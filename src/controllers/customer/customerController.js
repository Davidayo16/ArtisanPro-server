// backend/controllers/customer/customerController.js
import Customer from "../../models/Customer.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import Artisan from "../../models/Artisan.js";

// ========== SIMPLE IN-MEMORY CACHE ==========
const savedArtisansCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId, params) {
  return `${userId}_${JSON.stringify(params)}`;
}

function getFromCache(key) {
  const cached = savedArtisansCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  savedArtisansCache.delete(key);
  return null;
}

function setCache(key, data) {
  savedArtisansCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  // Clean old cache entries (keep cache size manageable)
  if (savedArtisansCache.size > 100) {
    const firstKey = savedArtisansCache.keys().next().value;
    savedArtisansCache.delete(firstKey);
  }
}

/**
 * @desc    Get customer profile
 * @route   GET /api/customers/profile
 * @access  Private (Customer only)
 */
export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select("+password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const defaultAddress =
      customer.addresses?.find((addr) => addr.isDefault) ||
      customer.addresses?.[0];

    const profileData = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      profilePhoto: customer.profilePhoto,
      gender: customer.gender || "",
      dateOfBirth: customer.dateOfBirth || "",
      bio: customer.bio || "",
      address: defaultAddress?.street || "",
      city: defaultAddress?.city || "",
      state: defaultAddress?.state || "",
      country: defaultAddress?.country || "Nigeria",
      postalCode: defaultAddress?.zipCode || "",
      isEmailVerified: customer.isEmailVerified,
      isPhoneVerified: customer.isPhoneVerified,
      verified: customer.isEmailVerified && customer.isPhoneVerified,
      totalBookings: customer.totalBookings || 0,
      totalSpent: customer.totalSpent || 0,
      averageRating: customer.averageRating || 0,
      savedArtisansCount: customer.savedArtisans?.length || 0,
      memberSince: customer.createdAt,
      lastLogin: customer.lastLogin,
      notificationPreferences: customer.notificationPreferences || {
        email: true,
        sms: true,
        push: true,
      },
    };

    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update customer profile
 * @route   PUT /api/customers/profile
 * @access  Private (Customer only)
 */
