import { BACKEND_URL, getAuthHeaders } from './client';

/**
 * Upload a single binary chunk of a file to monitoring backend
 */
export async function uploadMultimediaChunkApi(uploadSessionId, fieldName, chunkIndex, totalChunks, filename, chunkBlob) {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  const headers = {
    'Content-Type': 'application/octet-stream',
    'x-upload-id': uploadSessionId,
    'x-field-name': fieldName,
    'x-chunk-index': String(chunkIndex),
    'x-total-chunks': String(totalChunks),
    'x-filename': encodeURIComponent(filename)
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia/upload-chunk`, {
    method: 'POST',
    headers,
    body: chunkBlob
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal mengunggah chunk ${chunkIndex + 1} untuk ${fieldName}`);
  }
  return data;
}

/**
 * Finalize multimedia upload, trigger backend reassembly, and dispatch to Master API
 */
export async function completeMultimediaUploadApi(uploadSessionId, metadata, filesManifest) {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia/complete-upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      uploadSessionId,
      metadata,
      filesManifest
    })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal menyelesaikan upload multimedia ke Master API');
  }
  return data;
}

/**
 * Cancel upload and cleanup temporary chunks on server
 */
export async function cancelMultimediaUploadApi(uploadSessionId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vps/multimedia/cancel-upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ uploadSessionId })
    });
    return await res.json();
  } catch (err) {
    console.warn('Gagal membatalkan upload di backend:', err.message);
  }
}

/**
 * Fetch paginated multimedia list from Master API
 */
export async function fetchMasterMultimediaListApi(search = '', page = 1, limit = 12) {
  const queryParams = new URLSearchParams({
    search: search || '',
    page: String(page || 1),
    limit: String(limit || 12)
  });

  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/list?${queryParams.toString()}`, {
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengambil data multimedia dari Master API');
  }
  return data;
}

/**
 * Inspect POD v3 fleet status (mobile-synch container & local media files)
 */
export async function inspectPodsSyncStatusApi(soundScapeCode = '') {
  const query = soundScapeCode ? `?soundScapeCode=${encodeURIComponent(soundScapeCode)}` : '';
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/inspect-fleet${query}`, {
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal memeriksa status POD V3');
  }
  return data;
}

/**
 * Inspect a single POD v3 status
 */
export async function inspectSinglePodSyncStatusApi(serverId, soundScapeCode = '') {
  const query = soundScapeCode ? `?soundScapeCode=${encodeURIComponent(soundScapeCode)}` : '';
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/inspect-pod/${serverId}${query}`, {
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal memeriksa status POD');
  }
  return data.data;
}

/**
 * Control (Start / Restart / Stop) mobile-synch container on a single POD
 */
export async function controlPodSyncContainerApi(serverId, action = 'start', containerName = 'mobile-synch', soundScapeCode = '') {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/control-container`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, action, containerName, soundScapeCode })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal mengeksekusi aksi '${action}' pada container di POD`);
  }
  return data;
}

/**
 * Batch Control (Start / Restart / Stop) mobile-synch containers on multiple PODs
 */
export async function batchControlPodsSyncContainersApi(serverIds = [], action = 'start', containerName = 'mobile-synch') {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/batch-control-containers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds, action, containerName })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal mengeksekusi aksi '${action}' container secara batch`);
  }
  return data;
}

// Aliases for backward compatibility
export const wakePodSyncContainerApi = (serverId, containerName) => controlPodSyncContainerApi(serverId, 'start', containerName);
export const batchWakePodsSyncContainersApi = (serverIds, containerName) => batchControlPodsSyncContainersApi(serverIds, 'start', containerName);

/**
 * Trigger Re-Save via RabbitMQ on Master API
 */
export async function triggerMasterResaveApi(soundScapeCode) {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/trigger-resave`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ soundScapeCode })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal mentrigger re-save RabbitMQ untuk #${soundScapeCode}`);
  }
  return data;
}

/**
 * Fetch logs for mobile-synch container from a specific POD
 */
export async function fetchPodSyncLogsApi(serverId, containerName = 'mobile-synch', lines = 100) {
  const queryParams = new URLSearchParams({
    containerName: containerName || 'mobile-synch',
    lines: String(lines || 100)
  });

  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/pod-logs/${serverId}?${queryParams.toString()}`, {
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengambil log container dari POD');
  }
  return data.data;
}

/**
 * Delete multimedia item from Master API
 */
export async function deleteMasterMultimediaApi(soundScapeCode) {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia-sync/delete/${encodeURIComponent(soundScapeCode)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Gagal menghapus multimedia #${soundScapeCode} dari Master API`);
  }
  return data;
}
