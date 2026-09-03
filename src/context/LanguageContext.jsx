import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import { fetchSettingsApi, saveSettingApi } from '../api/vpsApi';

const LanguageContext = createContext();

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

  const changeLanguage = (newLang) => {
    const validLang = newLang === 'en' ? 'en' : 'id';
    setLang(validLang);
    localStorage.setItem('vps_monitoring_lang', validLang);
    saveSettingApi('language', validLang);
  };

  const t = (key) => {
    const dict = translations[lang] || translations.id;
    return dict[key] || translations.id[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
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
