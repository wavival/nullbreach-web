function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format an ISO timestamp as "HH:mm" when same day, else "dd/MM HH:mm".
 * Returns empty string for invalid input.
 */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  if (sameDay) return `${hh}:${mm}`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hh}:${mm}`;
}

/** Same as {@link formatTimestamp} but prefixes "Today " for same-day values. */
export function formatTimestampWithToday(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  if (sameDay) return `Today ${hh}:${mm}`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hh}:${mm}`;
}
