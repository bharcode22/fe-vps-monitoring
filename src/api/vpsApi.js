import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch registered servers with optional category filter & search query
 */
export async function fetchServersApi(searchQuery = '', filterType = 'all') {
  let endpoint = '/api/vps';
  if (filterType === 'vps') endpoint = '/api/vps/vps';
  else if (filterType === 'pod' || filterType === 'pod_v3' || filterType === 'pod_v2') endpoint = '/api/vps/pod';
  else if (filterType === 'postgresql') endpoint = '/api/vps/database';
  else if (filterType === 'storage' || filterType === 'minio' || filterType === 's3') endpoint = '/api/vps/storage';

  const param = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
  const url = `${BACKEND_URL}${endpoint}${param}`;

  const res = await fetch(url, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data layanan');
  return data.data;
}

/**
 * Fetch historical metrics for a specific server
 */
export async function fetchServerHistoryApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/history`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil riwayat statistik');
  return data.data;
}

/**
 * Helper to determine dedicated endpoint path based on service type
 */
function getEndpointPathByType(type) {
  if (type === 'vps') return '/api/vps/vps';
  if (type === 'pod') return '/api/vps/pod';
  if (type === 'postgresql') return '/api/vps/database';
  if (type === 'minio' || type === 's3') return '/api/vps/storage';
  return '/api/vps';
}

/**
 * Create a new server / POD / Database / Storage
 */
export async function createServerApi(serverData) {
  const endpoint = getEndpointPathByType(serverData.type);
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menambahkan layanan');
  return data;
}

/**
 * Update an existing server / POD / Database / Storage configuration
 */
export async function updateServerApi(id, serverData) {
  const endpoint = getEndpointPathByType(serverData.type);
  const res = await fetch(`${BACKEND_URL}${endpoint}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui layanan');
  return data;
}

/**
 * Delete a server / POD / Database / Storage by ID and type
 */
export async function deleteServerApi(id, type = 'vps') {
  const endpoint = getEndpointPathByType(type);
  const res = await fetch(`${BACKEND_URL}${endpoint}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus layanan');
  return data;
}

/**
 * Test SSH connection before saving
 */
export async function testConnectionApi(serverData) {
  const res = await fetch(`${BACKEND_URL}/api/vps/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(serverData)
  });
  return await res.json();
}

/**
 * Fetch all user settings from DB
 */
export async function fetchSettingsApi() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings`);
    const data = await res.json();
    if (data.success) return data.data;
    return {};
  } catch (err) {
    return {};
  }
}

/**
 * Save / Update a user setting in DB
 */
export async function saveSettingApi(key, value) {
  try {
    await fetch(`${BACKEND_URL}/api/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ key, value: String(value) })
    });
  } catch (err) {
    console.error('Failed to save setting:', err);
  }
}

/**
 * Fetch all users (Super Admin only)
 */
export async function fetchAllUsersApi() {
  const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar pengguna');
  return data.data;
}

/**
 * Update user status / approval (Super Admin only)
 */
export async function updateUserStatusApi(userId, status, role) {
  const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, role })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui status pengguna');
  return data;
}

/**
 * Fetch all Docker containers for a specific server (Admin only)
 */
export async function fetchDockerContainersApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar container Docker');
  return data.data;
}

/**
 * Restart a Docker container (Admin only)
 */
export async function restartDockerContainerApi(serverId, containerName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker/restart`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ containerName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal merestart container');
  return data;
}

/**
 * Stop a Docker container (Admin only)
 */
export async function stopDockerContainerApi(serverId, containerName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ containerName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghentikan (stop) container');
  return data;
}

/**
 * Fetch logs for a Docker container (Admin only)
 */
export async function fetchDockerLogsApi(serverId, containerName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker/${encodeURIComponent(containerName)}/logs`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil log container');
  return data.data;
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
 * Validate sound & video metadata.json against physical server files (Admin only)
 */
export async function validateServerSoundsApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/sounds/validate`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memvalidasi data metadata sounds');
  return data.data;
}
