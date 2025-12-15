import {
  searchArtisans,
  findNearbyArtisans,
  getRecommendedArtisans,
} from "../../services/search/searchService.js";
import {
  geocodeAddress,
  reverseGeocode,
} from "../../services/location/geocodingService.js";

// @desc    Search artisans with filters
// @route   GET /api/v1/search/artisans
// @access  Public
export const searchArtisansHandler = async (req, res) => {
  try {
    const result = await searchArtisans(req.query);

    res.status(200).json({
      success: true,
      count: result.artisans.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      hasLocation: result.hasLocation,
      data: result.artisans,
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

// @desc    Find nearby artisans
// @route   GET /api/v1/search/nearby
// @access  Public
export const findNearbyArtisansHandler = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Please provide latitude and longitude",
      });
    }

    const artisans = await findNearbyArtisans(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );

    res.status(200).json({
      success: true,
      count: artisans.length,
      radius: parseFloat(radius),
      data: artisans,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to find nearby artisans",
      error: error.message,
    });
  }
};

// @desc    Get recommended artisans
// @route   GET /api/v1/search/recommended
// @access  Private
export const getRecommendedArtisansHandler = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Please provide latitude and longitude",
      });
    }

    const artisans = await getRecommendedArtisans(
      req.user?.id,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(200).json({
      success: true,
      count: artisans.length,
      data: artisans,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

// @desc    Geocode address to coordinates
// @route   POST /api/v1/search/geocode
// @access  Public
export const geocodeAddressHandler = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Please provide an address",
      });
    }

    const result = await geocodeAddress(address);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Geocoding failed",
      error: error.message,
    });
  }
};

// @desc    Reverse geocode coordinates to address
// @route   POST /api/v1/search/reverse-geocode
// @access  Public
export const reverseGeocodeHandler = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Please provide latitude and longitude",
      });
    }

    const result = await reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Reverse geocoding failed",
      error: error.message,
    });
  }
};
