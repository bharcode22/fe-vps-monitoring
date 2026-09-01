import { BACKEND_URL, getAuthHeaders } from './client';

/**
 * Fetch all code folders in AWS S3 media/
 */
export async function fetchS3MediaFoldersApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/s3/folders`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data folder AWS S3');
  return data.data;
}

/**
 * Fetch files inside a specific S3 code folder (e.g. 144411)
 */
export async function fetchS3FolderFilesApi(code) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/s3/files?code=${encodeURIComponent(code)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal mengambil file folder ${code} di AWS S3`);
  return data.data;
}

/**
 * Fetch real-time storage metrics (1 TB disk meter, /home/pod breakdown) for all POD v3
 */
export async function fetchPodsStorageSummaryApi(version = 'v3') {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/storage?version=${encodeURIComponent(version)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat status storage POD v3');
  return data.data;
}

/**
 * Fetch real-time storage metrics for a single POD server
 */
export async function fetchSinglePodStorageSummaryApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/storage?serverId=${encodeURIComponent(serverId)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat status storage POD');
  return data.data?.pods?.[0] || null;
}

/**
 * Scan a single POD server for physical files and detect orphan/junk files
 */
export async function scanPodJunkFilesApi(serverId, s3Code = '') {
  const query = s3Code ? `?s3Code=${encodeURIComponent(s3Code)}` : '';
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/${serverId}/scan${query}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan scan file di POD');
  return data.data;
}

/**
 * Clean up selected junk files from a POD server (with dry-run support)
 */
export async function cleanupPodJunkFilesApi(serverId, filePaths, isDryRun = true) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/cleanup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, filePaths, isDryRun })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membersihkan file sampah di POD');
  return data.data;
}

/**
 * Sync selected AWS S3 code folder to target POD servers
 */
export async function syncS3ToPodApi(serverIds, s3Code) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds, s3Code })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal melakukan sinkronisasi AWS S3 ke POD');
  return data;
}

/**
 * Hard delete entire code folder from AWS S3
 */
export async function deleteS3FolderApi(code) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/s3/folder/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal menghapus folder #${code} di AWS S3`);
  return data.data;
}

/**
 * Hard delete a single file from AWS S3
 */
export async function deleteS3FileApi(key) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/s3/file`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ key })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus file di AWS S3');
  return data.data;
}

/**
 * Check file presence for a single S3 code across all or selected PODs (Lazy Matrix Row Check)
 */
export async function checkCodeOnPodsApi(s3Code, filenames = [], serverIds = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/matrix/check-pods`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ s3Code, filenames, serverIds })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal memeriksa ketersediaan file #${s3Code} di POD`);
  return data.data;
}

/**
 * Hard delete files matching a specific S3 code on a specific POD
 */
export async function deleteCodeOnPodApi(serverId, s3Code, filenames = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/delete-code`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, s3Code, filenames })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal menghapus file di POD #${serverId}`);
  return data.data;
}

/**
 * Download specific files (or all missing files) of an S3 code to a specific POD
 */
export async function downloadCodeFilesToPodApi(serverId, s3Code, filenames = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/download-code`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, s3Code, filenames })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal mendownload file ke POD #${serverId}`);
  return data;
}

/**
 * Download missing files of an S3 code to multiple PODs in batch
 */
export async function downloadCodeFilesToBatchPodsApi(serverIds = [], s3Code, filenames = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/download-batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds, s3Code, filenames })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal mendownload batch file ke ${serverIds.length} POD`);
  return data;
}

/**
 * Batch delete code files across multiple PODs and/or AWS S3
 */
export async function batchDeleteCodeApi(s3Code, filenames = [], serverIds = [], deleteFromS3 = false) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/batch-delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ s3Code, filenames, serverIds, deleteFromS3 })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memproses batch delete file');
  return data.data;
}

/**
 * Check media file integrity using ffprobe & stat on remote POD
 */
export async function checkPodFileIntegrityApi(serverId, filePath) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pods/check-file-integrity`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, filePath })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal memeriksa integritas file di POD #${serverId}`);
  return data.data;
}

/**
 * Helper to build media streaming URL directly from remote POD via SFTP proxy
 */
export function getPodFileStreamUrl(serverId, filePath) {
  return `${BACKEND_URL}/api/vps/content/pods/file-stream?serverId=${encodeURIComponent(serverId)}&filePath=${encodeURIComponent(filePath)}`;
}

/**
 * Inspect Docker disk usage (BuildKit cache, dangling images, container logs, volumes) on a single POD
 */
export async function inspectSinglePodDockerApi(serverId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/storage/docker/inspect/${encodeURIComponent(serverId)}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menginspeksi Docker di server POD');
  return data.data;
}

/**
 * Inspect Docker disk usage across all POD v3 servers in parallel
 */
export async function inspectAllPodsDockerApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/storage/docker/inspect-all`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menginspeksi Docker di seluruh POD');
  return data.data;
}

/**
 * Execute Docker cleanup on a single POD server
 * cleanType: 'safe' | 'deep' | 'logs' | 'all'
 */
export async function cleanupSinglePodDockerApi(serverId, cleanType = 'safe') {
  const res = await fetch(`${BACKEND_URL}/api/vps/storage/docker/cleanup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, cleanType })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membersihkan Docker storage');
  return data.data;
}

/**
 * Execute Docker cleanup in batch across multiple/all POD servers
 */
export async function cleanupBatchPodsDockerApi(serverIds = [], cleanType = 'safe') {
  const res = await fetch(`${BACKEND_URL}/api/vps/storage/docker/cleanup-batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds, cleanType })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memproses pembersihan batch Docker');
  return data;
}

/**
 * Scan all PODs for rogue media files
 */
export async function scanRogueFilesApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pod-rogue-files`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memindai file rogue');
  return data.data;
}

/**
 * Cleanup rogue media files from a POD
 */
export async function cleanupRogueFilesApi(serverId, filePaths, isDryRun = true) {
  const res = await fetch(`${BACKEND_URL}/api/vps/content/pod-rogue-files/cleanup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, filePaths, isDryRun })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal membersihkan file rogue');
  return data;
}

/**
 * Flow Editor Media Storage APIs (Master RDS, S3 images/, POD V3)
 */
export async function getFlowEditorFilesApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/files`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memuat daftar file Flow Editor');
  return data.data;
}

export async function checkFlowEditorPodsApi(serverIds = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/pods/check`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memeriksa file Flow Editor di POD');
  return data.data;
}

export async function downloadFlowFilesToPodApi(serverId, filenames = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/pods/download`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, filenames })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Gagal mendownload flow file ke POD #${serverId}`);
  return data;
}

export async function downloadFlowFilesToBatchPodsApi(serverIds = [], filenames = []) {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/pods/download-batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverIds, filenames })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mendownload batch flow file ke POD');
  return data;
}

export async function deleteFlowFileFromPodApi(serverId, filename, folderType = 'images') {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/pods/delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ serverId, filename, folderType })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus flow file dari POD');
  return data.data;
}

export async function deleteFlowFileFromS3Api(filename) {
  const res = await fetch(`${BACKEND_URL}/api/vps/flow-editor/s3/delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus file dari S3');
  return data.data;
}
