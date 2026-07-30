import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Fetch all registered servers with their latest metrics
 */
export async function fetchServersApi(searchQuery = '') {
  const url = searchQuery.trim()
    ? `${BACKEND_URL}/api/vps?q=${encodeURIComponent(searchQuery.trim())}`
    : `${BACKEND_URL}/api/vps`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data VPS');
  return data.data;
}

/**
 * Fetch historical metrics for a specific server
 */
export async function fetchServerHistoryApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/history`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil riwayat statistik');
  return data.data;
}

/**
 * Create a new server / POD
 */
export async function createServerApi(serverData) {
  const res = await fetch(`${BACKEND_URL}/api/vps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menambahkan server');
  return data;
}

/**
 * Update an existing server configuration
 */
export async function updateServerApi(id, serverData) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui server');
  return data;
}

/**
 * Delete a server by ID
 */
export async function deleteServerApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus server');
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
