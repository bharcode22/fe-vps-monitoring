// Constants and Helper Utilities for PodInfluxDataManager

export const FIELD_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
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

export const DEFAULT_TEMPLATE_CATEGORIES = [
  'Semua',
  'Sensor Hardware',
  'Kelistrikan',
  'Sistem & Heartbeat',
  'Air Conditioning',
  'Audio & Soundscape',
  'Kustom Pengguna'
];

// Helper to compute safe Y-Axis domain and avoid NaN or collapsing when min === max
export const getYDomain = (min, max) => {
  if (min === undefined || max === undefined || !isFinite(min) || !isFinite(max)) {
    return ['auto', 'auto'];
  }
  if (min === max) {
    if (min === 0) return [-0.2, 1.0];
    return [Math.max(0, Math.floor(min - 1)), Math.ceil(max + 1)];
  }
  const padding = (max - min) * 0.08;
  return [
    min >= 0 && (min - padding) < 0 ? 0 : Math.floor((min - padding) * 10) / 10,
    Math.ceil((max + padding) * 10) / 10
  ];
};

// Helper to format Date into HTML datetime-local format (YYYY-MM-DDTHH:mm) using UTC/original timestamp
export function toOriginalDatetimeInput(d) {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format date/duration into valid Influx Flux RFC3339 timestamp literal without shifting timezone
export function formatFluxTimeLiteral(val, isStop = false) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^-\d+[smhdwmo]$/i.test(s) || s === 'now()') return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}${isStop ? 'T23:59:59Z' : 'T00:00:00Z'}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    if (isStop && s.endsWith(':59')) {
      return `${s}:59Z`;
    }
    return `${s}:00Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    return `${s}Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?$/i.test(s)) {
    return s.endsWith('Z') ? s : `${s}Z`;
  }
  return s;
}

// Helper to format a data point's original timestamp into readable date & time (YYYY-MM-DD HH:MM:SS)
export function formatPointDateTime(point) {
  if (!point) return '-';
  if (point.fullTime && typeof point.fullTime === 'string' && point.fullTime.includes('T')) {
    const [datePart, timePart] = point.fullTime.split('T');
    const cleanTime = timePart ? timePart.slice(0, 8) : (point.time || '');
    return `${datePart} ${cleanTime}`.trim();
  }
  return point.time || '-';
}
