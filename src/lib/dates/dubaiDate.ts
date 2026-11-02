/**
 * Date and Regional Utilities for DAVIZ Solutions (UAE)
 * Time Zone: Asia/Dubai (UTC+4)
 * Currency: AED
 */

export const DEFAULT_TIMEZONE = 'Asia/Dubai';
export const DEFAULT_CURRENCY = 'AED';

/**
 * Returns the current date in Asia/Dubai as YYYY-MM-DD
 */
export function getDubaiCurrentDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns current year and month in Asia/Dubai for monthly sequence ID generation
 */
export function getDubaiYearMonth(date: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
  }

  return { year, month };
}

/**
 * Formats an ISO date string or Date object into human-readable Dubai date & time
 * Example: "27 Oct 2026, 04:30 PM"
 */
export function formatDubaiDateTime(
  dateInput: string | Date | null | undefined,
  includeTime = true
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }
      : {}),
  };

  return new Intl.DateTimeFormat('en-GB', options).format(d);
}

/**
 * Formats a number to AED currency string
 * Example: 15000 -> "AED 15,000"
 */
export function formatAED(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'AED 0';
  const formatted = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount);
  // Replace non-breaking space and format cleanly as "AED X,XXX"
  return formatted.replace(/\u00a0/g, ' ').replace('AED', 'AED ').replace(/\s+/g, ' ').trim();
}

/**
 * Formats a phone number for display and safe WhatsApp link creation
 */
export function formatWhatsAppLink(phone: string, text?: string): string {
  // Strip all non-digits except leading +
  const clean = phone.replace(/[^0-9]/g, '');
  // UAE mobile normalization (05x -> 9715x)
  let international = clean;
  if (clean.startsWith('05')) {
    international = '971' + clean.slice(1);
  } else if (!clean.startsWith('971') && clean.length === 9 && clean.startsWith('5')) {
    international = '971' + clean;
  }
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${international}${encodedText}`;
}
