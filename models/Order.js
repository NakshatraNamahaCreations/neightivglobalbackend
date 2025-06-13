const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  paypalOrderId: { type: String, required: true },
  userId: { type: String },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  total: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  status: { type: String, default: "completed" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);