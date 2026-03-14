const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LeaveRequest = require("../models/LeaveRequest");
const { protect } = require("../middleware/auth");
const { daysSince } = require("../utils/date");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

async function publicUser(user) {
  let approvedLeaves = 0;
  if (user.role === "student") {
    approvedLeaves = await LeaveRequest.countDocuments({
      user: user._id,
      status: "approved"
    });
  }

  const daysPassed = daysSince(user.joiningDate);
  // Formula: 30 - daysPassed + approvedLeaves
  const daysLeft = Math.max(0, 30 - daysPassed + approvedLeaves);

  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    joiningDate: user.joiningDate,
    daysLeftFor30: daysLeft
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, role, adminCode } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Name, username, email and password are required" });
    }

    const requestedRole = role === "admin" ? "admin" : "student";
    if (requestedRole === "admin") {
      const secretCode = process.env.ADMIN_REGISTRATION_CODE;
      if (!secretCode) {
        return res.status(500).json({ message: "Admin registration is not configured" });
      }
      if (!adminCode || adminCode !== secretCode) {
        return res.status(403).json({ message: "Invalid admin registration code" });
      }
    }

    const existsEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existsEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existsUsername = await User.findOne({ username: username.toLowerCase().trim() });
    if (existsUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
      role: requestedRole
    });

    const token = signToken(user._id);
    const pUser = await publicUser(user);
    return res.status(201).json({ token, user: pUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password, role } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Username/Email and password are required" });
    }

    const searchIdentifier = identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: searchIdentifier }, { username: searchIdentifier }]
    });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && role !== user.role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

    const token = signToken(user._id);
    const pUser = await publicUser(user);
    return res.json({ token, user: pUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  const pUser = await publicUser(req.user);
  return res.json({ user: pUser });
});

module.exports = router;
