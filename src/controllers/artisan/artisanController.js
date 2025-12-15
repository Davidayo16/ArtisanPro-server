import mongoose from "mongoose";
import Artisan from "../../models/Artisan.js";
import Service from "../../models/Service.js";
import ServiceCategory from "../../models/ServiceCategory.js";
import User from "../../models/User.js";
import Certification from "../../models/Certification.js"; // ADD THIS LINE
import ArtisanService from "../../models/ArtisanService.js";
import { updateProfileCompleteStatus } from "../../utils/artisanHelpers.js";

import { calculateDistance } from "../../utils/geoUtils.js"; // if you have it

// @desc    Get artisan profile (own profile)
// @route   GET /api/v1/artisans/me
// @access  Private/Artisan
export const getMyProfile = async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.user.id)
      .populate("serviceCategories", "name slug icon")
      .populate({
        path: "services", // ✅ Virtual populate from ArtisanService
        populate: {
          path: "service",
          select: "name slug pricingModel icon",
        },
        match: { enabled: true }, // Only show enabled services
      })
      .populate("certifications")
      .populate("portfolio");

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: artisan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};
// @desc    Update basic info (Step 1: Basic Info)
// @route   PUT /api/v1/artisans/me/basic-info
// @access  Private/Artisan


// @desc    Update services (Step 2: Services)
// @route   PUT /api/v1/artisans/me/services
// @access  Private/Artisan
// @desc    Update artisan services (Step 2 in Profile Wizard)
// @route   PUT /api/v1/artisans/me/services
// @access  Private (Artisan only)


// ✅ UPDATE: Add this to updateBasicInfo
export const updateBasicInfo = async (req, res) => {
  try {
    const { businessName, bio, yearsOfExperience, phone, location } = req.body;

    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    // Update fields
    if (phone !== undefined) {
      if (!phone || !/^[0-9]{10,15}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number (10-15 digits)",
        });
      }

      const existingPhone = await User.findOne({
        phone,
        _id: { $ne: req.user.id },
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already in use",
        });
      }

      artisan.phone = phone;
    }
    if (businessName) artisan.businessName = businessName;
    if (bio) artisan.bio = bio;
    if (yearsOfExperience !== undefined)
      artisan.yearsOfExperience = yearsOfExperience;

    if (location) {
      if (!artisan.location) artisan.location = {};
      if (location.street) artisan.location.street = location.street;
      if (location.city) artisan.location.city = location.city;
      if (location.state) artisan.location.state = location.state;
      if (location.country) artisan.location.country = location.country;

      if (location.coordinates && Array.isArray(location.coordinates)) {
        if (!artisan.location.coordinates) {
          artisan.location.coordinates = { type: "Point", coordinates: [0, 0] };
        }
        artisan.location.coordinates.coordinates = location.coordinates;
      }
    }

    await artisan.save();

    // ✅ CHECK AND UPDATE PROFILE COMPLETION STATUS
    await updateProfileCompleteStatus(req.user.id);

    res.status(200).json({
      success: true,
      message: "Basic info updated successfully",
      data: artisan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update basic info",
      error: error.message,
    });
  }
};

