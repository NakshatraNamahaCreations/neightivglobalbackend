const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "contact@neightivglobal.com",
    pass: process.env.EMAIL_PASS || "omyf ilxy vsfc laov",
  },
  requireTLS: true,
  debug: true,
  logger: true,
});

const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Contact SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("❌ Contact SMTP connection verification failed:", error.message, error.stack);
    return false;
  }
};

router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Missing required fields: name, email, or message" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    console.log("Contact Form Payload:", JSON.stringify(req.body, null, 2));

    const smtpVerified = await verifyTransporter();
    if (!smtpVerified) {
      throw new Error("SMTP connection verification failed");
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
        <h2 style="color: #333;">📩 New Contact Form Notification</h2>
        <p style="font-size: 16px;">You have received a new message via the Neightiv Global contact form.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #e0e0e0;">
            <th style="padding: 10px; text-align: left;">Sender's Email</th>
            <td style="padding: 10px; font-weight: bold; color: #007bff;">
              <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
            </td>
          </tr>
          <tr>
            <th style="padding: 10px; text-align: left;">Sender's Name</th>
            <td style="padding: 10px;">${name}</td>
          </tr>
          <tr>
            <th style="padding: 10px; text-align: left;">Message</th>
            <td style="padding: 10px;">${message}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #555;">
          To respond, please reply directly to <a href="mailto:${email}" style="color: #007bff;">${email}</a>.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Neightiv Global Contact Form" <${process.env.EMAIL_USER}>`, // Authenticated email
      to: process.env.EMAIL_USER || "contact@neightivglobal.com",
      replyTo: email, // Sender’s email for replies
      subject: `📩 Contact Form Submission from ${name} (${email})`,
      html: emailContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Contact email sent to ${mailOptions.to}: Message ID ${info.messageId}`);

    res.status(200).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("❌ Contact Email Error:", error.message, error.stack);
    res.status(500).json({ message: "Failed to send contact email", error: error.message });
  }
});

module.exports = router;