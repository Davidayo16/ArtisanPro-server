import Service from "../../models/Service.js";
import ServiceCategory from "../../models/ServiceCategory.js";

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
export const getServices = async (req, res) => {
  try {
    const {
      category,
      pricingType,
      minPrice,
      maxPrice,
      popular,
      search,
      page = 1,
      limit = 20,
      active,     // ← Accept
      isActive,   // ← Accept legacy
    } = req.query;

    // Build filter
    const filter = {};

    // Handle active/isActive
    const isActiveValue = active ?? isActive;
    if (isActiveValue !== undefined) {
      filter.isActive = isActiveValue === "true";
    } else {
      filter.isActive = true; // default
    }

    if (category) filter.category = category;
    if (pricingType) filter.pricingType = pricingType;
    if (popular === "true") filter.isPopular = true;

    if (minPrice || maxPrice) {
      filter.fixedPrice = {};
      if (minPrice) filter.fixedPrice.$gte = Number(minPrice);
      if (maxPrice) filter.fixedPrice.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(filter)
      .populate("category", "name slug icon")
      .sort(
        search
          ? { score: { $meta: "textScore" } }
          : { displayOrder: 1, name: 1 }
      )
      .skip(skip)
      .limit(Number(limit))
      .select("-__v");

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: services.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: services,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
export const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "category",
      "name slug icon"
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service",
      error: error.message,
    });
  }
};

// @desc    Get service by slug
// @route   GET /api/v1/services/slug/:slug
// @access  Public
export const getServiceBySlug = async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug }).populate(
      "category",
      "name slug icon"
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service",
      error: error.message,
    });
  }
};

// @desc    Calculate service price
// @route   POST /api/v1/services/:id/calculate-price
// @access  Public
export const calculateServicePrice = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const { urgency, timeOfDay, dayType, estimatedHours } = req.body;

    const priceCalculation = service.calculatePrice({
      urgency,
      timeOfDay,
      dayType,
      estimatedHours,
    });

    res.status(200).json({
      success: true,
      data: {
        service: {
          id: service._id,
          name: service.name,
          pricingType: service.pricingType,
        },
        calculation: priceCalculation,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate price",
      error: error.message,
    });
  }
};

// @desc    Search services
// @route   GET /api/v1/services/search
// @access  Public
export const searchServices = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const services = await Service.find(
      {
        $text: { $search: q },
        isActive: true,
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .populate("category", "name slug icon")
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// @desc    Get popular services
// @route   GET /api/v1/services/popular
// @access  Public
export const getPopularServices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const services = await Service.find({
      isActive: true,
      isPopular: true,
    })
      .populate("category", "name slug icon")
      .sort({ totalBookings: -1, averageRating: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch popular services",
      error: error.message,
    });
  }
};

