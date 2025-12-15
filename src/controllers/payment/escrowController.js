import mongoose from "mongoose";
import {
  releaseEscrow,
  refundEscrow,
  getEscrowByBooking,
} from "../../services/payment/escrowService.js";
import Booking from "../../models/Booking.js";
import Escrow from "../../models/Escrow.js";
import { sendNotification } from "../../services/notification/notificationService.js";

// @desc    Release escrow (customer confirms job completion)
// @route   POST /api/v1/payments/escrow/:bookingId/release
// @access  Private/Customer
export const releaseEscrowHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.bookingId).session(
      session
    );

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (booking.customer.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Booking must be completed before releasing payment. Current status: ${booking.status}`,
      });
    }

    // Get escrow with session
    const escrow = await Escrow.findOne({ booking: booking._id }).session(
      session
    );

    if (!escrow) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Escrow not found for this booking",
      });
    }

    // ✅ Handle already released case gracefully
    if (escrow.status === "released") {
      let needsSync = false;

      if (booking.paymentStatus !== "released") {
        booking.paymentStatus = "released";
        needsSync = true;
      }

      if (booking.status === "completed") {
        booking.status = "payment_released";
        needsSync = true;
      }

      if (!booking.paymentReleasedAt) {
        booking.paymentReleasedAt = escrow.releasedAt || new Date();
        needsSync = true;
      }

      if (needsSync) {
        await booking.save({ session });
        await session.commitTransaction();
        console.log("✅ Booking synced with already-released escrow");
      } else {
        await session.abortTransaction();
      }

      session.endSession();

      return res.status(200).json({
        success: true,
        message: "Payment was already released",
        data: {
          escrow: {
            id: escrow._id,
            status: escrow.status,
            amount: escrow.artisanAmount,
            releasedAt: escrow.releasedAt,
          },
          booking: {
            id: booking._id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paymentReleasedAt: booking.paymentReleasedAt,
          },
        },
      });
    }

    // Check if can be released
    if (escrow.status !== "held") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot release escrow with status: ${escrow.status}. Expected: held`,
        debug: {
          escrowStatus: escrow.status,
          bookingStatus: booking.status,
          paymentStatus: booking.paymentStatus,
        },
      });
    }

    // ✅ Release escrow (within transaction) - using your service
    const releasedEscrow = await releaseEscrow(
      escrow._id,
      "manual",
      req.user.id,
      session // Pass session to service
    );

    // ✅ Update booking (within same transaction)
    booking.paymentStatus = "released";
    booking.status = "payment_released";
    booking.paymentReleasedAt = new Date();
    await booking.save({ session });

    // ✅ Commit transaction (all or nothing)
    await session.commitTransaction();
    session.endSession();

    console.log("✅ Payment released successfully in transaction");

    // Send notification (outside transaction)
    try {
      await sendNotification(booking.artisan.toString(), "payment_released", {
        booking,
        amount: releasedEscrow.artisanAmount,
      });
    } catch (notifError) {
      console.error("⚠️ Notification failed:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Payment released to artisan successfully",
      data: {
        escrow: {
          id: releasedEscrow._id,
          status: releasedEscrow.status,
          amount: releasedEscrow.artisanAmount,
          releasedAt: releasedEscrow.releasedAt,
        },
        booking: {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentReleasedAt: booking.paymentReleasedAt,
        },
      },
    });
  } catch (error) {
    // ❌ Rollback on any error
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Release escrow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to release escrow",
      error: error.message,
    });
  }
};

// @desc    Request refund
// @route   POST /api/v1/payments/escrow/:bookingId/refund
// @access  Private/Customer
export const requestRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    if (!reason) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for refund",
      });
    }

    const booking = await Booking.findById(req.params.bookingId).session(
      session
    );

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (booking.customer.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const escrow = await Escrow.findOne({ booking: booking._id }).session(
      session
    );

    if (!escrow) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Escrow not found",
      });
    }

    if (escrow.status !== "held") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Escrow not in held status. Current: ${escrow.status}`,
      });
    }

    // Refund escrow (with session)
    const refundedEscrow = await refundEscrow(escrow._id, reason, session);

    // Update booking (with session)
    booking.paymentStatus = "refunded";
    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancelledBy = "customer";
    booking.cancelledAt = new Date();
    await booking.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log("✅ Refund processed successfully in transaction");

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: refundedEscrow,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Refund error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message,
    });
  }
};

// @desc    Get escrow details
// @route   GET /api/v1/payments/escrow/:bookingId
// @access  Private
export const getEscrow = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      booking.customer.toString() !== req.user.id &&
      booking.artisan.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const escrow = await getEscrowByBooking(booking._id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: "Escrow not found",
      });
    }

    res.status(200).json({
      success: true,
      data: escrow,
    });
  } catch (error) {
    console.error("❌ Get escrow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get escrow",
      error: error.message,
    });
  }
};

// @desc    Sync booking with escrow (fix desync issues)
// @route   PATCH /api/v1/payments/escrow/:bookingId/sync
// @access  Private/Customer or Admin
export const syncBookingWithEscrow = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      booking.customer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const escrow = await Escrow.findOne({ booking: booking._id });

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: "Escrow not found",
      });
    }

    let updated = false;
    const changes = [];

    // Sync released status
    if (escrow.status === "released") {
      if (booking.paymentStatus !== "released") {
        booking.paymentStatus = "released";
        changes.push("paymentStatus: paid → released");
        updated = true;
      }

      if (booking.status === "completed") {
        booking.status = "payment_released";
        changes.push("status: completed → payment_released");
        updated = true;
      }

      if (!booking.paymentReleasedAt && escrow.releasedAt) {
        booking.paymentReleasedAt = escrow.releasedAt;
        changes.push(`paymentReleasedAt: ${escrow.releasedAt}`);
        updated = true;
      }
    }

    // Sync refunded status
    if (escrow.status === "refunded") {
      if (booking.paymentStatus !== "refunded") {
        booking.paymentStatus = "refunded";
        changes.push("paymentStatus → refunded");
        updated = true;
      }

      if (booking.status !== "cancelled") {
        booking.status = "cancelled";
        booking.cancelledBy = "system";
        booking.cancelledAt = new Date();
        changes.push("status → cancelled");
        updated = true;
      }
    }

    if (updated) {
      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Booking synced with escrow successfully",
        data: {
          bookingId: booking._id,
          changes,
          currentState: {
            bookingStatus: booking.status,
            paymentStatus: booking.paymentStatus,
            escrowStatus: escrow.status,
            paymentReleasedAt: booking.paymentReleasedAt,
          },
        },
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Booking already in sync with escrow",
        data: {
          bookingStatus: booking.status,
          paymentStatus: booking.paymentStatus,
          escrowStatus: escrow.status,
        },
      });
    }
  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync booking",
      error: error.message,
    });
  }
};
