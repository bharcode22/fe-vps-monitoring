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
    throw new Error('Respons server bukan berformat JSON yang valid.');
  }

  return await res.json();
}

/**
 * Fetch comparison matrix of pod_topic and socket_topic across all POD V3 instances
 */
export async function fetchPodTopicMatrixApi() {
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/matrix`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil matriks topic POD');
  return data.data;
}

/**
 * Fetch details of topics for a single POD
 */
export async function fetchPodTopicDetailApi(serverId) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/${serverId}`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil detail topic server');
  return data.data;
}

/**
 * Sync missing topics to target PODs
 */
export async function syncPodTopicsApi(payload) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/sync`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!data.success) throw new Error(data.error || 'Gagal melakukan sinkronisasi topic');
  return data;
}

/**
 * Register a new topic to target PODs
 */
export async function registerPodTopicApi(payload) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!data.success) throw new Error(data.error || 'Gagal mendaftarkan topic');
  return data;
}

/**
 * Publish a test packet to MQTT broker via HTTP REST
 */
export async function sendMqttTestMessageApi(payload) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/test-publish`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!data.success) throw new Error(data.error || 'Gagal mengirim pesan uji MQTT');
  return data;
}

/**
 * Get active MQTT broker connection status
 */
export async function fetchMqttBrokerStatusApi(params = {}) {
  const query = new URLSearchParams();
  if (params.serverId) query.set('serverId', params.serverId);
  if (params.host) query.set('host', params.host);
  if (params.brokerUrl) query.set('brokerUrl', params.brokerUrl);
  const qStr = query.toString();
  const data = await safeFetchJson(`${BACKEND_URL}/api/pod-topics/mqtt-status${qStr ? `?${qStr}` : ''}`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil status broker MQTT');
  return data.data;
}
