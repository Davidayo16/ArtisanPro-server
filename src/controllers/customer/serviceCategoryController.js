import ServiceCategory from "../../models/ServiceCategory.js";
import Service from "../../models/Service.js";

// @desc    Get all service categories
// @route   GET /api/v1/service-categories
// @access  Public
export const getServiceCategories = async (req, res) => {
  try {
    const { active = true } = req.query;

    const filter = active === "true" ? { isActive: true } : {};

    const categories = await ServiceCategory.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// @desc    Get single service category with services
// @route   GET /api/v1/service-categories/:id
// @access  Public
export const getServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get all services in this category
    const services = await Service.find({
      category: category._id,
      isActive: true,
    }).sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: {
        category,
        services,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

// @desc    Get category by slug
// @route   GET /api/v1/service-categories/slug/:slug
// @access  Public
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await ServiceCategory.findOne({ slug: req.params.slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get all services in this category
    const services = await Service.find({
      category: category._id,
      isActive: true,
    }).sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: {
        category,
        services,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};
