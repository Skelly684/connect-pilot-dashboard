/**
 * Convert a datetime-local input value (local time) to UTC ISO string
 * @param localValue - Value from <input type="datetime-local"> (e.g., "2025-10-05T14:30")
 * @returns UTC ISO string with Z suffix (e.g., "2025-10-05T07:30:00.000Z") or null
 */
export function localDatetimeInputToUtcIso(localValue: string | null | undefined): string | null {
  if (!localValue) return null;
  const d = new Date(localValue); // Interprets as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString(); // -> UTC ISO "...Z"
}

/**
 * Convert a UTC ISO string to datetime-local input format (local time)
 * @param utc - UTC ISO string (e.g., "2025-10-05T07:30:00.000Z")
 * @returns Local datetime string for <input type="datetime-local"> (e.g., "2025-10-05T14:30")
 */
export function utcIsoToLocalDatetimeInput(utc: string | null | undefined): string {
  if (!utc) return '';
  const d = new Date(utc); // Treats `utc` as UTC
  if (Number.isNaN(d.getTime())) return '';
  // Format to "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm   = pad(d.getMonth() + 1);
  const dd   = pad(d.getDate());
  const hh   = pad(d.getHours());
  const mi   = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
