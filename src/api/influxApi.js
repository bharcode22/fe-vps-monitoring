import { BACKEND_URL, safeFetchJson, getAuthHeaders } from './modules/client';

/**
 * Check InfluxDB connection health and authorization status
 */
export async function fetchInfluxHealthApi(params = {}) {
  const query = new URLSearchParams();
  if (params.url) query.set('url', params.url);
  if (params.token) query.set('token', params.token);
  if (params.org) query.set('org', params.org);
  if (params.bucket) query.set('bucket', params.bucket);

  const qs = query.toString();
  const url = `${BACKEND_URL}/api/influx/health${qs ? `?${qs}` : ''}`;
  return await safeFetchJson(url);
}

/**
 * Get current InfluxDB configuration
 */
export async function fetchInfluxConfigApi() {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/config`);
}

/**
 * Save / Update InfluxDB configuration
 */
export async function saveInfluxConfigApi(config) {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/config`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

/**
 * Fetch available InfluxDB buckets
 */
export async function fetchInfluxBucketsApi() {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/buckets`);
}

/**
 * Fetch bucket schema (measurements, fields, units)
 */
export async function fetchInfluxSchemaApi(bucket, measurement = null) {
  const params = new URLSearchParams();
  if (bucket) params.set('bucket', bucket);
  if (Array.isArray(measurement) && measurement.length > 0) {
    params.set('measurements', measurement.join(','));
  } else if (measurement && typeof measurement === 'string') {
    params.set('measurement', measurement);
  }
  const qs = params.toString();
  return await safeFetchJson(`${BACKEND_URL}/api/influx/schema${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch saved Influx query templates
 */
export async function fetchInfluxQueryTemplatesApi() {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/templates`);
}

/**
 * Save new Influx query template
 */
export async function saveInfluxQueryTemplateApi(templateData) {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/templates`, {
    method: 'POST',
    body: JSON.stringify(templateData)
  });
}

/**
 * Update an existing Influx query template
 */
export async function updateInfluxQueryTemplateApi(id, templateData) {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(templateData)
  });
}

/**
 * Delete an Influx query template
 */
export async function deleteInfluxQueryTemplateApi(id) {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/templates/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Query InfluxDB data with dynamic filters (Read-Only)
 */
export async function queryInfluxDataApi(filterPayload) {
  return await safeFetchJson(`${BACKEND_URL}/api/influx/query`, {
    method: 'POST',
    body: JSON.stringify(filterPayload)
  });
}

/**
 * Download queried data as CSV or JSON file directly to user's computer
 */
export async function downloadInfluxExport(filterPayload, format = 'csv') {
  const payload = {
    ...filterPayload,
    format
  };

  const headers = getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/influx/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errText = 'Gagal mengunduh berkas.';
    try {
      const errJson = await res.json();
      errText = errJson.error || errText;
    } catch (_) {
      errText = await res.text();
    }
    throw new Error(errText);
  }

  // Extract filename from Content-Disposition header if available
  let filename = `influx_export_${Date.now()}.${format}`;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);

  return filename;
}
