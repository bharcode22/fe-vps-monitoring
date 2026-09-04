export const STORAGE_KEY_HB_MODULES = 'vps_hb_modules_config';
export const EVENT_HB_MODULES_UPDATED = 'vps_hb_modules_updated';

export const DEFAULT_FALLBACK_MODULES = [
  { id: 501, name: 'Manual Control', topic: 'mod_server/501/data', defaultPort: 'ttyUSB0', description: 'Kontrol manual dan override input perangkat' },
  { id: 502, name: 'Chair Module', topic: 'mod_server/502/data', defaultPort: 'ttyUSB1', description: 'Sensor kursi (POB), PEMF, & Schumann' },
  { id: 503, name: 'Lighting Module', topic: 'mod_server/503/data', defaultPort: 'ttyUSB4', description: 'Kontrol RGB, UVC/UVB/UVA, & Strobo' },
  { id: 504, name: 'Olfactory Module', topic: 'mod_server/504/data', defaultPort: 'ttyUSB5', description: 'Modul aroma wewangian & difusi' },
  { id: 505, name: 'Door Module', topic: 'mod_server/505/data', defaultPort: null, description: 'Sensor status pintu & magnetic lock' },
  { id: 506, name: 'AirCon Module', topic: 'mod_server/506/data', defaultPort: null, description: 'Kontrol suhu & ventilasi udara' },
  { id: 507, name: 'Audio Module', topic: 'mod_server/507/data', defaultPort: 'ttyUSB2', description: 'Soundscape, voice guide, & haptic amplifier' },
  { id: 508, name: 'Power Module', topic: 'mod_server/508/data', defaultPort: 'ttyUSB3', description: 'Distribusi daya, relay baterai, & proteksi' },
  { id: 509, name: 'Biofeedback Module', topic: 'mod_server/509/data', defaultPort: null, description: 'Sensor GSR, detak jantung, & biometrik' }
];

/**
 * Get cached/stored heartbeat modules config from localStorage/sessionStorage, or fallback
 */
export function getStoredHbModules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HB_MODULES) || sessionStorage.getItem(STORAGE_KEY_HB_MODULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached heartbeat modules:', e.message);
  }
  return DEFAULT_FALLBACK_MODULES;
}

/**
 * Store updated heartbeat modules to localStorage & sessionStorage, and notify all active components
 */
export function setStoredHbModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) return modules;
  try {
    const jsonStr = JSON.stringify(modules);
    localStorage.setItem(STORAGE_KEY_HB_MODULES, jsonStr);
    sessionStorage.setItem(STORAGE_KEY_HB_MODULES, jsonStr);
    window.dispatchEvent(new CustomEvent(EVENT_HB_MODULES_UPDATED, { detail: modules }));
  } catch (e) {
    console.error('Failed to store heartbeat modules config:', e.message);
  }
  return modules;
}
