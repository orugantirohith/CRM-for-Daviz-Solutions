/**
 * DAVIZ Solutions CRM — OTP / Email Verification ONLY
 * Google Apps Script Web App (Code.gs)
 *
 * This script is intentionally separate from CRM database integration.
 * It does NOT create or update leads, companies, visits, tasks, or other CRM data.
 *
 * Spreadsheet used for OTP audit/settings:
 * 1PBXJTaEcO0mTOHRjpGOf5ds8q4ljIYDFtFtMNtkxbKk
 *
 * Actions (requests must be signed by your trusted CRM backend):
 *   POST action=sendOtp   email=user@example.com timestamp=... nonce=... signature=...
 *   POST action=verifyOtp email=user@example.com otp=123456 timestamp=... nonce=... signature=...
 *
 * Canonical HMAC message (UTF-8):
 *   timestamp + "\n" + nonce + "\n" + action + "\n" + normalizedEmail + "\n" + otp
 * For sendOtp, otp must be an empty string.
 * Signature = lowercase hex HMAC-SHA256(canonical message, CRM_HMAC_SECRET).
 *
 * IMPORTANT:
 * - Never call this endpoint directly from public frontend JavaScript because that
 *   would expose the shared secret. Call it from your trusted backend only.
 * - Set CRM_HMAC_SECRET in Apps Script Project Settings > Script properties.
 * - OTP_PEPPER is generated automatically if absent; you may set your own secret.
 * - OTP values are not stored in the spreadsheet or logs. A hash is kept in cache.
 * - Supabase/PostgreSQL remains the CRM's primary database; this script handles OTP only.
 */

const OTP_CONFIG = Object.freeze({
  SPREADSHEET_ID: '1PBXJTaEcO0mTOHRjpGOf5ds8q4ljIYDFtFtMNtkxbKk',
  OTP_SHEET: 'OTP_Verifications',
  SETTINGS_SHEET: 'OTP_Settings',
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 10 * 60,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_OTP_SENDS_PER_HOUR: 5,
  MAX_VERIFY_ATTEMPTS: 5,
  REQUEST_MAX_AGE_SECONDS: 300,
  EMAIL_SENDER_NAME: 'DAVIZ Solutions',
  TIMEZONE: 'Asia/Dubai'
});

const OTP_HEADERS = ['Timestamp', 'Email', 'Event', 'Result', 'Details'];
const SETTINGS_HEADERS = ['Setting', 'Value', 'Description'];

/** Run once manually from the Apps Script editor. Safe to run again. */
function setupOtpSheets() {
  const ss = getOtpSpreadsheet_();
  const otpSheet = ensureOtpSheet_(ss, OTP_CONFIG.OTP_SHEET, OTP_HEADERS);
  const settings = ensureOtpSheet_(ss, OTP_CONFIG.SETTINGS_SHEET, SETTINGS_HEADERS);

  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, 5, 3).setValues([
      ['OTP_TTL_MINUTES', String(OTP_CONFIG.OTP_TTL_SECONDS / 60), 'How long an OTP remains valid'],
      ['OTP_RESEND_COOLDOWN_SECONDS', String(OTP_CONFIG.RESEND_COOLDOWN_SECONDS), 'Minimum seconds between OTP emails'],
      ['MAX_OTP_SENDS_PER_HOUR', String(OTP_CONFIG.MAX_OTP_SENDS_PER_HOUR), 'Maximum OTP emails per email address per hour'],
      ['MAX_VERIFY_ATTEMPTS', String(OTP_CONFIG.MAX_VERIFY_ATTEMPTS), 'Maximum incorrect OTP attempts'],
      ['TIMEZONE', OTP_CONFIG.TIMEZONE, 'Timezone used for audit timestamps']
    ]);
  }

  [otpSheet, settings].forEach(sheet => {
    sheet.setFrozenRows(1);
    if (sheet.getLastColumn() > 0) {
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
      sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 5));
    }
  });

  return { success: true, message: 'DAVIZ OTP sheets are ready.' };
}

