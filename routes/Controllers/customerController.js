const bcrypt = require("bcrypt");
const User = require("../models/Customer");

// Register a new user
exports.register = async (req, res) => {
  try {
    console.log("🔍 Register Request:", req.body);

    const { firstname, lastname, email, mobilenumber, password } = req.body;

    // Check if all fields are provided
    if (!firstname || !lastname || !email || !mobilenumber || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists. Please log in." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstname,
      lastname,
      email,
      mobilenumber,
      password: hashedPassword,
    });

    await newUser.save();

    console.log("✅ User Registered Successfully:", {
      id: newUser._id,
      email: newUser.email,
    });
    res.status(201).json({ message: "User registered successfully!", userId: newUser._id });
  } catch (error) {
    console.error("❌ Register Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log("🔍 Login Request:", req.body);

    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Send user details in response
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.mobilenumber,
        countryCode: "+91",
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Get Profile Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Get All Users Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("❌ Delete User Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};