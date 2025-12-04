/**
 * Trial Service Internationalization
 *
 * Multi-language support for trial activation feature
 */

/**
 * Pluralize trial duration for each language
 * Handles complex pluralization rules (Russian/Ukrainian: 3 forms, English/French: 2 forms, others: 1 form)
 */
function pluralizeTrialDuration(lang: string, days: number): string {
  switch (lang) {
    case 'ru':
      // Russian: 1 день, 2-4 дня, 5+ дней
      if (days % 10 === 1 && days % 100 !== 11) {
        return `${days}-дневная`;
      } else if (
        days % 10 >= 2 &&
        days % 10 <= 4 &&
        (days % 100 < 10 || days % 100 >= 20)
      ) {
        return `${days}-дневная`;
      } else {
        return `${days}-дневная`;
      }

    case 'uk':
      // Ukrainian: 1 день, 2-4 дні, 5+ днів
      if (days % 10 === 1 && days % 100 !== 11) {
        return `${days}-денну`;
      } else if (
        days % 10 >= 2 &&
        days % 10 <= 4 &&
        (days % 100 < 10 || days % 100 >= 20)
      ) {
        return `${days}-денну`;
      } else {
        return `${days}-денну`;
      }

    case 'hi':
      return `${days}-दिन का`; // Hindi: same form for all

    case 'fr':
      // French: 1 jour, 2+ jours
      return days === 1 ? `${days} jour` : `${days} jours`;

    case 'kk':
      return `${days} күндік`; // Kazakh: no plural forms

    case 'uz':
      return `${days} kunlik`; // Uzbek: no plural forms

    case 'tg':
      return `${days}-рӯзаи`; // Tajik: no plural forms

    case 'en':
    default:
      // English: 1 day, 2+ days
      return `${days}-day`;
  }
}

