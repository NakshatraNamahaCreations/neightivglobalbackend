const express = require('express');
const DhlOrder = require('../models/DhlOrder');
const router = express.Router();

// Fetch all DhlOrders (for admin panel)
router.get('/admin/orders', async (req, res) => {
  try {
    const dhlOrders = await DhlOrder.find();
    if (!dhlOrders || dhlOrders.length === 0) {
      return res.status(404).json({ error: 'No orders found' });
    }
    return res.status(200).json(dhlOrders);
  } catch (err) {
    console.error('Error fetching DhlOrders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

module.exports = router;