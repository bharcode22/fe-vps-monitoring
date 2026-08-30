/**
 * Centralized Application & Backend Configuration
 * - Development: automatically uses .env.development (http://localhost:5002)
 * - Production: automatically uses .env.production (Server #8 Workstation)
 * - Clean UI without exposing raw backend URLs
 */

export const BACKEND_PRESETS = [
  {
    id: 'server-8',
    name: 'Server #8 (Workstation)',
    url: 'https://utilities-workstation-hide-economies.trycloudflare.com',
    desc: 'Server Monitoring Utama (Workstation #8)',
    badge: 'Server #8',
    isDefault: !import.meta.env.DEV
  },
  {
    id: 'server-aws',
    name: 'Server AWS Cloud',
    url: 'https://downloading-documentation-detected-deeper.trycloudflare.com',
    desc: 'Server Monitoring Cadangan (AWS Cloud)',
    badge: 'Server AWS',
    isDefault: false
  },
  {
    id: 'local',
    name: 'Localhost Development',
    url: 'http://localhost:5002',
    desc: 'Development Server Lokal (Port 5002)',
    badge: 'Localhost',
    isDefault: !!import.meta.env.DEV
  }
];

// Fallback to Server #8 if environment variable is not defined
export const DEFAULT_BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || 'https://utilities-workstation-hide-economies.trycloudflare.com'
).replace(/\/+$/, '');

function resolveBackendUrl() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vps_active_backend_url');
      if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
    } catch (e) {}
  }
  return DEFAULT_BACKEND_URL;
}

export const BACKEND_URL = resolveBackendUrl();

export const SOCKET_URL = (typeof window !== 'undefined' && localStorage.getItem('vps_active_backend_url'))
  ? localStorage.getItem('vps_active_backend_url').trim().replace(/\/+$/, '')
  : (import.meta.env.VITE_SOCKET_URL ? import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '') : BACKEND_URL);

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'VPS Server Monitoring';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;

/**
 * Switch the active backend URL and reload the app
 * @param {string} newUrl - Target backend URL, or empty string to reset to default
 */
export function switchBackendUrl(newUrl) {
  if (!newUrl || newUrl === DEFAULT_BACKEND_URL) {
    localStorage.removeItem('vps_active_backend_url');
  } else {
    const clean = newUrl.trim().replace(/\/+$/, '');
    localStorage.setItem('vps_active_backend_url', clean);
  }
  window.location.reload();
}

/**
 * Returns matching preset object for the current backend without exposing raw URLs
 */
export function getActiveBackendInfo() {
  const current = BACKEND_URL;
  const found = BACKEND_PRESETS.find(p => p.url === current);
  if (found) return found;
  return import.meta.env.DEV ? BACKEND_PRESETS[2] : BACKEND_PRESETS[0];
}
