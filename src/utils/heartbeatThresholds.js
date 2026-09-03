export const DEFAULT_HB_THRESHOLDS = {
  delaySec: 2,
  frozenSec: 10,
  deadSec: 30
};

export const STORAGE_KEY_HB_THRESHOLDS = 'vps_hb_thresholds';
export const EVENT_HB_THRESHOLDS_UPDATED = 'vps_hb_thresholds_updated';

/**
 * Get cached/stored heartbeat thresholds from localStorage
 */
export function getStoredHbThresholds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HB_THRESHOLDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          delaySec: Math.max(1, Number(parsed.delaySec) || DEFAULT_HB_THRESHOLDS.delaySec),
          frozenSec: Math.max(2, Number(parsed.frozenSec) || DEFAULT_HB_THRESHOLDS.frozenSec),
          deadSec: Math.max(3, Number(parsed.deadSec) || DEFAULT_HB_THRESHOLDS.deadSec)
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached heartbeat thresholds:', e.message);
  }
  return { ...DEFAULT_HB_THRESHOLDS };
}

/**
 * Store updated heartbeat thresholds to localStorage and notify all listeners
 */
export function setStoredHbThresholds(thresholds) {
  try {
    const sanitized = {
      delaySec: Math.max(1, Number(thresholds.delaySec) || DEFAULT_HB_THRESHOLDS.delaySec),
      frozenSec: Math.max(Number(thresholds.delaySec) + 1, Number(thresholds.frozenSec) || DEFAULT_HB_THRESHOLDS.frozenSec),
      deadSec: Math.max(Number(thresholds.frozenSec) + 1, Number(thresholds.deadSec) || DEFAULT_HB_THRESHOLDS.deadSec)
    };
    localStorage.setItem(STORAGE_KEY_HB_THRESHOLDS, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(EVENT_HB_THRESHOLDS_UPDATED, { detail: sanitized }));
    return sanitized;
  } catch (e) {
    console.error('Failed to store heartbeat thresholds:', e.message);
    return thresholds;
  }
}

/**
 * Universal strict health evaluation for any heartbeat module data
 * 
 * Rules:
 * 1. DEAD (🔴): No packet at all, OR packet timeout >= deadSec (e.g. >= 30s), OR HB unchanged >= deadSec (e.g. >= 30s)
 * 2. FROZEN (🟣): HB counter stuck/unchanged >= frozenSec (e.g. >= 10s up to < 30s), OR packet delay >= frozenSec
 * 3. DELAY (🟡): Packet or HB lag > delaySec (e.g. > 2s up to < 10s)
 * 4. LIVE (🟢): Packet <= delaySec AND HB incrementing <= delaySec AND valid HB counter
 */
export function evaluateModuleHealth(modData, thresholds, nowTimestamp = Date.now()) {
  const { delaySec = 2, frozenSec = 10, deadSec = 30 } = thresholds || DEFAULT_HB_THRESHOLDS;

  if (!modData || !modData.lastSeenAt) {
    return {
      status: 'DEAD',
      reason: 'Belum ada data',
      packetElapsedSec: null,
      hbElapsedSec: null,
      elapsedSec: null
    };
  }

  const packetElapsedSec = Math.floor((nowTimestamp - modData.lastSeenAt) / 1000);
  const hbElapsedSec = modData.lastHbChangeAt ? Math.floor((nowTimestamp - modData.lastHbChangeAt) / 1000) : null;
  const maxElapsedSec = Math.max(packetElapsedSec ?? 0, hbElapsedSec ?? 0);

  // 1. DEAD: timeout >= deadSec (e.g. 30s) on packet or HB counter
  if (
    packetElapsedSec >= deadSec ||
    (hbElapsedSec !== null && hbElapsedSec >= deadSec) ||
    (modData.hb === null && packetElapsedSec >= frozenSec)
  ) {
    return {
      status: 'DEAD',
      reason: !modData.lastSeenAt ? 'Belum ada data' : `Mati ${maxElapsedSec}s lalu`,
      packetElapsedSec,
      hbElapsedSec,
      elapsedSec: maxElapsedSec
    };
  }

  // 2. FROZEN: stuck >= frozenSec (e.g. 10s up to < 30s)
  if (
    (hbElapsedSec !== null && hbElapsedSec >= frozenSec) ||
    packetElapsedSec >= frozenSec ||
    (modData.hb === null && packetElapsedSec > delaySec)
  ) {
    return {
      status: 'FROZEN',
      reason: modData.hb !== null ? `Macet di #${modData.hb} (${maxElapsedSec}s)` : `Data macet (${maxElapsedSec}s)`,
      packetElapsedSec,
      hbElapsedSec,
      elapsedSec: maxElapsedSec
    };
  }

  // 3. DELAY: lag > delaySec (e.g. 2s up to < 10s)
  if (
    packetElapsedSec > delaySec ||
    (hbElapsedSec !== null && hbElapsedSec > delaySec) ||
    modData.hb === null
  ) {
    return {
      status: 'DELAY',
      reason: `Delay ${maxElapsedSec}s`,
      packetElapsedSec,
      hbElapsedSec,
      elapsedSec: maxElapsedSec
    };
  }

  // 4. LIVE: <= delaySec on both packet and increment
  return {
    status: 'LIVE',
    reason: 'Live OK',
    packetElapsedSec,
    hbElapsedSec,
    elapsedSec: maxElapsedSec
  };
}
