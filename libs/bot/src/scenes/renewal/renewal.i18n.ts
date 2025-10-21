/**
 * Renewal Scene Internationalization
 *
 * Multi-language support for subscription renewal UI
 */

export const renewalMessages = {
  ru: {
    // Scene entry
    noActiveSubscriptions:
      '❌ У вас нет активных подписок для продления.\n\nИспользуйте /start для активации новой подписки.',
    selectSubscription: '🎯 Выберите подписку для продления:',
    selectTariff: '🎯 Выберите тариф:',
    selectTariffHeader: '🎯 Продление подписки',
    yourSubscriptions: '📋 Ваши подписки:',
    until: 'до',
    noExpiry: 'Не истекает',
    availableTariffs: '💳 Доступные тарифы',
    noActiveSubscriptionsShort:
      '📋 У вас пока нет активных подписок.\n\n💳 Доступные тарифы:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Продление подписки: ${subscriptionName}`,
    currentExpiry: (date: string) => `Текущее окончание: ${date}`,
    subscriptionExpired: 'Подписка истекла',
    selectPeriod: 'Выберите период продления:',

    // Subscription display
    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Подписка #${subscriptionId} (${daysRemaining} дн.)`,
    subscriptionName: (subscriptionId: number) => `Подписка #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Отмена',
    renewButton: '🔄 Продлить подписку',

    // Payment processing
    creatingInvoice: '⏳ Создаем счет на оплату...',
    invoiceTitle: (subscriptionName: string) => `Подписка ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Ошибка: пользователь не найден',
    subscriptionNotFound: 'Ошибка: подписка не найдена',
    noTariffsAvailable:
      'К сожалению, для этой подписки нет доступных тарифов продления.',
    genericError:
      'Произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.',
    paymentCreationFailed:
      'Произошла ошибка при создании счета на оплату.\n\nПожалуйста, попробуйте позже или свяжитесь с поддержкой.',

    // Success
    renewalCancelled: '❌ Продление отменено',
    paymentSuccess:
      '✅ Оплата успешно завершена!\n\nВаша подписка продлена. Спасибо за оплату! 🎉',
    paymentError:
      '❌ Произошла ошибка при обработке оплаты.\n\nВаш платеж получен, но продление не завершено. Пожалуйста, свяжитесь с поддержкой.',
  },

  en: {
    noActiveSubscriptions:
      '❌ You have no active subscriptions to renew.\n\nUse /start to activate a new subscription.',
    selectSubscription: '🎯 Select subscription to renew:',
    selectTariff: '🎯 Select tariff:',
    selectTariffHeader: '🎯 Subscription Renewal',
    yourSubscriptions: '📋 Your subscriptions:',
    until: 'until',
    noExpiry: 'No expiry',
    availableTariffs: '💳 Available tariffs',
    noActiveSubscriptionsShort:
      '📋 You have no active subscriptions yet.\n\n💳 Available tariffs:',

    renewalTitle: (subscriptionName: string) =>
      `🎯 Renew Subscription: ${subscriptionName}`,
    currentExpiry: (date: string) => `Current expiration: ${date}`,
    subscriptionExpired: 'Subscription expired',
    selectPeriod: 'Select renewal period:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Subscription #${subscriptionId} (${daysRemaining} days)`,
    subscriptionName: (subscriptionId: number) =>
      `Subscription #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Cancel',
    renewButton: '🔄 Renew Subscription',

    creatingInvoice: '⏳ Creating invoice...',
    invoiceTitle: (subscriptionName: string) =>
      `Subscription ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Error: user not found',
    subscriptionNotFound: 'Error: subscription not found',
    noTariffsAvailable:
      'Unfortunately, there are no renewal tariffs available for this subscription.',
    genericError:
      'An error occurred. Please try again later or contact support.',
    paymentCreationFailed:
      'An error occurred while creating the invoice.\n\nPlease try again later or contact support.',

    renewalCancelled: '❌ Renewal cancelled',
    paymentSuccess:
      '✅ Payment completed successfully!\n\nYour subscription has been renewed. Thank you! 🎉',
    paymentError:
      '❌ An error occurred while processing the payment.\n\nYour payment was received, but the renewal was not completed. Please contact support.',
  },

  uk: {
    noActiveSubscriptions:
      '❌ У вас немає активних підписок для продовження.\n\nВикористовуйте /start для активації нової підписки.',
    selectSubscription: '🎯 Виберіть підписку для продовження:',
    selectTariff: '🎯 Виберіть тариф:',
    selectTariffHeader: '🎯 Продовження підписки',
    yourSubscriptions: '📋 Ваші підписки:',
    until: 'до',
    noExpiry: 'Не закінчується',
    availableTariffs: '💳 Доступні тарифи',
    noActiveSubscriptionsShort:
      '📋 У вас поки немає активних підписок.\n\n💳 Доступні тарифи:',

    renewalTitle: (subscriptionName: string) =>
      `🎯 Продовження підписки: ${subscriptionName}`,
    currentExpiry: (date: string) => `Поточне закінчення: ${date}`,
    subscriptionExpired: 'Підписка закінчилася',
    selectPeriod: 'Виберіть період продовження:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Підписка #${subscriptionId} (${daysRemaining} дн.)`,
    subscriptionName: (subscriptionId: number) => `Підписка #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Скасувати',
    renewButton: '🔄 Продовжити підписку',

    creatingInvoice: '⏳ Створюємо рахунок на оплату...',
    invoiceTitle: (subscriptionName: string) => `Підписка ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Помилка: користувача не знайдено',
    subscriptionNotFound: 'Помилка: підписку не знайдено',
    noTariffsAvailable:
      'На жаль, для цієї підписки немає доступних тарифів продовження.',
    genericError:
      'Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.',
    paymentCreationFailed:
      'Сталася помилка при створенні рахунку на оплату.\n\nБудь ласка, спробуйте пізніше або зверніться до підтримки.',

    renewalCancelled: '❌ Продовження скасовано',
    paymentSuccess:
      '✅ Оплата успішно завершена!\n\nВашу підписку продовжено. Дякуємо! 🎉',
    paymentError:
      '❌ Сталася помилка при обробці оплати.\n\nВаш платіж отримано, але продовження не завершено. Будь ласка, зверніться до підтримки.',
  },

  hi: {
    noActiveSubscriptions:
      '❌ नवीनीकरण के लिए आपके पास कोई सक्रिय सदस्यता नहीं है।\n\nनई सदस्यता सक्रिय करने के लिए /start का उपयोग करें।',
    selectSubscription: '🎯 नवीनीकरण के लिए सदस्यता चुनें:',
    selectTariff: '🎯 टैरिफ चुनें:',
    selectTariffHeader: '🎯 सदस्यता नवीनीकरण',
    yourSubscriptions: '📋 आपकी सदस्यताएँ:',
    until: 'तक',
    noExpiry: 'कोई समाप्ति नहीं',
    availableTariffs: '💳 उपलब्ध टैरिफ',
    noActiveSubscriptionsShort:
      '📋 आपके पास अभी तक कोई सक्रिय सदस्यता नहीं है।\n\n💳 उपलब्ध टैरिफ:',

    renewalTitle: (subscriptionName: string) =>
      `🎯 सदस्यता नवीनीकरण: ${subscriptionName}`,
    currentExpiry: (date: string) => `वर्तमान समाप्ति: ${date}`,
    subscriptionExpired: 'सदस्यता समाप्त हो गई',
    selectPeriod: 'नवीनीकरण अवधि चुनें:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `सदस्यता #${subscriptionId} (${daysRemaining} दिन)`,
    subscriptionName: (subscriptionId: number) => `सदस्यता #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ रद्द करें',
    renewButton: '🔄 सदस्यता नवीनीकरण',

    creatingInvoice: '⏳ चालान बना रहे हैं...',
    invoiceTitle: (subscriptionName: string) => `सदस्यता ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'त्रुटि: उपयोगकर्ता नहीं मिला',
    subscriptionNotFound: 'त्रुटि: सदस्यता नहीं मिली',
    noTariffsAvailable:
      'दुर्भाग्य से, इस सदस्यता के लिए कोई नवीनीकरण टैरिफ उपलब्ध नहीं है।',
    genericError:
      'एक त्रुटि हुई। कृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',
    paymentCreationFailed:
      'चालान बनाते समय एक त्रुटि हुई।\n\nकृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',

    renewalCancelled: '❌ नवीनीकरण रद्द किया गया',
    paymentSuccess:
      '✅ भुगतान सफलतापूर्वक पूर्ण हुआ!\n\nआपकी सदस्यता नवीनीकृत कर दी गई है। धन्यवाद! 🎉',
    paymentError:
      '❌ भुगतान संसाधित करते समय एक त्रुटि हुई।\n\nआपका भुगतान प्राप्त हो गया है, लेकिन नवीनीकरण पूरा नहीं हुआ। कृपया सहायता से संपर्क करें।',
  },

  fr: {
    noActiveSubscriptions:
      "❌ Vous n'avez aucun abonnement actif à renouveler.\n\nUtilisez /start pour activer un nouvel abonnement.",
    selectSubscription: '🎯 Sélectionnez un abonnement à renouveler:',
    selectTariff: '🎯 Sélectionnez le tarif:',
    selectTariffHeader: '🎯 Renouvellement',
    yourSubscriptions: '📋 Vos abonnements:',
    until: "jusqu'au",
    noExpiry: 'Sans expiration',
    availableTariffs: '💳 Tarifs disponibles',
    noActiveSubscriptionsShort:
      "📋 Vous n'avez pas encore d'abonnements actifs.\n\n💳 Tarifs disponibles:",

    renewalTitle: (subscriptionName: string) =>
      `🎯 Renouvellement: ${subscriptionName}`,
    currentExpiry: (date: string) => `Expiration actuelle: ${date}`,
    subscriptionExpired: 'Abonnement expiré',
    selectPeriod: 'Sélectionnez la période de renouvellement:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Abonnement #${subscriptionId} (${daysRemaining} jours)`,
    subscriptionName: (subscriptionId: number) =>
      `Abonnement #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Annuler',
    renewButton: '🔄 Renouveler',

    creatingInvoice: '⏳ Création de la facture...',
    invoiceTitle: (subscriptionName: string) =>
      `Abonnement ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Erreur: utilisateur non trouvé',
    subscriptionNotFound: 'Erreur: abonnement non trouvé',
    noTariffsAvailable:
      "Malheureusement, il n'y a pas de tarifs de renouvellement disponibles pour cet abonnement.",
    genericError:
      'Une erreur est survenue. Veuillez réessayer plus tard ou contacter le support.',
    paymentCreationFailed:
      'Une erreur est survenue lors de la création de la facture.\n\nVeuillez réessayer plus tard ou contacter le support.',

    renewalCancelled: '❌ Renouvellement annulé',
    paymentSuccess:
      '✅ Paiement effectué avec succès!\n\nVotre abonnement a été renouvelé. Merci! 🎉',
    paymentError:
      "❌ Une erreur est survenue lors du traitement du paiement.\n\nVotre paiement a été reçu, mais le renouvellement n'a pas été effectué. Veuillez contacter le support.",
  },

  kk: {
    noActiveSubscriptions:
      '❌ Жаңартуға белсенді жазылымдарыңыз жоқ.\n\nЖаңа жазылымды белсендіру үшін /start пайдаланыңыз.',
    selectSubscription: '🎯 Жаңарту үшін жазылымды таңдаңыз:',
    selectTariff: '🎯 Тарифті таңдаңыз:',
    selectTariffHeader: '🎯 Жазылымды жаңарту',
    yourSubscriptions: '📋 Сіздің жазылымдарыңыз:',
    until: 'дейін',
    noExpiry: 'Мерзімсіз',
    availableTariffs: '💳 Қолжетімді тарифтер',
    noActiveSubscriptionsShort:
      '📋 Сізде әзірше белсенді жазылымдар жоқ.\n\n💳 Қолжетімді тарифтер:',

    renewalTitle: (subscriptionName: string) =>
      `🎯 Жазылымды жаңарту: ${subscriptionName}`,
    currentExpiry: (date: string) => `Ағымдағы аяқталу: ${date}`,
    subscriptionExpired: 'Жазылым аяқталды',
    selectPeriod: 'Жаңарту кезеңін таңдаңыз:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Жазылым #${subscriptionId} (${daysRemaining} күн)`,
    subscriptionName: (subscriptionId: number) => `Жазылым #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Болдырмау',
    renewButton: '🔄 Жазылымды жаңарту',

    creatingInvoice: '⏳ Шот жасалуда...',
    invoiceTitle: (subscriptionName: string) => `Жазылым ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Қате: пайдаланушы табылмады',
    subscriptionNotFound: 'Қате: жазылым табылмады',
    noTariffsAvailable:
      'Өкінішке орай, бұл жазылым үшін жаңарту тарифтері жоқ.',
    genericError:
      'Қате орын алды. Кейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',
    paymentCreationFailed:
      'Шот жасау кезінде қате орын алды.\n\nКейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',

    renewalCancelled: '❌ Жаңарту болдырылмады',
    paymentSuccess:
      '✅ Төлем сәтті аяқталды!\n\nЖазылымыңыз жаңартылды. Рахмет! 🎉',
    paymentError:
      '❌ Төлемді өңдеу кезінде қате орын алды.\n\nТөлеміңіз қабылданды, бірақ жаңарту аяқталмады. Қолдау қызметіне хабарласыңыз.',
  },

  uz: {
    noActiveSubscriptions:
      "❌ Yangilash uchun faol obunalaringiz yo'q.\n\nYangi obunani faollashtirish uchun /start dan foydalaning.",
    selectSubscription: '🎯 Yangilash uchun obunani tanlang:',
    selectTariff: '🎯 Tarifni tanlang:',
    selectTariffHeader: '🎯 Obunani yangilash',
    yourSubscriptions: '📋 Sizning obunalaringiz:',
    until: 'gacha',
    noExpiry: 'Muddatsiz',
    availableTariffs: '💳 Mavjud tariflar',
    noActiveSubscriptionsShort:
      "📋 Sizda hali faol obunalar yo'q.\n\n💳 Mavjud tariflar:",

    renewalTitle: (subscriptionName: string) =>
      `🎯 Obunani yangilash: ${subscriptionName}`,
    currentExpiry: (date: string) => `Joriy tugash sanasi: ${date}`,
    subscriptionExpired: 'Obuna tugadi',
    selectPeriod: 'Yangilash davrini tanlang:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Obuna #${subscriptionId} (${daysRemaining} kun)`,
    subscriptionName: (subscriptionId: number) => `Obuna #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Bekor qilish',
    renewButton: '🔄 Obunani yangilash',

    creatingInvoice: '⏳ Hisob yaratilmoqda...',
    invoiceTitle: (subscriptionName: string) => `Obuna ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Xato: foydalanuvchi topilmadi',
    subscriptionNotFound: 'Xato: obuna topilmadi',
    noTariffsAvailable:
      'Afsuski, bu obuna uchun yangilash tariflari mavjud emas.',
    genericError:
      "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",
    paymentCreationFailed:
      "Hisob yaratishda xatolik yuz berdi.\n\nKeyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",

    renewalCancelled: '❌ Yangilash bekor qilindi',
    paymentSuccess:
      "✅ To'lov muvaffaqiyatli yakunlandi!\n\nObunangiz yangilandi. Rahmat! 🎉",
    paymentError:
      "❌ To'lovni qayta ishlashda xatolik yuz berdi.\n\nTo'lovingiz qabul qilindi, lekin yangilash yakunlanmadi. Qo'llab-quvvatlash bilan bog'laning.",
  },

  tg: {
    noActiveSubscriptions:
      '❌ Шумо обунаҳои фаъол барои нав кардан надоред.\n\nБарои фаъол кардани обунаи нав /start истифода баред.',
    selectSubscription: '🎯 Обунаро барои нав кардан интихоб кунед:',
    selectTariff: '🎯 Тарифро интихоб кунед:',
    selectTariffHeader: '🎯 Нав кардани обуна',
    yourSubscriptions: '📋 Обунаҳои шумо:',
    until: 'то',
    noExpiry: 'Бемӯҳлат',
    availableTariffs: '💳 Тарифҳои мавҷуд',
    noActiveSubscriptionsShort:
      '📋 Шумо ҳанӯз обунаҳои фаъол надоред.\n\n💳 Тарифҳои мавҷуд:',

    renewalTitle: (subscriptionName: string) =>
      `🎯 Нав кардани обуна: ${subscriptionName}`,
    currentExpiry: (date: string) => `Анҷоми ҷорӣ: ${date}`,
    subscriptionExpired: 'Обуна анҷом ёфт',
    selectPeriod: 'Давраи нав кардани обунаро интихоб кунед:',

    subscriptionLabel: (subscriptionId: number, daysRemaining: number) =>
      `Обуна #${subscriptionId} (${daysRemaining} рӯз)`,
    subscriptionName: (subscriptionId: number) => `Обуна #${subscriptionId}`,

    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    cancel: '❌ Бекор кардан',
    renewButton: '🔄 Нав кардани обуна',

    creatingInvoice: '⏳ Ҳисоб сохта мешавад...',
    invoiceTitle: (subscriptionName: string) => `Обуна ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    userNotFound: 'Хато: корбар ёфт нашуд',
    subscriptionNotFound: 'Хато: обуна ёфт нашуд',
    noTariffsAvailable:
      'Мутаассифона, барои ин обуна тарифҳои нав кардан мавҷуд нестанд.',
    genericError:
      'Хато рӯй дод. Лутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',
    paymentCreationFailed:
      'Ҳангоми сохтани ҳисоб хато рӯй дод.\n\nЛутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',

    renewalCancelled: '❌ Нав кардан бекор карда шуд',
    paymentSuccess:
      '✅ Пардохт бомуваффақият анҷом ёфт!\n\nОбунаи шумо нав карда шуд. Ташаккур! 🎉',
    paymentError:
      '❌ Ҳангоми коркарди пардохт хато рӯй дод.\n\nПардохти шумо қабул карда шуд, аммо нав кардан анҷом наёфт. Лутфан бо дастгирӣ тамос гиред.',
  },
};

export type RenewalLang = keyof typeof renewalMessages;

/**
 * Get localized message
 */
export function getRenewalMessage(
  lang: string,
  key: keyof typeof renewalMessages.ru,
  ...args: unknown[]
): string {
  const messages = renewalMessages[lang as RenewalLang] || renewalMessages.en;
  const message = messages[key];

  if (typeof message === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, prefer-spread
    return message.apply(null, args as any[]);
  }

  return message;
}

/**
 * Format days with correct plural form for each language
 */
export function formatDays(lang: string, days: number): string {
  const langKey = lang as RenewalLang;
  
  switch (langKey) {
    case 'ru':
    case 'uk':
      // Russian/Ukrainian: 1 день, 2-4 дня, 5-20 дней, 21 день, 22-24 дня, 25-30 дней
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

    case 'kk':
      return `${days} күн`; // Kazakh doesn't have plural forms

    case 'uz':
      return `${days} kun`; // Uzbek doesn't have plural forms

    case 'tg':
      return `${days} рӯз`; // Tajik doesn't have plural forms

    case 'hi':
      return `${days} दिन`; // Hindi: same for all

    case 'fr':
      return days === 1 ? `${days} jour` : `${days} jours`;

    case 'en':
    default:
      return days === 1 ? `${days} day` : `${days} days`;
  }
}
