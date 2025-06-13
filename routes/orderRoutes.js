const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/", orderController.getAllOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id", orderController.updateOrderStatus);
router.delete("/:id", orderController.deleteOrder);

module.exports = router;
