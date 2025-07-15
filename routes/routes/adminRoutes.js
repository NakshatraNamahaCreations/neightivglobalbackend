const express = require("express");
const { registerAdmin, loginAdmin, updateAdmin } = require("../Controllers/adminController");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Attach decoded admin info to request
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.put("/update/:id", authMiddleware, updateAdmin);

module.exports = router;
