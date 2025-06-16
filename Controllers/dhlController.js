const axios = require('axios');
const Shipment = require('../models/Shipment');

const DHL_API_KEY = process.env.DHL_API_KEY;

exports.createShipment = async (req, res) => {
  const shipmentData = req.body;

  try {
    const response = await axios.post(
      "https://express.api.dhl.com/mydhlapi/test/shipments",
      shipmentData,
      {
        headers: {
          "Content-Type": "application/json",
          "DHL-API-Key": DHL_API_KEY,
        },
      }
    );

    // Save to DB (optional)
    const saved = await Shipment.create({
      shipmentRequest: shipmentData,
      dhlResponse: response.data,
      status: "success",
    });

    res.status(200).json({
      message: "Shipment created successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("DHL API error:", error.response?.data || error.message);
    
    // Save failed attempt (optional)
    await Shipment.create({
      shipmentRequest: shipmentData,
      dhlResponse: error.response?.data || {},
      status: "failed",
    });

    res.status(500).json({
      message: "Failed to create shipment",
      error: error.response?.data || error.message,
    });
  }
};
