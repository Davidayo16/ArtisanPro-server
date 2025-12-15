import Booking from "../../models/Booking.js";
import Artisan from "../../models/Artisan.js";
import Service from "../../models/Service.js";
import ArtisanService from "../../models/ArtisanService.js";
import Customer from "../../models/Customer.js";
import {
  calculateDistance,
  calculateETA,
} from "../location/distanceService.js";

/**
 * Create new booking with the new pricing system
 */
export const createBooking = async (bookingData) => {
  try {
    const {
      customerId,
      artisanId,
      serviceId,
      description,
      photos,
      location,
      scheduledDate,
      scheduledTime,
      urgency,
      customerSelections, // NEW: Customer's selections for pricing
      timeOfDay = "business",
      dayType = "weekday",
    } = bookingData;

    // ===== VALIDATION =====

    // Validate artisan
    const artisan = await Artisan.findById(artisanId);
    if (!artisan || !artisan.isActive) {
      throw new Error("Artisan not found or inactive");
    }

    // Validate service
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      throw new Error("Service not found or inactive");
    }

    // ✅ NEW: Validate artisan offers this service via ArtisanService
    const artisanService = await ArtisanService.findOne({
      artisan: artisanId,
      service: serviceId,
      enabled: true,
    }).populate("service");
    console.log("🔍 ARTISAN SERVICE LOOKUP:");
    console.log("artisanId:", artisanId);
    console.log("serviceId:", serviceId);
    console.log("Found artisanService:", artisanService);

    if (!artisanService) {
      throw new Error("Artisan does not offer this service or it's disabled");
    }

    // ===== CALCULATE DISTANCE & ETA =====
    let distance = null;
    let eta = null;

    if (location.coordinates && artisan.location?.coordinates?.coordinates) {
      const customerLocation = {
        lat: location.coordinates[1],
        lng: location.coordinates[0],
      };
      const artisanLocation = {
        lat: artisan.location.coordinates.coordinates[1],
        lng: artisan.location.coordinates.coordinates[0],
      };

      distance = parseFloat(
        calculateDistance(customerLocation, artisanLocation)
      );
      eta = calculateETA(distance);
    }

    // ===== CALCULATE PRICE =====
    const priceCalculation = service.calculatePrice(
      {
        ...customerSelections,
        urgency,
        timeOfDay,
        dayType,
      },
      artisanService // Pass artisan's custom pricing
    );

    let estimatedPrice = null;
    let pricingModel = service.pricingModel;
    let priceBreakdown = null;

    // Handle different pricing model results
    if (priceCalculation.type === "inspection_required") {
      pricingModel = "inspection_required";
      estimatedPrice = priceCalculation.inspectionFee;
    } else if (priceCalculation.type === "fully_custom") {
      pricingModel = "fully_custom";
      estimatedPrice = null; // No upfront price
    } else {
      estimatedPrice = priceCalculation.finalPrice;
      priceBreakdown = {
        basePrice: priceCalculation.basePrice,
        modifiers: {
          urgency,
          timeOfDay,
          dayType,
        },
        multiplier: priceCalculation.multiplier,
        subtotal: priceCalculation.finalPrice,
        materialsIncluded: priceCalculation.materialsIncluded,
        depositAmount: priceCalculation.deposit,
      };
    }

    // ===== CREATE BOOKING =====
    console.log("📝 CREATING BOOKING WITH:");
    console.log("serviceId:", serviceId);
    console.log("artisanService._id:", artisanService._id);
    const booking = new Booking({
      customer: customerId,
      artisan: artisanId,
      service: serviceId,
      artisanService: artisanService._id, // ✅ NEW: Link to ArtisanService
      description,
      photos,
      location,
      scheduledDate,
      scheduledTime,
      urgency,
      pricingModel, // ✅ NEW: Store pricing model
      customerSelections, // ✅ NEW: Store selections
      priceBreakdown, // ✅ NEW: Store breakdown
      estimatedPrice,
      distance,
      eta,
      status: "pending",
    });
    console.log("📝 BOOKING OBJECT BEFORE SAVE:", booking);

    await booking.save();
    console.log("✅ BOOKING SAVED:", booking.toObject());
    return booking;
  } catch (error) {
    console.error("❌ Create booking error:", error);
    throw new Error(`Failed to create booking: ${error.message}`);
  }
};

