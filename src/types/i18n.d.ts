import type enCommon from '@/i18n/locales/en/common.json';
import type enGame from '@/i18n/locales/en/game.json';
import type enRoster from '@/i18n/locales/en/roster.json';
import type enPractice from '@/i18n/locales/en/practice.json';
import type enSettings from '@/i18n/locales/en/settings.json';
import type enFaq from '@/i18n/locales/en/faq.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      game: typeof enGame;
      roster: typeof enRoster;
      practice: typeof enPractice;
      settings: typeof enSettings;
      faq: typeof enFaq;
    };
  }
}