const trialMessages = {
  ru: {
    // Callback query responses
    userNotFound: 'Пользователь не найден',

    // Error messages
    trialNotAvailable:
      '❌ Пробная версия больше недоступна. Возможно, вы уже использовали её или у вас есть активная подписка.',
    activationFailed: (error: string) =>
      `❌ Не удалось активировать пробную версию: ${error}`,
    genericError: 'Произошла ошибка. Пожалуйста, попробуйте позже.',

    // Success messages
    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Ваша ${pluralizeTrialDuration('ru', duration)} бесплатная пробная версия активирована!\n\n` +
      `У вас есть полный доступ ко всем функциям до ${expiryDate}.\n\n` +
      `Наслаждайтесь премиальными торговыми сигналами! 📈`,
  },

  en: {
    userNotFound: 'User not found',

    trialNotAvailable:
      '❌ Trial is no longer available. You may have already used it or have an active subscription.',
    activationFailed: (error: string) =>
      `❌ Failed to activate trial: ${error}`,
    genericError: 'An error occurred. Please try again later.',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Your ${pluralizeTrialDuration('en', duration)} free trial is now active!\n\n` +
      `You have full access to all features until ${expiryDate}.\n\n` +
      `Enjoy premium trading signals! 📈`,
  },

  uk: {
    userNotFound: 'Користувача не знайдено',

    trialNotAvailable:
      '❌ Пробна версія більше недоступна. Можливо, ви вже використали її або у вас є активна підписка.',
    activationFailed: (error: string) =>
      `❌ Не вдалося активувати пробну версію: ${error}`,
    genericError: 'Сталася помилка. Будь ласка, спробуйте пізніше.',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Вашу ${pluralizeTrialDuration('uk', duration)} безкоштовну пробну версію активовано!\n\n` +
      `У вас є повний доступ до всіх функцій до ${expiryDate}.\n\n` +
      `Насолоджуйтесь преміальними торговими сигналами! 📈`,
  },

  hi: {
    userNotFound: 'उपयोगकर्ता नहीं मिला',

    trialNotAvailable:
      '❌ ट्रायल अब उपलब्ध नहीं है। आपने इसे पहले ही उपयोग किया हो सकता है या आपके पास सक्रिय सदस्यता है।',
    activationFailed: (error: string) =>
      `❌ ट्रायल सक्रिय करने में विफल: ${error}`,
    genericError: 'त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 आपका ${pluralizeTrialDuration('hi', duration)} मुफ्त ट्रायल अब सक्रिय है!\n\n` +
      `आपके पास ${expiryDate} तक सभी सुविधाओं तक पूर्ण पहुंच है।\n\n` +
      `प्रीमियम ट्रेडिंग सिग्नल का आनंद लें! 📈`,
  },

  fr: {
    userNotFound: 'Utilisateur non trouvé',

    trialNotAvailable:
      "❌ L'essai n'est plus disponible. Vous l'avez peut-être déjà utilisé ou vous avez un abonnement actif.",
    activationFailed: (error: string) =>
      `❌ Échec de l'activation de l'essai : ${error}`,
    genericError: 'Une erreur est survenue. Veuillez réessayer plus tard.',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Votre essai gratuit de ${pluralizeTrialDuration('fr', duration)} est maintenant actif!\n\n` +
      `Vous avez un accès complet à toutes les fonctionnalités jusqu'au ${expiryDate}.\n\n` +
      `Profitez des signaux de trading premium! 📈`,
  },

  kk: {
    userNotFound: 'Пайдаланушы табылмады',

    trialNotAvailable:
      '❌ Сынақ нұсқа енді қолжетімді емес. Сіз оны қолдана алдыңыз немесе белсенді жазылым бар.',
    activationFailed: (error: string) =>
      `❌ Сынақ нұсқаны белсендіру сәтсіз аяқталды: ${error}`,
    genericError: 'Қате орын алды. Кейінірек қайталап көріңіз.',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Сіздің ${pluralizeTrialDuration('kk', duration)} тегін сынақ нұсқаңыз белсендірілді!\n\n` +
      `Сізде ${expiryDate} дейін барлық функцияларға толық қол жетімділік бар.\n\n` +
      `Премиум трейдинг сигналдарынан ләззат алыңыз! 📈`,
  },

  uz: {
    userNotFound: 'Foydalanuvchi topilmadi',

    trialNotAvailable:
      "❌ Sinov versiyasi endi mavjud emas. Siz uni allaqachon ishlatgan bo'lishingiz mumkin yoki faol obuna bor.",
    activationFailed: (error: string) =>
      `❌ Sinov versiyasini faollashtirish muvaffaqiyatsiz: ${error}`,
    genericError: "Xato yuz berdi. Keyinroq qayta urinib ko'ring.",

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Sizning ${pluralizeTrialDuration('uz', duration)} bepul sinov versiyangiz faollashtirildi!\n\n` +
      `Sizda ${expiryDate} gacha barcha funksiyalarga to'liq kirish huquqi bor.\n\n` +
      `Premium treyding signallaridan bahramand bo'ling! 📈`,
  },

  tg: {
    userNotFound: 'Корбар ёфт нашуд',

    trialNotAvailable:
      '❌ Версияи озмоишӣ дигар дастрас нест. Эҳтимол шумо аллакай аз он истифода кардед ё обунаи фаъол доред.',
    activationFailed: (error: string) =>
      `❌ Фаъол кардани версияи озмоишӣ ноком шуд: ${error}`,
    genericError: 'Хато ба амал омад. Лутфан баъдтар кӯшиш кунед.',

    trialActivated: (duration: number, expiryDate: string) =>
      `🎉 Версияи озмоишии ${pluralizeTrialDuration('tg', duration)} ройгони шумо фаъол карда шуд!\n\n` +
      `Шумо то ${expiryDate} ба ҳамаи функсияҳо дастрасии пурра доред.\n\n` +
      `Аз сигналҳои савдои преміум лаззат баред! 📈`,
  },
};

type TrialLang = keyof typeof trialMessages;

/**
 * Get localized message for trial activation
 */
export function getTrialMessage(
  lang: string,
  key: keyof typeof trialMessages.ru,
  ...args: unknown[]
): string {
  const messages = trialMessages[lang as TrialLang] || trialMessages.en;
  const message = messages[key];

  if (typeof message === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, prefer-spread
    return message.apply(null, args as any[]);
  }

  return message;
}
