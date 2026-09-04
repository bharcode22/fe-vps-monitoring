export const STORAGE_KEY_TELEGRAM_CONFIG = 'vps_hb_telegram_config';
export const EVENT_TELEGRAM_CONFIG_UPDATED = 'vps_hb_telegram_config_updated';

export const DEFAULT_TELEGRAM_CONFIG = {
  enabled: true,
  botToken: '8336177409:AAE5sZ7LcnrCePY3pdc3wue8BSQ69M3OY7I',
  chatId: '-1003076691771',
  alertOnlyDead: true,
  cooldownMinutes: 5
};

/**
 * Get cached/stored Telegram alert config from localStorage or defaults
 */
export function getStoredTelegramConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TELEGRAM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_TELEGRAM_CONFIG,
          ...parsed,
          enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached telegram config:', e.message);
  }
  return { ...DEFAULT_TELEGRAM_CONFIG };
}

/**
 * Store updated Telegram alert config to localStorage and notify listeners
 */
export function setStoredTelegramConfig(config) {
  if (!config || typeof config !== 'object') return config;
  try {
    const current = getStoredTelegramConfig();
    const updated = {
      ...current,
      ...config,
      enabled: config.enabled !== undefined ? Boolean(config.enabled) : current.enabled
    };
    localStorage.setItem(STORAGE_KEY_TELEGRAM_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_TELEGRAM_CONFIG_UPDATED, { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to store telegram config:', e.message);
    return config;
  }
}
