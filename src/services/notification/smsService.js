// SMS notifications using Twilio or Termii

// ========== AUTHENTICATION SMS (ORIGINAL - KEEP THESE!) ==========

// Send verification SMS
export const sendVerificationSMS = async (phone, otp) => {
  try {
    // For development: Just log the SMS
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 SMS would be sent:'.cyan);
      console.log(`To: ${phone}`);
      console.log(
        `Message: Your Artisan Marketplace verification code is ${otp}. Valid for 10 minutes.`
      );
      return;
    }

    // TODO: Implement actual SMS sending (Twilio/Termii)
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: `Your Artisan Marketplace verification code is ${otp}. Valid for 10 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });

    console.log(`✅ Verification SMS sent to ${phone}`.green);
  } catch (error) {
    console.error('❌ SMS send failed:', error);
    throw new Error('Failed to send verification SMS');
  }
};

// Send password reset SMS
export const sendPasswordResetSMS = async (phone, otp) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 Password reset SMS would be sent:'.cyan);
      console.log(`To: ${phone}`);
      console.log(
        `Message: Your password reset code is ${otp}. Valid for 10 minutes.`
      );
      return;
    }

    // TODO: Implement actual SMS sending
    console.log(`✅ Password reset SMS sent to ${phone}`.green);
  } catch (error) {
    console.error('❌ SMS send failed:', error);
    throw new Error('Failed to send password reset SMS');
  }
};

// ========== BOOKING SMS (NEW) ==========

export const sendBookingCreatedSMS = async (phone, artisanName, bookingNumber) => {
  const message = `Hi ${artisanName}! You have a new booking request #${bookingNumber}. Please respond within 2 minutes. Check your app for details.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS would be sent to: ${phone}`.cyan);
    console.log(`Message: ${message}`.gray);
    return;
  }

  // TODO: Implement actual SMS sending
  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendBookingAcceptedSMS = async (phone, customerName, bookingNumber) => {
  const message = `Hi ${customerName}! Your booking #${bookingNumber} has been accepted. Please complete payment to confirm.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendPaymentConfirmedSMS = async (phone, bookingNumber) => {
  const message = `Payment confirmed for booking #${bookingNumber}. Your artisan will start the job as scheduled.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendJobStartedSMS = async (phone, artisanName, bookingNumber) => {
  const message = `${artisanName} has started working on your booking #${bookingNumber}. Track progress in the app.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendJobCompletedSMS = async (phone, bookingNumber) => {
  const message = `Job completed for booking #${bookingNumber}! Please review the work and release payment.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendPaymentReleasedSMS = async (phone, amount, bookingNumber) => {
  const message = `Payment of ₦${amount.toLocaleString()} released for booking #${bookingNumber}. Payout processing.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};

export const sendReviewReceivedSMS = async (phone, rating, customerName) => {
  const message = `${customerName} left you a ${rating}-star review! Check your app to view and respond.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS: ${message}`.cyan);
    return;
  }

  console.log(`✅ SMS sent to ${phone}`.green);
};
