const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 250,
      default: ""
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
    }
  },
  { timestamps: true }
);

passwordResetRequestSchema.index({ user: 1, status: 1 });
passwordResetRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
