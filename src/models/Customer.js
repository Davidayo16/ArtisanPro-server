// backend/models/Customer.js
import mongoose from "mongoose";
import User from "./User.js";

const CustomerSchema = new mongoose.Schema({
  addresses: [
    {
      label: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home",
      },
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "Nigeria" },
      zipCode: String,
      isDefault: { type: Boolean, default: false },
    },
  ],
  savedArtisans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "artisan",
    },
  ],
  totalBookings: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer-not-to-say", ""],
    default: "",
  },
  dateOfBirth: {
    type: Date,
  },
  bio: {
    type: String,
    maxlength: [500, "Bio cannot exceed 500 characters"],
    default: "",
  },
});

// ✅ PERFORMANCE INDEX: Fast savedArtisans lookups
CustomerSchema.index({ savedArtisans: 1 });

// ✅ PERFORMANCE INDEX: Fast user lookups with savedArtisans count
CustomerSchema.index({ _id: 1, savedArtisans: 1 });

const Customer = User.discriminator("customer", CustomerSchema);

export default Customer;
