import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";
import {
  initializePayment,
  verifyPayment,
} from "../../services/payment/paystackService.js";
import { createEscrow } from "../../services/payment/escrowService.js";
import {
  calculateTotalAmount,
  calculatePlatformFee,
} from "../../services/booking/bookingService.js";
import { sendNotification } from "../../services/notification/notificationService.js";

// @desc    Initialize payment
// @route   POST /api/v1/payments/initialize
// @access  Private/Customer
export const initializePaymentHandler = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("customer", "email")
      .populate("artisan");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (booking.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if booking is accepted
    if (booking.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Booking must be accepted before payment",
      });
    }

    // Check if already paid
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking already paid",
      });
    }

    // Calculate amounts
    const agreedPrice = booking.agreedPrice;
    const platformFee = calculatePlatformFee(agreedPrice);
    const totalAmount = calculateTotalAmount(agreedPrice);

    // Generate payment reference BEFORE creating the payment
    const paymentReference = `PAY-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Initialize Paystack payment FIRST (before creating payment record)
    const paystackResponse = await initializePayment(
      booking.customer.email,
      totalAmount,
      paymentReference,
      {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customer._id,
        artisanId: booking.artisan._id,
      }
    );

    // Create payment record with both references
    const payment = await Payment.create({
      booking: bookingId,
      customer: booking.customer._id,
      artisan: booking.artisan._id,
      amount: agreedPrice,
      platformFee,
      artisanAmount: agreedPrice,
      totalAmount,
      status: "pending",
      paymentReference, // ✅ Now provided
      paystackReference: paystackResponse.reference,
      paystackResponse,
    });

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paystackResponse.authorization_url,
        access_code: paystackResponse.access_code,
        reference: paystackResponse.reference,
        amount: totalAmount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
      error: error.message,
    });
  }
};

// @desc    Verify payment
// @route   GET /api/v1/payments/verify/:reference
// @access  Private
export const verifyPaymentHandler = async (req, res) => {
  try {
    const { reference } = req.params;

    // Get payment record
    const payment = await Payment.findOne({ paystackReference: reference });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify with Paystack
    const paystackData = await verifyPayment(reference);

    // In paystackController.js - verifyPaymentHandler

    if (paystackData.status === "success") {
      // Update payment status
      payment.status = "successful";
      payment.paidAt = new Date();
      payment.paystackResponse = paystackData;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      booking.payment = payment._id;
      booking.confirmedAt = new Date();
      await booking.save();

      // Create escrow (now handles duplicates gracefully)
      const escrow = await createEscrow(booking._id, payment._id);

      // Send notifications (wrap in try-catch to not fail if notification fails)
      try {
        await sendNotification(
          payment.customer.toString(),
          "payment_confirmed",
          {
            booking,
            payment,
          }
        );

        await sendNotification(
          payment.artisan.toString(),
          "payment_confirmed",
          {
            booking,
            payment,
          }
        );
      } catch (notifError) {
        console.error("⚠️ Notification error (non-fatal):", notifError.message);
      }

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          payment,
          escrow, // ✅ Add escrow to response
          booking: {
            id: booking._id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
          },
        },
      });
    } else {
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = paystackData.gateway_response;
      await payment.save();

      res.status(400).json({
        success: false,
        message: "Payment verification failed",
        data: paystackData,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

// @desc    Get payment details
// @route   GET /api/v1/payments/:id
// @access  Private
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("booking", "bookingNumber status")
      .populate("customer", "firstName lastName email")
      .populate("artisan", "firstName lastName businessName");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check authorization
    if (
      payment.customer._id.toString() !== req.user.id &&
      payment.artisan._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment",
      error: error.message,
    });
  }
};
