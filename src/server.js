require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const requestRoutes = require("./routes/requests");
const adminRoutes = require("./routes/admin");
const passwordResetRoutes = require("./routes/passwordReset");
const { ensureDefaultAdmin } = require("./services/bootstrapAdmin");
const { startScheduler } = require("./services/scheduler");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/password-reset", passwordResetRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

async function boot() {
  try {
    await connectDB();
    await ensureDefaultAdmin();
    startScheduler();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

boot();
