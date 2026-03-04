const cron = require("node-cron");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const { APP_TZ, todayKey, toExpireAt } = require("../utils/date");

async function autoMarkForDate(dateKey) {
  const students = await User.find({ role: "student" }).select("_id");
  if (!students.length) return { created: 0 };

  const studentIds = students.map((s) => s._id);

  const existingAttendance = await Attendance.find({
    user: { $in: studentIds },
    dateKey
  }).select("user");

  const approvedRequests = await LeaveRequest.find({
    user: { $in: studentIds },
    dateKey,
    status: "approved"
  }).select("user");

  const blocked = new Set([
    ...existingAttendance.map((a) => String(a.user)),
    ...approvedRequests.map((r) => String(r.user))
  ]);

  const bulk = students
    .filter((student) => !blocked.has(String(student._id)))
    .map((student) => ({
      insertOne: {
        document: {
          user: student._id,
          dateKey,
          status: "present",
          markedBy: "auto",
          expireAt: toExpireAt(dateKey)
        }
      }
    }));

  if (!bulk.length) return { created: 0 };

  const result = await Attendance.bulkWrite(bulk, { ordered: false });
  return { created: result.insertedCount || 0 };
}

function startScheduler() {
  cron.schedule(
    "0 23 * * *",
    async () => {
      try {
        const dateKey = todayKey();
        const result = await autoMarkForDate(dateKey);
        console.log(`[AutoMark ${dateKey}] created=${result.created}`);
      } catch (error) {
        console.error("AutoMark failed", error.message);
      }
    },
    { timezone: APP_TZ }
  );
}

module.exports = { autoMarkForDate, startScheduler };
