const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  details: { type: String },
  amount: { type: Number, required: true },
  dimension: { type: String }, // e.g., "10x20x30 cm"
  images: [{ type: String }],
});

module.exports = mongoose.model("Product", productSchema);