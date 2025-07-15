const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token
const generateToken = (admin) => {
  return jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc Register new Admin
// @route POST /api/admin/register
const registerAdmin = async (req, res) => {
  try {
    console.log("🔍 Register Admin Request:", req.body);

    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Check if admin exists
    const adminExists = await Admin.findOne({ $or: [{ email }, { username }] });
    if (adminExists) {
      return res.status(409).json({
        message: adminExists.email === email ? "Email already exists." : "Username already exists.",
      });
    }

    // Create admin
    const admin = await Admin.create({ username, email, password });

    console.log("✅ Admin Registered Successfully:", { id: admin._id, email: admin.email });
    res.status(201).json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      token: generateToken(admin),
    });
  } catch (error) {
    console.error("❌ Register Admin Error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({ message: `${field} already exists.` });
    }
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// @desc Login Admin
// @route POST /api/admin/login
const loginAdmin = async (req, res) => {
  try {
    console.log("🔍 Login Admin Request:", req.body);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Check admin credentials
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    console.log("✅ Admin Login Successful:", { id: admin._id, email: admin.email });
    res.json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      token: generateToken(admin),
    });
  } catch (error) {
    console.error("❌ Login Admin Error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// @desc Update Admin details
// @route PUT /api/admin/update/:id
const updateAdmin = async (req, res) => {
  try {
    console.log("🔍 Update Admin Request:", { id: req.params.id, body: req.body });

    const { username, email, password } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // Validate input
    if (!username && !email && !password) {
      return res.status(400).json({ message: "At least one field is required to update." });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      const emailExists = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (emailExists) {
        return res.status(409).json({ message: "Email already exists." });
      }
    }

    if (username) {
      const usernameExists = await Admin.findOne({ username, _id: { $ne: admin._id } });
      if (usernameExists) {
        return res.status(409).json({ message: "Username already exists." });
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Update fields
    admin.username = username || admin.username;
    admin.email = email || admin.email;
    if (password) {
      admin.password = await bcrypt.hash(password, 10); // Hash new password
    }

    await admin.save();

    console.log("✅ Admin Updated Successfully:", { id: admin._id, email: admin.email });
    res.json({
      message: "Admin updated successfully",
      admin: {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("❌ Update Admin Error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({ message: `${field} already exists.` });
    }
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

module.exports = { registerAdmin, loginAdmin, updateAdmin };
