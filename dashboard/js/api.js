/**
 * @file dashboard/js/api.js
 * API transport wrapper with X-API-Key injection and error handling.
 */

import { CONFIG } from './config.js';

export async function request(path, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const headers = {
    Accept: 'application/json',
    'X-API-Key': CONFIG.API_KEY,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = data?.error || {
      code: `http_${response.status}`,
      message: response.statusText || 'Request failed',
    };
    throw error;
  }

  return data;
}
