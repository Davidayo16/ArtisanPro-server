import User from "../../models/User.js";
import { getRedisClient } from "../../config/redis.js";
import { generateOTP, generateOTPExpiry } from "../../utils/generateOTP.js";
import { sendVerificationEmail } from "../../services/notification/emailService.js";
import { sendVerificationSMS } from "../../services/notification/smsService.js";

const redis = getRedisClient();

// @desc    Send Email OTP
// @route   POST /api/v1/auth/send-email-otp
// @access  Private
export const sendEmailOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis (expires in 10 minutes)
    await redis.set(`otp:email:${user.email}`, otp, "EX", 600);

    // Send OTP via email
    await sendVerificationEmail(user.email, otp, user.firstName);

    console.log(`📧 Email OTP for ${user.email}: ${otp}`.cyan);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// @desc    Verify Email OTP
// @route   POST /api/v1/auth/verify-email
// @access  Private
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide OTP",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    // Get OTP from Redis
    const storedOTP = await redis.get(`otp:email:${user.email}`);

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

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    // Delete OTP from Redis
    await redis.del(`otp:email:${user.email}`);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
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

// @desc    Send Phone OTP
// @route   POST /api/v1/auth/send-phone-otp
// @access  Private
export const sendPhoneOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone already verified",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis (expires in 10 minutes)
    await redis.set(`otp:phone:${user.phone}`, otp, "EX", 600);

    // Send OTP via SMS
    await sendVerificationSMS(user.phone, otp);

    console.log(`📱 Phone OTP for ${user.phone}: ${otp}`.cyan);

    res.status(200).json({
      success: true,
      message: "OTP sent to your phone",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// @desc    Verify Phone OTP
// @route   POST /api/v1/auth/verify-phone
// @access  Private
export const verifyPhone = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide OTP",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone already verified",
      });
    }

    // Get OTP from Redis
    const storedOTP = await redis.get(`otp:phone:${user.phone}`);

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

    // Mark phone as verified
    user.isPhoneVerified = true;
    await user.save();

    // Delete OTP from Redis
    await redis.del(`otp:phone:${user.phone}`);

    res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      user: {
        id: user._id,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
      },
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

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Private
export const resendOTP = async (req, res) => {
  try {
    const { type } = req.body; // 'email' or 'phone'

    if (!type || !["email", "phone"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be email or phone",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already verified
    if (type === "email" && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    if (type === "phone" && user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone already verified",
      });
    }

    // Rate limiting: Check if OTP was sent recently
    const key =
      type === "email" ? `otp:email:${user.email}` : `otp:phone:${user.phone}`;
    const existingOTP = await redis.get(key);

    if (existingOTP) {
      const ttl = await redis.ttl(key);
      if (ttl > 540) {
        // More than 9 minutes left (sent less than 1 min ago)
        return res.status(429).json({
          success: false,
          message: "Please wait before requesting another OTP",
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    await redis.set(key, otp, "EX", 600);

    // Send OTP
    if (type === "email") {
      await sendVerificationEmail(user.email, otp, user.firstName);
      console.log(`📧 Resent Email OTP: ${otp}`.cyan);
    } else {
      await sendVerificationSMS(user.phone, otp);
      console.log(`📱 Resent Phone OTP: ${otp}`.cyan);
    }

    res.status(200).json({
      success: true,
      message: `OTP resent to your ${type}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};
