// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  details: { type: String },
  amount: { type: Number, required: true },
  dimension: { type: String },
  sku: { type: String },
  stock: { type: Number, required: true, default: 0 },
  soldStock: { type: Number, default: 0 }, // New field for sold stock
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);