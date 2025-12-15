import { paystackAxios } from '../../config/paystack.js';

// Initialize payment
export const initializePayment = async (email, amount, reference, metadata = {}) => {
  try {
    const response = await paystackAxios.post('/transaction/initialize', {
      email,
      amount: Math.round(amount * 100), // Convert to kobo
      reference,
      currency: 'NGN',
      metadata,
      callback_url: `${process.env.CLIENT_URL}/payment/callback`,
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ Paystack initialize error:', error.response?.data || error.message);
    throw new Error(`Payment initialization failed: ${error.response?.data?.message || error.message}`);
  }
};

// Verify payment
export const verifyPayment = async (reference) => {
  try {
    const response = await paystackAxios.get(`/transaction/verify/${reference}`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Paystack verify error:', error.response?.data || error.message);
    throw new Error(`Payment verification failed: ${error.response?.data?.message || error.message}`);
  }
};

// Initiate transfer (payout to artisan)
export const initiateTransfer = async (recipientCode, amount, reference, reason) => {
  try {
    const response = await paystackAxios.post('/transfer', {
      source: 'balance',
      recipient: recipientCode,
      amount: Math.round(amount * 100), // Convert to kobo
      reference,
      reason,
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ Paystack transfer error:', error.response?.data || error.message);
    throw new Error(`Transfer failed: ${error.response?.data?.message || error.message}`);
  }
};

// Create transfer recipient (artisan bank details)
export const createTransferRecipient = async (name, accountNumber, bankCode) => {
  try {
    const response = await paystackAxios.post('/transferrecipient', {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ Create recipient error:', error.response?.data || error.message);
    throw new Error(`Failed to create recipient: ${error.response?.data?.message || error.message}`);
  }
};

// Verify bank account
export const verifyBankAccount = async (accountNumber, bankCode) => {
  try {
    const response = await paystackAxios.get('/bank/resolve', {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ Verify bank account error:', error.response?.data || error.message);
    throw new Error(`Account verification failed: ${error.response?.data?.message || error.message}`);
  }
};

// Get list of banks
export const getBanks = async () => {
  try {
    const response = await paystackAxios.get('/bank');
    return response.data.data;
  } catch (error) {
    console.error('❌ Get banks error:', error.response?.data || error.message);
    throw new Error(`Failed to get banks: ${error.response?.data?.message || error.message}`);
  }
};

// Refund payment
export const refundPayment = async (reference, amount = null) => {
  try {
    const data = { transaction: reference };
    if (amount) {
      data.amount = Math.round(amount * 100);
    }

    const response = await paystackAxios.post('/refund', data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Refund error:', error.response?.data || error.message);
    throw new Error(`Refund failed: ${error.response?.data?.message || error.message}`);
  }
};