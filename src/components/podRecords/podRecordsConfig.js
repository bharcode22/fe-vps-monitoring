/**
 * Configuration & Helper Utilities for POD Heartbeat Records Explorer
 */

// Hardware modules definition with friendly names, ports, and colors
export const MODULE_CONFIG = [
  { id: 501, name: 'Manual', fullName: 'Manual Control', defaultPort: 'ttyUSB0', color: 'cyan' },
  { id: 502, name: 'RFID', fullName: 'RFID Reader', defaultPort: 'ttyUSB1', color: 'blue' },
  { id: 503, name: 'Motion', fullName: 'Motion Sensor (PIR)', defaultPort: 'ttyUSB2', color: 'purple' },
  { id: 504, name: 'Relay', fullName: 'Relay Actuator', defaultPort: 'ttyUSB3', color: 'emerald' },
  { id: 505, name: 'Power', fullName: 'Power Meter', defaultPort: 'ttyUSB4', color: 'amber' },
  { id: 506, name: 'Temp', fullName: 'Temperature & Hum', defaultPort: 'ttyUSB5', color: 'rose' },
  { id: 507, name: 'Door', fullName: 'Door Lock Contact', defaultPort: 'ttyUSB6', color: 'teal' },
  { id: 508, name: 'Dispenser', fullName: 'Scent Dispenser', defaultPort: 'ttyUSB7', color: 'indigo' },
  { id: 509, name: 'Audio', fullName: 'Audio Amp Controller', defaultPort: 'ttyUSB8', color: 'sky' }
];

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
