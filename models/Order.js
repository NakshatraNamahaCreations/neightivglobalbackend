const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  paypalOrderId: { type: String, required: true },
  userId: { type: String },
  items: [
    {
      productId: String,
      name: String,
      price: Number, // Price in INR
      quantity: Number,
    },
  ],
  total: { type: Number, required: true }, // Total in INR
  currency: { type: String, default: "INR" }, // Changed to INR for consistency
  status: { type: String, default: "completed" },
  createdAt: { type: Date, default: Date.now },
  shiprocketOrderId: { type: String }, // Shiprocket order ID
  shipmentId: { type: String }, // Shiprocket shipment ID
  awbCode: { type: String }, // Air Waybill code
  courierName: { type: String }, // Courier (e.g., Delhivery, FedEx)
  shippingStatus: { type: String, default: "pending" }, // e.g., pending, shipped, delivered
  shippingAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    phone: String,
    email: String,
  },
   tax_details: {
    base_total: Number,
    cgst_total: Number,
    sgst_total: Number,
  },
  terms_and_conditions: String,
});

module.exports = mongoose.model("Order", OrderSchema);