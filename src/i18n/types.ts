export type LocaleCode = 'en' | 'es-MX';

export interface LocaleConfig {
  code: LocaleCode;
  /** Native name shown in the language picker */
  label: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', label: 'English' },
  { code: 'es-MX', label: 'Español (México)' },
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

/** Maps browser navigator.language values to a supported LocaleCode */
export function detectLocale(): LocaleCode {
  const lang = navigator.language;
  if (lang === 'es-MX' || lang.startsWith('es')) return 'es-MX';
  return DEFAULT_LOCALE;
}
