import { BACKEND_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('vps_monitoring_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Fetch default sync environment info
 */
export async function fetchSyncInfoApi() {
  const res = await fetch(`${BACKEND_URL}/api/sync/info`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil info default database');
  return data.defaults;
}

/**
 * Test connections for Source and Target PostgreSQL databases
 */
export async function testSyncConnectionApi(sourceUrl, targetUrl) {
  const res = await fetch(`${BACKEND_URL}/api/sync/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceUrl, targetUrl })
  });
  const data = await res.json();
  return data;
}

/**
 * Test a single PostgreSQL database connection (Source or Target)
 */
export async function testSingleConnectionApi(url) {
  const res = await fetch(`${BACKEND_URL}/api/sync/test-single`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  return data;
}

/**
 * Compare schemas between Source and Target databases
 */
export async function compareSchemaApi(sourceUrl, targetUrl) {
  const res = await fetch(`${BACKEND_URL}/api/sync/compare-schema`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceUrl, targetUrl })
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.error || 'Gagal membandingkan skema database');
  return data;
}

/**
 * Execute data synchronization from Source to Target DB
 */
export async function performSyncApi(options) {
  const { sourceUrl, targetUrl, dryRun = false, tables = null, batchSize = 500 } = options;
  const res = await fetch(`${BACKEND_URL}/api/sync/perform`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceUrl, targetUrl, dryRun, tables, batchSize })
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.error || 'Gagal mengeksekusi sinkronisasi database');
  return data;
}