// ✅ UPDATE: Add this to updateServices
export const updateServices = async (req, res) => {
  try {
    const { serviceIds, categoryIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one service",
      });
    }

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid categories found for selected services",
      });
    }

    const artisanId = req.user.id;

    await ArtisanService.deleteMany({ artisan: artisanId });

    const artisanServices = serviceIds.map((serviceId) => ({
      artisan: artisanId,
      service: serviceId,
      enabled: true,
      customPricingConfig: null,
      customUniversalFeatures: [],
      customModifiers: [],
    }));

    await ArtisanService.insertMany(artisanServices);

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    artisan.serviceCategories = categoryIds;
    await artisan.save();

    // ✅ CHECK AND UPDATE PROFILE COMPLETION STATUS
    await updateProfileCompleteStatus(artisanId);

    res.status(200).json({
      success: true,
      message: "Services updated successfully",
      data: {
        serviceIds,
        categoryIds,
        totalServices: serviceIds.length,
      },
    });
  } catch (error) {
    console.error("updateServices error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ✅ UPDATE: Add this to updateWorkingHours
export const updateWorkingHours = async (req, res) => {
  try {
    const { workingHours, serviceRadius } = req.body;

    if (!workingHours) {
      return res.status(400).json({
        success: false,
        message: "Please provide working hours",
      });
    }

    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    const daysOfWeek = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    for (const day of daysOfWeek) {
      if (workingHours[day]) {
        const { start, end, isAvailable } = workingHours[day];

        if (isAvailable && (!start || !end)) {
          return res.status(400).json({
            success: false,
            message: `Please provide start and end time for ${day}`,
          });
        }
      }
    }

    artisan.workingHours = workingHours;

    if (serviceRadius !== undefined) {
      artisan.serviceRadius = serviceRadius;
    }

    await artisan.save();

    // ✅ CHECK AND UPDATE PROFILE COMPLETION STATUS
    await updateProfileCompleteStatus(req.user.id);

    res.status(200).json({
      success: true,
      message: "Working hours updated successfully",
      data: {
        workingHours: artisan.workingHours,
        serviceRadius: artisan.serviceRadius,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update working hours",
      error: error.message,
    });
  }
};

// ✅ UPDATE: Add this to updateBankDetails
// backend/controllers/artisan/artisanController.js
// ONLY UPDATE THIS FUNCTION

export const updateBankDetails = async (req, res) => {
  try {
    const { accountName, accountNumber, bankName, bankCode } = req.body;

    if (!accountName || !accountNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: "Please provide account name, number, and bank name",
      });
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: "Account number must be 10 digits",
      });
    }

    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    artisan.bankDetails = {
      accountName,
      accountNumber,
      bankName,
      bankCode,
    };

    // 🔥 NEW: Set hasCompletedInitialSetup to true when wizard is done
    if (!artisan.hasCompletedInitialSetup) {
      artisan.hasCompletedInitialSetup = true;
      console.log("✅ hasCompletedInitialSetup set to TRUE");
    }

    await artisan.save();

    // Update profile status
    const status = await updateProfileCompleteStatus(req.user.id);

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      profileComplete: status.profileComplete,
      canReceiveJobs: status.canReceiveJobs,
      hasCompletedInitialSetup: true, // 🔥 NEW
      data: {
        bankDetails: artisan.bankDetails,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update bank details",
      error: error.message,
    });
  }
};

// ✅ UPDATE: Add this to removeServiceFromArtisan
export const removeServiceFromArtisan = async (req, res) => {
  try {
    const { id } = req.params;

    const artisanService = await ArtisanService.findById(id);

    if (!artisanService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (artisanService.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this service",
      });
    }

    await artisanService.deleteOne();

    const serviceDoc = await Service.findById(artisanService.service);
    const remainingServicesInCategory = await ArtisanService.countDocuments({
      artisan: req.user.id,
      service: {
        $in: await Service.find({ category: serviceDoc.category }).distinct(
          "_id"
        ),
      },
    });

    if (remainingServicesInCategory === 0) {
      await Artisan.findByIdAndUpdate(req.user.id, {
        $pull: { serviceCategories: serviceDoc.category },
      });
    }

    // ✅ CHECK AND UPDATE PROFILE COMPLETION STATUS (might become incomplete if no services left)
    await updateProfileCompleteStatus(req.user.id);

    res.status(200).json({
      success: true,
      message: "Service removed successfully",
    });
  } catch (error) {
    console.error("removeServiceFromArtisan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove service",
      error: error.message,
    });
  }
};

// @desc    Update verification details (Step 5: Verification)
// @route   PUT /api/v1/artisans/me/verification
// @access  Private/Artisan
export const updateVerification = async (req, res) => {
  try {
    const { idType, idNumber } = req.body;

    if (!idType || !idNumber) {
      return res.status(400).json({
        success: false,
        message: "Please provide ID type and number",
      });
    }

    const validIdTypes = [
      "nin",
      "drivers_license",
      "voters_card",
      "international_passport",
    ];

    if (!validIdTypes.includes(idType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID type",
      });
    }

    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    if (!artisan.verification) {
      artisan.verification = {};
    }

    artisan.verification.idType = idType;
    artisan.verification.idNumber = idNumber;
    artisan.verification.status = "pending";

    await artisan.save();

    res.status(200).json({
      success: true,
      message: "Verification details submitted. Awaiting admin approval.",
      data: {
        verification: artisan.verification,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update verification",
      error: error.message,
    });
  }
};

// @desc    Toggle availability status
// @route   PUT /api/v1/artisans/me/availability
// @access  Private/Artisan
export const toggleAvailability = async (req, res) => {
  try {
    const { isAvailableNow } = req.body;

    if (isAvailableNow === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide availability status",
      });
    }

    const artisan = await Artisan.findById(req.user.id);

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found",
      });
    }

    artisan.isAvailableNow = isAvailableNow;
    await artisan.save();

    res.status(200).json({
      success: true,
      message: `You are now ${
        isAvailableNow ? "available" : "unavailable"
      } for jobs`,
      data: {
        isAvailableNow: artisan.isAvailableNow,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update availability",
      error: error.message,
    });
  }
};

