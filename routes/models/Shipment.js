const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentRequest: { type: Object, required: true },
  dhlResponse: { type: Object },
  status: { type: String, enum: ["success", "failed"], default: "success" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Shipment', shipmentSchema);
