import crypto from "crypto";
import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";
import { createEscrow } from "../../services/payment/escrowService.js";

// @desc    Paystack webhook
// @route   POST /api/v1/payments/webhook
// @access  Public (but verified)
export const paystackWebhook = async (req, res) => {
  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const event = req.body;

    console.log(`📩 Webhook received: ${event.event}`.cyan);

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data);
        break;

      case "transfer.success":
        await handleTransferSuccess(event.data);
        break;

      case "transfer.failed":
        await handleTransferFailed(event.data);
        break;

      default:
        console.log(`Unhandled event: ${event.event}`.yellow);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

// Handle successful charge
const handleChargeSuccess = async (data) => {
  try {
    const payment = await Payment.findOne({
      paystackReference: data.reference,
    });

    if (!payment) {
      console.log("Payment not found for reference:", data.reference);
      return;
    }

    if (payment.status === "successful") {
      console.log("Payment already processed");
      return;
    }

    // Update payment
    payment.status = "successful";
    payment.paidAt = new Date();
    payment.paystackResponse = data;
    await payment.save();

    // Update booking
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      booking.payment = payment._id;
      booking.confirmedAt = new Date();
      await booking.save();

      // Create escrow
      await createEscrow(booking._id, payment._id);

      console.log(`✅ Payment processed: ${payment.paymentReference}`.green);
    }
  } catch (error) {
    console.error("❌ Handle charge success error:", error);
  }
};

// Handle failed charge
const handleChargeFailed = async (data) => {
  try {
    const payment = await Payment.findOne({
      paystackReference: data.reference,
    });

    if (!payment) {
      console.log("Payment not found for reference:", data.reference);
      return;
    }

    payment.status = "failed";
    payment.failedAt = new Date();
    payment.failureReason = data.gateway_response;
    await payment.save();

    console.log(`❌ Payment failed: ${payment.paymentReference}`.red);
  } catch (error) {
    console.error("❌ Handle charge failed error:", error);
  }
};

// Handle successful transfer (payout)
const handleTransferSuccess = async (data) => {
  try {
    console.log(`✅ Transfer successful: ${data.reference}`.green);
    // Update transaction status if needed
  } catch (error) {
    console.error("❌ Handle transfer success error:", error);
  }
};

// Handle failed transfer
const handleTransferFailed = async (data) => {
  try {
    console.log(`❌ Transfer failed: ${data.reference}`.red);
    // Handle failed payout
  } catch (error) {
    console.error("❌ Handle transfer failed error:", error);
  }
};
