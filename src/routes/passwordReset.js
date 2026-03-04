const express = require("express");
const User = require("../models/User");
const PasswordResetRequest = require("../models/PasswordResetRequest");

const router = express.Router();

router.post("/request", async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const message = (req.body.message || "").trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If account exists, reset request has been submitted" });
    }

    const pending = await PasswordResetRequest.findOne({
      user: user._id,
      status: "pending"
    });
    if (pending) {
      return res.status(409).json({ message: "You already have a pending reset request" });
    }

    await PasswordResetRequest.create({
      user: user._id,
      email,
      message
    });

    return res.json({ message: "Password reset request sent to admin" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
