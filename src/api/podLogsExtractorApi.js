import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch available master databases
 */
export async function fetchExtractorMastersApi() {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/masters`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat daftar Master Database');
  return data.data || [];
}

/**
 * Fetch extraction status statistics from Master DB
 */
export async function fetchExtractorStatsApi(masterId) {
  if (!masterId) throw new Error('masterId wajib ditentukan');
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/stats?masterId=${encodeURIComponent(masterId)}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil statistik ekstraksi log');
  return data.data;
}

/**
 * Execute extraction with real-time SSE streaming progress
 */
export async function executeExtractionApi(payload, onProgress) {
  const token = localStorage.getItem('vps_monitoring_token');
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/execute?stream=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errMsg = 'Gagal mengeksekusi ekstraksi log';
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errMsg;
    } catch (_) { }
    throw new Error(errMsg);
  }

  // Handle SSE streaming reader
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          try {
            const parsed = JSON.parse(trimmed.replace(/^data:\s*/, ''));
            if (parsed.status === 'ERROR') {
              throw new Error(parsed.error || 'Terjadi kesalahan saat ekstraksi');
            }
            if (parsed.status === 'DONE') {
              finalResult = parsed.result;
            }
            if (onProgress && typeof onProgress === 'function') {
              onProgress(parsed);
            }
          } catch (e) {
            if (e.message.includes('Terjadi kesalahan')) throw e;
          }
        }
      }
    }

    return finalResult || { success: true };
  }

  const data = await res.json();
  return data.data;
}
