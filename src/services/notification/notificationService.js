import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import {
  sendBookingCreatedEmail,
  sendBookingAcceptedEmail,
  sendPaymentConfirmationEmail,
  sendJobStartedEmail,
  sendJobCompletedEmail,
  sendPaymentReleasedEmail,
  sendReviewReceivedEmail,
} from "./emailService.js";
import {
  sendBookingCreatedSMS,
  sendBookingAcceptedSMS,
  sendPaymentConfirmedSMS,
  sendJobStartedSMS,
  sendJobCompletedSMS,
} from "./smsService.js";
import { sendPushNotification } from "./pushService.js";

// Create in-app notification
export const createNotification = async (
  recipientId,
  type,
  title,
  message,
  data = {}
) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data,
    });

    // Send push notification
    await sendPushNotification(recipientId, title, message, data);

    return notification;
  } catch (error) {
    console.error("❌ Create notification error:", error);
    throw error;
  }
};

// Send notification (email + SMS + in-app + push)
export const sendNotification = async (userId, type, data) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Check user's notification preferences
    const preferences = user.notificationPreferences || {
      email: true,
      sms: true,
      push: true,
    };

    // Handle different notification types
    switch (type) {
      case "booking_created":
        await handleBookingCreatedNotification(user, data, preferences);
        break;
      case "booking_accepted":
        await handleBookingAcceptedNotification(user, data, preferences);
        break;
      case "payment_confirmed":
        await handlePaymentConfirmedNotification(user, data, preferences);
        break;
      case "job_started":
        await handleJobStartedNotification(user, data, preferences);
        break;
      case "job_completed":
        await handleJobCompletedNotification(user, data, preferences);
        break;
      case "payment_released":
        await handlePaymentReleasedNotification(user, data, preferences);
        break;
      case "review_received":
        await handleReviewReceivedNotification(user, data, preferences);
        break;
      default:
        console.log(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    console.error("❌ Send notification error:", error);
  }
};

// Handlers for each notification type
const handleBookingCreatedNotification = async (
  artisan,
  { booking, customer },
  preferences
) => {
  // In-app notification
  await createNotification(
    artisan._id,
    "booking_created",
    "New Booking Request!",
    `${customer.firstName} ${customer.lastName} requested a booking. Respond within 2 minutes!`,
    { bookingId: booking._id, bookingNumber: booking.bookingNumber }
  );

  // Email
  if (preferences.email) {
    await sendBookingCreatedEmail(artisan, booking, customer);
  }

  // SMS
  if (preferences.sms && artisan.phone) {
    await sendBookingCreatedSMS(
      artisan.phone,
      artisan.firstName,
      booking.bookingNumber
    );
  }
};

const handleBookingAcceptedNotification = async (
  customer,
  { booking, artisan },
  preferences
) => {
  await createNotification(
    customer._id,
    "booking_accepted",
    "Booking Accepted!",
    `${
      artisan.businessName || artisan.firstName
    } accepted your booking. Complete payment now.`,
    { bookingId: booking._id, bookingNumber: booking.bookingNumber }
  );

  if (preferences.email) {
    await sendBookingAcceptedEmail(customer, booking, artisan);
  }

  if (preferences.sms && customer.phone) {
    await sendBookingAcceptedSMS(
      customer.phone,
      customer.firstName,
      booking.bookingNumber
    );
  }
};

const handlePaymentConfirmedNotification = async (
  user,
  { booking, payment },
  preferences
) => {
  await createNotification(
    user._id,
    "payment_received",
    "Payment Confirmed!",
    `Payment of ₦${payment.totalAmount.toLocaleString()} confirmed for booking #${
      booking.bookingNumber
    }`,
    { bookingId: booking._id, paymentId: payment._id }
  );

  if (preferences.email) {
    await sendPaymentConfirmationEmail(user, booking, payment);
  }

  if (preferences.sms && user.phone) {
    await sendPaymentConfirmedSMS(user.phone, booking.bookingNumber);
  }
};

const handleJobStartedNotification = async (
  customer,
  { booking, artisan },
  preferences
) => {
  await createNotification(
    customer._id,
    "booking_started",
    "Job Started!",
    `${
      artisan.businessName || artisan.firstName
    } has started working on your job.`,
    { bookingId: booking._id }
  );

  if (preferences.email) {
    await sendJobStartedEmail(customer, booking, artisan);
  }

  if (preferences.sms && customer.phone) {
    await sendJobStartedSMS(
      customer.phone,
      artisan.businessName || artisan.firstName,
      booking.bookingNumber
    );
  }
};

const handleJobCompletedNotification = async (
  customer,
  { booking, artisan },
  preferences
) => {
  await createNotification(
    customer._id,
    "booking_completed",
    "Job Completed!",
    `${
      artisan.businessName || artisan.firstName
    } has completed your job. Please review and release payment.`,
    { bookingId: booking._id }
  );

  if (preferences.email) {
    await sendJobCompletedEmail(customer, booking, artisan);
  }

  if (preferences.sms && customer.phone) {
    await sendJobCompletedSMS(customer.phone, booking.bookingNumber);
  }
};

const handlePaymentReleasedNotification = async (
  artisan,
  { booking, amount },
  preferences
) => {
  await createNotification(
    artisan._id,
    "payment_released",
    "Payment Released!",
    `Payment of ₦${amount.toLocaleString()} has been released. Payout will be processed soon.`,
    { bookingId: booking._id }
  );

  if (preferences.email) {
    await sendPaymentReleasedEmail(artisan, booking, amount);
  }
};

const handleReviewReceivedNotification = async (
  artisan,
  { review, customer },
  preferences
) => {
  await createNotification(
    artisan._id,
    "review_received",
    "New Review Received!",
    `${customer.firstName} ${customer.lastName} left you a ${review.rating}-star review.`,
    { reviewId: review._id }
  );

  if (preferences.email) {
    await sendReviewReceivedEmail(artisan, review, customer);
  }
};
