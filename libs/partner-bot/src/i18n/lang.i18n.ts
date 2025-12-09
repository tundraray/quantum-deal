/**
 * Language Selection Internationalization
 *
 * Multi-language support for language selection messages
 *
 * Key naming convention:
 * - lang_select_prompt - Language selection prompt
 * - lang_changed - Language change confirmation
 */

import type { I18nMessages } from '@quantumdeal/framework';

/**
 * Language i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const LANG_I18N_NAMESPACE = 'lang';

/**
 * Language messages in format compatible with LocalizationService.registerI18n()
 */
export const langMessages: I18nMessages = {
  en: {
    lang_select_prompt: '🌐 <b>Choose Language:</b>',
    lang_changed: '✅ <b>English selected.</b>',
  },

  ru: {
    lang_select_prompt: '🌐 <b>Выберите язык:</b>',
    lang_changed: '✅ <b>Русский выбран.</b>',
  },

  uk: {
    lang_select_prompt: '🌐 <b>Оберіть мову:</b>',
    lang_changed: '✅ <b>Українську вибрано.</b>',
  },

  hi: {
    lang_select_prompt: '🌐 <b>भाषा चुनें:</b>',
    lang_changed: '✅ <b>हिंदी चुनी गई।</b>',
  },

  fr: {
    lang_select_prompt: '🌐 <b>Choisissez la langue:</b>',
    lang_changed: '✅ <b>Français sélectionné.</b>',
  },

  kk: {
    lang_select_prompt: '🌐 <b>Тілді таңдаңыз:</b>',
    lang_changed: '✅ <b>Қазақша таңдалды.</b>',
  },

  uz: {
    lang_select_prompt: '🌐 <b>Tilni tanlang:</b>',
    lang_changed: "✅ <b>O'zbekcha tanlandi.</b>",
  },

  tg: {
    lang_select_prompt: '🌐 <b>Забонро интихоб кунед:</b>',
    lang_changed: '✅ <b>Тоҷикӣ интихоб шуд.</b>',
  },

  tl: {
    lang_select_prompt: '🌐 <b>Pumili ng Wika:</b>',
    lang_changed: '✅ <b>Tagalog ang napili.</b>',
  },
};
