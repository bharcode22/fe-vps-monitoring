import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch list of currently active / online users
 */
export async function fetchActiveUsersApi() {
  const res = await fetch(`${BACKEND_URL}/api/activity-logs/active-users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Gagal mengambil data active users`);
  }
  return res.json();
}

/**
 * Fetch paginated activity / audit logs with filters
 */
export async function fetchActivityLogsApi(params = {}) {
  const cleanParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams.append(key, String(val));
    }
  });

  const queryStr = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
  const res = await fetch(`${BACKEND_URL}/api/activity-logs${queryStr}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Gagal mengambil activity logs`);
  }
  return res.json();
}

/**
 * Fetch activity statistics & KPI breakdown
 */
export async function fetchActivityStatsApi() {
  const res = await fetch(`${BACKEND_URL}/api/activity-logs/stats`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Gagal mengambil activity stats`);
  }
  return res.json();
}

/**
 * Export audit logs to CSV or JSON
 */
export async function exportActivityLogsApi(params = {}) {
  const cleanParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams.append(key, String(val));
    }
  });

  const queryStr = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
  const format = params.format || 'csv';

  const res = await fetch(`${BACKEND_URL}/api/activity-logs/export${queryStr}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Gagal mengekspor logs`);
  }

  if (format === 'json') {
    return res.json();
  }
  return res.blob();
}

/**
 * Purge activity logs older than X days
 */
export async function purgeOldActivityLogsApi(days = 90) {
  const res = await fetch(`${BACKEND_URL}/api/activity-logs/purge`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ days })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Gagal menghapus log lama`);
  }
  return res.json();
}
