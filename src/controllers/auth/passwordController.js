import crypto from "crypto";
import User from "../../models/User.js";
import { getRedisClient } from "../../config/redis.js";
import { generateOTP } from "../../utils/generateOTP.js";
import { sendPasswordResetEmail } from "../../services/notification/emailService.js";

const redis = getRedisClient();

// @desc    Forgot Password - Send Reset OTP
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis (expires in 10 minutes)
    await redis.set(`otp:reset:${email}`, otp, "EX", 600);

    // Send reset email
    await sendPasswordResetEmail(email, otp, user.firstName);

    console.log(`🔑 Password Reset OTP for ${email}: ${otp}`.cyan);

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send reset email",
      error: error.message,
    });
  }
};

// @desc    Verify Reset OTP
// @route   POST /api/v1/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and OTP",
      });
    }

    // Get OTP from Redis
    const storedOTP = await redis.get(`otp:reset:${email}`);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    if (storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`token:reset:${resetToken}`, email, "EX", 900); // 15 mins

    // Delete OTP
    await redis.del(`otp:reset:${email}`);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
};

// @desc    Reset Password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide reset token and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Get email from reset token
    const email = await redis.get(`token:reset:${resetToken}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Find user and update password
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete reset token
    await redis.del(`token:reset:${resetToken}`);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: error.message,
    });
  }
};

// @desc    Change Password (for logged in users)
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Password change failed",
      error: error.message,
    });
  }
};