export const updateCustomerProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      bio,
      address,
      city,
      state,
      country,
      postalCode,
    } = req.body;

    let customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.addresses && customer.addresses.length > 0) {
      await Customer.updateOne(
        { _id: req.user._id },
        { $unset: { "addresses.$[].coordinates": "" } }
      );

      customer = await Customer.findById(req.user._id);
    }

    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;
    if (phone) customer.phone = phone;
    if (gender !== undefined) customer.gender = gender;
    if (dateOfBirth !== undefined) customer.dateOfBirth = dateOfBirth;
    if (bio !== undefined) customer.bio = bio;

    const hasAddressData = address || city || state || postalCode;

    if (hasAddressData) {
      if (!customer.addresses || customer.addresses.length === 0) {
        customer.addresses = [];
      }

      let defaultAddress = customer.addresses.find((addr) => addr.isDefault);

      if (!defaultAddress) {
        customer.addresses.push({
          label: "home",
          street: address || "",
          city: city || "",
          state: state || "",
          country: country || "Nigeria",
          zipCode: postalCode || "",
          isDefault: true,
        });
      } else {
        if (address !== undefined) defaultAddress.street = address;
        if (city !== undefined) defaultAddress.city = city;
        if (state !== undefined) defaultAddress.state = state;
        if (country !== undefined) defaultAddress.country = country;
        if (postalCode !== undefined) defaultAddress.zipCode = postalCode;
      }

      customer.markModified("addresses");
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        gender: customer.gender,
        dateOfBirth: customer.dateOfBirth,
        bio: customer.bio,
      },
    });
  } catch (error) {
    console.error("Error updating customer profile:", error);

    if (error.code === 11000 && error.keyPattern?.phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload profile photo
 * @route   PUT /api/customers/profile/photo
 * @access  Private (Customer only)
 */
export const updateProfilePhoto = async (req, res) => {
  try {
    const { profilePhoto } = req.body;

    if (!profilePhoto) {
      return res.status(400).json({
        success: false,
        message: "Please provide a profile photo",
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.profilePhoto = profilePhoto;
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      data: { profilePhoto: customer.profilePhoto },
    });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/customers/profile/password
 * @access  Private (Customer only)
 */
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

    const customer = await Customer.findById(req.user._id).select("+password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const isMatch = await customer.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    customer.password = newPassword;
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/customers/profile/preferences
 * @access  Private (Customer only)
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, push } = req.body;

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (email !== undefined) customer.notificationPreferences.email = email;
    if (sms !== undefined) customer.notificationPreferences.sms = sms;
    if (push !== undefined) customer.notificationPreferences.push = push;

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: customer.notificationPreferences,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Deactivate account
 * @route   PUT /api/customers/profile/deactivate
 * @access  Private (Customer only)
 */
export const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your password to confirm",
      });
    }

    const customer = await Customer.findById(req.user._id).select("+password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const isMatch = await customer.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    customer.isActive = false;
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get saved artisans for logged-in customer (OPTIMIZED WITH PAGINATION)
 * @route   GET /api/customers/saved-artisans?page=1&limit=10&category=Plumber&minRating=4.5&sortBy=rating
 * @access  Private (Customer only)
 */
export const getSavedArtisans = async (req, res) => {
  try {
    // ========== PARSE QUERY PARAMS ==========
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const minRating = parseFloat(req.query.minRating);
    const maxDistance = parseFloat(req.query.maxDistance);
    const sortBy = req.query.sortBy || "date-desc";

    // ========== CHECK CACHE ==========
    const cacheKey = getCacheKey(req.user._id, {
      page,
      limit,
      category,
      minRating,
      maxDistance,
      sortBy,
    });
    const cachedData = getFromCache(cacheKey);

    if (cachedData) {
      console.log("✅ Returning cached saved artisans");
      return res.status(200).json({
        success: true,
        ...cachedData,
        fromCache: true,
      });
    }

    // ========== FETCH CUSTOMER ==========
    const customer = await Customer.findById(req.user._id)
      .select("savedArtisans addresses")
      .lean(); // ✅ Use lean() for faster queries

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.savedArtisans || customer.savedArtisans.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        hasMore: false,
        data: [],
      });
    }

    // ========== BUILD MATCH QUERY ==========
    const matchQuery = {
      _id: { $in: customer.savedArtisans },
    };

    // Filter by minimum rating
    if (minRating && !isNaN(minRating)) {
      matchQuery.averageRating = { $gte: minRating };
    }

    // ========== BUILD SORT QUERY ==========
    let sortQuery = {};
    switch (sortBy) {
      case "rating-high":
        sortQuery = { averageRating: -1, totalReviews: -1 };
        break;
      case "distance":
        sortQuery = { distance: 1 };
        break;
      case "price-low":
        sortQuery = { "services.price": 1 };
        break;
      case "most-booked":
        sortQuery = { totalJobsCompleted: -1 };
        break;
      case "date-desc":
      default:
        // Sort by order in savedArtisans array (recently saved first)
        sortQuery = { _id: -1 };
        break;
    }

    // ========== AGGREGATION PIPELINE (OPTIMIZED) ==========
    const pipeline = [
      {
        $match: matchQuery,
      },
      // Lookup service categories
      {
        $lookup: {
          from: "servicecategories",
          localField: "serviceCategories",
          foreignField: "_id",
          as: "serviceCategories",
        },
      },
      // Lookup services
      {
        $lookup: {
          from: "artisanservices",
          let: { artisanId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$artisan", "$$artisanId"] },
                    { $eq: ["$enabled", true] },
                  ],
                },
              },
            },
            {
              $limit: 3, // Only get first 3 services for performance
            },
            {
              $project: {
                name: 1,
                price: 1,
                description: 1,
              },
            },
          ],
          as: "services",
        },
      },
      // Project only needed fields (MASSIVE performance boost)
      {
        $project: {
          firstName: 1,
          lastName: 1,
          profilePhoto: 1,
          email: 1,
          phone: 1,
          bio: 1,
          averageRating: 1,
          totalReviews: 1,
          totalJobsCompleted: 1,
          totalBookingRequests: 1,
          responseTime: 1,
          yearsOfExperience: 1,
          badges: 1,
          isAvailableNow: 1,
          verification: 1,
          detailedRatings: 1,
          location: 1,
          workingHours: 1,
          serviceCategories: { name: 1 },
          services: 1,
          createdAt: 1,
        },
      },
      {
        $sort: sortQuery,
      },
    ];

    // Get total count before pagination
    const totalCountPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Artisan.aggregate(totalCountPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Apply pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute query
    const artisans = await Artisan.aggregate(pipeline);

    // ========== TRANSFORM DATA ==========
    const defaultAddress =
      customer.addresses?.find((addr) => addr.isDefault) ||
      customer.addresses?.[0];

    const transformedArtisans = artisans.map((artisan) => {
      // Calculate distance (simplified - no coordinates for now)
      let distance = "N/A";

      // Calculate response time
      const responseTime = artisan.responseTime
        ? `${Math.round(artisan.responseTime / 60)} min`
        : "N/A";

      // Get primary service
      const primaryService =
        artisan.serviceCategories?.[0]?.name || "General Service";

      // Get specialties
      const specialties =
        artisan.services?.slice(0, 3).map((s) => s.name) || [];

      // Calculate badges
      const badges = [];
      if (artisan.badges?.includes("top_rated")) badges.push("Top Rated");
      if (
        artisan.badges?.includes("verified") ||
        artisan.verification?.status === "verified"
      )
        badges.push("Verified");
      if (artisan.badges?.includes("quick_response"))
        badges.push("Quick Response");
      if (artisan.verification?.idType) badges.push("Licensed");

      // Get hourly rate
      const hourlyRate = artisan.services?.[0]?.price
        ? `₦${artisan.services[0].price.toLocaleString()}`
        : "₦3,500";

      // Determine availability
      let availability = "Busy";
      if (artisan.isAvailableNow) {
        availability = "Available Now";
      } else {
        const today = new Date().toLocaleDateString("en-US", {
          weekday: "lowercase",
        });
        const todayHours = artisan.workingHours?.[today];
        if (todayHours?.isAvailable) {
          availability = "Available Today";
        } else {
          availability = "Available Tomorrow";
        }
      }

      // Format dates
      const savedDate = artisan.createdAt
        ? new Date(artisan.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A";

      return {
        id: artisan._id,
        name: `${artisan.firstName} ${artisan.lastName}`,
        photo: artisan.profilePhoto || "default-avatar.png",
        service: primaryService,
        rating: artisan.averageRating || 0,
        reviews: artisan.totalReviews || 0,
        jobsCompleted: artisan.totalJobsCompleted || 0,
        distance,
        responseTime,
        savedDate,
        availability,
        badges,
        hourlyRate,
        specialties:
          specialties.length > 0
            ? specialties
            : ["General Service", "Repairs", "Installation"],
        phone: artisan.phone || "N/A",
        email: artisan.email || "N/A",
        yearsExperience: artisan.yearsOfExperience || 0,
        completionRate: Math.round(
          (artisan.totalJobsCompleted / (artisan.totalBookingRequests || 1)) *
            100
        ),
        lastBooked: "Never",
        totalBooked: 0,
        detailedRatings: artisan.detailedRatings || {
          quality: 0,
          professionalism: 0,
          timeliness: 0,
          communication: 0,
          value: 0,
        },
        bio: artisan.bio || "",
        location: artisan.location || {},
      };
    });

    // ========== CALCULATE PAGINATION ==========
    const pages = Math.ceil(total / limit);
    const hasMore = page < pages;

    // ========== RESPONSE DATA ==========
    const responseData = {
      success: true,
      count: transformedArtisans.length,
      total,
      page,
      pages,
      hasMore,
      data: transformedArtisans,
    };

    // ========== CACHE RESPONSE ==========
    setCache(cacheKey, responseData);

    console.log(
      `✅ Saved artisans loaded: page ${page}/${pages}, ${transformedArtisans.length} items`
    );

    res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Error fetching saved artisans:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Add artisan to saved list
 * @route   POST /api/customers/saved-artisans/:artisanId
 * @access  Private (Customer only)
 */
export const addSavedArtisan = async (req, res) => {
  try {
    const { artisanId } = req.params;

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (customer.savedArtisans.includes(artisanId)) {
      return res.status(400).json({
        success: false,
        message: "Artisan already in saved list",
      });
    }

    customer.savedArtisans.push(artisanId);
    await customer.save();

    // ✅ CLEAR CACHE for this user
    const keys = Array.from(savedArtisansCache.keys());
    keys.forEach((key) => {
      if (key.startsWith(req.user._id)) {
        savedArtisansCache.delete(key);
      }
    });

    res.status(200).json({
      success: true,
      message: "Artisan added to saved list",
      data: customer.savedArtisans,
    });
  } catch (error) {
    console.error("Error adding saved artisan:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Remove artisan from saved list
 * @route   DELETE /api/customers/saved-artisans/:artisanId
 * @access  Private (Customer only)
 */
export const removeSavedArtisan = async (req, res) => {
  try {
    const { artisanId } = req.params;

    const customer = await Customer.findById(req.user._id);

    if (!customer.savedArtisans.includes(artisanId)) {
      return res.status(400).json({
        success: false,
        message: "Artisan not in saved list",
      });
    }

    customer.savedArtisans = customer.savedArtisans.filter(
      (id) => id.toString() !== artisanId
    );
    await customer.save();

    // ✅ CLEAR CACHE for this user
    const keys = Array.from(savedArtisansCache.keys());
    keys.forEach((key) => {
      if (key.startsWith(req.user._id)) {
        savedArtisansCache.delete(key);
      }
    });

    res.status(200).json({
      success: true,
      message: "Artisan removed from saved list",
      data: customer.savedArtisans,
    });
  } catch (error) {
    console.error("Error removing saved artisan:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
