import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, detectLocale, type LocaleCode } from '@/i18n/types.ts';

import enCommon from '@/i18n/locales/en/common.json';
import enGame from '@/i18n/locales/en/game.json';
import enRoster from '@/i18n/locales/en/roster.json';
import enPractice from '@/i18n/locales/en/practice.json';
import enSettings from '@/i18n/locales/en/settings.json';

import esMxCommon from '@/i18n/locales/es-MX/common.json';
import esMxGame from '@/i18n/locales/es-MX/game.json';
import esMxRoster from '@/i18n/locales/es-MX/roster.json';
import esMxPractice from '@/i18n/locales/es-MX/practice.json';
import esMxSettings from '@/i18n/locales/es-MX/settings.json';

const STORAGE_KEY = 'benchassist_locale';

function readStoredLocale(): LocaleCode | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es-MX') return stored;
  return null;
}

const initialLocale: LocaleCode = readStoredLocale() ?? detectLocale();

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  ns: ['common', 'game', 'roster', 'practice', 'settings'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already handles XSS
  },
  resources: {
    en: {
      common: enCommon,
      game: enGame,
      roster: enRoster,
      practice: enPractice,
      settings: enSettings,
    },
    'es-MX': {
      common: esMxCommon,
      game: esMxGame,
      roster: esMxRoster,
      practice: esMxPractice,
      settings: esMxSettings,
    },
  },
});

export default i18n;
