/**
 * OTP Verification Business Rules
 * - 6-digit numeric code
 * - 10-minute expiry
 * - 60-second resend cooldown
 * - Max 5 attempts
 * - Purpose bound (e.g. 'profile_email_verification')
 */

export const OTP_CONFIG = {
  CODE_LENGTH: 6,
  EXPIRY_MINUTES: 10,
  EXPIRY_MS: 10 * 60 * 1000,
  RESEND_COOLDOWN_SECONDS: 60,
  RESEND_COOLDOWN_MS: 60 * 1000,
  MAX_ATTEMPTS: 5,
};

export interface OtpValidationResult {
  valid: boolean;
  error?: string;
}

export function isValidOtpFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim());
}

export function checkOtpExpiry(createdAtMs: number, nowMs: number = Date.now()): boolean {
  return nowMs - createdAtMs <= OTP_CONFIG.EXPIRY_MS;
}

export function getRemainingCooldownSeconds(
  lastSentMs: number,
  nowMs: number = Date.now()
): number {
  const elapsed = nowMs - lastSentMs;
  if (elapsed >= OTP_CONFIG.RESEND_COOLDOWN_MS) return 0;
  return Math.ceil((OTP_CONFIG.RESEND_COOLDOWN_MS - elapsed) / 1000);
}

export function validateOtpAttempt(
  enteredOtp: string,
  targetEmail: string,
  state: {
    attempts: number;
    createdAtMs: number;
    isVerified: boolean;
  }
): OtpValidationResult {
  if (state.isVerified) {
    return { valid: false, error: 'This verification request has already been used.' };
  }

  if (state.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    return {
      valid: false,
      error: 'Maximum verification attempts exceeded. Please request a new code.',
    };
  }

  if (!checkOtpExpiry(state.createdAtMs)) {
    return { valid: false, error: 'Verification code has expired (valid for 10 minutes).' };
  }

  if (!isValidOtpFormat(enteredOtp)) {
    return { valid: false, error: 'Please enter a valid 6-digit numeric verification code.' };
  }

  return { valid: true };
}
