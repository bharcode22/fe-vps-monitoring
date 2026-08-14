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
 * Fetch logs for a Docker container or System GUI App (Admin only)
 */
export async function fetchDockerLogsApi(serverId, containerName) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/docker/${encodeURIComponent(containerName)}/logs`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil log container');
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
 * Fetch and compare all sounds across multiple pods
 */
export async function fetchCompareSoundsApi(version = 'all') {
  const res = await fetch(`${BACKEND_URL}/api/vps/sounds/compare?version=${encodeURIComponent(version)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membandingkan sounds antar pod');
  return data.data;
}

/**
 * Fetch and compare all metadata across multiple pods
 */
export async function fetchCompareMetadataApi(version = 'all') {
  const res = await fetch(`${BACKEND_URL}/api/vps/metadata/compare?version=${encodeURIComponent(version)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membandingkan metadata antar pod');
  return data.data;
}

/**
 * Fetch all configured RabbitMQ servers
 */
export async function fetchRabbitMqsApi() {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data RabbitMQ');
  return data.data;
}

/**
 * Create a new RabbitMQ server connection
 */
export async function createRabbitMqApi(serverData) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menambahkan server RabbitMQ');
  return data.data;
}

/**
 * Update an existing RabbitMQ server connection
 */
export async function updateRabbitMqApi(id, serverData) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui server RabbitMQ');
  return data;
}

/**
 * Delete a RabbitMQ server connection
 */
export async function deleteRabbitMqApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus server RabbitMQ');
  return data;
}

/**
 * Fetch health & live queues/consumers from RabbitMQ HTTP API
 */
export async function fetchRabbitMqStatusApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}/status`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil live status RabbitMQ');
  return data.data;
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
 * Fetch Pod config and available sound metadata options for a Pod server
 */
export async function fetchPodConfigApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pod-config`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil konfigurasi Pod');
  return data.data;
}

/**
 * Update Pod config on a Pod server
 */
export async function updatePodConfigApi(serverId, configData) {
  const res = await fetch(`${BACKEND_URL}/api/vps/${serverId}/pod-config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(configData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui konfigurasi Pod');
  return data;
}

/**
 * Trigger backend redeployment (git pull & docker compose rebuild) on target server
 */
export async function redeployBackendApi(serverId) {
  const url = `${BACKEND_URL}/api/vps/${serverId}/deploy-backend`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    if (res.status === 404) {
      throw new Error(`Rute backend tidak ditemukan (404 Not Found). Backend yang sedang berjalan di server belum memiliki rute '/api/vps/${serverId}/deploy-backend'. Jalankan 'bash scripts/deploy.sh' di server sekali secara manual terlebih dahulu untuk memperbarui backend.`);
    }
    throw new Error(`Server mengembalikan respons non-JSON (${res.status} ${res.statusText}).`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || 'Gagal meredeploy backend');
  return data;
}

/**
 * Fetch available .env configuration files from backend/envoirment
 */
export async function fetchInstallationEnvFilesApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/env-files`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil daftar file .env');
  return data;
}

/**
 * Fetch available artifact versions for an app & environment from MinIO
 */
export async function fetchInstallationVersionsApi(appName, env) {
  const query = new URLSearchParams({ app_name: appName || 'mobile-api', env: env || 'dev' }).toString();
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/versions?${query}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil versi instalasi dari MinIO');
  return data;
}

/**
 * Execute automated deployment on target POD v3 server
 */
export async function executeInstallationApi(payload) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/deploy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengeksekusi instalasi POD v3');
  return data;
}
