const express = require("express");
const router = express.Router();
const dhlController = require("../Controllers/dhlController");

// Route for creating a shipping quote
router.post("/create-shipping-quote", dhlController.createShippingQuote);

// Route for creating a pickup
router.post("/create-pickup", dhlController.createPickup);

// Route for tracking a shipment
router.post("/track-shipment", dhlController.trackShipment);

// Route for creating a shipment
router.post("/create-shipment", dhlController.createDHLShipment);

module.exports = router;