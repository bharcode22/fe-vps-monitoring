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
 * Helper to build Option A descriptive filename:
 * [NAMA_POD]_[MEASUREMENT]_[YYYY-MM-DD_HHmm].[ext]
 */
function buildClientExportFilename(podId, filterPayload = {}, format = 'csv', explicitPodName = null) {
  const rawPod = explicitPodName || `POD_${podId}`;
  const safePod = rawPod.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');

  let mTag = 'all-measurements';
  if (Array.isArray(filterPayload.measurements) && filterPayload.measurements.length === 1 && filterPayload.measurements[0]) {
    mTag = String(filterPayload.measurements[0]).trim();
  } else if (typeof filterPayload.measurement === 'string' && filterPayload.measurement.trim()) {
    mTag = filterPayload.measurement.trim();
  } else if (Array.isArray(filterPayload.measurements) && filterPayload.measurements.length > 1) {
    mTag = `${filterPayload.measurements.length}-measurements`;
  }
  const safeMeasurement = mTag.replace(/[^a-zA-Z0-9_-]/g, '_');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timestampStr = `${year}-${month}-${day}_${hours}${minutes}`;

  return `${safePod}_${safeMeasurement}_${timestampStr}.${format === 'json' ? 'json' : 'csv'}`;
}

/**
 * Download CSV or JSON data directly from a POD to user's local machine
 */
export async function downloadPodInfluxExport(podId, filterPayload, format = 'csv', options = {}) {
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

  let filename = buildClientExportFilename(podId, filterPayload, format, options.podName);
  const customHeaderFilename = res.headers.get('X-Export-Filename');
  if (customHeaderFilename) {
    filename = customHeaderFilename;
  } else {
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
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
 * Download CSV or JSON data directly from a POD with real-time stream chunk progress tracking and cancellation
 * @param {number|string} podId 
 * @param {object} filterPayload 
 * @param {string} format 'csv' | 'json'
 * @param {object} options { onProgress: ({ stage, receivedBytes, receivedMb, rowCount, percent, filename }), signal: AbortSignal, podName: string }
 */
export async function downloadPodInfluxExportStreaming(podId, filterPayload, format = 'csv', options = {}) {
  const { onProgress, signal, podName } = options;

  const payload = {
    ...filterPayload,
    format
  };

  const headers = getAuthHeaders();

  // Notify initial connection stage
  if (onProgress) {
    onProgress({
      stage: 'connecting',
      receivedBytes: 0,
      receivedMb: '0.00',
      rowCount: 0,
      percent: 15
    });
  }

  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/pod-influx/pods/${podId}/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Unduhan dibatalkan oleh pengguna.');
    }
    throw fetchErr;
  }

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

  let filename = buildClientExportFilename(podId, filterPayload, format, podName);
  const customHeaderFilename = res.headers.get('X-Export-Filename');
  if (customHeaderFilename) {
    filename = customHeaderFilename;
  } else {
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
  }

  if (onProgress) {
    onProgress({
      stage: 'streaming',
      receivedBytes: 0,
      receivedMb: '0.00',
      rowCount: 0,
      percent: 40,
      filename
    });
  }

  // Fallback if ReadableStream is not available in environment
  if (!res.body || typeof res.body.getReader !== 'function') {
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);

    if (onProgress) {
      onProgress({
        stage: 'done',
        receivedBytes: blob.size,
        receivedMb: (blob.size / (1024 * 1024)).toFixed(2),
        rowCount: 0,
        percent: 100,
        filename
      });
    }
    return { success: true, filename, receivedBytes: blob.size, rowCount: 0 };
  }

  const reader = res.body.getReader();
  const chunks = [];
  let receivedBytes = 0;
  let rowCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      // Count newlines in binary chunk (10 is ASCII for '\n')
      for (let i = 0; i < value.length; i++) {
        if (value[i] === 10) rowCount++;
      }

      if (onProgress) {
        // Organic progress calculation while streaming
        const estimatedPercent = Math.min(95, 40 + Math.floor(Math.log10(Math.max(10, rowCount)) * 12));
        onProgress({
          stage: 'streaming',
          receivedBytes,
          receivedMb: (receivedBytes / (1024 * 1024)).toFixed(2),
          rowCount,
          percent: estimatedPercent
        });
      }
    }
  } catch (readErr) {
    if (readErr.name === 'AbortError') {
      throw new Error('Unduhan dibatalkan oleh pengguna.');
    }
    throw readErr;
  }

  if (onProgress) {
    onProgress({
      stage: 'saving',
      receivedBytes,
      receivedMb: (receivedBytes / (1024 * 1024)).toFixed(2),
      rowCount,
      percent: 98
    });
  }

  const contentType = res.headers.get('Content-Type') || (format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json');
  const blob = new Blob(chunks, { type: contentType });
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);

  if (onProgress) {
    onProgress({
      stage: 'done',
      receivedBytes,
      receivedMb: (receivedBytes / (1024 * 1024)).toFixed(2),
      rowCount,
      percent: 100,
      filename
    });
  }

  return { success: true, filename, receivedBytes, rowCount };
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
