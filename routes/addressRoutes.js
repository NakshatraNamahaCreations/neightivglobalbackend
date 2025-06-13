const express = require("express");
const router = express.Router();
const addressController = require("../Controllers/addressController");

router.post("/", addressController.createAddress);
router.get("/", addressController.getAllAddresses);
router.get("/email/:email", addressController.getAddressByEmail);
router.get("/:id", addressController.getAddressById);
router.put("/:id", addressController.updateAddress); // Added PUT route
router.delete("/:id", addressController.deleteAddress);

module.exports = router;