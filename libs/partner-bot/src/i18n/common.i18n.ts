/**
 * Common/Shared Internationalization
 *
 * Multi-language support for shared messages like buttons and common texts
 *
 * Key naming convention:
 * - button_* - Button texts
 */

import type { I18nMessages } from '@quantumdeal/framework';

/**
 * Common i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const COMMON_I18N_NAMESPACE = 'common';

/**
 * Common messages in format compatible with LocalizationService.registerI18n()
 */
export const commonMessages: I18nMessages = {
  ru: {
    button_change_language: '🌐 Язык',
    button_i_subscribed: '✅ Я подписался! Активировать пробный период 🚀',
    button_try_again: '🔄 Попробовать снова',
    button_extend_trial: '🎁 Продлить бесплатный период',
    button_buy_subscription: '💳 Купить подписку',
  },

  en: {
    button_change_language: '🌐 Language',
    button_i_subscribed: '✅ I Joined! Activate Trial 🚀',
    button_try_again: '🔄 Try Again',
    button_extend_trial: '🎁 Extend Free Period',
    button_buy_subscription: '💳 Buy Subscription',
  },

  uk: {
    button_change_language: '🌐 Мова',
    button_i_subscribed: '✅ Я підписався! Активувати пробний період 🚀',
    button_try_again: '🔄 Спробувати знову',
    button_extend_trial: '🎁 Продовжити безкоштовний період',
    button_buy_subscription: '💳 Купити підписку',
  },

  hi: {
    button_change_language: '🌐 भाषा',
    button_i_subscribed: '✅ मैं जुड़ गया! ट्रायल सक्रिय करें 🚀',
    button_try_again: '🔄 पुनः प्रयास करें',
    button_extend_trial: '🎁 मुफ्त अवधि बढ़ाएं',
    button_buy_subscription: '💳 सदस्यता खरीदें',
  },

  fr: {
    button_change_language: '🌐 Langue',
    button_i_subscribed: "✅ J'ai rejoint! Activer l'essai 🚀",
    button_try_again: '🔄 Reessayer',
    button_extend_trial: '🎁 Prolonger la periode gratuite',
    button_buy_subscription: '💳 Acheter un abonnement',
  },

  kk: {
    button_change_language: '🌐 Тіл',
    button_i_subscribed: '✅ Мен жазылдым! Сынақ мерзімін белсендіру 🚀',
    button_try_again: '🔄 Қайта көру',
    button_extend_trial: '🎁 Тегін мерзімді ұзарту',
    button_buy_subscription: '💳 Жазылым сатып алу',
  },

  uz: {
    button_change_language: '🌐 Til',
    button_i_subscribed: "✅ Qo'shildim! Sinov muddatini faollashtirish 🚀",
    button_try_again: '🔄 Qayta urinish',
    button_extend_trial: '🎁 Bepul muddatni uzaytirish',
    button_buy_subscription: '💳 Obuna sotib olish',
  },

  tg: {
    button_change_language: '🌐 Забон',
    button_i_subscribed: '✅ Ман ҳамроҳ шудам! Давраи санҷиширо фаъол созед 🚀',
    button_try_again: '🔄 Аз нав кӯшиш кунед',
    button_extend_trial: '🎁 Давраи ройгонро дароз кунед',
    button_buy_subscription: '💳 Обуна харидан',
  },

  tl: {
    button_change_language: '🌐 Wika',
    button_i_subscribed: '✅ Sumali na ako! I-activate ang Trial 🚀',
    button_try_again: '🔄 Subukan Muli',
    button_extend_trial: '🎁 Pahabain ang Libreng Panahon',
    button_buy_subscription: '💳 Bumili ng Subscription',
  },
};
