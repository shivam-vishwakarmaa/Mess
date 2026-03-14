const express = require("express");
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

router.get("/export/today", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).send("No token provided");

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestingUser = await User.findById(decoded.id);
    
    if (!requestingUser || requestingUser.role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const dateKey = todayKey();
    
    // Fetch all students
    const students = await User.find({ role: "student" }).sort({ name: 1 });
    
    // Calculate stats for each student
    const studentData = await Promise.all(students.map(async (student) => {
      const approvedLeaves = await LeaveRequest.countDocuments({
        user: student._id,
        status: "approved"
      });
      const daysPassed = daysSince(student.joiningDate);
      const daysLeft = Math.max(0, 30 - daysPassed + approvedLeaves);
      return {
        name: student.name,
        username: student.username || "-",
        email: student.email,
        joined: student.joiningDate ? new Date(student.joiningDate).toLocaleDateString() : "-",
        approvedLeaves,
        daysLeft
      };
    }));

    let csvContent = "Name,Username,Email,Joined Date,Total Approved Leaves,Days Left (of 30)\n";
    
    studentData.forEach(s => {
      csvContent += `"${s.name}","${s.username}","${s.email}","${s.joined}","${s.approvedLeaves}","${s.daysLeft}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${dateKey}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).send("Export failed: " + error.message);
  }
});

router.get("/users/suggest", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ users: [] });

  const users = await User.find({
    role: "student",
    $or: [
      { name: { $regex: `^${escapeRegex(q)}`, $options: "i" } },
      { username: { $regex: `^${escapeRegex(q)}`, $options: "i" } }
    ]
  })
    .sort({ name: 1 })
    .limit(10)
    .select("name email");

  return res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      email: u.email
    }))
  });
});

router.get("/attendance/search", async (req, res) => {
  const q = (req.query.name || "").trim();
  if (!q) return res.status(400).json({ message: "Query name is required" });

  const users = await User.find({
    role: "student",
    $or: [
      { name: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } }
    ]
  }).select("name username email joiningDate");

  const usersWithStats = await Promise.all(users.map(async (u) => {
    const approvedLeaves = await LeaveRequest.countDocuments({
      user: u._id,
      status: "approved"
    });
    const daysLeft = Math.max(0, 30 - daysSince(u.joiningDate) + approvedLeaves);
    return {
      id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      joiningDate: u.joiningDate,
      daysLeftFor30: daysLeft
    };
  }));

  return res.json({
    users: usersWithStats
  });
});

router.put("/users/:id/password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.role !== "student") {
      return res.status(400).json({ message: "Can only change student passwords" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
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
      LeaveRequest.deleteMany({ user: user._id }),
      PasswordResetRequest.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id })
    ]);

    return res.json({ message: "User deleted successfully" });
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



module.exports = router;
