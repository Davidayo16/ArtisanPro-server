import PriceNegotiation from "../../models/PriceNegotiation.js";
import Booking from "../../models/Booking.js";
import Customer from "../../models/Customer.js"; // ✅ ADD THIS
import Artisan from "../../models/Artisan.js";   // ✅ ADD THIS
// Start price negotiation
export const startNegotiation = async (
  bookingId,
  customerId,
  artisanId,
  initialPrice
) => {
  try {
    const negotiation = await PriceNegotiation.create({
      booking: bookingId,
      customer: customerId,
      artisan: artisanId,
      initialPrice,
      currentRound: 1,
    });

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, {
      status: "negotiating",
      "negotiation.isNegotiating": true,
    });

    return negotiation;
  } catch (error) {
    console.error("❌ Start negotiation error:", error);
    throw new Error(`Failed to start negotiation: ${error.message}`);
  }
};

// Add negotiation round
export const addNegotiationRound = async (
  negotiationId,
  proposedBy,
  proposedAmount,
  message
) => {
  try {
    const negotiation = await PriceNegotiation.findById(negotiationId);

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.status !== "active") {
      throw new Error("Negotiation is not active");
    }

    // Check if max rounds reached
    if (negotiation.currentRound >= negotiation.maxRounds) {
      throw new Error("Maximum negotiation rounds reached");
    }

    // Check if negotiation expired
    if (new Date() > negotiation.expiresAt) {
      negotiation.status = "expired";
      await negotiation.save();
      throw new Error("Negotiation has expired");
    }

    // Add new round
    const newRound = {
      roundNumber: negotiation.currentRound,
      proposedBy,
      proposedAmount,
      message,
      response: "pending",
    };

    negotiation.rounds.push(newRound);
    negotiation.currentRound += 1;

    await negotiation.save();

    return negotiation;
  } catch (error) {
    console.error("❌ Add negotiation round error:", error);
    throw new Error(`Failed to add negotiation round: ${error.message}`);
  }
};

// Accept negotiation offer
export const acceptNegotiation = async (negotiationId, agreedPrice) => {
  try {
    const negotiation = await PriceNegotiation.findById(negotiationId);

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    negotiation.status = "agreed";
    negotiation.agreedPrice = agreedPrice;

    // Update last round response
    if (negotiation.rounds.length > 0) {
      negotiation.rounds[negotiation.rounds.length - 1].response = "accepted";
    }

    await negotiation.save();

    // Update booking with agreed price
    await Booking.findByIdAndUpdate(negotiation.booking, {
      status: "accepted",
      agreedPrice,
      "negotiation.isNegotiating": false,
    });

    return negotiation;
  } catch (error) {
    console.error("❌ Accept negotiation error:", error);
    throw new Error(`Failed to accept negotiation: ${error.message}`);
  }
};

// Reject negotiation
export const rejectNegotiation = async (negotiationId) => {
  try {
    const negotiation = await PriceNegotiation.findById(negotiationId);

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    negotiation.status = "rejected";

    // Update last round response
    if (negotiation.rounds.length > 0) {
      negotiation.rounds[negotiation.rounds.length - 1].response = "rejected";
    }

    await negotiation.save();

    // Update booking
    await Booking.findByIdAndUpdate(negotiation.booking, {
      status: "declined",
      declineReason: "Price negotiation rejected",
      "negotiation.isNegotiating": false,
    });

    return negotiation;
  } catch (error) {
    console.error("❌ Reject negotiation error:", error);
    throw new Error(`Failed to reject negotiation: ${error.message}`);
  }
};

// Get negotiation by booking ID
export const getNegotiationByBooking = async (bookingId) => {
  try {
    const negotiation = await PriceNegotiation.findOne({ booking: bookingId })
      .populate("customer", "firstName lastName")
      .populate("artisan", "firstName lastName businessName")
      .lean();

    return negotiation;
  } catch (error) {
    console.error("❌ Get negotiation error:", error);
    throw new Error(`Failed to get negotiation: ${error.message}`);
  }
};
