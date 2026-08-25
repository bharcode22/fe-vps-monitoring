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
 * Fetch Fleet-Wide Discrepancy & Health Audit across all 95 Tables and all PODs
 */
export async function fetchFleetAuditApi(masterId) {
  const res = await safeFetchJson(`${BASE_URL}/fleet-audit?masterId=${masterId}`);
  return res.data;
}

/**
 * Fetch Dynamic Relational FK Tree for a selected table (Parents & Children)
 */
export async function fetchTableRelationsApi(masterId, tableName) {
  const res = await safeFetchJson(`${BASE_URL}/relations?masterId=${masterId}&table=${encodeURIComponent(tableName)}`);
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

/**
 * Execute Dynamic Relational Sync (Multi-Table Ordered FK Sync)
 */
export async function performRelationalSyncApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/sync-relational`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Delete a specific row in Master Database
 */
export async function deleteMasterRowApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/master-row`, {
    method: 'DELETE',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Delete a specific row in a target POD Database
 */
export async function deletePodRowApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/pod-row`, {
    method: 'DELETE',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Sync 1 single row from Master Database to Selected PODs
 */
export async function syncSingleMasterRowApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/sync-single-row`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Pull all / filtered data from a target POD to Master Database (POD ➔ Master)
 */
export async function syncPodToMasterApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/pod-to-master`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Sync 1 single row from target POD to Master Database (POD ➔ Master)
 */
export async function syncSinglePodRowApi(payload) {
  const res = await safeFetchJson(`${BASE_URL}/sync-single-pod-row`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}
