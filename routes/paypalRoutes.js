const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const fetch = require("node-fetch");

router.post("/token", async (req, res) => {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("PayPal client ID or secret is missing in environment variables.");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    myHeaders.append("Authorization", `Basic ${auth}`);

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    const response = await fetch("https://api.paypal.com/v1/oauth2/token", requestOptions);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error_description || "Failed to obtain access token");
    }

    console.log("✅ PayPal Access Token:", result.access_token);
    res.status(200).json({ access_token: result.access_token });
  } catch (error) {
    console.error("❌ PayPal Token Error:", error.message);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency_code = "USD", cartItems } = req.body;

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Valid amount is required." });
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart items are required." });
    }

    const accessToken = req.header("Authorization")?.replace("Bearer ", "");
    if (!accessToken) {
      return res.status(401).json({ message: "Access token is required." });
    }

    // Calculate item_total from cartItems
    const itemTotal = cartItems.reduce((total, item) => {
      const price = parseFloat(item.price);
      const quantity = parseInt(item.quantity);
      if (isNaN(price) || isNaN(quantity)) {
        throw new Error("Invalid price or quantity in cart items.");
      }
      return total + price * quantity;
    }, 0);

    // Validate item_total matches amount
    if (Math.abs(itemTotal - numericAmount) > 0.01) {
      return res.status(400).json({ message: "Item total does not match order amount." });
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${accessToken}`);

    const raw = JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code,
            value: numericAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code,
                value: itemTotal.toFixed(2),
              },
            },
          },
          items: cartItems.map((item) => ({
            name: item.name,
            unit_amount: {
              currency_code,
              value: parseFloat(item.price).toFixed(2),
            },
            quantity: item.quantity.toString(),
            sku: item.sku || undefined,
          })),
        },
      ],
      application_context: {
        return_url: process.env.PAYPAL_RETURN_URL,
        cancel_url: process.env.PAYPAL_CANCEL_URL,
        brand_name: process.env.PAYPAL_BRAND_NAME,
        user_action: "PAY_NOW",
      },
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch("https://api.paypal.com/v2/checkout/orders", requestOptions);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details?.[0]?.description || "Failed to create order");
    }

    console.log("✅ PayPal Order Created:", result.id);
    res.status(200).json({
      order_id: result.id,
      links: result.links,
    });
  } catch (error) {
    console.error("❌ PayPal Order Error:", error.message);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.get("/capture-order", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Order token is required." });
  }

  try {
    const tokenResponse = await fetch("https://api.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    const { access_token } = await tokenResponse.json();

    const captureResponse = await fetch(`https://api.paypal.com/v2/checkout/orders/${token}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    });
    const captureResult = await captureResponse.json();

    if (!captureResponse.ok) {
      throw new Error(captureResult.details?.[0]?.description || "Failed to capture order");
    }

    const order = new Order({
      paypalOrderId: captureResult.id,
      userId: null, // Set to req.user?._id if authentication is implemented
      items: captureResult.purchase_units[0].items
        ? captureResult.purchase_units[0].items.map((item) => ({
            productId: item.sku || "N/A",
            name: item.name,
            price: parseFloat(item.unit_amount.value),
            quantity: parseInt(item.quantity),
          }))
        : [],
      total: parseFloat(captureResult.purchase_units[0].amount.value),
      currency: captureResult.purchase_units[0].amount.currency_code || "USD",
    });
    await order.save();

    console.log("✅ PayPal Order Captured:", captureResult.id);
    res.redirect("https://neightivglobal.com/paypal-success?status=success");
  } catch (error) {
    console.error("❌ PayPal Capture Error:", error.message);
    res.redirect(`https://neightivglobal.com/paypal-cancel?error=${encodeURIComponent(error.message)}`);
  }
});

router.get("/cancel-order", async (req, res) => {
  console.log("❌ PayPal Payment Cancelled");
  res.redirect("https://neightivglobal.com/paypal-cancel?status=cancelled");
});

module.exports = router;