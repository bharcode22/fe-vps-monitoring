import { BACKEND_URL, getAuthHeaders } from './client';

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

  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Koneksi Timeout (HTTP ${res.status}: ${res.statusText || 'Gateway Timeout'}). Proses deployment di server mungkin masih berlangsung.`);
    }
    throw new Error(`Respon server tidak valid (${responseText.slice(0, 100)})`);
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Gagal mengeksekusi instalasi POD v3 (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch all .env files with detailed variables (Environment Manager)
 */
export async function fetchEnvManagerFilesApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/env-manager/files`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat daftar file environment');
  return data.files || [];
}

/**
 * Create a new .env file in backend/envoirment
 */
export async function createEnvFileApi(filename, content = '') {
  const res = await fetch(`${BACKEND_URL}/api/vps/env-manager/files`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, content })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membuat file environment baru');
  return data;
}

/**
 * Save / Update an existing .env file
 */
export async function saveEnvFileApi(filename, content) {
  const res = await fetch(`${BACKEND_URL}/api/vps/env-manager/files/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, content })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menyimpan perubahan file environment');
  return data;
}

/**
 * Delete a .env file
 */
export async function deleteEnvFileApi(filename) {
  const res = await fetch(`${BACKEND_URL}/api/vps/env-manager/files/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus file environment');
  return data;
}

/**
 * Compare two .env files side-by-side
 */
export async function compareEnvFilesApi(sourceFileA, sourceFileB) {
  const res = await fetch(`${BACKEND_URL}/api/vps/env-manager/compare`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceFileA, sourceFileB })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan komparasi environment');
  return data;
}

/**
 * Fetch detailed artifact versions with file list & sizes from MinIO
 */
export async function fetchMinioArtifactDetailsApi(appName, env) {
  const query = new URLSearchParams({ app_name: appName || 'mobile-api', env: env || 'dev' }).toString();
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/minio-artifacts/details?${query}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat rincian artefak MinIO');
  return data;
}

/**
 * Delete a single artifact version from MinIO
 */
export async function deleteMinioArtifactVersionApi(appName, env, version) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/minio-artifacts/version`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ app_name: appName, env, version })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus versi dari MinIO');
  return data;
}

/**
 * Delete multiple artifact versions in batch from MinIO
 */
export async function deleteMinioBatchArtifactVersionsApi(appName, env, versions) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/minio-artifacts/batch-delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ app_name: appName, env, versions })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan batch delete MinIO');
  return data;
}

/**
 * Cleanup older artifact versions, keeping N newest
 */
export async function cleanupMinioOlderArtifactVersionsApi(appName, env, keepCount = 3) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/minio-artifacts/cleanup-older`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ app_name: appName, env, keepCount })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan cleanup versi lama MinIO');
  return data;
}

/**
 * Fetch paginated deployment history with filters
 */
export async function fetchDeploymentHistoryApi(params = {}) {
  const query = new URLSearchParams();
  if (params.pod_code) query.append('pod_code', params.pod_code);
  if (params.app_name) query.append('app_name', params.app_name);
  if (params.environment) query.append('environment', params.environment);
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/history${qs}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat riwayat deployment');
  return data;
}

/**
 * Fetch full deployment detail with terminal logs
 */
export async function fetchDeploymentDetailApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/history/${id}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat detail riwayat deployment');
  return data.data;
}

/**
 * Delete a specific deployment history item
 */
export async function deleteDeploymentHistoryApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus riwayat deployment');
  return data;
}

/**
 * Cleanup old deployment history
 */
export async function cleanupDeploymentHistoryApi(keepCount = 100) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/history/cleanup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ keepCount })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membersihkan riwayat deployment');
  return data;
}

/**
 * Fetch current application versions matrix across all PODs
 */
export async function fetchPodAppVersionsApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/pod-versions`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat matriks versi aplikasi POD');
  return data.data;
}

/**
 * Scan live application versions on PODs via SSH
 */
export async function scanPodAppVersionsApi(serverIds = null) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/pod-versions/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ server_ids: serverIds })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan pemindaian versi POD');
  return data;
}

/**
 * Fetch all bundle definitions with optional environment filter
 */
export async function fetchBundleDefinitionsApi(env = '') {
  const qs = env ? `?env=${encodeURIComponent(env)}` : '';
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles${qs}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat daftar bundle');
  return data.data || [];
}

/**
 * Fetch single bundle detail
 */
export async function fetchBundleDetailApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles/${id}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat detail bundle');
  return data.data;
}

/**
 * Create a new bundle definition
 */
export async function createBundleDefinitionApi(payload) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membuat bundle baru');
  return data;
}

/**
 * Update an existing bundle definition
 */
export async function updateBundleDefinitionApi(id, payload) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui bundle');
  return data;
}

/**
 * Delete a bundle definition
 */
export async function deleteBundleDefinitionApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus bundle');
  return data;
}

/**
 * Fetch POD v3 bundle compliance matrix
 */
export async function fetchPodBundleMatrixApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles/pod-matrix`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat matriks bundle POD');
  return data.data || [];
}

/**
 * Assign a bundle to a POD
 */
export async function assignPodBundleApi(podCode, bundleId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/installation/bundles/assign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ pod_code: podCode, bundle_id: bundleId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menugaskan bundle ke POD');
  return data;
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
