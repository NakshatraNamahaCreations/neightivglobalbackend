const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const Order = require("../models/Order");
require('dotenv').config();

// Step 1: OAuth Authentication - Get access token
const phonePeAuth = async () => {
  const data = qs.stringify({
    client_id: process.env.PHONEPE_CLIENT_ID,
    client_secret: process.env.PHONEPE_CLIENT_SECRET,
    client_version: '1',
    grant_type: 'client_credentials',
  });

  const response = await axios.post(
    `${process.env.PHONEPE_API_BASE_URL}/apis/identity-manager/v1/oauth/token`,
    data,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return response.data.access_token;
};

// Step 2: Payment initiation
router.post('/initiate-payment', async (req, res) => {
  const { paypalOrderId, amount, redirectUrl, cartItems, shippingDetails, termsAndConditions, selectedCourier } = req.body;

  try {
    if (!paypalOrderId || !amount || !cartItems || !shippingDetails) {
      return res.status(400).json({ error: "Required fields are missing." });
    }

    const accessToken = await phonePeAuth();

    const payload = {
      merchantOrderId: paypalOrderId,
      amount,
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Complete your payment",
        merchantUrls: {
          redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/checkout?callback=true&transactionId=${paypalOrderId}`,
        },
      },
    };

    const order = await Order.create({
      paypalOrderId,
      amount,
      items: cartItems,
      total: amount / 100, // Convert back to INR
      shippingAddress: shippingDetails,
      terms_and_conditions: termsAndConditions,
      status: 'pending',
      selectedCourier,
    });

    const response = await axios.post(
      `${process.env.PHONEPE_API_BASE_URL}/apis/pg/checkout/v2/pay`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
        },
      }
    );

    if (response.data?.redirectUrl) {
      order.transactionId = response.data.orderId;
      order.paymentStatus = 'pending';
      order.paymentRedirectUrl = response.data.redirectUrl;
      await order.save();

      res.json({ redirectUrl: response.data.redirectUrl });
    } else {
      console.error('Redirect URL missing from PhonePe response');
      res.status(400).json({ error: 'Redirect URL missing in PhonePe response' });
    }
  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Step 3: Verify Payment Status
router.get('/verify-payment', async (req, res) => {
  const { transactionId } = req.query;

  try {
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    const accessToken = await phonePeAuth();

    const response = await axios.get(
      `${process.env.PHONEPE_API_BASE_URL}/apis/pg/checkout/v2/status?merchantOrderId=${transactionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
        },
      }
    );

    const { status } = response.data;

    if (status === 'PAYMENT_SUCCESS') {
      await Order.findOneAndUpdate(
        { paypalOrderId: transactionId },
        { paymentStatus: 'completed' },
        { new: true }
      );
      res.json({ success: true, paymentStatus: 'completed' });
    } else {
      res.json({ success: false, paymentStatus: status });
    }
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Step 4: PhonePe Callback/Webhook (Optional)
router.post('/callback', async (req, res) => {
  const { merchantOrderId, status } = req.body;

  try {
    if (!merchantOrderId || !status) {
      return res.status(400).json({ error: 'Invalid callback data.' });
    }

    if (status === 'PAYMENT_SUCCESS') {
      await Order.findOneAndUpdate(
        { paypalOrderId: merchantOrderId },
        { paymentStatus: 'completed' },
        { new: true }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Payment not successful.' });
    }
  } catch (error) {
    console.error('Callback error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;