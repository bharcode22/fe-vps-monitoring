/**
 * Configuration & Helper Utilities for POD Heartbeat Records Explorer
 */

export const MODULE_CONFIG = [
  { id: 508, name: 'PDU / Power', fullName: 'PDU Power Distribution (6 Kanal Arus)', defaultPort: 'ttyUSB7', color: 'indigo', hasTelemetry: true },
  { id: 504, name: 'Relay / Olfa', fullName: 'Relay & Olfa Actuator (Arus & Daya)', defaultPort: 'ttyUSB3', color: 'emerald', hasTelemetry: true },
  { id: 503, name: 'Strobe', fullName: 'Strobe & PIR Sensor (Tegangan & Daya)', defaultPort: 'ttyUSB2', color: 'purple', hasTelemetry: true },
  { id: 502, name: 'Chair / Magnet', fullName: 'Kursi & Magnet (Arus PEMF & HM)', defaultPort: 'ttyUSB1', color: 'blue', hasTelemetry: true },
  { id: 501, name: 'Manual', fullName: 'Manual Control Button', defaultPort: 'ttyUSB0', color: 'cyan' },
  { id: 505, name: 'Power Meter', fullName: 'Power Meter / Aux Relay', defaultPort: 'ttyUSB4', color: 'amber' },
  { id: 506, name: 'Temp / Hum', fullName: 'Temperature & Humidity', defaultPort: 'ttyUSB5', color: 'rose' },
  { id: 507, name: 'Door Lock', fullName: 'Door Lock Contact Sensor', defaultPort: 'ttyUSB6', color: 'teal' },
  { id: 509, name: 'Audio Amp', fullName: 'Audio Amp Controller', defaultPort: 'ttyUSB8', color: 'sky' }
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
  const found = MODULE_CONFIG.find((m) => Number(m.id) === Number(modId));
  return found ? found.name : null;
}

export function getModuleFullName(modId) {
  if (!modId) return null;
  const found = MODULE_CONFIG.find((m) => Number(m.id) === Number(modId));
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
