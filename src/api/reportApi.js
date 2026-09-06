import { BACKEND_URL, safeFetchJson, getAuthHeaders } from './modules/client';

/**
 * Trigger report generation for a specific server
 */
export async function generatePodReportApi(serverId, sendTelegram = false) {
  const url = `${BACKEND_URL}/api/reports/generate/${serverId}`;
  return await safeFetchJson(url, {
    method: 'POST',
    body: JSON.stringify({ sendTelegram })
  });
}

/**
 * Fetch list of generated PDF reports
 */
export async function fetchReportsListApi() {
  const url = `${BACKEND_URL}/api/reports/list`;
  return await safeFetchJson(url, { method: 'GET' });
}

/**
 * Get direct download URL for a report file
 */
export function getReportDownloadUrl(fileName) {
  return `${BACKEND_URL}/api/reports/download/${encodeURIComponent(fileName)}`;
}

/**
 * Trigger programmatic blob download with proper error handling
 */
export async function downloadReportBlobApi(fileName) {
  const url = getReportDownloadUrl(fileName);
  const res = await fetch(url);
  if (!res.ok) {
    let errMsg = `Gagal mengunduh berkas (${res.status})`;
    try {
      const json = await res.json();
      if (json.error) errMsg = json.error;
    } catch (_) { }
    throw new Error(errMsg);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * Hard delete a PDF report file permanently
 */
export async function deleteReportApi(fileName) {
  const url = `${BACKEND_URL}/api/reports/${encodeURIComponent(fileName)}`;
  return await safeFetchJson(url, {
    method: 'DELETE'
  });
}