/**
 * Get booking by ID with full details
 */
export const getBookingById = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "customer",
        select: "firstName lastName email phone profilePhoto",
      })
      .populate({
        path: "artisan",
        select:
          "firstName lastName businessName email phone profilePhoto averageRating totalJobsCompleted",
      })
      .populate("service", "name slug pricingModel icon")
      .populate({
        path: "artisanService",
        populate: {
          path: "service",
          select: "name pricingModel pricingConfig universalFeatures modifiers",
        },
      })
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Add time-left for pending bookings
    if (booking.status === "pending" && booking.expiresAt) {
      booking.timeLeftSeconds = Math.max(
        0,
        Math.floor((new Date(booking.expiresAt) - new Date()) / 1000)
      );
    } else {
      booking.timeLeftSeconds = null;
    }

    return booking;
  } catch (error) {
    console.error("Get booking error:", error);
    throw new Error(`Failed to get booking: ${error.message}`);
  }
};

/**
 * Enrich booking with calculated fields
 */
export const enrichBooking = (booking) => {
  const enriched = { ...booking };

  // Time-left (only for pending)
  if (enriched.status === "pending" && enriched.expiresAt) {
    enriched.timeLeftSeconds = Math.max(
      0,
      Math.floor((new Date(enriched.expiresAt) - new Date()) / 1000)
    );
  } else {
    enriched.timeLeftSeconds = null;
  }

  // Distance
  enriched.distance = enriched.distance ?? null;

  return enriched;
};

/**
 * Check if booking has expired
 */
export const isBookingExpired = (booking) => {
  if (booking.status !== "pending") return false;
  return new Date() > new Date(booking.expiresAt);
};

/**
 * Auto-decline expired booking
 */
export const autoDeclineBooking = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);

    if (!booking || booking.status !== "pending") {
      return booking;
    }

    booking.status = "declined";
    booking.declinedAt = new Date();
    booking.declineReason = "Auto-declined - No response within 2 minutes";
    booking.cancelledBy = "system";

    await booking.save();

    return booking;
  } catch (error) {
    console.error("❌ Auto-decline error:", error);
    throw new Error(`Failed to auto-decline booking: ${error.message}`);
  }
};

/**
 * Calculate platform fee
 */
export const calculatePlatformFee = (amount) => {
  const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || 5);
  return Math.round((amount * feePercentage) / 100);
};

/**
 * Calculate total amount
 */
export const calculateTotalAmount = (agreedPrice) => {
  const platformFee = calculatePlatformFee(agreedPrice);
  return agreedPrice + platformFee;
};

/**
 * Recalculate price if customer changes selections
 */
export const recalculateBookingPrice = async (bookingId, newSelections) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("service")
      .populate("artisanService");

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Recalculate with new selections
    const priceCalculation = booking.service.calculatePrice(
      {
        ...newSelections,
        urgency: booking.urgency,
        timeOfDay: booking.priceBreakdown?.modifiers?.timeOfDay || "business",
        dayType: booking.priceBreakdown?.modifiers?.dayType || "weekday",
      },
      booking.artisanService
    );

    // Update booking
    booking.customerSelections = newSelections;
    booking.estimatedPrice = priceCalculation.finalPrice;
    booking.priceBreakdown = {
      basePrice: priceCalculation.basePrice,
      modifiers: booking.priceBreakdown.modifiers,
      multiplier: priceCalculation.multiplier,
      subtotal: priceCalculation.finalPrice,
      materialsIncluded: priceCalculation.materialsIncluded,
      depositAmount: priceCalculation.deposit,
    };

    await booking.save();

    return booking;
  } catch (error) {
    console.error("❌ Recalculate price error:", error);
    throw new Error(`Failed to recalculate price: ${error.message}`);
  }
};
