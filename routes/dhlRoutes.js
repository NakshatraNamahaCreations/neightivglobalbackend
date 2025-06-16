const express = require('express');
const router = express.Router();
const { createShipment } = require('../Controllers/dhlController');

router.post('/create-shipment', createShipment);

module.exports = router;
