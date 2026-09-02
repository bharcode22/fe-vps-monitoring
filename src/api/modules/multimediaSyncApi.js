import { BACKEND_URL, getAuthHeaders } from './client';

/**
 * Fetch Master API JWT authentication token from backend
 */
export async function fetchMasterTokenApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/multimedia/master-token`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success || !data.token) {
    throw new Error(data.error || 'Gagal mengambil token autentikasi Master API');
  }
  return data;
}

/**
 * Direct High-Speed Multipart Upload with SSE Progress Tracking from Browser to Master API (/multimedia/upload-with-progress)
 */
export function uploadDirectToMasterApi(
  formData,
  masterToken,
  masterApiBase = 'https://be-api.regenesispod.com/admin-api',
  onClientProgress = null,
  onServerProgress = null,
  onXhrCreated = null
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cleanBase = (masterApiBase || 'https://be-api.regenesispod.com/admin-api').replace(/\/+$/, '');
    const uploadUrl = `${cleanBase}/multimedia/upload-with-progress`;

    xhr.open('POST', uploadUrl, true);
    const authHeader = masterToken?.startsWith('Bearer ') ? masterToken : masterToken;
    xhr.setRequestHeader('Authorization', authHeader);

    if (onXhrCreated) {
      onXhrCreated(xhr);
    }

    // Phase 1: Client Upload Stream to Master API Server
    if (onClientProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onClientProgress(e.loaded, e.total);
        }
      };
    }

    let seenIndex = 0;
    let finalCompletedData = null;
    let hasError = null;

    const parseSseChunk = () => {
      const text = xhr.responseText || '';
      if (text.length <= seenIndex) return;

      const newChunk = text.substring(seenIndex);
      seenIndex = text.length;

      const lines = newChunk.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          try {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            const eventData = JSON.parse(jsonStr);

            if (eventData.status === 'heartbeat') {
              continue;
            }

            if (eventData.status === 'completed') {
              finalCompletedData = eventData;
            }

            if (eventData.status === 'error') {
              hasError = eventData.error || 'Terjadi kesalahan pada backend Master API';
            }

            if (onServerProgress) {
              onServerProgress(eventData);
            }
          } catch (_) {}
        }
      }
    };

    // Phase 2: Listen to SSE stream chunks pushed from Master API Server as it uploads to AWS S3
    xhr.onprogress = () => {
      parseSseChunk();
    };

    xhr.onload = () => {
      parseSseChunk();

      if (hasError) {
        reject(new Error(hasError));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (finalCompletedData) {
          resolve(finalCompletedData.data || finalCompletedData);
        } else {
          // If no specific SSE completed event but status 200, try to parse full responseText
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve(parsed?.data || parsed);
          } catch (_) {
            resolve({ message: 'Upload multimedia berhasil diproses' });
          }
        }
      } else {
        const errorMsg = hasError || xhr.responseText || `HTTP ${xhr.status}`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus saat mengunggah langsung ke Master API'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload dibatalkan oleh pengguna'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Timeout koneksi (15 menit) saat mengunggah langsung ke Master API'));
    };

    // 15 menit timeout untuk file berukuran besar hingga 10 GB
    xhr.timeout = 900000;

    xhr.send(formData);
  });
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

/**
 * Request AWS S3 Presigned URLs for Direct Browser Upload
 */
export async function getDirectS3PresignedUrlsApi(soundScape, files = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/direct-s3/presigned-urls`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sound_scape: soundScape, files })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal membuat URL Presigned S3');
  }
  return data;
}

/**
 * Save direct multimedia metadata to `multimedia` and `media_forensik` (SHA-256) tables
 */
export async function saveDirectS3MultimediaMetadataApi(payload) {
  const res = await fetch(`${BACKEND_URL}/api/vps/direct-s3/save-metadata`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal menyimpan metadata ke database Master');
  }
  return data;
}

