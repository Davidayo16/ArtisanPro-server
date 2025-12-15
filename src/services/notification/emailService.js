import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generic email sender
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    };

  

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`.green);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('Failed to send email');
  }
};

// ========== AUTHENTICATION EMAILS (ORIGINAL - KEEP THESE!) ==========

// Send verification email
export const sendVerificationEmail = async (email, otp, firstName) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email - Artisan Marketplace",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${firstName}!</h2>
          <p>Thank you for registering with Artisan Marketplace.</p>
          <p>Your email verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 2 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Artisan Marketplace Team</p>
        </div>
      `,
    };

    // if (process.env.NODE_ENV === 'development') {
    //   console.log('📧 Email would be sent:'.cyan);
    //   console.log(`To: ${email}`);
    //   console.log(`Subject: ${mailOptions.subject}`);
    //   console.log(`OTP: ${otp}`);
    //   return;
    // }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`.green);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, otp, firstName) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset - Artisan Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${firstName}!</h2>
          <p>You requested to reset your password.</p>
          <p>Your password reset code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #d9534f;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Artisan Marketplace Team</p>
        </div>
      `,
    };

    // if (process.env.NODE_ENV === 'development') {
    //   console.log('📧 Password reset email would be sent:'.cyan);
    //   console.log(`To: ${email}`);
    //   console.log(`OTP: ${otp}`);
    //   return;
    // }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`.green);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('Failed to send password reset email');
  }
};

// ========== BOOKING EMAILS (NEW) ==========

// Booking created notification (to artisan)
export const sendBookingCreatedEmail = async (artisan, booking, customer) => {
  const subject = 'New Booking Request!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hi ${artisan.firstName}!</h2>
      <p>You have a new booking request from <strong>${customer.firstName} ${customer.lastName}</strong>.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Booking Details:</h3>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
        <p><strong>Scheduled:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()} at ${booking.scheduledTime}</p>
        <p><strong>Estimated Price:</strong> ₦${booking.estimatedPrice?.toLocaleString() || 'TBD'}</p>
      </div>

      <p style="color: #d9534f; font-weight: bold;">⏰ Please respond within 2 minutes!</p>

      <a href="${process.env.CLIENT_URL}/artisan/bookings/${booking._id}" 
         style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        View Booking
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(artisan.email, subject, html);
};

// Booking accepted notification (to customer)
export const sendBookingAcceptedEmail = async (customer, booking, artisan) => {
  const subject = 'Booking Accepted!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Great News!</h2>
      <p><strong>${artisan.businessName || artisan.firstName}</strong> has accepted your booking!</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Booking Details:</h3>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
        <p><strong>Price:</strong> ₦${booking.agreedPrice?.toLocaleString()}</p>
        <p><strong>Total Amount:</strong> ₦${booking.totalAmount?.toLocaleString()}</p>
      </div>

      <p><strong>Next Step:</strong> Complete payment to confirm your booking.</p>

      <a href="${process.env.CLIENT_URL}/customer/bookings/${booking._id}/payment" 
         style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        Pay Now
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(customer.email, subject, html);
};

// Payment confirmation (to customer)
export const sendPaymentConfirmationEmail = async (customer, booking, payment) => {
  const subject = 'Payment Confirmed!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Payment Successful!</h2>
      <p>Your payment has been received and held securely.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details:</h3>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Amount Paid:</strong> ₦${payment.totalAmount.toLocaleString()}</p>
        <p><strong>Payment Reference:</strong> ${payment.paymentReference}</p>
        <p><strong>Date:</strong> ${new Date(payment.paidAt).toLocaleString()}</p>
      </div>

      <p>Your payment is held securely until the job is completed.</p>

      <a href="${process.env.CLIENT_URL}/customer/bookings/${booking._id}" 
         style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        View Booking
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(customer.email, subject, html);
};

// Job started notification (to customer)
export const sendJobStartedEmail = async (customer, booking, artisan) => {
  const subject = 'Job Started!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">Job Started!</h2>
      <p><strong>${artisan.businessName || artisan.firstName}</strong> has started working on your job.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Started at:</strong> ${new Date(booking.startedAt).toLocaleString()}</p>
      </div>

      <a href="${process.env.CLIENT_URL}/customer/bookings/${booking._id}/track" 
         style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        Track Artisan
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(customer.email, subject, html);
};

// Job completed notification (to customer)
export const sendJobCompletedEmail = async (customer, booking, artisan) => {
  const subject = 'Job Completed - Please Review';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Job Completed!</h2>
      <p><strong>${artisan.businessName || artisan.firstName}</strong> has marked your job as completed.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Completed at:</strong> ${new Date(booking.completedAt).toLocaleString()}</p>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Review the completed work</li>
        <li>Release payment if satisfied</li>
        <li>Leave a review</li>
      </ol>

      <p style="color: #f0ad4e;">⏰ Payment will be automatically released in 48 hours if no action is taken.</p>

      <a href="${process.env.CLIENT_URL}/customer/bookings/${booking._id}" 
         style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        Review & Release Payment
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(customer.email, subject, html);
};

// Payment released notification (to artisan)
export const sendPaymentReleasedEmail = async (artisan, booking, amount) => {
  const subject = 'Payment Released!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Payment Released!</h2>
      <p>Great news! Payment has been released for your completed job.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details:</h3>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
        <p><strong>Status:</strong> Processing payout</p>
      </div>

      <p>Your payout will be processed within 24 hours and transferred to your bank account.</p>

      <a href="${process.env.CLIENT_URL}/artisan/earnings" 
         style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        View Earnings
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(artisan.email, subject, html);
};

// Review received notification
export const sendReviewReceivedEmail = async (artisan, review, customer) => {
  const subject = 'You Received a New Review!';
  const stars = '⭐'.repeat(review.rating);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">New Review Received!</h2>
      <p><strong>${customer.firstName} ${customer.lastName}</strong> left you a review.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Rating: ${stars} (${review.rating}/5)</h3>
        ${review.comment ? `<p style="font-style: italic;">"${review.comment}"</p>` : ''}
      </div>

      <a href="${process.env.CLIENT_URL}/artisan/reviews" 
         style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        View All Reviews
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(artisan.email, subject, html);
};

// Booking reminder (24 hours before)
export const sendBookingReminderEmail = async (user, booking, role) => {
  const subject = 'Booking Reminder - Tomorrow';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f0ad4e;">Booking Reminder</h2>
      <p>This is a reminder about your upcoming booking tomorrow.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Booking Details:</h3>
        <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
        <p><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${booking.scheduledTime}</p>
        <p><strong>Location:</strong> ${booking.location.address}</p>
      </div>

      <a href="${process.env.CLIENT_URL}/${role}/bookings/${booking._id}" 
         style="display: inline-block; background: #f0ad4e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
        View Details
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Artisan Marketplace</p>
    </div>
  `;

  await sendEmail(user.email, subject, html);
};

export { sendEmail };