import Escrow from "../../models/Escrow.js";
import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";
import Transaction from "../../models/Transaction.js";
import Artisan from "../../models/Artisan.js";
import Customer from "../../models/Customer.js";

// Create escrow after successful payment
export const createEscrow = async (bookingId, paymentId) => {
  try {
    const payment = await Payment.findById(paymentId);
    const booking = await Booking.findById(bookingId);

    if (!payment || !booking) {
      throw new Error("Payment or booking not found");
    }

    // Check if escrow already exists for this booking
    const existingEscrow = await Escrow.findOne({ booking: bookingId });

    if (existingEscrow) {
      console.log(
        `⚠️ Escrow already exists for booking ${bookingId}, returning existing escrow`
      );
      return existingEscrow;
    }

    // Calculate auto-release time (48 hours from now)
    const autoReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const escrow = await Escrow.create({
      booking: bookingId,
      payment: paymentId,
      customer: payment.customer,
      artisan: payment.artisan,
      amount: payment.totalAmount,
      platformFee: payment.platformFee,
      artisanAmount: payment.artisanAmount,
      status: "held",
      heldAt: new Date(),
      autoReleaseAt,
    });

    // Update booking
    booking.escrow = escrow._id;
    await booking.save();

    // Update customer total spent
    await Customer.findByIdAndUpdate(payment.customer, {
      $inc: {
        totalSpent: payment.amount,
        totalBookings: 1,
      },
    });

    console.log(`✅ Escrow created for booking ${bookingId}`);
    console.log(`✅ Customer totalSpent updated: +${payment.amount}`);

    return escrow;
  } catch (error) {
    // If it's a duplicate key error, fetch and return the existing escrow
    if (error.code === 11000) {
      console.log(
        `⚠️ Duplicate escrow detected for booking ${bookingId}, fetching existing...`
      );
      const existingEscrow = await Escrow.findOne({ booking: bookingId });
      if (existingEscrow) {
        return existingEscrow;
      }
    }

    console.error("❌ Create escrow error:", error);
    throw new Error(`Failed to create escrow: ${error.message}`);
  }
};

// Release escrow to artisan (NOW WITH TRANSACTION SUPPORT)
export const releaseEscrow = async (
  escrowId,
  releaseType = "manual",
  releasedBy = null,
  session = null // ✅ Accept optional session for transactions
) => {
  try {
    const escrow = await Escrow.findById(escrowId)
      .populate("artisan")
      .populate("booking")
      .session(session); // ✅ Use session if provided

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error(
        `Escrow is not in held status. Current: ${escrow.status}`
      );
    }

    escrow.status = "released";
    escrow.releasedAt = new Date();
    escrow.releaseType = releaseType;
    escrow.releasedBy = releasedBy;

    await escrow.save({ session }); // ✅ Save with session

    // Update artisan total earnings (with session)
    await Artisan.findByIdAndUpdate(
      escrow.artisan._id,
      {
        $inc: { totalEarnings: escrow.artisanAmount },
      },
      { session } // ✅ Update with session
    );

    // Create transaction record (with session)
    await Transaction.create(
      [
        {
          user: escrow.artisan._id,
          booking: escrow.booking._id,
          payment: escrow.payment,
          type: "payout",
          amount: escrow.artisanAmount,
          status: "pending",
          description: `Payout for booking ${escrow.booking.bookingNumber}`,
          reference: `PAYOUT-${Date.now()}-${escrow._id}`,
        },
      ],
      { session } // ✅ Create with session (note: array format required)
    );

    console.log(`✅ Escrow ${escrowId} released successfully`);

    return escrow;
  } catch (error) {
    console.error("❌ Release escrow error:", error);
    throw new Error(`Failed to release escrow: ${error.message}`);
  }
};

// Refund escrow to customer (NOW WITH TRANSACTION SUPPORT)
export const refundEscrow = async (escrowId, reason, session = null) => {
  try {
    const escrow = await Escrow.findById(escrowId).session(session);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error(
        `Escrow is not in held status. Current: ${escrow.status}`
      );
    }

    escrow.status = "refunded";
    escrow.refundedAt = new Date();
    escrow.refundReason = reason;

    await escrow.save({ session });

    // Decrease customer's totalSpent and totalBookings
    await Customer.findByIdAndUpdate(
      escrow.customer,
      {
        $inc: {
          totalSpent: -escrow.amount,
          totalBookings: -1,
        },
      },
      { session }
    );

    // Create transaction record
    await Transaction.create(
      [
        {
          user: escrow.customer,
          booking: escrow.booking,
          payment: escrow.payment,
          type: "refund",
          amount: escrow.amount,
          status: "pending",
          description: `Refund for booking - ${reason}`,
          reference: `REFUND-${Date.now()}-${escrow._id}`,
        },
      ],
      { session }
    );

    console.log(
      `✅ Refund processed: Customer totalSpent decreased by ${escrow.amount}`
    );

    return escrow;
  } catch (error) {
    console.error("❌ Refund escrow error:", error);
    throw new Error(`Failed to refund escrow: ${error.message}`);
  }
};

// Get escrow by booking
export const getEscrowByBooking = async (bookingId) => {
  try {
    const escrow = await Escrow.findOne({ booking: bookingId })
      .populate("payment")
      .populate("customer", "firstName lastName email")
      .populate("artisan", "firstName lastName businessName");

    return escrow;
  } catch (error) {
    console.error("❌ Get escrow error:", error);
    throw new Error(`Failed to get escrow: ${error.message}`);
  }
};
