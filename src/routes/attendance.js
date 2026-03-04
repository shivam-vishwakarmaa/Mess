const express = require("express");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const { protect, requireRole } = require("../middleware/auth");
const { normalizeDateKey, todayKey, toExpireAt } = require("../utils/date");

const router = express.Router();

router.use(protect);

router.get("/me", requireRole("student", "admin"), async (req, res) => {
  const list = await Attendance.find({ user: req.user._id })
    .sort({ dateKey: -1 })
    .limit(40);
  return res.json({ attendance: list });
});

router.get("/can-mark", requireRole("student"), async (req, res) => {
  const currentDate = todayKey();

  const [todayAttendance, approvedRequests] = await Promise.all([
    Attendance.findOne({ user: req.user._id, dateKey: currentDate }),
    LeaveRequest.find({
      user: req.user._id,
      status: "approved"
    }).sort({ dateKey: -1 })
  ]);

  const approvedWithoutAttendance = [];
  for (const request of approvedRequests) {
    const exists = await Attendance.findOne({
      user: req.user._id,
      dateKey: request.dateKey
    });
    if (!exists) {
      approvedWithoutAttendance.push(request.dateKey);
    }
  }

  return res.json({
    canMarkToday: !todayAttendance,
    todayDateKey: currentDate,
    approvedDateKeysOpen: approvedWithoutAttendance
  });
});

router.post("/mark", requireRole("student"), async (req, res) => {
  try {
    const requestedDate = req.body.dateKey ? normalizeDateKey(req.body.dateKey) : todayKey();
    const currentDate = todayKey();

    const isToday = requestedDate === currentDate;
    if (!isToday) {
      const approved = await LeaveRequest.findOne({
        user: req.user._id,
        dateKey: requestedDate,
        status: "approved"
      });
      if (!approved) {
        return res.status(400).json({
          message: "You can mark only today or an approved empty-date request"
        });
      }
    }

    const existing = await Attendance.findOne({
      user: req.user._id,
      dateKey: requestedDate
    });
    if (existing) {
      return res.status(409).json({ message: "Attendance already marked for this date" });
    }

    const attendance = await Attendance.create({
      user: req.user._id,
      dateKey: requestedDate,
      status: "present",
      markedBy: "student",
      expireAt: toExpireAt(requestedDate)
    });

    return res.status(201).json({ attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
