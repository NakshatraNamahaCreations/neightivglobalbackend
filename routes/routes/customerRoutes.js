const express = require("express");
const router = express.Router();
const CustomerController = require("../Controllers/customerController");

router.post("/register", CustomerController.register);
router.post("/login", CustomerController.login);
router.get("/profile/:id", CustomerController.getProfile);
router.get("/all", CustomerController.getAllUsers);
router.delete("/delete/:id", CustomerController.deleteUser);

module.exports = router;