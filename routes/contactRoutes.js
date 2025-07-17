const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create Zoho transporter
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "contact@neightivglobal.com",
    pass: process.env.EMAIL_PASS || "Kalpana@neightivglobal2025",
  },
  requireTLS: true,
});

// Contact form POST endpoint
router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Compose mail
    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`, 
      to: process.env.EMAIL_USER, 
      replyTo: email, 
      subject: `📩 New Contact Message from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    console.error("❌ Error sending contact message:", error.message);
    res.status(500).json({ message: "Failed to send message. Please try again later." });
  }
});

module.exports = router;
