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

/**
 * Fetch daily aggregated user & session monitoring data
 */
export async function fetchSessionMonitoringSummaryApi(params = {}) {
  const query = new URLSearchParams();
  if (params.masterId) query.set('masterId', params.masterId);
  if (params.podId && params.podId !== 'ALL') query.set('podId', params.podId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.groupByPod !== undefined) query.set('groupByPod', String(params.groupByPod));

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/monitoring/summary?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data monitoring sesi & user');
  return data.data;
}

/**
 * Fetch detailed sessions list for a specific date and/or POD
 */
export async function fetchSessionMonitoringDetailsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.masterId) query.set('masterId', params.masterId);
  if (params.podId && params.podId !== 'ALL') query.set('podId', params.podId);
  if (params.date) query.set('date', params.date);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/monitoring/details?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil detail sesi');
  return data.data;
}

/**
 * Fetch Experience & Therapy Insights (Top Songs, Per-POD, Hourly, Completion)
 */
export async function fetchExperienceInsightsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.masterId) query.set('masterId', params.masterId);
  if (params.podId && params.podId !== 'ALL') query.set('podId', params.podId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/monitoring/insights?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data wawasan experience');
  return data.data;
}

/**
 * Fetch preview of orphan/unregistered pod records
 */
export async function fetchOrphanCleanupPreviewApi(masterId) {
  if (!masterId) throw new Error('masterId wajib disertakan.');
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/cleanup/preview?masterId=${encodeURIComponent(masterId)}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat pratinjau pembersihan data orphan');
  return data.data;
}

/**
 * Execute cleanup of orphan/unregistered pod records in Master DB
 */
export async function executeOrphanCleanupApi(payload = {}) {
  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/cleanup/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengeksekusi pembersihan data orphan');
  return data.data;
}

/**
 * Fetch detailed paginated orphan records for inspection prior to cleanup
 */
export async function fetchOrphanCleanupRecordsApi({ masterId, table = 'play_sesion_detail', page = 1, limit = 20, search = '' }) {
  if (!masterId) throw new Error('masterId wajib disertakan.');
  const query = new URLSearchParams();
  query.set('masterId', masterId);
  query.set('table', table);
  query.set('page', page);
  query.set('limit', limit);
  if (search) query.set('search', search);

  const res = await fetch(`${BACKEND_URL}/api/pod-logs-extractor/cleanup/records?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat rincian data orphan');
  return data.data;
}
