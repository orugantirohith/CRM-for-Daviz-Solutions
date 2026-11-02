/**
 * Human-readable ID Generator for DAVIZ Solutions CRM
 * Format: [PREFIX]-[YY]-[MM]-[NNNN]
 * e.g., LD-26-10-0001
 * Resets each month in Asia/Dubai local time. Concurrency safety is enforced
 * server-side via Supabase atomic sequences/functions.
 */

export type EntityPrefix = 'LD' | 'VS' | 'CP' | 'CT' | 'PL' | 'FU' | 'TK' | 'ARC';

export const PREFIX_MAP: Record<string, EntityPrefix> = {
  leads: 'LD',
  visits: 'VS',
  companies: 'CP',
  contacts: 'CT',
  plans: 'PL',
  follow_ups: 'FU',
  tasks: 'TK',
  archive: 'ARC',
};

/**
 * Formats a record ID according to the mandatory specification:
 * [PREFIX]-[YY]-[MM]-[NNNN]
 *
 * @param prefix 2-3 char prefix like 'LD', 'VS', 'CP'
 * @param year Full 4-digit year or 2-digit year (e.g. 2026 or 26)
 * @param month 1-12 month number
 * @param sequence Integer sequence starting from 1
 */
export function formatRecordId(
  prefix: EntityPrefix | string,
  year: number,
  month: number,
  sequence: number
): string {
  const yy = String(year).slice(-2).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const nnnn = String(sequence).padStart(4, '0');
  return `${prefix}-${yy}-${mm}-${nnnn}`;
}

/**
 * Validates whether a given string matches the DAVIZ Solutions CRM ID scheme.
 */
export function isValidRecordId(id: string): boolean {
  if (!id) return false;
  const regex = /^[A-Z]{2,3}-\d{2}-\d{2}-\d{4,}$/;
  return regex.test(id);
}

/**
 * Parses components from a formatted CRM ID.
 */
export function parseRecordId(id: string): {
  prefix: string;
  year: number;
  month: number;
  sequence: number;
} | null {
  if (!isValidRecordId(id)) return null;
  const [prefix, yy, mm, seq] = id.split('-');
  return {
    prefix,
    year: 2000 + parseInt(yy, 10),
    month: parseInt(mm, 10),
    sequence: parseInt(seq, 10),
  };
}
