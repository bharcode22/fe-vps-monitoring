import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`Server error (${res.status}): ${rawText.slice(0, 150)}`);
    }
    return { success: true, data: rawText };
  }

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request error (${res.status})`);
  }
  return data;
}

const BASE_URL = `${BACKEND_URL}/api/master-pod-sync`;

/**
 * Fetch all registered Master Databases
 */
export async function fetchMasterDatabasesApi() {
  const res = await safeFetchJson(`${BASE_URL}/masters`);
  return res.data || [];
}

/**
 * Fetch tables in the selected Master Database
 */
export async function fetchMasterTablesApi(masterId) {
  const res = await safeFetchJson(`${BASE_URL}/tables?masterId=${masterId}`);
  return res.data || { master: null, tables: [] };
}

/**
 * Compare Master Table schema & rows across all POD V3 instances
 */
export async function fetchMasterTableMatrixApi(masterId, tableName) {
  const res = await safeFetchJson(`${BASE_URL}/matrix?masterId=${masterId}&table=${encodeURIComponent(tableName)}`);
  return res.data;
}

/**
 * Execute Sync from Master to selected PODs (Dry-Run or Live)
 */
export async function performMasterSyncApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/sync`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}
