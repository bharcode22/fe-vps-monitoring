import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';
import { fetchSettingsApi, saveSettingApi } from '../api/vpsApi';

const LanguageContext = createContext();

/**
 * Helper to resolve nested object path e.g. 'podActivity.status.occupied'
 */
function resolveNestedPath(obj, path) {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path]; // Direct key lookup
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Helper to interpolate variables like 'Showing {count} of {total}'
 */
function interpolate(template, params) {
  if (typeof template !== 'string' || !params || typeof params !== 'object') {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('vps_monitoring_lang');
      return saved === 'en' ? 'en' : 'id';
    } catch (e) {
      return 'id';
    }
  });

  // Sync language setting from backend SQLite DB on mount
  useEffect(() => {
    fetchSettingsApi().then(settings => {
      if (settings && settings.language) {
        const val = settings.language === 'en' ? 'en' : 'id';
        setLang(val);
        localStorage.setItem('vps_monitoring_lang', val);
      }
    });
  }, []);

  const changeLanguage = useCallback((newLang) => {
    const validLang = newLang === 'en' ? 'en' : 'id';
    setLang(validLang);
    localStorage.setItem('vps_monitoring_lang', validLang);
    saveSettingApi('language', validLang);
  }, []);

  const t = useCallback((key, params = null, fallback = null) => {
    if (!key) return '';

    const currentDict = translations[lang] || translations.id || {};
    const fallbackDict = translations.id || {};

    let result = resolveNestedPath(currentDict, key);
    if (result === undefined) {
      result = resolveNestedPath(fallbackDict, key);
    }
    if (result === undefined) {
      result = fallback !== null && fallback !== undefined ? fallback : key;
    }

    if (typeof result === 'string' && params && typeof params === 'object') {
      return interpolate(result, params);
    }

    return result;
  }, [lang]);

  const isEn = lang === 'en';
  const isId = lang === 'id';

  return (
    <LanguageContext.Provider value={{ lang, isEn, isId, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
