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

// router.post("/orders/create", refreshToken, async (req, res) => {
//   try {
//     const {
//       paypalOrderId,
//       order_date,
//       pickup_location = "Primary",
//       billing_customer_name,
//       billing_last_name,
//       billing_address,
//       billing_city,
//       billing_pincode,
//       billing_state,
//       billing_country,
//       billing_email,
//       billing_phone,
//       shipping_is_billing = true,
//       order_items,
//       payment_method = "Prepaid",
//       sub_total,
//       shipping_cost,
//       terms_and_conditions,
//       length,
//       breadth,
//       height,
//       weight,
//     } = req.body;

//     // Calculate total tax (12% tax for simplicity)
//     const totalTax = sub_total * 0.12;
//     const grandTotal = sub_total + totalTax + shipping_cost;

//     // Prepare the tax breakdown
//     const taxBreakup = {
//       total_tax: totalTax,
//     };

//     // Send the order creation request to Shiprocket
//     const myHeaders = new Headers();
//     myHeaders.append("Content-Type", "application/json");
//     myHeaders.append("Authorization", `Bearer ${req.shiprocketToken}`);

//     const raw = JSON.stringify({
//       order_id: paypalOrderId,
//       order_date,
//       pickup_location,
//       billing_customer_name,
//       billing_last_name: billing_last_name || "",
//       billing_address,
//       billing_city: billing_city || "",
//       billing_pincode,
//       billing_state: billing_state || "",
//       billing_country: billing_country || "India",
//       billing_email,
//       billing_phone,
//       shipping_is_billing,
//       order_items: order_items.map(item => ({
//         name: item.name,
//         sku: item.sku,
//         units: parseInt(item.quantity),
//         selling_price: parseFloat(item.price),
//         tax: 12,
//         total_price: parseFloat((item.price + (item.price * 0.12)).toFixed(2)),
//         terms_and_conditions: item.terms_and_conditions,
//       })),
//       payment_method,
//       sub_total: parseFloat(sub_total),
//       shipping_charges: parseFloat(shipping_cost),
//       length: parseFloat(length) || 10,
//       breadth: parseFloat(breadth) || 10,
//       height: parseFloat(height) || 1,
//       weight: parseFloat(weight) || 0.5,
//       tax_breakup: taxBreakup,
//       grand_total: grandTotal,
//       terms_and_conditions,
//     });

//     const requestOptions = {
//       method: "POST",
//       headers: myHeaders,
//       body: raw,
//       redirect: "follow",
//     };

//     const response = await fetch(`${process.env.SHIPROCKET_API_URL}/orders/create/adhoc`, requestOptions);
//     const result = await response.json();
//     console.log("Shiprocket Response:", result);

//     if (!response.ok) {
//       throw new Error(result.message || "Failed to create Shiprocket order");
//     }

//     // Save order data to MongoDB
//     const order = new Order({
//       paypalOrderId,
//       items: order_items.map(item => ({
//         productId: item.sku || "N/A",
//         name: item.name,
//         price: parseFloat(item.price),
//         quantity: parseInt(item.quantity),
//         taxable_value: parseFloat(item.price * item.quantity),
//         total_price: parseFloat(item.total_price || (item.price + (item.price * 0.12))),
//         base_price: parseFloat(item.base_price || item.price),
//       })),
//       total: parseFloat(grandTotal),
//       currency: "INR",
//       shiprocketOrderId: result.order_id,
//       shipmentId: result.shipment_id,
//       shippingStatus: "created",
//       shippingAddress: {
//         name: `${billing_customer_name} ${billing_last_name || ''}`.trim(),
//         address: billing_address,
//         city: billing_city || "",
//         state: billing_state || "",
//         country: billing_country || "India",
//         pincode: billing_pincode,
//         phone: billing_phone,
//         email: billing_email,
//       },
//       tax_details: taxBreakup,
//       terms_and_conditions,
//       paymentStatus: "completed", // Set to completed since payment is verified
//     });
//     await order.save();

//     res.status(200).json({
//       shiprocketOrderId: result.order_id,
//       shipmentId: result.shipment_id,
//       status: result.status,
//     });
//   } catch (error) {
//     console.error("❌ Shiprocket Order Error:", error.message);
//     res.status(500).json({ message: error.message || "Internal Server Error" });
//   }
// });

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

    res.status(200).json({
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      status: result.status,
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

