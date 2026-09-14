export const FIELD_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#14b8a6'  // Teal
];

export const MEASUREMENT_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1'  // Indigo
];

export const templateCategories = [
  'Semua',
  'Sensor Hardware',
  'Kelistrikan',
  'Sistem & Heartbeat',
  'Air Conditioning',
  'Audio & Soundscape',
  'Kustom Pengguna'
];

/**
 * Format Date into local HTML datetime-local format (YYYY-MM-DDTHH:mm)
 */
export function toLocalDatetimeInput(d) {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format date/duration into valid Influx Flux RFC3339 timestamp literal or relative interval
 */
export function formatFluxTimeLiteral(val, isStop = false) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^-\d+[smhdwmo]$/i.test(s) || s === 'now()') return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}${isStop ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`).toISOString();
  }
  const d = new Date(s);
  return !isNaN(d.getTime()) ? d.toISOString() : s;
}

/**
 * Format Timestamp into Indonesian WITA (UTC+8 / Asia/Makassar) format
 */
export function formatDateTimeWita(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d) + ' WITA';
  } catch {
    return isoString;
  }
}

/**
 * Calculate start and stop datetime-local strings for quick date shortcuts
 */
export function getDateShortcutRange(type) {
  const now = new Date();
  if (type === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(now) };
  }
  if (type === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const stop = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(stop) };
  }
  if (type === 'last7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(now) };
  }
  if (type === 'last30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(now) };
  }
  if (type === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(now) };
  }
  if (type === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const stop = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start: toLocalDatetimeInput(start), stop: toLocalDatetimeInput(stop) };
  }
  return null;
}
