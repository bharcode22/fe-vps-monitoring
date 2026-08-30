import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch all registered Master Databases
 */
export async function fetchPodLogsMastersApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/masters`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar Master Database');
  return data.data || [];
}

/**
 * Fetch all registered POD V3 servers
 */
export async function fetchPodLogsV3ListApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/pods`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar Server POD V3');
  return data.data || [];
}

/**
 * Audit count of pod_logs between Master DB and target POD V3s
 */
export async function fetchPodLogsAuditApi(masterId, podIds = []) {
  const params = new URLSearchParams({ masterId });
  if (Array.isArray(podIds) && podIds.length > 0) {
    params.append('podIds', podIds.join(','));
  }

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/audit?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan audit pod_logs');
  return data.data;
}

/**
 * Execute pull sync from POD V3 to Master DB with chunking
 */
export async function executePullPodLogsApi(payload) {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/pull`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengeksekusi penarikan pod_logs');
  return data;
}

/**
 * Fetch paginated pod_logs from Master DB
 */
export async function fetchMasterPodLogsDataApi({
  masterId,
  page = 1,
  limit = 25,
  podId = null,
  activityType = null,
  search = null,
  dateFrom = null,
  dateTo = null
}) {
  const params = new URLSearchParams({
    masterId: String(masterId),
    page: String(page),
    limit: String(limit)
  });

  if (podId) params.append('podId', podId);
  if (activityType && activityType !== 'ALL') params.append('activityType', activityType);
  if (search) params.append('search', search);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/master-logs?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data master pod_logs');
  return data.data;
}

/**
 * Fetch distinct activity types from Master DB for dropdown filter
 */
export async function fetchMasterActivityTypesApi(masterId) {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/activity-types?masterId=${masterId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar tipe aktivitas');
  return data.data || [];
}

/**
 * Compare pod_logs between Master DB and a specific POD V3
 */
export async function fetchPodLogsComparisonApi(masterId, podId, limit = 50) {
  const params = new URLSearchParams({
    masterId: String(masterId),
    podId: String(podId),
    limit: String(limit)
  });

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/compare-pod?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membandingkan log POD dengan Master');
  return data.data;
}

/**
 * Sync a single log row from POD to Master DB
 */
export async function syncSinglePodLogRowApi(masterId, podId, logId) {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/sync-single-row`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ masterId, podId, logId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menyinkronkan baris log tunggal');
  return data.data;
}

/**
 * Fetch UUID -> POD metadata lookup map
 */
export async function fetchPodUuidMapApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-sync/pod-uuid-map`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil pemetaan podUuidMap');
  return data.data || {};
}

