const express = require("express");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const PasswordResetRequest = require("../models/PasswordResetRequest");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/auth");
const { daysSince, normalizeDateKey, toExpireAt } = require("../utils/date");

const router = express.Router();

router.use(protect, requireRole("admin"));

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/users/suggest", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ users: [] });

  const users = await User.find({
    role: "student",
    name: { $regex: `^${escapeRegex(q)}`, $options: "i" }
  })
    .sort({ name: 1 })
    .limit(10)
    .select("name email");

  return res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email
    }))
  });
});

router.get("/attendance/search", async (req, res) => {
  const q = (req.query.name || "").trim();
  if (!q) return res.status(400).json({ message: "Query name is required" });

  const users = await User.find({
    role: "student",
    name: { $regex: q, $options: "i" }
  }).select("name email joiningDate");

  const userIds = users.map((u) => u._id);
  const attendance = await Attendance.find({ user: { $in: userIds } })
    .sort({ dateKey: -1 })
    .limit(500)
    .populate("user", "name email joiningDate");

  return res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      joiningDate: u.joiningDate,
      daysLeftFor30: Math.max(0, 30 - daysSince(u.joiningDate))
    })),
    attendance
  });
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "student") {
      return res.status(400).json({ message: "Only student accounts can be deleted" });
    }

    await Promise.all([
      Attendance.deleteMany({ user: user._id }),
      LeaveRequest.deleteMany({ user: user._id }),
      PasswordResetRequest.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id })
    ]);

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/attendance/:id", async (req, res) => {
  const { status, dateKey } = req.body;
  const updates = {};

  if (status) {
    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({ message: "Status must be present or absent" });
    }
    updates.status = status;
  }

  if (dateKey) {
    const normalized = normalizeDateKey(dateKey);
    updates.dateKey = normalized;
    updates.expireAt = toExpireAt(normalized);
  }

  updates.markedBy = "admin";

  try {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ message: "Attendance not found" });
    return res.json({ attendance: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/requests", async (req, res) => {
  const status = req.query.status || "pending";
  const requests = await LeaveRequest.find({ status })
    .sort({ createdAt: -1 })
    .populate("user", "name email joiningDate");
  return res.json({ requests });
});

router.get("/password-resets", async (_req, res) => {
  const requests = await PasswordResetRequest.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .populate("user", "name email role");
  return res.json({ requests });
});

router.patch("/password-resets/:id", async (req, res) => {
  try {
    const action = req.body.action;
    const newPassword = (req.body.newPassword || "").trim();

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }

    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }

    if (action === "approve") {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      const user = await User.findById(request.user);
      if (!user) return res.status(404).json({ message: "User not found" });
      user.password = newPassword;
      await user.save();
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/requests/:id", async (req, res) => {
  const action = req.body.action;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Action must be approve or reject" });
  }

  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "Request already reviewed" });
  }

  request.status = action === "approve" ? "approved" : "rejected";
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();

  return res.json({ request });
});

router.post("/attendance", async (req, res) => {
  try {
    const { userId, dateKey, status } = req.body;
    if (!userId || !dateKey || !status) {
      return res.status(400).json({ message: "userId, dateKey and status are required" });
    }
    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const normalized = normalizeDateKey(dateKey);
    const attendance = await Attendance.findOneAndUpdate(
      { user: userId, dateKey: normalized },
      {
        user: userId,
        dateKey: normalized,
        status,
        markedBy: "admin",
        expireAt: toExpireAt(normalized)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