/** Web app entry point. All POST requests must come from the trusted CRM backend. */
function doPost(e) {
  let action = '';
  let email = '';
  try {
    const data = readOtpRequest_(e);
    action = String(data.action || '').trim();
    email = normalizeOtpEmail_(data.email);

    if (!action) return jsonOtp_({ success: false, message: 'Missing action.' });
    if (!verifySignedRequest_(data, action, email)) {
      logOtpEvent_(email, action || 'UNKNOWN', 'REJECTED', 'Invalid or expired request signature');
      return jsonOtp_({ success: false, message: 'Unauthorized request.' });
    }

    ensureOtpSheets_();
    switch (action) {
      case 'sendOtp':
        return jsonOtp_(sendOtp_(email));
      case 'verifyOtp':
        return jsonOtp_(verifyOtp_(email, String(data.otp || '').trim()));
      default:
        return jsonOtp_({ success: false, message: 'Unsupported action.' });
    }
  } catch (err) {
    logOtpEvent_(email, action || 'UNHANDLED_ERROR', 'FAILURE', String(err.message || err));
    return jsonOtp_({ success: false, message: 'The request could not be completed. Please try again later.' });
  }
}

/** Simple deployment health response; reveals no secrets or user data. */
function doGet() {
  return jsonOtp_({ success: true, service: 'DAVIZ CRM OTP Verification', actions: ['sendOtp', 'verifyOtp'] });
}

function sendOtp_(email) {
  if (!isValidOtpEmail_(email)) {
    return { success: false, message: 'Enter a valid email address.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const key = emailCacheKey_(email);
    const cooldownKey = 'otp_cooldown_' + key;
    const hourlyKey = 'otp_hourly_' + key;

    if (cache.get(cooldownKey)) {
      return { success: false, message: 'Please wait before requesting another code.' };
    }
    const sentCount = Number(cache.get(hourlyKey) || 0);
    if (sentCount >= OTP_CONFIG.MAX_OTP_SENDS_PER_HOUR) {
      return { success: false, message: 'Too many code requests. Please try again later.' };
    }

    const otp = generateOtp_();
    const expiresAt = Date.now() + OTP_CONFIG.OTP_TTL_SECONDS * 1000;
    const payload = {
      email: email,
      otpHash: sha256Hex_(email + ':' + otp + ':' + getOtpPepper_()),
      expiresAt: expiresAt,
      attempts: 0
    };

    // Cache stores only a hash of the OTP, never the plaintext OTP.
    cache.put('otp_' + key, JSON.stringify(payload), OTP_CONFIG.OTP_TTL_SECONDS);
    cache.put(cooldownKey, '1', OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
    cache.put(hourlyKey, String(sentCount + 1), 60 * 60);

    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Your DAVIZ Solutions verification code',
        body: 'Hello,\n\nYour DAVIZ Solutions email verification code is: ' + otp +
          '\n\nThis code expires in 10 minutes and can be used only once. Do not share it with anyone.' +
          '\n\nIf you did not request this code, you can ignore this email.\n\nRegards,\nDAVIZ Solutions',
        name: OTP_CONFIG.EMAIL_SENDER_NAME
      });
    } catch (mailError) {
      cache.remove('otp_' + key);
      logOtpEvent_(email, 'SEND_OTP', 'FAILURE', 'Email delivery failed');
      return { success: false, message: 'The verification email could not be sent. Please try again later.' };
    }

    logOtpEvent_(email, 'SEND_OTP', 'SUCCESS', 'Verification email sent; OTP not stored in sheet');
    return { success: true, message: 'A verification code has been sent to your email.', expiresInSeconds: OTP_CONFIG.OTP_TTL_SECONDS };
  } finally {
    lock.releaseLock();
  }
}