// @desc    Get public artisan profile (for customers)
// @route   GET /api/v1/artisans/:id
// @access  Public


// @desc    Get single artisan profile by ID (public)
// @route   GET /api/v1/artisans/:id
// @access  Public
// GET /api/artisans/:id (Public)
// GET /api/artisans/:id (Public)
export const getArtisanProfile = async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.params.id)
      .select("-password")
      .populate("serviceCategories", "name _id icon description")
      .populate("portfolio") // ✅ ADD THIS LINE
      .populate({
        path: "services",
        match: { enabled: true },
        populate: {
          path: "service",
          select: "name slug pricingModel pricingConfig icon category",
          populate: {
            path: "category",
            select: "_id name icon",
          },
        },
      })
      .lean();

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    // Transform services
    if (artisan.services && artisan.services.length > 0) {
      artisan.services = artisan.services.map((as) => ({
        _id: as.service?._id,
        name: as.service?.name,
        slug: as.service?.slug,
        pricingModel: as.service?.pricingModel,
        pricingConfig: as.service?.pricingConfig,
        icon: as.service?.icon,
        category: as.service?.category?._id,
        categoryName: as.service?.category?.name,
        customPricingConfig: as.customPricingConfig,
        customUniversalFeatures: as.customUniversalFeatures,
        customModifiers: as.customModifiers,
        enabled: as.enabled,
      }));
    }

    res.json(artisan);
  } catch (error) {
    console.error("Error in getArtisanProfile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// @desc    Get all artisans (with filters)
// @route   GET /api/v1/artisans
// @access  Public
// @desc    Get all artisans (with filters)
// @route   GET /api/v1/artisans
// @access  Public
// @desc    Get all artisans (with filters)
// @route   GET /api/v1/artisans
// @access  Public
// @desc    Get all artisans (with filters)
// @route   GET /api/v1/artisans
// @access  Public
// @desc    Get artisans with filters, search, and geolocation
// @route   GET /api/v1/artisans
// @access  Public
// ============================================
// backend/controllers/artisan/artisanController.js
// Update the getArtisans function
// ============================================

export const getArtisans = async (req, res) => {
  try {
    const {
      service,
      category,
      minRating,
      available,
      verified,
      page = 1,
      limit = 20,
      latitude,
      longitude,
      radius = 10,
      search,
    } = req.query;

    // ✅ ADD profileComplete: true filter
    const filter = { 
      isActive: true,
      profileComplete: true, // ✅ ONLY show artisans with complete profiles
    };

    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
      ];
    }

    if (service) {
      const artisanIds = await ArtisanService.find({
        service: new mongoose.Types.ObjectId(service),
        enabled: true,
      }).distinct("artisan");

      if (artisanIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          page: 1,
          pages: 0,
          data: [],
        });
      }

      filter._id = { $in: artisanIds };
    }

    if (category) {
      filter.serviceCategories = {
        $in: [new mongoose.Types.ObjectId(category)],
      };
    }

    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    if (available === "true") {
      filter.isAvailableNow = true;
    }

    if (verified === "true") {
      filter["verification.status"] = "verified";
    }

    const skip = (page - 1) * limit;

    let artisans;
    let total;

    if (latitude && longitude) {
      // GEOLOCATION SEARCH
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            distanceField: "distance",
            maxDistance: parseFloat(radius) * 1000,
            spherical: true,
            key: "location.coordinates",
            query: filter, // ✅ This now includes profileComplete: true
          },
        },
        {
          $lookup: {
            from: "servicecategories",
            localField: "serviceCategories",
            foreignField: "_id",
            as: "serviceCategories",
          },
        },
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
                $lookup: {
                  from: "services",
                  localField: "service",
                  foreignField: "_id",
                  as: "serviceDetails",
                },
              },
              {
                $unwind: {
                  path: "$serviceDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "servicecategories",
                  localField: "serviceDetails.category",
                  foreignField: "_id",
                  as: "categoryDetails",
                },
              },
              {
                $unwind: {
                  path: "$categoryDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: "$serviceDetails._id",
                  name: "$serviceDetails.name",
                  slug: "$serviceDetails.slug",
                  pricingModel: "$serviceDetails.pricingModel",
                  pricingConfig: "$serviceDetails.pricingConfig",
                  icon: "$serviceDetails.icon",
                  category: "$categoryDetails._id",
                  categoryName: "$categoryDetails.name",
                  customPricingConfig: "$customPricingConfig",
                  customUniversalFeatures: "$customUniversalFeatures",
                  customModifiers: "$customModifiers",
                  enabled: "$enabled",
                },
              },
            ],
            as: "services",
          },
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            profilePhoto: 1,
            businessName: 1,
            bio: 1,
            yearsOfExperience: 1,
            serviceCategories: {
              _id: 1,
              name: 1,
              slug: 1,
              icon: 1,
            },
            services: 1,
            location: 1,
            averageRating: 1,
            totalReviews: 1,
            totalJobsCompleted: 1,
            badges: 1,
            isAvailableNow: 1,
            distance: 1,
            serviceRadius: 1,
          },
        },
        { $skip: skip },
        { $limit: Number(limit) },
      ];

      artisans = await Artisan.aggregate(pipeline);

      const countPipeline = [
        { $geoNear: { ...pipeline[0].$geoNear, query: filter } },
        { $count: "total" },
      ];

      const countResult = await Artisan.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } else {
      // REGULAR SEARCH (no location)
      artisans = await Artisan.find(filter) // ✅ This now includes profileComplete: true
        .populate("serviceCategories", "name slug icon")
        .select(
          "firstName lastName profilePhoto businessName bio yearsOfExperience serviceCategories location averageRating totalReviews totalJobsCompleted badges isAvailableNow serviceRadius"
        )
        .sort({ averageRating: -1, totalJobsCompleted: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      if (artisans.length > 0) {
        const artisanIds = artisans.map((a) => a._id);
        const artisanServices = await ArtisanService.find({
          artisan: { $in: artisanIds },
          enabled: true,
        })
          .populate({
            path: "service",
            select: "name slug pricingModel pricingConfig icon category",
            populate: {
              path: "category",
              select: "_id name slug icon",
            },
          })
          .lean();

        artisans = artisans.map((artisan) => {
          const services = artisanServices
            .filter((as) => as.artisan.toString() === artisan._id.toString())
            .map((as) => ({
              _id: as.service._id,
              name: as.service.name,
              slug: as.service.slug,
              pricingModel: as.service.pricingModel,
              pricingConfig: as.service.pricingConfig,
              icon: as.service.icon,
              category: as.service.category?._id,
              categoryName: as.service.category?.name,
              customPricingConfig: as.customPricingConfig,
              customUniversalFeatures: as.customUniversalFeatures,
              customModifiers: as.customModifiers,
              enabled: as.enabled,
            }));
          return { ...artisan, services };
        });
      }

      total = await Artisan.countDocuments(filter); // ✅ This now includes profileComplete: true
    }

    res.status(200).json({
      success: true,
      count: artisans.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: artisans,
    });
  } catch (error) {
    console.error("getArtisans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch artisans",
      error: error.message,
    });
  }
};

