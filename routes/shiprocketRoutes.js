const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Order = require("../models/Order");

let shiprocketToken = null;
let tokenExpiry = 0;

const refreshToken = async (req, res, next) => {
  try {
    if (!shiprocketToken || Date.now() >= tokenExpiry) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      const response = await fetch(`${process.env.SHIPROCKET_API_URL}/auth/login`, requestOptions);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to authenticate with Shiprocket");
      }

      shiprocketToken = result.token;
      tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
      console.log("✅ Shiprocket Token Refreshed");
    }
    req.shiprocketToken = shiprocketToken;
    next();
  } catch (error) {
    console.error("❌ Shiprocket Auth Error:", error.message);
    res.status(500).json({ message: "Failed to authenticate with Shiprocket" });
  }
};

router.get("/courier/serviceability", refreshToken, async (req, res) => {
  try {
    const { pickup_postcode, delivery_postcode, cod = 0, weight } = req.query;

    if (!pickup_postcode || !delivery_postcode || !weight) {
      return res.status(400).json({ message: "Pickup postcode, delivery postcode, and weight are required" });
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${req.shiprocketToken}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    const response = await fetch(
      `${process.env.SHIPROCKET_API_URL}/courier/serviceability/?pickup_postcode=${pickup_postcode}&delivery_postcode=${delivery_postcode}&cod=${cod}&weight=${weight}`,
      requestOptions
    );
    const result = await response.json();

    console.log("Shiprocket Serviceability Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to check courier serviceability");
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Serviceability Error:", error.message, error.stack);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.post("/orders/create", refreshToken, async (req, res) => {
  try {
    const {
      paypalOrderId,
      order_date,
      pickup_location = "Primary",
      billing_customer_name,
      billing_last_name,
      billing_address,
      billing_city,
      billing_pincode,
      billing_state,
      billing_country,
      billing_email,
      billing_phone,
      shipping_is_billing = true,
      order_items,
      payment_method = "Prepaid",
      sub_total,
      length,
      breadth,
      height,
      weight,
    } = req.body;

    // Validate required fields
    if (!paypalOrderId || !order_date || !billing_customer_name || !billing_address || !billing_pincode || !billing_email || !billing_phone) {
      return res.status(400).json({ message: "Missing required fields: order_id, order_date, billing_customer_name, billing_address, billing_pincode, billing_email, billing_phone" });
    }
    if (!order_items || !Array.isArray(order_items) || order_items.length === 0) {
      return res.status(400).json({ message: "Order items are required and must be a non-empty array" });
    }
    if (isNaN(sub_total) || sub_total <= 0) {
      return res.status(400).json({ message: "Valid sub_total is required" });
    }
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({ message: "Valid weight is required" });
    }

    // Validate order_items
    for (const item of order_items) {
      if (!item.name || !item.sku || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.price) || item.price < 0) {
        return res.status(400).json({ message: `Invalid order item: ${JSON.stringify(item)}` });
      }
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${req.shiprocketToken}`);

    const raw = JSON.stringify({
      order_id: paypalOrderId,
      order_date,
      pickup_location,
      billing_customer_name,
      billing_last_name: billing_last_name || "",
      billing_address,
      billing_city: billing_city || "",
      billing_pincode,
      billing_state: billing_state || "",
      billing_country: billing_country || "India",
      billing_email,
      billing_phone,
      shipping_is_billing,
      order_items: order_items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: parseInt(item.quantity),
        selling_price: parseFloat(item.price),
        hsn: item.hsn || "6109",
      })),
      payment_method,
      sub_total: parseFloat(sub_total),
      length: parseFloat(length) || 10,
      breadth: parseFloat(breadth) || 10,
      height: parseFloat(height) || 1,
      weight: parseFloat(weight) || 0.5,
    });

    console.log('Shiprocket API Payload:', JSON.stringify(raw, null, 2));

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(`${process.env.SHIPROCKET_API_URL}/orders/create/adhoc`, requestOptions);
    const result = await response.json();

    console.log('Shiprocket API Response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(result.message || "Failed to create Shiprocket order");
    }

    // Save to MongoDB
    const order = new Order({
      paypalOrderId,
      items: order_items.map((item) => ({
        productId: item.sku || "N/A",
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
      })),
      total: parseFloat(sub_total),
      currency: "INR",
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      shippingStatus: "created",
      shippingAddress: {
        name: `${billing_customer_name} ${billing_last_name || ''}`.trim(),
        address: billing_address,
        city: billing_city || "",
        state: billing_state || "",
        country: billing_country || "India",
        pincode: billing_pincode,
        phone: billing_phone,
        email: billing_email,
      },
    });
    await order.save();

    console.log("✅ Shiprocket Order Created:", result.order_id);
    res.status(200).json({
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      status: result.status,
    });
  } catch (error) {
    console.error("❌ Shiprocket Order Error:", error.message, error.stack);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.post("/courier/assign/awb", refreshToken, async (req, res) => {
  try {
    const { shiprocketOrderId, shipmentId } = req.body;

    if (!shiprocketOrderId || !shipmentId) {
      return res.status(400).json({ message: "Order ID and shipment ID are required" });
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${req.shiprocketToken}`);

    const raw = JSON.stringify({
      order_id: shiprocketOrderId,
      shipment_id: shipmentId,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(`${process.env.SHIPROCKET_API_URL}/courier/assign/awb`, requestOptions);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to assign AWB");
    }

    await Order.findOneAndUpdate(
      { shiprocketOrderId },
      {
        awbCode: result.awb_code,
        courierName: result.courier_name,
        shippingStatus: "awb_assigned",
      },
      { new: true }
    );

    console.log("✅ AWB Assigned:", result.awb_code);
    res.status(200).json({
      awbCode: result.awb_code,
      courierName: result.courier_name,
      status: result.status,
    });
  } catch (error) {
    console.error("❌ AWB Assignment Error:", error.message);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

module.exports = router;