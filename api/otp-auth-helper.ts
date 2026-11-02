import crypto from 'crypto';

export function createGasSignature(
  action: 'sendOtp' | 'verifyOtp',
  email: string,
  otp: string = ''
) {
  const secret =
    process.env.CRM_HMAC_SECRET ||
    process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET ||
    '';

  // UNIX timestamp in seconds
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // 32-character hex nonce
  const nonce = crypto.randomBytes(16).toString('hex');
  const normalizedEmail = email.trim().toLowerCase();
  const otpVal = action === 'verifyOtp' ? otp.trim() : '';

  // Canonical message UTF-8: timestamp + "\n" + nonce + "\n" + action + "\n" + normalizedEmail + "\n" + otp
  const canonical = [timestamp, nonce, action, normalizedEmail, otpVal].join('\n');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(canonical, 'utf8')
    .digest('hex')
    .toLowerCase();

  return {
    action,
    email: normalizedEmail,
    otp: otpVal,
    timestamp,
    nonce,
    signature,
  };
}
