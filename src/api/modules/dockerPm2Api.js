import { BACKEND_URL, getAuthHeaders, safeFetchJson } from './client';

/**
 * Fetch all Docker containers for a specific server (Admin only)
 */
export async function fetchDockerContainersApi(serverId) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/docker`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar container Docker');
  return data.data;
}

/**
 * Restart a Docker container (Admin only)
 */
export async function restartDockerContainerApi(serverId, containerName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/docker/restart`, {
    method: 'POST',
    body: JSON.stringify({ containerName })
  });
  if (!data.success) throw new Error(data.error || 'Gagal merestart container');
  return data;
}

/**
 * Stop a Docker container (Admin only)
 */
export async function stopDockerContainerApi(serverId, containerName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/docker/stop`, {
    method: 'POST',
    body: JSON.stringify({ containerName })
  });
  if (!data.success) throw new Error(data.error || 'Gagal menghentikan (stop) container');
  return data;
}

/**
 * Remove a Docker container (docker rm -f) (Admin only)
 */
export async function removeDockerContainerApi(serverId, containerName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker/remove`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ containerName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus (docker rm) container');
  return data;
}

/**
 * Fetch logs for a Docker container (Admin only)
 */
export async function fetchDockerLogsApi(serverId, containerName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/docker/${encodeURIComponent(containerName)}/logs`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil log container');
  if (typeof data.data === 'string') return data.data;
  if (data.data && typeof data.data.logs === 'string') return data.data.logs;
  return typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data || '');
}

/**
 * Fetch Screen Apps (small-screen & big-screen Native GUI) status (Admin only)
 */
export async function fetchScreenAppsApi(serverId) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/screen-apps`);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil status Screen Apps');
  return data.data;
}

/**
 * Restart Screen App (small-screen / big-screen) (Admin only)
 */
export async function restartScreenAppApi(serverId, appName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/screen-apps/restart`, {
    method: 'POST',
    body: JSON.stringify({ appName })
  });
  if (!data.success) throw new Error(data.error || `Gagal merestart aplikasi ${appName}`);
  return data;
}

/**
 * Stop Screen App (small-screen / big-screen) (Admin only)
 */
export async function stopScreenAppApi(serverId, appName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/screen-apps/stop`, {
    method: 'POST',
    body: JSON.stringify({ appName })
  });
  if (!data.success) throw new Error(data.error || `Gagal menghentikan (stop) aplikasi ${appName}`);
  return data;
}

/**
 * Fetch logs for Screen App (small-screen / big-screen) (Admin only)
 */
export async function fetchScreenAppLogsApi(serverId, appName) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/screen-apps/${encodeURIComponent(appName)}/logs`);
  if (!data.success) throw new Error(data.error || `Gagal mengambil log aplikasi ${appName}`);
  if (typeof data.data === 'string') return data.data;
  if (data.data && typeof data.data.logs === 'string') return data.data.logs;
  return typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data || '');
}

/**
 * Execute bash script (/home/pod/scripts/exec/auto-script.sh or kill-process.sh) on VPS (Admin only)
 */
export async function runVpsScriptApi(serverId, scriptName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/scripts/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ scriptName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal mengeksekusi skrip ${scriptName}`);
  return data.data;
}

/**
 * Fetch all PM2 applications for a specific server (Admin only)
 */
export async function fetchPm2AppsApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pm2`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar aplikasi PM2');
  return data.data;
}

/**
 * Restart a PM2 app (Admin only)
 */
export async function restartPm2AppApi(serverId, appName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pm2/restart`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ appName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal merestart aplikasi PM2');
  return data;
}

/**
 * Stop a PM2 app (Admin only)
 */
export async function stopPm2AppApi(serverId, appName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pm2/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ appName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghentikan (stop) aplikasi PM2');
  return data;
}

/**
 * Delete a PM2 app (pm2 delete) (Admin only)
 */
export async function deletePm2AppApi(serverId, appName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pm2/delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ appName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus (pm2 delete) aplikasi PM2');
  return data;
}

/**
 * Fetch logs for a PM2 app (Admin only)
 */
export async function fetchPm2LogsApi(serverId, appName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pm2/${encodeURIComponent(appName)}/logs`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil log PM2');
  return data.data;
}

/**
 * Fetch list of all log files in /home/pod/Documents/RegenesisLogs on a POD V3
 */
export async function fetchRegenesisLogsApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/regenesis-logs`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar Regenesis Logs');
  return data;
}

/**
 * Fetch content of a specific log file with line limit and search keyword
 */
export async function fetchRegenesisLogContentApi(serverId, filename, options = {}) {
  const params = new URLSearchParams({
    file: filename,
    lines: options.lines || 500,
    search: options.search || '',
    direction: options.direction || 'tail'
  });

  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/regenesis-logs/content?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membaca isi file log');
  return data.data;
}

/**
 * Generate direct download URL for a log file
 */
export function getRegenesisLogDownloadUrl(serverId, filename) {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  return `${BACKEND_URL}/api/vps/${serverId}/regenesis-logs/download?file=${encodeURIComponent(filename)}&token=${encodeURIComponent(token)}`;
}

/**
 * Trigger browser file download directly via fetch & blob (with auth header)
 */
export async function downloadRegenesisLogApi(serverId, filename) {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  const url = `${BACKEND_URL}/api/vps/${serverId}/regenesis-logs/download?file=${encodeURIComponent(filename)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    let errMsg = `Gagal mengunduh file (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

/**
 * Delete a log file from POD server
 */
export async function deleteRegenesisLogApi(serverId, filename) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/regenesis-logs?file=${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus file log');
  return data;
}