// @desc    Get artisan's services (from ArtisanService junction)
// @route   GET /api/v1/artisans/me/services
// @access  Private/Artisan
export const getMyServices = async (req, res) => {
  try {
    const artisanServices = await ArtisanService.find({
      artisan: req.user.id,
    })
      .populate({
        path: "service",
        select: "name slug description pricingModel pricingConfig icon category",
        populate: {
          path: "category",
          select: "name slug icon",
        },
      })
      .sort({ createdAt: -1 });

    // Transform data for frontend
    const services = artisanServices.map((as) => ({
      _id: as._id, // ArtisanService ID (for updates/deletes)
      serviceId: as.service._id, // Actual Service ID
      name: as.service.name,
      slug: as.service.slug,
      description: as.service.description,
      pricingModel: as.service.pricingModel,
      pricingConfig: as.service.pricingConfig,
      icon: as.service.icon,
      category: {
        _id: as.service.category._id,
        name: as.service.category.name,
        slug: as.service.category.slug,
        icon: as.service.category.icon,
      },
      enabled: as.enabled,
      customPricingConfig: as.customPricingConfig,
      customDescription: as.customDescription,
      specialNotes: as.specialNotes,
      totalBookings: as.totalBookings,
      totalRevenue: as.totalRevenue,
      averageRating: as.averageRating,
      createdAt: as.createdAt,
      updatedAt: as.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("getMyServices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

// @desc    Add service to artisan
// @route   POST /api/v1/artisans/me/services
// @access  Private/Artisan
export const addServiceToArtisan = async (req, res) => {
  try {
    const {
      serviceId,
      enabled = true,
      customPricingConfig,
      customDescription,
      specialNotes,
    } = req.body;

    // Validate service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if artisan already has this service
    const existingService = await ArtisanService.findOne({
      artisan: req.user.id,
      service: serviceId,
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "You already offer this service",
      });
    }

    // Create ArtisanService entry
    const artisanService = await ArtisanService.create({
      artisan: req.user.id,
      service: serviceId,
      enabled,
      customPricingConfig,
      customDescription,
      specialNotes,
    });

    // Update artisan's serviceCategories if not already included
    const artisan = await Artisan.findById(req.user.id);
    if (!artisan.serviceCategories.includes(service.category)) {
      artisan.serviceCategories.push(service.category);
      await artisan.save();
    }

    // Populate and return
    await artisanService.populate([
      {
        path: "service",
        select: "name slug description pricingModel pricingConfig icon category",
        populate: {
          path: "category",
          select: "name slug icon",
        },
      },
    ]);

    res.status(201).json({
      success: true,
      message: "Service added successfully",
      data: {
        _id: artisanService._id,
        serviceId: artisanService.service._id,
        name: artisanService.service.name,
        slug: artisanService.service.slug,
        description: artisanService.service.description,
        pricingModel: artisanService.service.pricingModel,
        pricingConfig: artisanService.service.pricingConfig,
        icon: artisanService.service.icon,
        category: {
          _id: artisanService.service.category._id,
          name: artisanService.service.category.name,
          slug: artisanService.service.category.slug,
          icon: artisanService.service.category.icon,
        },
        enabled: artisanService.enabled,
        customPricingConfig: artisanService.customPricingConfig,
        customDescription: artisanService.customDescription,
        specialNotes: artisanService.specialNotes,
        totalBookings: artisanService.totalBookings,
        totalRevenue: artisanService.totalRevenue,
        averageRating: artisanService.averageRating,
        createdAt: artisanService.createdAt,
        updatedAt: artisanService.updatedAt,
      },
    });
  } catch (error) {
    console.error("addServiceToArtisan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add service",
      error: error.message,
    });
  }
};

// @desc    Update artisan's service
// @route   PUT /api/v1/artisans/me/services/:id
// @access  Private/Artisan
export const updateArtisanService = async (req, res) => {
  try {
    const { id } = req.params;
    const { customPricingConfig, customDescription, specialNotes } = req.body;

    // Find ArtisanService
    let artisanService = await ArtisanService.findById(id);

    if (!artisanService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check ownership
    if (artisanService.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this service",
      });
    }

    // Update fields
    if (customPricingConfig !== undefined) {
      artisanService.customPricingConfig = customPricingConfig;
    }
    if (customDescription !== undefined) {
      artisanService.customDescription = customDescription;
    }
    if (specialNotes !== undefined) {
      artisanService.specialNotes = specialNotes;
    }

    await artisanService.save();

    // Populate and return
    await artisanService.populate([
      {
        path: "service",
        select: "name slug description pricingModel pricingConfig icon category",
        populate: {
          path: "category",
          select: "name slug icon",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: {
        _id: artisanService._id,
        serviceId: artisanService.service._id,
        name: artisanService.service.name,
        slug: artisanService.service.slug,
        description: artisanService.service.description,
        pricingModel: artisanService.service.pricingModel,
        pricingConfig: artisanService.service.pricingConfig,
        icon: artisanService.service.icon,
        category: {
          _id: artisanService.service.category._id,
          name: artisanService.service.category.name,
          slug: artisanService.service.category.slug,
          icon: artisanService.service.category.icon,
        },
        enabled: artisanService.enabled,
        customPricingConfig: artisanService.customPricingConfig,
        customDescription: artisanService.customDescription,
        specialNotes: artisanService.specialNotes,
        totalBookings: artisanService.totalBookings,
        totalRevenue: artisanService.totalRevenue,
        averageRating: artisanService.averageRating,
        createdAt: artisanService.createdAt,
        updatedAt: artisanService.updatedAt,
      },
    });
  } catch (error) {
    console.error("updateArtisanService error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

// @desc    Remove service from artisan
// @route   DELETE /api/v1/artisans/me/services/:id
// @access  Private/Artisan


// @desc    Toggle service enabled status
// @route   PUT /api/v1/artisans/me/services/:id/toggle
// @access  Private/Artisan
export const toggleArtisanService = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide enabled status",
      });
    }

    // Find ArtisanService
    const artisanService = await ArtisanService.findById(id);

    if (!artisanService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check ownership
    if (artisanService.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this service",
      });
    }

    artisanService.enabled = enabled;
    await artisanService.save();
    await updateProfileCompleteStatus(req.user.id);

    res.status(200).json({
      success: true,
      message: `Service ${enabled ? "enabled" : "disabled"} successfully`,
      data: {
        _id: artisanService._id,
        enabled: artisanService.enabled,
      },
    });
  } catch (error) {
    console.error("toggleArtisanService error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle service",
      error: error.message,
    });
  }
};