import Artisan from "../../models/Artisan.js";
import Service from "../../models/Service.js";
import ServiceCategory from "../../models/ServiceCategory.js";
import {
  calculateDistance,
  isWithinRadius,
  sortByDistance,
  getBoundingBox,
} from "../location/distanceService.js";

// Main search function
export const searchArtisans = async (filters) => {
  try {
    const {
      // Service filters
      service,
      category,

      // Location filters
      latitude,
      longitude,
      radius = 10, // Default 10km

      // Quality filters
      minRating,
      verified,

      // Availability filters
      availableNow,

      // Price filters
      maxPrice,

      // Sorting
      sortBy = "distance", // distance, rating, price, popular

      // Pagination
      page = 1,
      limit = 20,
    } = filters;

    // Build base query
    const query = { isActive: true };

    // Service/Category filter
    if (service) {
      query.services = service;
    }

    if (category) {
      query.serviceCategories = category;
    }

    // Rating filter
    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    // Verification filter
    if (verified === "true") {
      query["verification.status"] = "verified";
    }

    // Availability filter
    if (availableNow === "true") {
      query.isAvailableNow = true;
    }

    // Location-based filtering
    let artisans;
    if (latitude && longitude) {
      const centerPoint = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
      };
      const radiusInKm = parseFloat(radius);

      // Get bounding box for optimization
      const bbox = getBoundingBox(centerPoint, radiusInKm);

      // MongoDB geospatial query
      query["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [centerPoint.lng, centerPoint.lat], // [lng, lat]
          },
          $maxDistance: radiusInKm * 1000, // Convert to meters
        },
      };

      artisans = await Artisan.find(query)
        .populate("serviceCategories", "name slug icon")
        .populate(
          "services",
          "name slug pricingType priceRange fixedPrice hourlyRate"
        )
        .select("-bankDetails -__v")
        .lean();

      // Calculate distances and filter by exact radius
      artisans = artisans
        .map((artisan) => {
          const artisanLocation = {
            lat: artisan.location?.coordinates?.coordinates?.[1],
            lng: artisan.location?.coordinates?.coordinates?.[0],
          };

          if (!artisanLocation.lat || !artisanLocation.lng) {
            return null;
          }

          const distance = calculateDistance(centerPoint, artisanLocation);

          return {
            ...artisan,
            distance: parseFloat(distance),
          };
        })
        .filter(
          (artisan) => artisan !== null && artisan.distance <= radiusInKm
        );
    } else {
      // No location filter - just fetch all matching artisans
      artisans = await Artisan.find(query)
        .populate("serviceCategories", "name slug icon")
        .populate(
          "services",
          "name slug pricingType priceRange fixedPrice hourlyRate"
        )
        .select("-bankDetails -__v")
        .lean();
    }

    // Price filter (if specified)
    if (maxPrice) {
      artisans = artisans.filter((artisan) => {
        // Check if any of artisan's services are within budget
        return artisan.services.some((service) => {
          if (service.pricingType === "fixed") {
            return service.fixedPrice <= parseFloat(maxPrice);
          } else if (service.pricingType === "range") {
            return service.priceRange.min <= parseFloat(maxPrice);
          } else if (service.pricingType === "hourly") {
            return service.hourlyRate <= parseFloat(maxPrice);
          }
          return true; // Include custom pricing
        });
      });
    }

    // Sorting
    artisans = sortArtisans(artisans, sortBy);

    // Pagination
    const total = artisans.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedArtisans = artisans.slice(startIndex, endIndex);

    return {
      artisans: paginatedArtisans,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      hasLocation: !!(latitude && longitude),
    };
  } catch (error) {
    console.error("❌ Search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
};

// Sort artisans by different criteria
const sortArtisans = (artisans, sortBy) => {
  switch (sortBy) {
    case "distance":
      return artisans.sort((a, b) => {
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        return a.distance - b.distance;
      });

    case "rating":
      return artisans.sort((a, b) => b.averageRating - a.averageRating);

    case "popular":
      return artisans.sort(
        (a, b) => b.totalJobsCompleted - a.totalJobsCompleted
      );

    case "price":
      return artisans.sort((a, b) => {
        const aPrice = getLowestPrice(a.services);
        const bPrice = getLowestPrice(b.services);
        return aPrice - bPrice;
      });

    case "newest":
      return artisans.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

    default:
      return artisans;
  }
};

// Helper to get lowest price from artisan's services
const getLowestPrice = (services) => {
  if (!services || services.length === 0) return Infinity;

  return Math.min(
    ...services.map((service) => {
      if (service.pricingType === "fixed") {
        return service.fixedPrice || Infinity;
      } else if (service.pricingType === "range") {
        return service.priceRange?.min || Infinity;
      } else if (service.pricingType === "hourly") {
        return service.hourlyRate || Infinity;
      }
      return Infinity;
    })
  );
};

// Find nearby artisans (simple version)
export const findNearbyArtisans = async (
  latitude,
  longitude,
  radiusInKm = 10
) => {
  try {
    const centerPoint = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
    };

    const artisans = await Artisan.find({
      isActive: true,
      isAvailableNow: true,
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [centerPoint.lng, centerPoint.lat],
          },
          $maxDistance: radiusInKm * 1000,
        },
      },
    })
      .populate("serviceCategories", "name slug icon")
      .populate("services", "name slug")
      .limit(50)
      .select("-bankDetails -__v")
      .lean();

    // Add distance to each artisan
    const artisansWithDistance = artisans.map((artisan) => {
      const artisanLocation = {
        lat: artisan.location?.coordinates?.coordinates?.[1],
        lng: artisan.location?.coordinates?.coordinates?.[0],
      };

      const distance = calculateDistance(centerPoint, artisanLocation);

      return {
        ...artisan,
        distance: parseFloat(distance),
      };
    });

    return artisansWithDistance;
  } catch (error) {
    console.error("❌ Find nearby error:", error);
    throw new Error(`Failed to find nearby artisans: ${error.message}`);
  }
};

// Get recommended artisans based on user's location and preferences
export const getRecommendedArtisans = async (userId, latitude, longitude) => {
  try {
    // This can be enhanced with ML/user history later
    // For now, return top-rated nearby artisans
    const nearby = await findNearbyArtisans(latitude, longitude, 15);

    // Sort by rating and return top 10
    return nearby
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10);
  } catch (error) {
    console.error("❌ Recommendations error:", error);
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }
};
