const mongoose = require("mongoose");
const { toExpireAt } = require("../utils/date");

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dateKey: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "present"
    },
    markedBy: {
      type: String,
      enum: ["student", "admin", "auto"],
      required: true
    },
    expireAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, dateKey: 1 }, { unique: true });
attendanceSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

attendanceSchema.pre("validate", function setExpire(next) {
  if (!this.expireAt && this.dateKey) {
    this.expireAt = toExpireAt(this.dateKey);
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
