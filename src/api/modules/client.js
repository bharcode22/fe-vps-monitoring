import { BACKEND_URL } from '../../config';

export { BACKEND_URL };

export function getAuthHeaders() {
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
 * Safe fetch wrapper that handles HTML error pages, non-JSON responses, and timeouts cleanly
 */
export async function safeFetchJson(url, options = {}) {
  const defaultHeaders = getAuthHeaders();
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers: mergedHeaders
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server Error (${res.status}): ${text.substring(0, 120) || res.statusText}`);
    }
    throw new Error('Respon server tidak berformat JSON.');
  }

  return await res.json();
}
