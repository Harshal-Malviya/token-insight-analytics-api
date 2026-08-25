/**
 * Returns an array of YYYY-MM-DD strings inclusive between startDateStr and endDateStr.
 */
export function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T00:00:00.000Z`);

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Formats a Unix timestamp (in milliseconds or seconds) to UTC YYYY-MM-DD string.
 */
export function formatTimestampToDate(timestamp: number): string {
  // Check if timestamp is in seconds (10 digits) vs milliseconds (13 digits)
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  return new Date(ms).toISOString().split('T')[0];
}

/**
 * Validates whether a string is in YYYY-MM-DD format and is a valid date.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateStr;
}
