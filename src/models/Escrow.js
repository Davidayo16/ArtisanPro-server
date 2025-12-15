import mongoose from 'mongoose';

const EscrowSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
    },
    artisanAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['held', 'released', 'refunded', 'disputed'],
      default: 'held',
    },
    heldAt: {
      type: Date,
      default: Date.now,
    },
    releasedAt: Date,
    refundedAt: Date,
    autoReleaseAt: Date, // 48 hours after job completion
    releaseType: {
      type: String,
      enum: ['manual', 'auto', 'admin'],
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    refundReason: String,
    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
    },
  },
  {
    timestamps: true,
  }
);

EscrowSchema.index({ booking: 1 });
EscrowSchema.index({ status: 1, autoReleaseAt: 1 });

const Escrow = mongoose.model('Escrow', EscrowSchema);

export default Escrow;