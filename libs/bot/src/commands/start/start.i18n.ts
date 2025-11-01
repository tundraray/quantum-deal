/**
 * Start Command Internationalization
 *
 * Multi-language support for /start command UI
 */

/**
 * Format trial duration for button labels
 */
function formatTrialButtonDuration(lang: string, days: number): string {
  switch (lang) {
    case 'ru':
      // Russian: день/дня/дней
      if (days % 10 === 1 && days % 100 !== 11) {
        return `${days} день`;
      } else if (
        days % 10 >= 2 &&
        days % 10 <= 4 &&
        (days % 100 < 10 || days % 100 >= 20)
      ) {
        return `${days} дня`;
      } else {
        return `${days} дней`;
      }

    case 'uk':
      // Ukrainian: день/дні/днів
      if (days % 10 === 1 && days % 100 !== 11) {
        return `${days} день`;
      } else if (
        days % 10 >= 2 &&
        days % 10 <= 4 &&
        (days % 100 < 10 || days % 100 >= 20)
      ) {
        return `${days} дні`;
      } else {
        return `${days} днів`;
      }

    case 'hi':
      return `${days} दिन`; // Hindi: same for all

    case 'fr':
      return days === 1 ? `${days} jour` : `${days} jours`;

    case 'kk':
      return `${days} күн`; // Kazakh: no plural

    case 'uz':
      return `${days} kun`; // Uzbek: no plural

    case 'tg':
      return `${days} рӯз`; // Tajik: no plural

    case 'en':
    default:
      return days === 1 ? `${days} Day` : `${days} Days`;
  }
}

