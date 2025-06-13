const Order = require("../models/Order");
const Address = require("../models/Address");

const orderController = {
  // Create a new order
  createOrder: async (req, res) => {
    try {
      const { addressId, amount, paymentMode, quantity, productImage, productName } = req.body;

      // Validate required fields, including productName
      if (!addressId || !amount || !paymentMode || !quantity || !productName) {
        return res.status(400).json({ error: "All fields are required, including productName." });
      }

      const addressExists = await Address.findById(addressId);
      if (!addressExists) {
        return res.status(404).json({ error: "Address not found." });
      }

      const newOrder = new Order({
        address: addressId,
        amount,
        paymentMode,
        quantity,
        productImage, // optional
        productName, // required
      });

      await newOrder.save();
      res.status(201).json({ message: "Order created successfully", order: newOrder });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Server error while creating order" });
    }
  },

  // Get all orders
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.find().populate("address").sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching orders" });
    }
  },

  // Get single order
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate("address");
      if (!order) return res.status(404).json({ error: "Order not found" });

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching order" });
    }
  },

  // Delete an order
  deleteOrder: async (req, res) => {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error while deleting order" });
    }
  },

  // Update order status
  updateOrderStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate("address");

      if (!updatedOrder) return res.status(404).json({ error: "Order not found" });

      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Server error while updating status" });
    }
  },
};

module.exports = orderController;