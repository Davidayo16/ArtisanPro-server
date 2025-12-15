import Transaction from '../../models/Transaction.js';
import Artisan from '../../models/Artisan.js';
import { createTransferRecipient, initiateTransfer } from './paystackService.js';

// Process artisan payout
export const processArtisanPayout = async (artisanId, amount, bookingId, reference) => {
  try {
    const artisan = await Artisan.findById(artisanId);

    if (!artisan) {
      throw new Error('Artisan not found');
    }

    if (!artisan.bankDetails || !artisan.bankDetails.accountNumber) {
      throw new Error('Artisan bank details not found');
    }

    // Create transfer recipient if not exists
    let recipientCode = artisan.paystackRecipientCode;

    if (!recipientCode) {
      const recipient = await createTransferRecipient(
        artisan.bankDetails.accountName,
        artisan.bankDetails.accountNumber,
        artisan.bankDetails.bankCode
      );
      recipientCode = recipient.recipient_code;
      
      // Save recipient code
      artisan.paystackRecipientCode = recipientCode;
      await artisan.save();
    }

    // Initiate transfer
    const transfer = await initiateTransfer(
      recipientCode,
      amount,
      reference,
      `Payout for booking`
    );

    // Update transaction
    await Transaction.findOneAndUpdate(
      { reference },
      {
        status: transfer.status === 'success' ? 'successful' : 'pending',
        metadata: transfer,
      }
    );

    // Update artisan earnings
    artisan.totalEarnings = (artisan.totalEarnings || 0) + amount;
    await artisan.save();

    return transfer;
  } catch (error) {
    console.error('❌ Process payout error:', error);
    
    // Mark transaction as failed
    await Transaction.findOneAndUpdate(
      { reference },
      { status: 'failed', metadata: { error: error.message } }
    );

    throw new Error(`Payout failed: ${error.message}`);
  }
};

// Get pending payouts
export const getPendingPayouts = async () => {
  try {
    const pendingPayouts = await Transaction.find({
      type: 'payout',
      status: 'pending',
    })
      .populate('user', 'firstName lastName businessName')
      .populate('booking', 'bookingNumber')
      .sort({ createdAt: 1 });

    return pendingPayouts;
  } catch (error) {
    console.error('❌ Get pending payouts error:', error);
    throw new Error(`Failed to get pending payouts: ${error.message}`);
  }
};

// Process batch payouts
export const processBatchPayouts = async () => {
  try {
    const pendingPayouts = await getPendingPayouts();

    console.log(`Found ${pendingPayouts.length} pending payouts`.yellow);

    const results = {
      success: [],
      failed: [],
    };

    for (const payout of pendingPayouts) {
      try {
        await processArtisanPayout(
          payout.user._id,
          payout.amount,
          payout.booking._id,
          payout.reference
        );
        results.success.push(payout.reference);
        console.log(`✅ Payout successful: ${payout.reference}`.green);
      } catch (error) {
        results.failed.push({
          reference: payout.reference,
          error: error.message,
        });
        console.error(`❌ Payout failed: ${payout.reference}`.red);
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Batch payout error:', error);
    throw new Error(`Failed to process batch payouts: ${error.message}`);
  }
};