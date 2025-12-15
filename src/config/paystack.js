import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const paystackConfig = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseURL: 'https://api.paystack.co',
};

// Create axios instance for Paystack
export const paystackAxios = axios.create({
  baseURL: paystackConfig.baseURL,
  headers: {
    Authorization: `Bearer ${paystackConfig.secretKey}`,
    'Content-Type': 'application/json',
  },
});

// Test Paystack connection
export const testPaystackConnection = async () => {
  try {
    const response = await paystackAxios.get('/bank');
    console.log('✅ Paystack Connected'.green.bold);
    return true;
  } catch (error) {
    console.error('❌ Paystack Connection Failed:'.red, error.message);
    return false;
  }
};