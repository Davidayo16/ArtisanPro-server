import Booking from "../../models/Booking.js";
import {
  getBookingById,
  calculateTotalAmount,
  calculatePlatformFee,
} from "../../services/booking/bookingService.js";
import { startNegotiation } from "../../services/booking/negotiationService.js";
import { sendNotification } from "../../services/notification/notificationService.js";
import Artisan from "../../models/Artisan.js";

// @desc    Accept booking
// @route   PUT /api/v1/bookings/:id/accept
// @access  Private/Artisan
export const acceptBooking = async (req, res) => {
  try {
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
        message: "Not authorized to accept this booking",
      });
    }

    // Check if still pending
    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking with status: ${booking.status}`,
      });
    }

    // Check if expired
    if (new Date() > new Date(booking.expiresAt)) {
      booking.status = "declined";
      booking.declineReason = "Expired - Response time exceeded";
      await booking.save();

      return res.status(400).json({
        success: false,
        message: "Booking has expired",
      });
    }

    // Accept booking
    booking.status = "accepted";
    booking.acceptedAt = new Date();
    // ✅ CALCULATE RESPONSE TIME
    const responseMinutes = Math.floor(
      (booking.acceptedAt - booking.createdAt) / 60000
    );

    const artisan = await Artisan.findById(booking.artisan);
    const currentAvg = artisan.responseTime || 0;
    const newAvg =
      currentAvg === 0
        ? responseMinutes
        : Math.round((currentAvg + responseMinutes) / 2);

    // ✅ UPDATE ARTISAN STATS
    await Artisan.findByIdAndUpdate(booking.artisan, {
      $inc: {
        totalBookingRequests: 1,
        totalAcceptedBookings: 1,
      },
      responseTime: newAvg,
    });

    // ✅ CALCULATE ACCEPTANCE RATE
    const updatedArtisan = await Artisan.findById(booking.artisan);
    const acceptanceRate = Math.round(
      (updatedArtisan.totalAcceptedBookings /
        updatedArtisan.totalBookingRequests) *
        100
    );

    await Artisan.findByIdAndUpdate(booking.artisan, {
      acceptanceRate: acceptanceRate,
    });

    // Set agreed price if estimated price exists
    if (booking.estimatedPrice) {
      booking.agreedPrice = booking.estimatedPrice;
      booking.platformFee = calculatePlatformFee(booking.agreedPrice);
      booking.totalAmount = calculateTotalAmount(booking.agreedPrice);
    }

    await booking.save();

    const populatedBooking = await getBookingById(booking._id);

    // Send notification to customer
    await sendNotification(booking.customer.toString(), "booking_accepted", {
      booking: populatedBooking,
      artisan: req.user,
    });

    res.status(200).json({
      success: true,
      message: "Booking accepted successfully",
      data: populatedBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to accept booking",
      error: error.message,
    });
  }
};

// @desc    Decline booking
// @route   PUT /api/v1/bookings/:id/decline
// @access  Private/Artisan
export const declineBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for declining",
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
        message: "Not authorized to decline this booking",
      });
    }

    // Check if still pending
    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot decline booking with status: ${booking.status}`,
      });
    }

    booking.status = "declined";
    booking.declinedAt = new Date();
    booking.declineReason = reason;
    booking.cancelledBy = "artisan";

    await booking.save();
    // ✅ UPDATE BOOKING REQUESTS COUNT
    await Artisan.findByIdAndUpdate(booking.artisan, {
      $inc: { totalBookingRequests: 1 },
    });

    // ✅ RECALCULATE ACCEPTANCE RATE
    const artisan = await Artisan.findById(booking.artisan);
    const acceptanceRate = Math.round(
      (artisan.totalAcceptedBookings / artisan.totalBookingRequests) * 100
    );

    await Artisan.findByIdAndUpdate(booking.artisan, {
      acceptanceRate: acceptanceRate,
    });

    // TODO: Send notification to customer

    res.status(200).json({
      success: true,
      message: "Booking declined",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to decline booking",
      error: error.message,
    });
  }
};

