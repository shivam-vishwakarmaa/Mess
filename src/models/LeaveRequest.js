const mongoose = require("mongoose");
const { toExpireAt } = require("../utils/date");

const leaveRequestSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    expireAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

leaveRequestSchema.index({ user: 1, dateKey: 1 }, { unique: true });
leaveRequestSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
// Performance indexes for admin dashboard queries
leaveRequestSchema.index({ status: 1, dateKey: 1 });
leaveRequestSchema.index({ dateKey: 1 });

leaveRequestSchema.pre("validate", function setExpire(next) {
  if (!this.expireAt && this.dateKey) {
    this.expireAt = toExpireAt(this.dateKey);
  }
  next();
});

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
