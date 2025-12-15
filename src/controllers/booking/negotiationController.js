import {
  addNegotiationRound,
  acceptNegotiation,
  rejectNegotiation,
  getNegotiationByBooking,
} from "../../services/booking/negotiationService.js";
import Booking from "../../models/Booking.js";
import {
  calculateTotalAmount,
  calculatePlatformFee,
} from "../../services/booking/bookingService.js";

// @desc    Customer counter-offer
// @route   POST /api/v1/bookings/:id/counter-offer
// @access  Private/Customer
export const customerCounterOffer = async (req, res) => {
  try {
    const { counterPrice, message } = req.body;

    if (!counterPrice || counterPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid counter price",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if negotiating
    if (booking.status !== "negotiating") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in negotiation",
      });
    }

    // Get negotiation
    const negotiation = await getNegotiationByBooking(booking._id);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Negotiation not found",
      });
    }

    // Add counter-offer round
    const updatedNegotiation = await addNegotiationRound(
      negotiation._id,
      "customer",
      counterPrice,
      message || "Counter offer"
    );

    // Update booking negotiation rounds
    booking.negotiation.rounds.push({
      proposedBy: "customer",
      amount: counterPrice,
      message: message || "Counter offer",
    });

    await booking.save();

    // TODO: Send notification to artisan

    res.status(200).json({
      success: true,
      message: "Counter offer sent to artisan",
      data: {
        negotiation: updatedNegotiation,
        booking,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send counter offer",
      error: error.message,
    });
  }
};

// @desc    Artisan counter-offer
// @route   POST /api/v1/bookings/:id/artisan-counter
// @access  Private/Artisan
export const artisanCounterOffer = async (req, res) => {
  try {
    const { counterPrice, message } = req.body;

    if (!counterPrice || counterPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid counter price",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (booking.artisan.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if negotiating
    if (booking.status !== "negotiating") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in negotiation",
      });
    }

    // Get negotiation
    const negotiation = await getNegotiationByBooking(booking._id);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Negotiation not found",
      });
    }

    // Add counter-offer round
    const updatedNegotiation = await addNegotiationRound(
      negotiation._id,
      "artisan",
      counterPrice,
      message || "Counter offer"
    );

    // Update booking negotiation rounds
    booking.negotiation.rounds.push({
      proposedBy: "artisan",
      amount: counterPrice,
      message: message || "Counter offer",
    });

    await booking.save();

    // TODO: Send notification to customer

    res.status(200).json({
      success: true,
      message: "Counter offer sent to customer",
      data: {
        negotiation: updatedNegotiation,
        booking,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send counter offer",
      error: error.message,
    });
  }
};

// @desc    Accept negotiated price (customer or artisan)
// @route   POST /api/v1/bookings/:id/accept-price
// @access  Private
export const acceptNegotiatedPrice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization (customer or artisan)
    if (
      booking.customer.toString() !== req.user.id &&
      booking.artisan.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if negotiating
    if (booking.status !== "negotiating") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in negotiation",
      });
    }

    // Get negotiation
    const negotiation = await getNegotiationByBooking(booking._id);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Negotiation not found",
      });
    }

    // Get last proposed price
    const lastRound = negotiation.rounds[negotiation.rounds.length - 1];
    const agreedPrice = lastRound.proposedAmount;

    // Accept negotiation
    await acceptNegotiation(negotiation._id, agreedPrice);

    // Update booking
    booking.status = "accepted";
    booking.agreedPrice = agreedPrice;
    booking.platformFee = calculatePlatformFee(agreedPrice);
    booking.totalAmount = calculateTotalAmount(agreedPrice);
    booking.negotiation.isNegotiating = false;

    await booking.save();

    // TODO: Send notifications to both parties

    res.status(200).json({
      success: true,
      message: "Price agreed! Proceed to payment.",
      data: {
        booking,
        agreedPrice,
        totalAmount: booking.totalAmount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to accept price",
      error: error.message,
    });
  }
};

// @desc    Reject negotiation
// @route   POST /api/v1/bookings/:id/reject-negotiation
// @access  Private
export const rejectNegotiationHandler = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      booking.customer.toString() !== req.user.id &&
      booking.artisan.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Get negotiation
    const negotiation = await getNegotiationByBooking(booking._id);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Negotiation not found",
      });
    }

    // Reject negotiation
    await rejectNegotiation(negotiation._id);

    // Update booking
    booking.status = "declined";
    booking.declineReason = "Price negotiation failed";
    booking.negotiation.isNegotiating = false;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Negotiation rejected. Booking declined.",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to reject negotiation",
      error: error.message,
    });
  }
};

// @desc    Get negotiation details
// @route   GET /api/v1/bookings/:id/negotiation
// @access  Private
export const getNegotiation = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      booking.customer.toString() !== req.user.id &&
      booking.artisan.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const negotiation = await getNegotiationByBooking(booking._id);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "No negotiation found for this booking",
      });
    }

    res.status(200).json({
      success: true,
      data: negotiation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get negotiation",
      error: error.message,
    });
  }
};
