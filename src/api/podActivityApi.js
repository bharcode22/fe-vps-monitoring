import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch current real-time occupancy status of all POD V3 units
 */
export async function fetchPodActivityStatusApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/status`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil status aktivitas POD');
  return data.data || { summary: {}, pods: [], recentLogs: [] };
}

/**
 * Fetch historical occupancy transition logs
 */
export async function fetchPodActivityHistoryApi(limit = 50, offset = 0, serverId = null) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (serverId) params.append('serverId', String(serverId));

  const res = await fetch(`${BACKEND_URL}/api/pod-activity/history?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil riwayat aktivitas POD');
  return data.data || [];
}

/**
 * Simulate or inject an occupancy value (1 or 0) for testing
 */
export async function simulatePodActivityApi(serverId, value, topic = 'mod_chair/pob_state') {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/simulate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, value, topic })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengirim simulasi aktivitas');
  return data;
}

/**
 * Reconnect and resubscribe to all POD V3 MQTT Brokers
 */
export async function reconnectPodActivityApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/reconnect`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghubungkan ulang broker MQTT POD');
  return data;
}

/**
 * Fetch heartbeat modules config list from backend JSON file
 */
export async function fetchHeartbeatModulesApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-modules`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat konfigurasi modul heartbeat');
  return data.data || [];
}

/**
 * Save / update heartbeat modules config list to backend JSON file
 */
export async function saveHeartbeatModulesApi(modules) {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-modules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ modules })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menyimpan konfigurasi modul heartbeat');
  return data;
}

/**
 * Reset heartbeat modules config list to default 9 modules in backend JSON file
 */
export async function resetHeartbeatModulesApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-modules/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mereset konfigurasi modul heartbeat');
  return data;
}

/**
 * Fetch heartbeat status thresholds config from backend JSON file
 */
export async function fetchHeartbeatThresholdsApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-thresholds`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat konfigurasi ambang batas heartbeat');
  return data.data || { delaySec: 2, frozenSec: 10, deadSec: 30 };
}

/**
 * Save heartbeat status thresholds config to backend JSON file
 */
export async function saveHeartbeatThresholdsApi(thresholds) {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-thresholds`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(thresholds)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menyimpan konfigurasi ambang batas heartbeat');
  return data;
}

/**
 * Reset heartbeat status thresholds config to default in backend JSON file
 */
export async function resetHeartbeatThresholdsApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/heartbeat-thresholds/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mereset konfigurasi ambang batas heartbeat');
  return data;
}

/**
 * Fetch daily events list for a specific pod from .jsonl file
 */
export async function fetchPodEventsApi(podId, date = null) {
  const url = date
    ? `${BACKEND_URL}/api/pod-activity/pods/${podId}/events?date=${encodeURIComponent(date)}`
    : `${BACKEND_URL}/api/pod-activity/pods/${podId}/events`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat log peristiwa POD');
  return data.events || [];
}

/**
 * Fetch latest state.json snapshot for a specific pod
 */
export async function fetchPodStateApi(podId) {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/pods/${podId}/state`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat state POD');
  return data.state || null;
}

/**
 * Fetch raw heartbeat ticks stream for a specific pod from .jsonl file / memory
 * Supports either (podId, date, limit) or (podId, optionsObject)
 */
export async function fetchPodHeartbeatsApi(podId, dateOrOptions = null, defaultLimit = 500) {
  let date = null;
  let limit = defaultLimit;
  let moduleId = null;
  let startTime = null;
  let endTime = null;
  let source = 'auto';

  if (typeof dateOrOptions === 'object' && dateOrOptions !== null) {
    date = dateOrOptions.date || null;
    limit = dateOrOptions.limit || defaultLimit;
    moduleId = dateOrOptions.moduleId || null;
    startTime = dateOrOptions.startTime || null;
    endTime = dateOrOptions.endTime || null;
    source = dateOrOptions.source || 'auto';
  } else {
    date = dateOrOptions;
  }

  const params = new URLSearchParams({ limit: String(limit) });
  if (date) params.append('date', date);
  if (moduleId && moduleId !== 'ALL') params.append('moduleId', String(moduleId));
  if (startTime) params.append('startTime', String(startTime));
  if (endTime) params.append('endTime', String(endTime));
  if (source) params.append('source', source);

  const res = await fetch(`${BACKEND_URL}/api/pod-activity/pods/${podId}/heartbeats?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat aliran detak heartbeat');
  return data.heartbeats || [];
}

/**
 * Fetch available log dates for a specific pod
 */
export async function fetchPodLogDatesApi(podId) {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/pods/${podId}/log-dates`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat daftar tanggal log');
  return data.dates || [];
}

/**
 * Fetch physical storage files list for a pod
 */
export async function fetchPodStorageFilesApi(podId) {
  const res = await fetch(`${BACKEND_URL}/api/pod-activity/pods/${podId}/storage-files`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat berkas penyimpanan pod');
  return data;
}

/**
 * Get direct download URL for pod heartbeats (JSON or JSONL)
 */
export function getPodHeartbeatsDownloadUrl(podId, { date = null, format = 'json', moduleId = null, startTime = null, endTime = null } = {}) {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (format) params.append('format', format);
  if (moduleId && moduleId !== 'ALL') params.append('moduleId', String(moduleId));
  if (startTime) params.append('startTime', String(startTime));
  if (endTime) params.append('endTime', String(endTime));

  return `${BACKEND_URL}/api/pod-activity/pods/${podId}/heartbeats/download?${params.toString()}`;
}


