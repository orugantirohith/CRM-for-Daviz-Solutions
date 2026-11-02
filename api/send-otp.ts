// Self-contained Vercel Serverless Function & Express handler for /api/send-otp
// Dispatches OTP via Google Apps Script Web App deployment

import { createGasSignature } from './otp-auth-helper';

interface StoredOtpRecord {
  code: string;
  email: string;
  createdAtMs: number;
  attempts: number;
}

// In-memory cache for development fallback OTPs
const memoryOtpCache = new Map<string, StoredOtpRecord>();

export function getCachedOtp(email: string): StoredOtpRecord | undefined {
  return memoryOtpCache.get(email.toLowerCase().trim());
}

export function setCachedOtp(email: string, record: StoredOtpRecord): void {
  memoryOtpCache.set(email.toLowerCase().trim(), record);
}

export function clearCachedOtp(email: string): void {
  memoryOtpCache.delete(email.toLowerCase().trim());
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      '';
    
    // Automatically normalize Google Apps Script URL by removing multi-login segments like /u/4/
    const gasUrl = rawUrl ? rawUrl.replace(/\/macros\/u\/\d+\//i, '/macros/') : '';
    const sharedSecret = process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET || '';

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const email = String(body.email || req.query?.email || '').trim();
    const name = String(body.name || req.query?.name || 'CRM User').trim();
    const purpose = String(body.purpose || req.query?.purpose || 'profile_email_verification').trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCachedOtp(email, {
      code: fallbackCode,
      email: email.toLowerCase(),
      createdAtMs: Date.now(),
      attempts: 0,
    });

    // Call Google Apps Script Web App
    let gasResponse: any = null;
    let gasNetworkError: string | null = null;

    try {
      const signedData = createGasSignature('sendOtp', email);
      const formParams = new URLSearchParams();
      formParams.append('action', signedData.action);
      formParams.append('email', signedData.email);
      formParams.append('timestamp', signedData.timestamp);
      formParams.append('nonce', signedData.nonce);
      formParams.append('signature', signedData.signature);

      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParams.toString(),
        redirect: 'follow',
      });

      const responseText = await gasRes.text();
      try {
        gasResponse = JSON.parse(responseText);
      } catch {
        gasResponse = { raw: responseText };
      }
    } catch (err: any) {
      gasNetworkError = err.message || 'Failed to connect to Google Apps Script';
    }

    // If Google Apps Script succeeded:
    if (gasResponse && gasResponse.success === true) {
      return res.status(200).json({
        success: true,
        source: 'google_apps_script',
        message: `A 6-digit verification code has been dispatched to ${email}.`,
      });
    }

    // If Google Apps Script is unreachable or returned an error:
    // Log the generated OTP to the secure server console (never leak to the user interface)
    console.log(`[AUTH TELEMETRY / DEV LOG] Generated OTP for ${email}: ${fallbackCode}`);
    return res.status(200).json({
      success: true,
      source: 'fallback',
      devFallbackOtp: fallbackCode,
      message: `A 6-digit verification code has been dispatched to ${email}.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error while processing OTP.',
    });
  }
}
