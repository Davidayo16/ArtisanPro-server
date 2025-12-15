export const ROLES = {
  CUSTOMER: 'customer',
  ARTISAN: 'artisan',
  ADMIN: 'admin',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  NOT_INITIATED: 'not_initiated',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const ESCROW_STATUS = {
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
};

export const NEGOTIATION_STATUS = {
  PENDING: 'pending',
  AGREED: 'agreed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const PRICE_TYPE = {
  FIXED: 'fixed',
  HOURLY: 'hourly',
  CUSTOM: 'custom',
};

export const URGENCY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
};

export const URGENCY_MULTIPLIER = {
  normal: 1,
  urgent: 1.5,
  emergency: 2.0,
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const DISPUTE_STATUS = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const NOTIFICATION_TYPE = {
  BOOKING: 'booking',
  PAYMENT: 'payment',
  MESSAGE: 'message',
  REVIEW: 'review',
  SYSTEM: 'system',
};

export const PLATFORM_FEE_PERCENTAGE = 5;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES = 5;
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];

export const BOOKING_ACCEPT_TIMEOUT = 120; // 2 minutes
export const AUTO_RELEASE_TIMEOUT = 48 * 60 * 60; // 48 hours
export const NEGOTIATION_MAX_ROUNDS = 3;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;