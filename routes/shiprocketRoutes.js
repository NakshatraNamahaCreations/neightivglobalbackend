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

//     let totalCGST = 0;
//     let totalSGST = 0;
//     let baseSubTotal = 0;

//     // Calculate base total and tax details
//     order_items.forEach(item => {
//       const itemBasePrice = item.base_price * item.quantity; // Normal price (before tax)
//       const cgst = itemBasePrice * 0.06; // 6% CGST
//       const sgst = itemBasePrice * 0.06; // 6% SGST
//       totalCGST += cgst;
//       totalSGST += sgst;
//       baseSubTotal += itemBasePrice;
//     });

//     // Calculate grand total (normal price + tax + shipping cost)
//     const grandTotal = baseSubTotal + totalCGST + totalSGST + shipping_cost;

//     // Step 2: Send the order creation request to Shiprocket
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
//         tax: 12,  // 12% tax (CGST + SGST)
//         cgst: parseFloat((item.price * 0.06).toFixed(2)), // 6% CGST
//         sgst: parseFloat((item.price * 0.06).toFixed(2)), // 6% SGST
//         taxable_value: parseFloat(item.price * item.quantity), // Taxable value (Unit price * quantity)
//         total_price: parseFloat((item.price + (item.price * 0.06) + (item.price * 0.06)).toFixed(2)), // Final price including tax
//       })),
//       payment_method,
//       sub_total: parseFloat(baseSubTotal),
//       shipping_charges: parseFloat(shipping_cost),
//       length: parseFloat(length) || 10,
//       breadth: parseFloat(breadth) || 10,
//       height: parseFloat(height) || 1,
//       weight: parseFloat(weight) || 0.5,
//       tax_breakup: {
//         cgst_rate: 6,  // 6% CGST
//         sgst_rate: 6,  // 6% SGST
//         cgst_total: totalCGST,  // Total CGST amount
//         sgst_total: totalSGST,  // Total SGST amount
//         total_tax: totalCGST + totalSGST,  // Total tax (CGST + SGST)
//       },
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
//         cgst: parseFloat(item.cgst),
//         sgst: parseFloat(item.sgst),
//         taxable_value: parseFloat(item.taxable_value), // Taxable value
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
//       tax_details: {
//         base_total: parseFloat(baseSubTotal),
//         cgst_total: parseFloat(totalCGST),
//         sgst_total: parseFloat(totalSGST),
//       },
//       terms_and_conditions,
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
      tax_details,
      terms_and_conditions,  // Ensure this is passed in the request
      length,
      breadth,
      height,
      weight,
    } = req.body;

    let totalCGST = 0;
    let totalSGST = 0;
    let baseSubTotal = 0;

    // Calculate base total and tax details
    order_items.forEach(item => {
      const itemBasePrice = item.base_price * item.quantity; // Normal price (before tax)
      const cgst = itemBasePrice * 0.06; // 6% CGST
      const sgst = itemBasePrice * 0.06; // 6% SGST
      totalCGST += cgst;
      totalSGST += sgst;
      baseSubTotal += itemBasePrice;
    });

    // Calculate grand total (normal price + tax + shipping cost)
    const grandTotal = baseSubTotal + totalCGST + totalSGST + shipping_cost;

    // Step 2: Send the order creation request to Shiprocket
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
        selling_price: parseFloat(item.price), // Normal price (before tax)
        tax: 12,  // 12% tax (CGST + SGST)
        cgst: parseFloat((item.price * 0.06).toFixed(2)), // 6% CGST
        sgst: parseFloat((item.price * 0.06).toFixed(2)), // 6% SGST
        taxable_value: parseFloat(item.price * item.quantity), // Taxable value (Unit price * quantity)
        total_price: parseFloat((item.price + (item.price * 0.06) + (item.price * 0.06)).toFixed(2)), // Final price including tax
         terms_and_conditions: item.terms_and_conditions,
      })),
      payment_method,
      sub_total: parseFloat(baseSubTotal),
      shipping_charges: parseFloat(shipping_cost),
      length: parseFloat(length) || 10,
      breadth: parseFloat(breadth) || 10,
      height: parseFloat(height) || 1,
      weight: parseFloat(weight) || 0.5,
      tax_breakup: {
        cgst_rate: 6,  // 6% CGST
        sgst_rate: 6,  // 6% SGST
        cgst_total: totalCGST,  // Total CGST amount
        sgst_total: totalSGST,  // Total SGST amount
        total_tax: totalCGST + totalSGST,  // Total tax (CGST + SGST)
      },
      terms_and_conditions, // Add the terms_and_conditions field here
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

    // Step 3: Fetch the created order details from Shiprocket
    const orderDetailsRequestOptions = {
      method: "GET",
      headers: myHeaders,
    };

    const orderDetailsResponse = await fetch(
      `${process.env.SHIPROCKET_API_URL}/v1/external/orders/${result.order_id}`, 
      orderDetailsRequestOptions
    );
    const orderDetailsResult = await orderDetailsResponse.json();

    // Handle the response from fetching the order details
    if (!orderDetailsResponse.ok) {
      throw new Error(orderDetailsResult.message || "Failed to fetch order details");
    }

    // Step 4: Save order data to MongoDB (existing code)
    const order = new Order({
      paypalOrderId,
      items: order_items.map(item => ({
        productId: item.sku || "N/A",
        name: item.name,
        price: parseFloat(item.price), // Normal price (before tax)
        quantity: parseInt(item.quantity),
        cgst: parseFloat(item.cgst),
        sgst: parseFloat(item.sgst),
        taxable_value: parseFloat(item.taxable_value), // Taxable value
        total_price: parseFloat(item.total_price), // Price after tax
        base_price: parseFloat(item.price),
         sku: item.sku,
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
      tax_details: {
        base_total: parseFloat(baseSubTotal),
        cgst_total: parseFloat(totalCGST),
        sgst_total: parseFloat(totalSGST),
      },
      terms_and_conditions, // Save terms and conditions to MongoDB
    });
    await order.save();

    // Step 5: Generate the invoice for the order
    const invoicePayload = {
      order_ids: [result.order_id], // Use the Shiprocket order ID
    };

    const invoiceResponse = await fetch('https://apiv2.shiprocket.in/v1/external/orders/print/invoice', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.shiprocketToken}`,
      },
      body: JSON.stringify(invoicePayload),
    });

    const invoiceResult = await invoiceResponse.json();

    // Step 6: Handle the invoice generation response
    if (!invoiceResponse.ok) {
      console.error("❌ Invoice Generation Error:", invoiceResult.message);
    } else {
      console.log("✅ Invoice Generated:", invoiceResult);

      const pdfUrl = invoiceResult.data?.invoice_url || null;

      res.status(200).json({
        shiprocketOrderId: result.order_id,
        shipmentId: result.shipment_id,
        status: result.status,
        invoice_url: pdfUrl, // PDF URL for the generated invoice
        order_details: orderDetailsResult, // Include the fetched order details
      });
    }
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




module.exports = router;