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
