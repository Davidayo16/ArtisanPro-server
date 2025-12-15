// utils/tokenGenerator.js
import jwt from "jsonwebtoken";
import Artisan from "../models/Artisan.js"; // ADD THIS IMPORT

// Generate JWT token
export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Send token response with cookie
export const sendTokenResponse = async (user, statusCode, res, extra = {}) => {
  const token = user.getSignedJwtToken();

  // ADD PROFILE COMPLETE CHECK FOR ARTISANS
  let profileComplete = true;
  if (user.role === "artisan") {
    try {
      const artisan = await Artisan.findById(user._id);
      if (artisan) {
        const required = {
          phone: !!artisan.phone,
          businessName: !!artisan.businessName,
          bio: !!artisan.bio,
          yearsOfExperience: artisan.yearsOfExperience !== undefined,
          serviceCategories: artisan.serviceCategories?.length > 0,
          services: artisan.services?.length > 0,
          location: !!(artisan.location?.city && artisan.location?.state),
          workingHours: !!artisan.workingHours,
          bankDetails: !!(
            artisan.bankDetails?.accountNumber &&
            artisan.bankDetails?.accountName &&
            artisan.bankDetails?.bankName
          ),
        };
        const missing = Object.values(required).filter((v) => !v).length;
        profileComplete = missing === 0;
      }
    } catch (err) {
      console.error("Profile complete check failed:", err);
      profileComplete = false;
    }
  }

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        profileComplete, // THIS IS THE NEW FIELD
      },
      ...extra,
    });
};
