const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Order = require("../models/Order");
const nodemailer = require("nodemailer");

let shiprocketToken = null;
let tokenExpiry = 0;


const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in', // Zoho Mail SMTP server (India)
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER || "contact@neightivglobal.com",
    pass: process.env.EMAIL_PASS || "Kalpana@neightivglobal2025", // Replace with your app-specific password
  },
  requireTLS: true,
  debug: true,
  logger: true,
});

const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Order Confirmation SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("❌ Order Confirmation SMTP connection verification failed:", error.message, error.stack);
    return false;
  }
};


const sendOrderConfirmationEmail = async (order) => {
  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
        <h2 style="color: #333;">📦 Thank You for Your Order!</h2>
        <p style="font-size: 16px;">Dear ${order.shippingAddress?.name || 'Customer'},</p>
        <p style="font-size: 16px;">Your order has been successfully placed with Neightiv Global. Below are the details of your order:</p>

        <h3 style="color: #333; margin-top: 20px;">Order Details</h3>
        <p><strong>Order ID:</strong> ${order.paypalOrderId || '-'}</p>
        <p><strong>Shiprocket Order ID:</strong> ${order.shiprocketOrderId || '-'}</p>
        <p><strong>Shipment ID:</strong> ${order.shipmentId || '-'}</p>

        <h3 style="color: #333; margin-top: 20px;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #e0e0e0;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
          ${(order.items || [])
            .map(
              (item) => `
              <tr>
                <td style="padding: 10px;">${item.name || '-'}</td>
                <td style="padding: 10px;">${item.quantity || 0}</td>
                <td style="padding: 10px;">Rs. ${(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 10px;">Rs. ${(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>`
            )
            .join('')}
        </table>

        <h3 style="color: #333; margin-top: 20px;">Shipping Address</h3>
        <p>${order.shippingAddress?.name || ''} ${order.shippingAddress?.last_name || ''}</p>
        <p>${order.shippingAddress?.address || ''}</p>
        <p>${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.pincode || ''}</p>
        <p>${order.shippingAddress?.country || ''}</p>
        <p><strong>Phone:</strong> ${order.shippingAddress?.phone || ''}</p>
        <p><strong>Email:</strong> <a href="mailto:${order.shippingAddress?.email || ''}" style="color: #007bff;">${order.shippingAddress?.email || ''}</a></p>

        <h3 style="color: #333; margin-top: 20px;">Order Summary</h3>
        <p><strong>Subtotal:</strong> Rs. ${(order.sub_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        <p><strong>Tax (12%):</strong> Rs. ${(order.tax_details?.total_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        <p><strong>Shipping Charges:</strong> Rs. ${(order.shipping_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        <p><strong>Grand Total:</strong> Rs. ${(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>

        <h3 style="color: #333; margin-top: 20px;">Terms and Conditions</h3>
        <p style="font-size: 14px; white-space: pre-wrap;">${order.terms_and_conditions || ''}</p>

        <p style="font-size: 14px; color: #555; margin-top: 20px;">
          Thank you for shopping with Neightiv Global! You'll receive updates on your order status soon.
          For any questions, contact us at <a href="mailto:contact@neightivglobal.com" style="color: #007bff;">contact@neightivglobal.com</a>.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Neightiv Global" <${process.env.EMAIL_USER}>`,
      to: order.shippingAddress?.email || 'contact@neightivglobal.com',
      subject: `📦 Order Confirmation - ${order.paypalOrderId || 'Unknown Order'}`,
      html: emailContent,
    };

    const smtpVerified = await verifyTransporter();
    if (!smtpVerified) {
      throw new Error("SMTP connection verification failed");
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${mailOptions.to}: Message ID ${info.messageId}`);
  } catch (error) {
    console.error("❌ Order Confirmation Email Error:", error.message, error.stack);
  }
};



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

router.post("/create-shipment", refreshToken, async (req, res) => {
  try {
    console.log("Received Payload:", JSON.stringify(req.body, null, 2));

    const {
      order_id,
      order_date,
      pickup_location,
      billing_customer_name,
      billing_last_name,
      billing_address,
      billing_city,
      billing_pincode,
      billing_state,
      billing_country,
      billing_email,
      billing_phone,
      shipping_is_billing,
      order_items,
      payment_method,
      sub_total,
      shipping_charges,
      length,
      breadth,
      height,
      weight,
      grand_total,
      tax_breakup,
      terms_and_conditions
    } = req.body;
console.log(req.body)
    // Enhanced validation for required fields
    const requiredFields = {
      order_id,
      order_date,
      pickup_location,
      billing_customer_name,
      billing_last_name,
      billing_address,
      billing_city,
      billing_pincode,
      billing_state,
      billing_country,
      billing_email,
      billing_phone,
      shipping_is_billing,
      order_items,
      payment_method,
      sub_total
    };

    const missingFields = Object.keys(requiredFields).filter(
      key => requiredFields[key] === undefined || requiredFields[key] === null || 
             (Array.isArray(requiredFields[key]) && requiredFields[key].length === 0) ||
             (typeof requiredFields[key] === 'string' && requiredFields[key].trim() === '')
    );
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing or empty required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate order_items
    if (!Array.isArray(order_items) || order_items.length === 0) {
      return res.status(400).json({ error: "order_items must be a non-empty array" });
    }

    for (const [index, item] of order_items.entries()) {
      const requiredItemFields = ['name', 'units', 'selling_price'];
      const missingItemFields = requiredItemFields.filter(field => 
        item[field] === undefined || item[field] === null || item[field] === ''
      );
      if (missingItemFields.length > 0) {
        return res.status(400).json({ 
          error: `Invalid order item at index ${index}: missing or empty fields: ${missingItemFields.join(', ')}` 
        });
      }
      if (!item.sku) {
        item.sku = `SKU_${Date.now()}_${index}`;
      }
    }

    // Prepare the Shiprocket order payload
    const orderPayload = {
      order_id,
      order_date,
      pickup_location,
      billing_customer_name,
      billing_last_name,
      billing_address,
      billing_city: billing_city || "",
      billing_pincode,
      billing_state: billing_state || "",
      billing_country: billing_country || "India",
      billing_email,
      billing_phone,
      shipping_is_billing: shipping_is_billing ?? true,
      order_items: order_items.map(item => ({
        name: item.name,
        sku: item.sku || `SKU_${Date.now()}`,
        units: parseInt(item.units),
        selling_price: parseFloat(item.selling_price.toFixed(2)),
        tax: item.tax || 12,
        total_price: parseFloat((item.total_price || (item.selling_price * (1 + (item.tax || 12) / 100))).toFixed(2)),
      })),
      payment_method: payment_method || "Prepaid",
      sub_total: parseFloat(sub_total.toFixed(2)),
      shipping_charges: parseFloat((shipping_charges || 0).toFixed(2)),
      length: parseFloat(length) || 10,
      breadth: parseFloat(breadth) || 10,
      height: parseFloat(height) || 1,
      weight: parseFloat(weight) || 0.5,
      grand_total: parseFloat((grand_total || (sub_total + (sub_total * 0.12) + (shipping_charges || 0))).toFixed(2)),
      tax_breakup: tax_breakup || { total_tax: parseFloat((sub_total * 0.12).toFixed(2)) },
      terms_and_conditions
    };

    console.log("Shiprocket Payload:", JSON.stringify(orderPayload, null, 2));

    // Send the payload to Shiprocket
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${req.shiprocketToken}`);

    const response = await fetch(`${process.env.SHIPROCKET_API_URL}/orders/create/adhoc`, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(orderPayload),
    });
    const result = await response.json();

    // console.log("Shiprocket API Response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(result.message || "Failed to create Shiprocket order");
    }

    // Save order data to MongoDB
    const order = new Order({
      paypalOrderId: order_id,
      items: order_items.map(item => ({
        productId: item.sku || "N/A",
        name: item.name,
        price: parseFloat(item.selling_price),
        quantity: parseInt(item.units),
        total_price: parseFloat(item.total_price || (item.selling_price * (1 + (item.tax || 12) / 100))),
      })),
      total: parseFloat(grand_total || (sub_total + (sub_total * 0.12) + (shipping_charges || 0))),
      currency: "INR",
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      shippingStatus: "created",
      shippingAddress: {
        name: billing_customer_name,
        address: billing_address,
        city: billing_city || "",
        state: billing_state || "",
        country: billing_country || "India",
        pincode: billing_pincode,
        phone: billing_phone,
        email: billing_email,
      },
      tax_details: tax_breakup || { total_tax: parseFloat((sub_total * 0.12).toFixed(2)) },
      terms_and_conditions,
      paymentStatus: "completed",
    });
    await order.save();
try {
      await sendOrderConfirmationEmail(order);
    } catch (emailError) {
      console.error("Email Sending Failed:", emailError.message);
      // Optionally include email failure in the response without failing the entire request
      return res.status(200).json({
        shiprocketOrderId: result.order_id,
        shipmentId: result.shipment_id,
        status: result.status,
        emailStatus: "failed",
        emailError: emailError.message,
      });
    }


    res.status(200).json({
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      status: result.status,
      emailStatus: "sent",
    });
  } catch (err) {
    console.error("🚨 Shiprocket Order Error:", err.message, err.stack);
    res.status(500).json({ error: "Internal server error", detail: err.message });
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

router.get("/orders", async (req, res) => {
  try {
    // Assuming you are fetching from a MongoDB model
    const orders = await Order.find();  // Or replace with appropriate fetch logic
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});


module.exports = router;

