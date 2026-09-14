import { BACKEND_URL, safeFetchJson, getAuthHeaders } from './modules/client';

/**
 * Fetch list of all POD V3 units with Influx port status and token info
 */
export async function fetchPodInfluxListApi() {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods`);
}

/**
 * Check Influx connection & token health for a specific POD
 */
export async function fetchPodInfluxHealthApi(podId) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/health`);
}

/**
 * Refresh Influx token from /home/pod/influx_token.json via SSH or set manual override
 */
export async function refreshPodTokenApi(podId, overrideToken = null) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/token/refresh`, {
    method: 'POST',
    body: JSON.stringify({ token: overrideToken })
  });
}

/**
 * Fetch available buckets directly from a POD's InfluxDB
 */
export async function fetchPodBucketsApi(podId) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/buckets`);
}

/**
 * Fetch schema (measurements, fields, units) for a bucket in a POD
 */
export async function fetchPodSchemaApi(podId, bucket = 'pod_monitoring', measurement = null) {
  const params = new URLSearchParams();
  if (Array.isArray(bucket) && bucket.length > 0) {
    params.set('buckets', bucket.join(','));
  } else if (bucket && typeof bucket === 'string') {
    if (bucket.includes(',')) {
      params.set('buckets', bucket);
    } else {
      params.set('bucket', bucket);
    }
  }
  if (Array.isArray(measurement) && measurement.length > 0) {
    params.set('measurements', measurement.join(','));
  } else if (measurement && typeof measurement === 'string') {
    params.set('measurement', measurement);
  }
  const qs = params.toString();
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/schema${qs ? `?${qs}` : ''}`);
}

/**
 * Query data on a specific POD (Read-Only)
 */
export async function queryPodInfluxDataApi(podId, filterPayload) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/query`, {
    method: 'POST',
    body: JSON.stringify(filterPayload)
  });
}

/**
 * Download CSV or JSON data directly from a POD to user's local machine
 */
export async function downloadPodInfluxExport(podId, filterPayload, format = 'csv') {
  const payload = {
    ...filterPayload,
    format
  };

  const headers = getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/pod-influx/pods/${podId}/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errText = 'Gagal mengunduh berkas dari POD.';
    try {
      const errJson = await res.json();
      errText = errJson.error || errText;
    } catch (_) {
      errText = await res.text();
    }
    throw new Error(errText);
  }

  let filename = `pod_${podId}_influx_export_${Date.now()}.${format}`;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);

  return { success: true, filename };
}

/**
 * Fetch all saved query templates (cross-POD)
 */
export async function fetchPodQueryTemplatesApi() {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/templates`);
}

/**
 * Save a new query template
 */
export async function savePodQueryTemplateApi(templateData) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/templates`, {
    method: 'POST',
    body: JSON.stringify(templateData)
  });
}

/**
 * Update an existing query template
 */
export async function updatePodQueryTemplateApi(id, templateData) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(templateData)
  });
}

/**
 * Delete a query template
 */
export async function deletePodQueryTemplateApi(id) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/templates/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Trigger Influx CLI export directly on the POD via SSH
 */
export async function executePodCliExportApi(podId, payload) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/cli-export`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Fetch list of exported CSV files on the POD (/home/pod/exports)
 */
export async function fetchPodExportFilesApi(podId) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/exports`);
}

/**
 * Delete an exported file from the POD filesystem
 */
export async function deletePodExportFileApi(podId, filename) {
  return await safeFetchJson(`${BACKEND_URL}/api/pod-influx/pods/${podId}/exports/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });
}

/**
 * Get direct download URL for an exported file on the POD
 */
export function getPodExportFileDownloadUrl(podId, filename) {
  return `${BACKEND_URL}/api/pod-influx/pods/${podId}/exports/${encodeURIComponent(filename)}/download`;
}

/**
 * Download Timeseries Sensor Chart PDF Report directly to user's local machine
 */
export async function downloadPodChartPdfReport(podId, options = {}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/pod-influx/pods/${podId}/chart-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    let errText = 'Gagal membuat laporan PDF grafik sensor.';
    try {
      const errJson = await res.json();
      errText = errJson.error || errText;
    } catch (_) {
      errText = await res.text();
    }
    throw new Error(errText);
  }

  let filename = `report_sensor_chart_${podId}_${Date.now()}.pdf`;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }, 1000);

  return { success: true, filename };
}
