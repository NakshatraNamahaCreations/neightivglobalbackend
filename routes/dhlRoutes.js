const express = require("express");
const router = express.Router();
const { createDHLShipment } = require("../Controllers/dhlController");

router.post("/create-shipment", createDHLShipment);

module.exports = router;
