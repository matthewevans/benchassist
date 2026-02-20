import '@testing-library/jest-dom/vitest';
import { resetFactories } from './factories.ts';
import { beforeEach } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '@/i18n/locales/en/common.json';
import enGame from '@/i18n/locales/en/game.json';
import enRoster from '@/i18n/locales/en/roster.json';
import enPractice from '@/i18n/locales/en/practice.json';
import enSettings from '@/i18n/locales/en/settings.json';

// Initialize i18next synchronously for tests using real English translations
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'game', 'roster', 'practice', 'settings'],
    defaultNS: 'common',
    resources: {
      en: {
        common: enCommon,
        game: enGame,
        roster: enRoster,
        practice: enPractice,
        settings: enSettings,
      },
    },
    interpolation: { escapeValue: false },
  });
}

// jsdom doesn't implement CSS transforms in getComputedStyle.
// vaul (Drawer) reads transform and calls .match() on it, which throws if undefined.
// A real browser returns 'none' for elements without a transform — replicate that here.
const _getComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) =>
  new Proxy(_getComputedStyle(elt, pseudoElt), {
    get(target, prop: string) {
      if (prop === 'transform') return target.transform || 'none';
      const val = Reflect.get(target, prop);
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });

// jsdom doesn't implement pointer capture (used by vaul's drag handling).
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});

beforeEach(() => {
  resetFactories();
});
