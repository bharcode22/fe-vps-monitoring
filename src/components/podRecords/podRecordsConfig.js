import { getStoredHbModules } from '../../utils/heartbeatModules';

/**
 * Configuration & Helper Utilities for POD Heartbeat Records Explorer
 */

export const MODULE_CONFIG = [
  { id: 501, name: 'Manual Control', fullName: 'Manual Control Button', defaultPort: 'ttyUSB0', color: 'cyan' },
  { id: 502, name: 'Chair Module', fullName: 'Kursi & Magnet (Sensor POB, PEMF, HM)', defaultPort: 'ttyUSB1', color: 'blue', hasTelemetry: true },
  { id: 503, name: 'Lighting Module', fullName: 'Lighting & Strobo (RGB, UVC/UVB/UVA, PIR)', defaultPort: 'ttyUSB4', color: 'purple', hasTelemetry: true },
  { id: 504, name: 'Olfactory Module', fullName: 'Modul Aroma Wewangian & Difusi (Olfa Relay)', defaultPort: 'ttyUSB5', color: 'emerald', hasTelemetry: true },
  { id: 505, name: 'Door Module', fullName: 'Sensor Status Pintu & Magnetic Lock', defaultPort: null, color: 'teal' },
  { id: 506, name: 'AirCon Module', fullName: 'Kontrol Suhu, AC, & Ventilasi Udara', defaultPort: null, color: 'rose' },
  { id: 507, name: 'Audio Module', fullName: 'Soundscape, Voice Guide, & Haptic Amplifier', defaultPort: 'ttyUSB2', color: 'sky' },
  { id: 508, name: 'Power Module', fullName: 'PDU Power Distribution (Distribusi Daya & Proteksi)', defaultPort: 'ttyUSB3', color: 'indigo', hasTelemetry: true },
  { id: 509, name: 'Biofeedback Module', fullName: 'Sensor GSR, Detak Jantung, & Biometrik', defaultPort: null, color: 'amber' }
];

export function getTodayLocalDate() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (_) {
    return new Date().toLocaleDateString('sv-SE');
  }
}

export function getModuleName(modId) {
  if (!modId) return null;
  const num = Number(modId);
  try {
    const stored = getStoredHbModules();
    const foundStored = stored.find((m) => Number(m.id) === num);
    if (foundStored && foundStored.name) return foundStored.name;
  } catch (_) { }
  const found = MODULE_CONFIG.find((m) => Number(m.id) === num);
  return found ? found.name : `Modul ${modId}`;
}

export function getModuleFullName(modId) {
  if (!modId) return null;
  const num = Number(modId);
  try {
    const stored = getStoredHbModules();
    const foundStored = stored.find((m) => Number(m.id) === num);
    if (foundStored) {
      if (foundStored.description) return `${foundStored.name} (${foundStored.description})`;
      if (foundStored.name) return foundStored.name;
    }
  } catch (_) { }
  const found = MODULE_CONFIG.find((m) => Number(m.id) === num);
  return found ? found.fullName : `Modul ${modId}`;
}

/**
 * Format bytes into human-readable string (B, KB, MB, GB)
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Evaluate health status based on delta interval between heartbeats
 */
export function evaluateDeltaHealth(deltaSec) {
  if (deltaSec === null || deltaSec === undefined) {
    return { label: 'First Record', badgeClass: 'bg-slate-800 text-slate-400 border-slate-700' };
  }
  if (deltaSec <= 1.8) {
    return { label: 'Normal', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  }
  if (deltaSec <= 3.0) {
    return { label: 'Jitter', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  }
  return { label: 'Delay', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
}

/**
 * Compute delta intervals per module across sequential heartbeat records
 */
export function computeHeartbeatDeltas(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const prevTsMap = {};

  return records.map((record) => {
    const modId = record.modId;
    let deltaSec = null;
    if (prevTsMap[modId] !== undefined) {
      deltaSec = Math.abs(record.ts - prevTsMap[modId]) / 1000;
    }
    prevTsMap[modId] = record.ts;
    return {
      ...record,
      deltaSec: deltaSec !== null ? parseFloat(deltaSec.toFixed(2)) : null
    };
  });
}
