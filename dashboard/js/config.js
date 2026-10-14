/**
 * @file dashboard/js/config.js
 *
 * Central configuration for CloudRDR Dashboard.
 * Reads defaults, allows overrides via localStorage for live demo versatility,
 * and ensures no sensitive keys are ever logged or exposed in components.
 */

const STORAGE_KEYS = {
  API_BASE_URL: 'cloudrdr_api_base_url',
  API_KEY: 'cloudrdr_api_key',
  POLL_INTERVAL_MS: 'cloudrdr_poll_interval_ms',
  USE_MOCK: 'cloudrdr_use_mock',
  THEME: 'cloudrdr_theme',
  BUCKET_NAME: 'cloudrdr_bucket_name',
};

const defaultOrigin =
  typeof window !== 'undefined' && window.location?.origin?.startsWith('http')
    ? window.location.origin
    : 'http://localhost:3000';

// Safe defaults
const DEFAULTS = {
  API_BASE_URL: defaultOrigin,
  API_KEY: 'dev-secret-key-12345',
  POLL_INTERVAL_MS: 5000,
  USE_MOCK: true, // Default to true so demo opens immediately with full story
  THEME: 'dark',
  BUCKET_NAME: 'protected',
};


// Safe storage abstraction (browser localStorage with Node.js fallback)
const storage =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : typeof localStorage !== 'undefined'
      ? localStorage
      : {
          _map: new Map(),
          getItem(k) {
            return this._map.has(k) ? this._map.get(k) : null;
          },
          setItem(k, v) {
            this._map.set(k, String(v));
          },
          removeItem(k) {
            this._map.delete(k);
          },
        };

/**
 * Load configuration with localStorage overrides.
 */
function loadConfig() {
  const getStoredBool = (key, fallback) => {
    const val = storage.getItem(key);
    if (val === null) return fallback;
    return val === 'true';
  };

  const getStoredNum = (key, fallback) => {
    const val = storage.getItem(key);
    if (val === null) return fallback;
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
  };

  return {
    API_BASE_URL: (storage.getItem(STORAGE_KEYS.API_BASE_URL) || DEFAULTS.API_BASE_URL).replace(
      /\/+$/,
      ''
    ),
    API_KEY: storage.getItem(STORAGE_KEYS.API_KEY) || DEFAULTS.API_KEY,
    POLL_INTERVAL_MS: getStoredNum(STORAGE_KEYS.POLL_INTERVAL_MS, DEFAULTS.POLL_INTERVAL_MS),
    USE_MOCK: getStoredBool(STORAGE_KEYS.USE_MOCK, DEFAULTS.USE_MOCK),
    THEME: storage.getItem(STORAGE_KEYS.THEME) || DEFAULTS.THEME,
    BUCKET_NAME: storage.getItem(STORAGE_KEYS.BUCKET_NAME) || DEFAULTS.BUCKET_NAME,
  };
}

export const CONFIG = loadConfig();

/**
 * Update a configuration parameter and persist it.
 * @param {string} key
 * @param {string|number|boolean} value
 */
export function updateConfig(key, value) {
  if (key in CONFIG) {
    CONFIG[key] = value;
    const storageKey = STORAGE_KEYS[key];
    if (storageKey) {
      storage.setItem(storageKey, String(value));
    }
  }
}
