/**
 * Converts a raw category string (e.g. "car_wash, point_of_interest")
 * into a human-readable label (e.g. "Car Wash").
 * Takes only the first segment if comma-separated.
 */
export function formatCategory(raw: string | undefined | null): string {
  if (!raw) return '—';
  return raw
    .split(',')[0]
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