export const startMessages = {
  ru: {
    // Error messages
    registrationRequired:
      'Сначала нужно зарегистрироваться. Используйте /start',
    genericError:
      'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.',

    // Button labels
    tryFreeTrialButton: (duration: number) =>
      `🎁 Попробовать ${formatTrialButtonDuration('ru', duration)} бесплатно`,
    viewPlansButton: '💎 Посмотреть тарифы',
    changeLangButton: '🌐 Изменить язык',

    // Fallback messages (when LLM fails)
    welcomeWithActivation:
      'Добро пожаловать! Ваша подписка успешно активирована.',
    welcomeWithSubscriptions: (count: number) =>
      `Рады вас видеть! У вас ${count} активных подписок.`,
    welcomeNew:
      'Добро пожаловать! Для получения торговых сигналов активируйте код подписки.',
  },

  en: {
    registrationRequired: 'Please register first. Use /start',
    genericError:
      'An error occurred while processing your request. Please try again later.',

    tryFreeTrialButton: (duration: number) =>
      `🎁 Try ${formatTrialButtonDuration('en', duration)} Free`,
    viewPlansButton: '💎 View Plans',
    changeLangButton: '🌐 Change Language',

    welcomeWithActivation:
      'Welcome! Your subscription has been activated successfully.',
    welcomeWithSubscriptions: (count: number) =>
      `Welcome back! You have ${count} active subscription(s).`,
    welcomeNew:
      'Welcome! To start receiving trading signals, please activate a subscription code.',
  },

  uk: {
    registrationRequired:
      'Спочатку потрібно зареєструватися. Використовуйте /start',
    genericError:
      'Сталася помилка при обробці вашого запиту. Будь ласка, спробуйте пізніше.',

    tryFreeTrialButton: (duration: number) =>
      `🎁 Спробувати ${formatTrialButtonDuration('uk', duration)} безкоштовно`,
    viewPlansButton: '💎 Переглянути тарифи',
    changeLangButton: '🌐 Змінити мову',

    welcomeWithActivation: 'Ласкаво просимо! Вашу підписку успішно активовано.',
    welcomeWithSubscriptions: (count: number) =>
      `Раді вас бачити! У вас ${count} активних підписок.`,
    welcomeNew:
      'Ласкаво просимо! Для отримання торгових сигналів активуйте код підписки.',
  },

  hi: {
    registrationRequired: 'कृपया पहले पंजीकरण करें। /start का उपयोग करें',
    genericError:
      'आपके अनुरोध को संसाधित करते समय त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।',

    tryFreeTrialButton: (duration: number) =>
      `🎁 ${formatTrialButtonDuration('hi', duration)} मुफ्त में आज़माएं`,
    viewPlansButton: '💎 योजनाएं देखें',
    changeLangButton: '🌐 भाषा बदलें',

    welcomeWithActivation:
      'स्वागत है! आपकी सदस्यता सफलतापूर्वक सक्रिय हो गई है।',
    welcomeWithSubscriptions: (count: number) =>
      `वापसी पर स्वागत है! आपके पास ${count} सक्रिय सदस्यताएँ हैं।`,
    welcomeNew:
      'स्वागत है! ट्रेडिंग सिग्नल प्राप्त करने के लिए, कृपया सदस्यता कोड सक्रिय करें।',
  },

  fr: {
    registrationRequired: "Veuillez d'abord vous inscrire. Utilisez /start",
    genericError:
      "Une erreur s'est produite lors du traitement de votre demande. Veuillez réessayer plus tard.",

    tryFreeTrialButton: (duration: number) =>
      `🎁 Essayer ${formatTrialButtonDuration('fr', duration)} gratuits`,
    viewPlansButton: '💎 Voir les forfaits',
    changeLangButton: '🌐 Changer de langue',

    welcomeWithActivation:
      'Bienvenue ! Votre abonnement a été activé avec succès.',
    welcomeWithSubscriptions: (count: number) =>
      `Bon retour ! Vous avez ${count} abonnement(s) actif(s).`,
    welcomeNew:
      "Bienvenue ! Pour commencer à recevoir des signaux de trading, veuillez activer un code d'abonnement.",
  },

  kk: {
    registrationRequired: 'Алдымен тіркелу қажет. /start пайдаланыңыз',
    genericError:
      'Сіздің сұранысыңызды өңдеу кезінде қате орын алды. Кейінірек қайталап көріңіз.',

    tryFreeTrialButton: (duration: number) =>
      `🎁 ${formatTrialButtonDuration('kk', duration)} тегін сынап көріңіз`,
    viewPlansButton: '💎 Тарифтерді көру',
    changeLangButton: '🌐 Тілді өзгерту',

    welcomeWithActivation: 'Қош келдіңіз! Жазылымыңыз сәтті белсендірілді.',
    welcomeWithSubscriptions: (count: number) =>
      `Қош келдіңіз! Сізде ${count} белсенді жазылым бар.`,
    welcomeNew:
      'Қош келдіңіз! Трейдинг сигналдарын алу үшін жазылым кодын белсендіріңіз.',
  },

  uz: {
    registrationRequired:
      "Iltimos, avval ro'yxatdan o'ting. /start dan foydalaning",
    genericError:
      "So'rovingizni qayta ishlashda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",

    tryFreeTrialButton: (duration: number) =>
      `🎁 ${formatTrialButtonDuration('uz', duration)} bepul sinab ko'ring`,
    viewPlansButton: "💎 Tariflarni ko'rish",
    changeLangButton: "🌐 Tilni o'zgartirish",

    welcomeWithActivation:
      'Xush kelibsiz! Obunangiz muvaffaqiyatli faollashtirildi.',
    welcomeWithSubscriptions: (count: number) =>
      `Xush kelibsiz! Sizda ${count} ta faol obuna bor.`,
    welcomeNew:
      'Xush kelibsiz! Treyding signallarini olish uchun obuna kodini faollashtiring.',
  },

  tg: {
    registrationRequired: 'Лутфан аввал сабти ном кунед. /start истифода баред',
    genericError:
      'Ҳангоми коркарди дархости шумо хато ба амал омад. Лутфан баъдтар кӯшиш кунед.',

    tryFreeTrialButton: (duration: number) =>
      `🎁 ${formatTrialButtonDuration('tg', duration)} ройгон санҷед`,
    viewPlansButton: '💎 Тарифҳоро дидан',
    changeLangButton: '🌐 Забонро иваз кунед',

    welcomeWithActivation:
      'Хуш омадед! Обунаи шумо бомуваффақият фаъол карда шуд.',
    welcomeWithSubscriptions: (count: number) =>
      `Хуш омадед! Шумо ${count} обунаи фаъол доред.`,
    welcomeNew:
      'Хуш омадед! Барои гирифтани сигналҳои савдо, лутфан рамзи обунаро фаъол кунед.',
  },
};

export type StartLang = keyof typeof startMessages;

/**
 * Get localized message for start command
 */
export function getStartMessage(
  lang: string,
  key: keyof typeof startMessages.ru,
  ...args: unknown[]
): string {
  const messages = startMessages[lang as StartLang] || startMessages.en;
  const message = messages[key];

  if (typeof message === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, prefer-spread
    return message.apply(null, args as any[]);
  }

  return message;
}
