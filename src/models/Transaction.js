import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    type: {
      type: String,
      enum: ['payment', 'refund', 'payout', 'fee', 'reversal'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed'],
      default: 'pending',
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    balanceBefore: Number,
    balanceAfter: Number,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ reference: 1 });
TransactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);

export default Transaction;