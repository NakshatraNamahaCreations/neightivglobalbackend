const Address = require("../models/Address");

const addressController = {
  // Create a new address
  createAddress: async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        mobileNumber,
        state,
        city,
        address,
        pincode,
        country,
      } = req.body;

      if (
        !firstName ||
        !lastName ||
        !email ||
        !mobileNumber ||
        !state ||
        !city ||
        !address ||
        !pincode ||
        !country
      ) {
        return res.status(400).json({ error: "All fields are required." });
      }

      const newAddress = new Address({
        firstName,
        lastName,
        email,
        mobileNumber,
        state,
        city,
        address,
        pincode,
        country,
      });

      await newAddress.save();
      res.status(201).json({ message: "Address created successfully", address: newAddress });
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(500).json({ error: "Server error while creating address" });
    }
  },

  // Get all addresses
  getAllAddresses: async (req, res) => {
    try {
      const addresses = await Address.find().sort({ createdAt: -1 });
      res.status(200).json(addresses);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching addresses" });
    }
  },

  // Get single address by ID
  getAddressById: async (req, res) => {
    try {
      const address = await Address.findById(req.params.id);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.status(200).json(address);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching address" });
    }
  },

  // Get addresses by email
  getAddressByEmail: async (req, res) => {
    try {
      const { email } = req.params;
      const addresses = await Address.find({ email }).sort({ createdAt: -1 });

      if (!addresses || addresses.length === 0) {
        return res.status(404).json({ error: "No addresses found for this email" });
      }

      res.status(200).json(addresses);
    } catch (error) {
      console.error("Error fetching addresses by email:", error);
      res.status(500).json({ error: "Server error while fetching addresses" });
    }
  },

  // Update an address
  updateAddress: async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        mobileNumber,
        state,
        city,
        address,
        pincode,
        country,
      } = req.body;

      if (
        !firstName ||
        !lastName ||
        !email ||
        !mobileNumber ||
        !state ||
        !city ||
        !address ||
        !pincode ||
        !country
      ) {
        return res.status(400).json({ error: "All fields are required." });
      }

      const updatedAddress = await Address.findByIdAndUpdate(
        req.params.id,
        {
          firstName,
          lastName,
          email,
          mobileNumber,
          state,
          city,
          address,
          pincode,
          country,
        },
        { new: true, runValidators: true }
      );

      if (!updatedAddress) {
        return res.status(404).json({ error: "Address not found" });
      }

      res.status(200).json({ message: "Address updated successfully", address: updatedAddress });
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ error: "Server error while updating address" });
    }
  },

  // Delete an address
  deleteAddress: async (req, res) => {
    try {
      const address = await Address.findByIdAndDelete(req.params.id);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error while deleting address" });
    }
  },
};

module.exports = addressController;