function verifyOtp_(email, otp) {
  if (!isValidOtpEmail_(email) || !new RegExp('^\\d{' + OTP_CONFIG.OTP_LENGTH + '}$').test(otp)) {
    return { success: false, message: 'Enter a valid email address and 6-digit code.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const key = 'otp_' + emailCacheKey_(email);
    const raw = cache.get(key);
    if (!raw) {
      logOtpEvent_(email, 'VERIFY_OTP', 'FAILURE', 'Missing or expired OTP');
      return { success: false, message: 'The code has expired or was not found. Request a new code.' };
    }

    const record = JSON.parse(raw);
    if (Date.now() > Number(record.expiresAt)) {
      cache.remove(key);
      logOtpEvent_(email, 'VERIFY_OTP', 'FAILURE', 'Expired OTP');
      return { success: false, message: 'The code has expired. Request a new code.' };
    }

    record.attempts = Number(record.attempts || 0) + 1;
    if (record.attempts > OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
      cache.remove(key);
      logOtpEvent_(email, 'VERIFY_OTP', 'FAILURE', 'Maximum attempts exceeded');
      return { success: false, message: 'Too many incorrect attempts. Request a new code.' };
    }

    const suppliedHash = sha256Hex_(email + ':' + otp + ':' + getOtpPepper_());
    if (!constantTimeEquals_(suppliedHash, record.otpHash)) {
      const remaining = Math.max(1, Math.ceil((Number(record.expiresAt) - Date.now()) / 1000));
      cache.put(key, JSON.stringify(record), remaining);
      logOtpEvent_(email, 'VERIFY_OTP', 'FAILURE', 'Incorrect code');
      return { success: false, message: 'Incorrect code. Please try again.' };
    }

    cache.remove(key); // Single-use OTP.
    logOtpEvent_(email, 'VERIFY_OTP', 'SUCCESS', 'Email verification successful');
    // The trusted backend should mark this email verified only after receiving this success response.
    return { success: true, message: 'Email verified successfully.', email: email, verifiedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

/** Verify backend HMAC signature, timestamp freshness, and one-time nonce. */
function verifySignedRequest_(data, action, email) {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('CRM_HMAC_SECRET');
  if (!secret) throw new Error('Missing CRM_HMAC_SECRET script property.');

  const timestamp = String(data.timestamp || '').trim();
  const nonce = String(data.nonce || '').trim();
  const signature = String(data.signature || '').trim().toLowerCase();
  if (!/^\d{10,13}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;

  let timestampMs = Number(timestamp);
  if (timestamp.length === 10) timestampMs *= 1000;
  if (Math.abs(Date.now() - timestampMs) > OTP_CONFIG.REQUEST_MAX_AGE_SECONDS * 1000) return false;

  const otp = action === 'verifyOtp' ? String(data.otp || '').trim() : '';
  const canonical = [timestamp, nonce, action, email, otp].join('\n');
  const expected = hmacSha256Hex_(canonical, secret);
  if (!constantTimeEquals_(expected, signature)) return false;

  const nonceCacheKey = 'request_nonce_' + sha256Hex_(nonce);
  const cache = CacheService.getScriptCache();
  if (cache.get(nonceCacheKey)) return false;
  cache.put(nonceCacheKey, '1', OTP_CONFIG.REQUEST_MAX_AGE_SECONDS);
  return true;
}

function ensureOtpSheets_() {
  const ss = getOtpSpreadsheet_();
  ensureOtpSheet_(ss, OTP_CONFIG.OTP_SHEET, OTP_HEADERS);
  ensureOtpSheet_(ss, OTP_CONFIG.SETTINGS_SHEET, SETTINGS_HEADERS);
}

function getOtpSpreadsheet_() {
  return SpreadsheetApp.openById(OTP_CONFIG.SPREADSHEET_ID);
}

function ensureOtpSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v || '').trim());
    headers.forEach(header => {
      if (existing.indexOf(header) === -1) {
        const col = Math.max(sheet.getLastColumn(), 0) + 1;
        sheet.getRange(1, col).setValue(header);
        existing.push(header);
      }
    });
  }
  return sheet;
}

function logOtpEvent_(email, event, result, details) {
  try {
    const ss = getOtpSpreadsheet_();
    const sheet = ss.getSheetByName(OTP_CONFIG.OTP_SHEET) || ensureOtpSheet_(ss, OTP_CONFIG.OTP_SHEET, OTP_HEADERS);
    sheet.appendRow([new Date(), email || '', event || '', result || '', details || '']);
  } catch (ignored) {
    // Logging must not leak secrets or override the main response.
  }
}

function readOtpRequest_(e) {
  if (!e) return {};
  const out = {};
  if (e.parameter) Object.keys(e.parameter).forEach(k => out[k] = e.parameter[k]);
  if (e.postData && e.postData.contents && String(e.postData.type || '').toLowerCase().indexOf('application/json') !== -1) {
    const parsed = JSON.parse(e.postData.contents);
    Object.keys(parsed || {}).forEach(k => out[k] = parsed[k]);
  }
  return out;
}

function generateOtp_() {
  // Derive a six-digit OTP from a UUID-based value and SHA-256 digest.
  const digest = sha256Hex_(Utilities.getUuid() + ':' + Date.now() + ':' + Utilities.getUuid());
  return String(100000 + (parseInt(digest.substring(0, 8), 16) % 900000));
}

function getOtpPepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty('OTP_PEPPER');
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('OTP_PEPPER', pepper);
  }
  return pepper;
}

function sha256Hex_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function hmacSha256Hex_(value, secret) {
  const bytes = Utilities.computeHmacSha256Signature(String(value), String(secret), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function constantTimeEquals_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function normalizeOtpEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidOtpEmail_(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailCacheKey_(email) {
  return sha256Hex_(email).substring(0, 32);
}

function jsonOtp_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
