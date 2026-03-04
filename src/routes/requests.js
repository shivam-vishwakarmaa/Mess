const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const { protect, requireRole } = require("../middleware/auth");
const { normalizeDateKey, todayKey, toExpireAt } = require("../utils/date");

const router = express.Router();

router.use(protect);

router.post("/", requireRole("student"), async (req, res) => {
  try {
    const dateKey = req.body.dateKey ? normalizeDateKey(req.body.dateKey) : todayKey();
    const message = (req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const existing = await LeaveRequest.findOne({ user: req.user._id, dateKey });
    if (existing) {
      return res.status(409).json({ message: "Request already exists for this date" });
    }

    const request = await LeaveRequest.create({
      user: req.user._id,
      dateKey,
      message,
      expireAt: toExpireAt(dateKey)
    });

    return res.status(201).json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/me", requireRole("student"), async (req, res) => {
  const requests = await LeaveRequest.find({ user: req.user._id }).sort({ dateKey: -1 }).limit(40);
  return res.json({ requests });
});

module.exports = router;
