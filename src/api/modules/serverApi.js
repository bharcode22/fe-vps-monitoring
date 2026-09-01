import { BACKEND_URL, getAuthHeaders, safeFetchJson } from './client';

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

  const data = await safeFetchJson(url);
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data layanan');
  return data.data;
}

/**
 * Fetch historical metrics for a specific server
 */
export async function fetchServerHistoryApi(serverId) {
  const data = await safeFetchJson(`${BACKEND_URL}/api/vps/${serverId}/history`);
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
 * Execute generic shell command via SSH on a remote server (Admin only)
 */
export async function executeServerCommandApi(serverId, command) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${serverId}/commands/execute`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengeksekusi perintah');
  return data;
}

/**
 * Fetch live Heartbeat PODs and location data
 */
export async function fetchHeartbeatLiveApi() {
  const res = await fetch(`${BACKEND_URL}/api/heartbeat/live`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat data heartbeat live');
  return data;
}

/**
 * Sync Heartbeat location, MAC address, and code to servers database
 */
export async function syncHeartbeatApi() {
  const res = await fetch(`${BACKEND_URL}/api/heartbeat/sync`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan sinkronisasi heartbeat');
  return data;
}
