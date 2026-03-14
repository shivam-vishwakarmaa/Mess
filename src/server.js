require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const adminRoutes = require("./routes/admin");
const passwordResetRoutes = require("./routes/passwordReset");
const { ensureDefaultAdmin } = require("./services/bootstrapAdmin");

const app = express();
const port = process.env.PORT || 5000;

// ─── Rate Limiters ───────────────────────────────────────────────────────────
/** General API limiter: 200 requests per 15 minutes per IP */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again after 15 minutes." }
});

/** Strict auth limiter: 20 requests per 15 minutes per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again after 15 minutes." }
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/requests", apiLimiter, requestRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/password-reset", apiLimiter, passwordResetRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

async function boot() {
  try {
    await connectDB();
    await ensureDefaultAdmin();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

boot();
