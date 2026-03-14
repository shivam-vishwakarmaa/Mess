const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const { protect, requireRole } = require("../middleware/auth");
const { nowInTz, normalizeDateKey, todayKey, tomorrowKey, toExpireAt } = require("../utils/date");

const router = express.Router();

router.use(protect);

router.post("/", requireRole("student"), async (req, res) => {
  try {
    const dateKey = req.body.dateKey ? normalizeDateKey(req.body.dateKey) : todayKey();
    const message = (req.body.message || "").trim();
    const currentDate = todayKey();
    const maxDateKey = tomorrowKey(7); // allow up to 7 days in advance
    const cutoffHour = 17;
    const now = nowInTz();

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // dateKey must be today or within the next 7 days
    if (dateKey < currentDate) {
      return res.status(400).json({ message: "Cannot request leave for a past date" });
    }
    if (dateKey > maxDateKey) {
      return res.status(400).json({ message: "Request is allowed at most 7 days in advance" });
    }

    // 5 PM cutoff only applies when requesting for today
    if (dateKey === currentDate && now.hour() >= cutoffHour) {
      return res.status(400).json({ message: "Today's request window is closed after 5:00 PM" });
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
