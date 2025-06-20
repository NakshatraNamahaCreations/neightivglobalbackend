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
//       tax_details,
//       terms_and_conditions,
//       length,
//       breadth,
//       height,
//       weight,
//     } = req.body;

//     // Calculate total tax (12% tax for simplicity)
//     const totalTax = sub_total * 0.12;  // 12% tax (CGST + SGST combined)

//     let grandTotal = sub_total + totalTax + shipping_cost; // Adding tax and shipping to the grand total

//     // Prepare the tax breakdown to send to the frontend
//     const taxBreakup = {
//       total_tax: totalTax,  // Total tax (12% of sub_total)
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
//         selling_price: parseFloat(item.price), // Normal price (before tax)
//         tax: 12,  // 12% tax (CGST + SGST combined)
//         total_price: parseFloat((item.price + (item.price * 0.12)).toFixed(2)), // Price after tax
//         terms_and_conditions: item.terms_and_conditions,
//       })),
//       payment_method,
//       sub_total: parseFloat(sub_total),
//       shipping_charges: parseFloat(shipping_cost),
//       length: parseFloat(length) || 10,
//       breadth: parseFloat(breadth) || 10,
//       height: parseFloat(height) || 1,
//       weight: parseFloat(weight) || 0.5,
//       tax_breakup: taxBreakup, // Send tax details
//       grand_total: grandTotal, // Send the grand total in the payload
//       terms_and_conditions, // Add the terms_and_conditions field here
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

//     // Step 3: Save order data to MongoDB (existing code)
//     const order = new Order({
//       paypalOrderId,
//       items: order_items.map(item => ({
//         productId: item.sku || "N/A",
//         name: item.name,
//         price: parseFloat(item.price), // Normal price (before tax)
//         quantity: parseInt(item.quantity),
//         taxable_value: parseFloat(item.price * item.quantity), // Taxable value
//         total_price: parseFloat(item.total_price), // Price after tax
//         base_price: parseFloat(item.price),
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
//       tax_details: taxBreakup, // Save tax details in MongoDB
//       terms_and_conditions, // Save terms and conditions to MongoDB
//     });
//     await order.save();

//     // Step 4: Generate the invoice for the order
//     const invoicePayload = {
//       order_ids: [result.order_id], // Use the Shiprocket order ID
//     };

//     const invoiceResponse = await fetch('https://apiv2.shiprocket.in/v1/external/orders/print/invoice', {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${req.shiprocketToken}`,
//       },
//       body: JSON.stringify(invoicePayload),
//     });

//     const invoiceResult = await invoiceResponse.json();

//     // Step 5: Handle the invoice generation response
//     if (!invoiceResponse.ok) {
//       console.error("❌ Invoice Generation Error:", invoiceResult.message);
//     } else {
//       console.log("✅ Invoice Generated:", invoiceResult);

//       const pdfUrl = invoiceResult.data?.invoice_url || null;

//       res.status(200).json({
//         shiprocketOrderId: result.order_id,
//         shipmentId: result.shipment_id,
//         status: result.status,
//         invoice_url: pdfUrl, // PDF URL for the generated invoice
//       });
//     }
//   } catch (error) {
//     console.error("❌ Shiprocket Order Error:", error.message);
//     res.status(500).json({ message: error.message || "Internal Server Error" });
//   }
// });

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
      shipping_cost,
      terms_and_conditions,
      length,
      breadth,
      height,
      weight,
    } = req.body;

    // Calculate total tax (12% tax for simplicity)
    const totalTax = sub_total * 0.12;
    const grandTotal = sub_total + totalTax + shipping_cost;

    // Prepare the tax breakdown
    const taxBreakup = {
      total_tax: totalTax,
    };

    // Send the order creation request to Shiprocket
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
      order_items: order_items.map(item => ({
        name: item.name,
        sku: item.sku,
        units: parseInt(item.quantity),
        selling_price: parseFloat(item.price),
        tax: 12,
        total_price: parseFloat((item.price + (item.price * 0.12)).toFixed(2)),
        terms_and_conditions: item.terms_and_conditions,
      })),
      payment_method,
      sub_total: parseFloat(sub_total),
      shipping_charges: parseFloat(shipping_cost),
      length: parseFloat(length) || 10,
      breadth: parseFloat(breadth) || 10,
      height: parseFloat(height) || 1,
      weight: parseFloat(weight) || 0.5,
      tax_breakup: taxBreakup,
      grand_total: grandTotal,
      terms_and_conditions,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(`${process.env.SHIPROCKET_API_URL}/orders/create/adhoc`, requestOptions);
    const result = await response.json();
    console.log("Shiprocket Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to create Shiprocket order");
    }

    // Save order data to MongoDB
    const order = new Order({
      paypalOrderId,
      items: order_items.map(item => ({
        productId: item.sku || "N/A",
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        taxable_value: parseFloat(item.price * item.quantity),
        total_price: parseFloat(item.total_price || (item.price + (item.price * 0.12))),
        base_price: parseFloat(item.base_price || item.price),
      })),
      total: parseFloat(grandTotal),
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
      tax_details: taxBreakup,
      terms_and_conditions,
      paymentStatus: "completed", // Set to completed since payment is verified
    });
    await order.save();

    res.status(200).json({
      shiprocketOrderId: result.order_id,
      shipmentId: result.shipment_id,
      status: result.status,
    });
  } catch (error) {
    console.error("❌ Shiprocket Order Error:", error.message);
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