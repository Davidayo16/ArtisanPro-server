import Service from "../../models/Service.js";
import ServiceCategory from "../../models/ServiceCategory.js";

// @desc    Create service category
// @route   POST /api/v1/admin/service-categories
// @access  Private/Admin
export const createServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.create(req.body);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// @desc    Update service category
// @route   PUT /api/v1/admin/service-categories/:id
// @access  Private/Admin
export const updateServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// @desc    Delete service category
// @route   DELETE /api/v1/admin/service-categories/:id
// @access  Private/Admin
export const deleteServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has services
    const servicesCount = await Service.countDocuments({
      category: category._id,
    });

    if (servicesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${servicesCount} services. Delete services first.`,
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// @desc    Create service
// @route   POST /api/v1/admin/services
// @access  Private/Admin
export const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    // Update category service count
    const category = await ServiceCategory.findById(service.category);
    if (category) {
      await category.updateServiceCount();
    }

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create service",
      error: error.message,
    });
  }
};

// @desc    Update service
// @route   PUT /api/v1/admin/services/:id
// @access  Private/Admin
export const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

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
      message: "Failed to update service",
      error: error.message,
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/v1/admin/services/:id
// @access  Private/Admin
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const categoryId = service.category;

    await service.deleteOne();

    // Update category service count
    const category = await ServiceCategory.findById(categoryId);
    if (category) {
      await category.updateServiceCount();
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
