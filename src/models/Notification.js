import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_accepted",
        "booking_declined",
        "booking_confirmed",
        "booking_started",
        "booking_completed",
        "booking_cancelled",
        "payment_received",
        "payment_released",
        "payout_processed",
        "review_received",
        "review_response",
        "negotiation_offer",
        "negotiation_accepted",
        "message_received",
        "system_announcement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: mongoose.Schema.Types.Mixed, // Additional data (booking ID, etc.)
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    actionUrl: String, // Link to relevant page
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }); // For auto-deletion of old notifications

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
