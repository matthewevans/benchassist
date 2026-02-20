import { useState, useEffect, useCallback } from 'react';
import i18n from '@/i18n/config.ts';
import { SUPPORTED_LOCALES, detectLocale, type LocaleCode } from '@/i18n/types.ts';

const STORAGE_KEY = 'benchassist_locale';

function readPreference(): LocaleCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es-MX') return stored;
  return detectLocale();
}

export function useLocale() {
  const [locale, setLocaleState] = useState<LocaleCode>(readPreference);

  // Sync i18next and persist to localStorage whenever locale changes
  useEffect(() => {
    void i18n.changeLanguage(locale);
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
  }, []);

  return { locale, setLocale, supportedLocales: SUPPORTED_LOCALES };
}
