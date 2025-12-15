import User from "../../models/User.js";
import Customer from "../../models/Customer.js";
import Artisan from "../../models/Artisan.js";
import { sendTokenResponse } from "../../utils/tokenGenerator.js";
import { generateOTP, generateOTPExpiry } from "../../utils/generateOTP.js";
import { sendVerificationEmail } from "../../services/notification/emailService.js";
import { sendVerificationSMS } from "../../services/notification/smsService.js";
import { getRedisClient } from "../../config/redis.js";
const redis = getRedisClient();

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Enforce phone if password exists (traditional signup)
    if (password && !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone number",
      });
    }

    // Validate role
    if (!["customer", "artisan"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be customer or artisan",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user already exists
    let existingUser = await User.findOne({ email: normalizedEmail });

    // 2. USER EXISTS BUT NOT VERIFIED → RESEND OTP + SAVE TO REDIS
    if (existingUser && !existingUser.isEmailVerified) {
      const emailOTP = generateOTP();
      const phoneOTP = generateOTP();

      await redis.set(`otp:email:${normalizedEmail}`, emailOTP, "EX", 120);
      if (existingUser.phone) {
        await redis.set(`otp:phone:${existingUser.phone}`, phoneOTP, "EX", 120);
      }

      try {
        await sendVerificationEmail(
          normalizedEmail,
          emailOTP,
          existingUser.firstName
        );
        console.log(
          `RESEND Email OTP → ${normalizedEmail}: ${emailOTP}`.yellow
        );
      } catch (err) {
        console.error("Failed to resend email:", err);
      }

      try {
        if (existingUser.phone) {
          await sendVerificationSMS(existingUser.phone, phoneOTP);
          console.log(
            `RESEND SMS OTP → ${existingUser.phone}: ${phoneOTP}`.yellow
          );
        }
      } catch (err) {
        console.error("Failed to resend SMS:", err);
      }

      return sendTokenResponse(existingUser, 200, res, {
        message: "We found your account! New verification code sent.",
        redirectTo: "/verify-email",
      });
    }

    // 3. USER EXISTS AND VERIFIED → BLOCK
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please log in.",
      });
    }

    // 4. CHECK PHONE UNIQUENESS
    if (phone) {
      const phoneUser = await User.findOne({ phone });
      if (phoneUser) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use",
        });
      }
    }

    // 5. CREATE NEW USER
    let user;

    // ✅ CHANGED: Only include phone if it exists
    const userDataBase = {
      firstName,
      lastName,
      email: normalizedEmail,
      password,
    };

    const userData = phone ? { ...userDataBase, phone } : userDataBase;

    if (role === "customer") {
      user = await Customer.create({
        ...userData,
        role: "customer",
      });
    } else if (role === "artisan") {
      user = await Artisan.create({
        ...userData,
        role: "artisan",
        location: {
          country: "Nigeria",
          coordinates: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
      });
    }

    // 6. GENERATE OTPs AND SAVE TO REDIS
    const emailOTP = generateOTP();
    const phoneOTP = generateOTP();

    await redis.set(`otp:email:${normalizedEmail}`, emailOTP, "EX", 600);
    if (phone) {
      await redis.set(`otp:phone:${phone}`, phoneOTP, "EX", 600);
    }

    // 7. SEND OTPs
    try {
      await sendVerificationEmail(normalizedEmail, emailOTP, firstName);
      console.log(`Email OTP sent to ${normalizedEmail}: ${emailOTP}`.cyan);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    try {
      if (phone) {
        await sendVerificationSMS(phone, phoneOTP);
        console.log(`Phone OTP sent to ${phone}: ${phoneOTP}`.cyan);
      }
    } catch (error) {
      console.error("Failed to send verification SMS:", error);
    }

    // 8. Send token + success
    sendTokenResponse(user, 201, res, {
      message: "Registration successful! Check your email & phone for OTP.",
      redirectTo: "/verify-email",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const googleAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=authentication_failed`
      );
    }

    const token = req.user.getSignedJwtToken();

    req.user.lastLogin = Date.now();
    await req.user.save();

    let profileComplete = true;
    if (req.user.role === "artisan") {
      const artisan = await Artisan.findById(req.user._id);
      profileComplete = !!(
        artisan.phone &&
        artisan.businessName &&
        artisan.bio &&
        artisan.services?.length > 0 &&
        artisan.bankDetails?.accountNumber
      );
    }

    const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${token}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ Google auth success handler error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};

export const googleAuthFailure = (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
};
