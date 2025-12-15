import Portfolio from "../../models/Portfolio.js";
import Artisan from "../../models/Artisan.js";

// @desc    Get artisan's portfolio
// @route   GET /api/v1/artisans/me/portfolio
// @access  Private/Artisan
export const getMyPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.find({
      artisan: req.user.id, // ✅ FIXED: Use req.user.id, not req.params
      isActive: true,
    })
      .populate("service", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: portfolio.length,
      data: portfolio,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio",
      error: error.message,
    });
  }
};

// @desc    Add portfolio item
// @route   POST /api/v1/artisans/me/portfolio
// @access  Private/Artisan
export const addPortfolioItem = async (req, res) => {
  try {
    const {
      title,
      description,
      service,
      images,
      beforeImages,
      afterImages,
      completedDate,
      client,
      location,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide title and description",
      });
    }

    if (!images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one image",
      });
    }

    const portfolioItem = await Portfolio.create({
      artisan: req.user.id,
      title,
      description,
      service,
      images,
      beforeImages,
      afterImages,
      completedDate,
      client,
      location,
    });

    // Update artisan's portfolio array
    await Artisan.findByIdAndUpdate(req.user.id, {
      $push: { portfolio: portfolioItem._id },
    });

    res.status(201).json({
      success: true,
      message: "Portfolio item added successfully",
      data: portfolioItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to add portfolio item",
      error: error.message,
    });
  }
};

// @desc    Update portfolio item
// @route   PUT /api/v1/artisans/me/portfolio/:id
// @access  Private/Artisan
export const updatePortfolioItem = async (req, res) => {
  try {
    let portfolioItem = await Portfolio.findById(req.params.id);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      });
    }

    // Check ownership
    if (portfolioItem.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this portfolio item",
      });
    }

    portfolioItem = await Portfolio.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Portfolio item updated successfully",
      data: portfolioItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update portfolio item",
      error: error.message,
    });
  }
};

// @desc    Delete portfolio item
// @route   DELETE /api/v1/artisans/me/portfolio/:id
// @access  Private/Artisan
export const deletePortfolioItem = async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findById(req.params.id);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      });
    }

    // Check ownership
    if (portfolioItem.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this portfolio item",
      });
    }

    await portfolioItem.deleteOne();

    // Remove from artisan's portfolio array
    await Artisan.findByIdAndUpdate(req.user.id, {
      $pull: { portfolio: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Portfolio item deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete portfolio item",
      error: error.message,
    });
  }
};

// @desc    Get public portfolio (for customers)
// @route   GET /api/v1/artisans/:artisanId/portfolio
// @access  Public
export const getArtisanPortfolio = async (req, res) => {
  try {
    // ✅ FIXED: This one correctly uses req.params.artisanId for public view
    const portfolio = await Portfolio.find({
      artisan: req.params.artisanId,
      isActive: true,
    })
      .populate("service", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: portfolio.length,
      data: portfolio,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio",
      error: error.message,
    });
  }
};