// @desc    Propose custom price (start negotiation)
// @route   POST /api/v1/bookings/:id/propose-price
// @access  Private/Artisan
export const proposePrice = async (req, res) => {
  try {
    const { proposedPrice, message } = req.body;

    if (!proposedPrice || proposedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price",
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
        message: "Not authorized to propose price for this booking",
      });
    }

    // Check if still pending
    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot propose price for booking with status: ${booking.status}`,
      });
    }

    // Start negotiation
    const negotiation = await startNegotiation(
      booking._id,
      booking.customer,
      booking.artisan,
      proposedPrice
    );

    // Add first round (artisan's proposal)
    negotiation.rounds.push({
      roundNumber: 1,
      proposedBy: "artisan",
      proposedAmount: proposedPrice,
      message: message || "Initial price proposal",
      response: "pending",
    });

    await negotiation.save();

    // Update booking
    booking.status = "negotiating";
    booking.negotiation.isNegotiating = true;
    booking.negotiation.rounds.push({
      proposedBy: "artisan",
      amount: proposedPrice,
      message: message || "Initial price proposal",
    });

    await booking.save();

    // TODO: Send notification to customer

    res.status(200).json({
      success: true,
      message: "Price proposal sent to customer",
      data: {
        booking,
        negotiation,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to propose price",
      error: error.message,
    });
  }
};

// @desc    Start job
// @route   PUT /api/v1/bookings/:id/start
// @access  Private/Artisan
export const startJob = async (req, res) => {
  try {
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
        message: "Not authorized to start this job",
      });
    }

    // Check if booking is confirmed
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Booking must be confirmed before starting",
      });
    }

    booking.status = "in_progress";
    booking.startedAt = new Date();

    await booking.save();

    const populatedBooking = await getBookingById(booking._id);

    // Send notification to customer
    await sendNotification(booking.customer.toString(), "job_started", {
      booking: populatedBooking,
      artisan: req.user,
    });

    res.status(200).json({
      success: true,
      message: "Job started successfully",
      data: populatedBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to start job",
      error: error.message,
    });
  }
};

// @desc    Complete job
// @route   PUT /api/v1/bookings/:id/complete
// @access  Private/Artisan
// @desc    Complete job
// @route   PUT /api/v1/bookings/:id/complete
// @access  Private/Artisan
export const completeJob = async (req, res) => {
  try {
    const { completionNotes, completionPhotos, materialsUsed, workDuration } =
      req.body;

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
        message: "Not authorized to complete this job",
      });
    }

    // Check if job is in progress
    if (booking.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Job must be in progress to mark as complete",
      });
    }

    // ✅ ADD: Check if already completed
    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Job has already been completed",
      });
    }

    // Validate completion photos
    if (!completionPhotos || completionPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one completion photo",
      });
    }

    // Validate completion notes
    if (!completionNotes || completionNotes.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Completion notes must be at least 20 characters",
      });
    }

    // Calculate work duration if not provided
    const calculatedDuration =
      workDuration ||
      (booking.startedAt
        ? Math.round((new Date() - new Date(booking.startedAt)) / 3600000) // hours
        : null);

    booking.status = "completed";
    booking.completedAt = new Date();
    booking.completionNotes = completionNotes.trim();
    booking.completionPhotos = completionPhotos;
    booking.materialsUsed = materialsUsed || [];
    booking.workDuration = calculatedDuration;

    await booking.save();
    // After line: await booking.save();

    // ✅ UPDATE ARTISAN STATS
    await Artisan.findByIdAndUpdate(booking.artisan, {
      $inc: { totalJobsCompleted: 1 },
    });

    // ✅ OPTIMIZE: Use lean populate instead of heavy getBookingById
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customer", "firstName lastName profilePhoto")
      .populate("artisan", "firstName lastName businessName profilePhoto")
      .populate("service", "name")
      .lean();

    // Send notification to customer (don't await - run async)
    sendNotification(booking.customer.toString(), "job_completed", {
      booking: populatedBooking,
      artisan: req.user,
    }).catch((err) => console.error("Notification error:", err));

    // ✅ RESPOND IMMEDIATELY - Don't wait for notification
    res.status(200).json({
      success: true,
      message: "Job marked as complete. Awaiting customer confirmation.",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Complete job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete job",
      error: error.message,
    });
  }
};
