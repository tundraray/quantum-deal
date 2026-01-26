/**
 * Renewal Scene Internationalization
 *
 * Multi-language support for subscription renewal UI
 *
 * Key naming convention:
 * - renewal_button_* - Button texts
 * - renewal_text_* - Display texts and messages
 * - renewal_error_* - Error messages
 */

import type { I18nMessages, LangCode } from '@quantumdeal/framework';

/**
 * Renewal i18n namespace identifier
 * Used when registering with LocalizationService
 */
export const RENEWAL_I18N_NAMESPACE = 'renewal';

/**
 * Renewal messages in format compatible with LocalizationService.registerI18n()
 */
export const renewalMessages: I18nMessages = {
  ru: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Продление подписки',
    renewal_text_yourSubscriptions: '📋 Ваши подписки:',
    renewal_text_until: 'до',
    renewal_text_noExpiry: 'Не истекает',
    renewal_text_availableTariffs: '💳 Доступные тарифы',
    renewal_text_noActiveSubscriptionsShort:
      '📋 У вас пока нет активных подписок.\n\n💳 Доступные тарифы:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Продление подписки: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `Текущее окончание: ${date}`,
    renewal_text_subscriptionExpired: 'Подписка истекла',
    renewal_text_selectPeriod: 'Выберите период продления:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Подписка #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Отмена',
    renewal_button_renew: '🔄 Продлить подписку',
    renewal_button_choosePlan: '📋 Выбрать план',
    renewal_button_changePlan: '🔄 Сменить тариф',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Создаем счет на оплату...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Подписка ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Ошибка: пользователь не найден',
    renewal_error_subscriptionNotFound: 'Ошибка: подписка не найдена',
    renewal_error_noTariffsAvailable:
      'К сожалению, для этой подписки нет доступных тарифов продления.',
    renewal_error_genericError:
      'Произошла ошибка. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.',
    renewal_error_paymentCreationFailed:
      'Произошла ошибка при создании счета на оплату.\n\nПожалуйста, попробуйте позже или свяжитесь с поддержкой.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Продление отменено',
    renewal_text_paymentSuccess:
      '✅ Оплата успешно завершена!\n\nВаша подписка продлена. Спасибо за оплату! 🎉',
    renewal_error_paymentError:
      '❌ Произошла ошибка при обработке оплаты.\n\nВаш платеж получен, но продление не завершено. Пожалуйста, свяжитесь с поддержкой.',
  },

  en: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Subscription Renewal',
    renewal_text_yourSubscriptions: '📋 Your subscriptions:',
    renewal_text_until: 'until',
    renewal_text_noExpiry: 'No expiry',
    renewal_text_availableTariffs: '💳 Available tariffs',
    renewal_text_noActiveSubscriptionsShort:
      '📋 You have no active subscriptions yet.\n\n💳 Available tariffs:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Renew Subscription: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `Current expiration: ${date}`,
    renewal_text_subscriptionExpired: 'Subscription expired',
    renewal_text_selectPeriod: 'Select renewal period:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Subscription #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Cancel',
    renewal_button_renew: '🔄 Renew Subscription',
    renewal_button_choosePlan: '📋 Choose Plan',
    renewal_button_changePlan: '🔄 Change Plan',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Creating invoice...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Subscription ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Error: user not found',
    renewal_error_subscriptionNotFound: 'Error: subscription not found',
    renewal_error_noTariffsAvailable:
      'Unfortunately, there are no renewal tariffs available for this subscription.',
    renewal_error_genericError:
      'An error occurred. Please try again later or contact support.',
    renewal_error_paymentCreationFailed:
      'An error occurred while creating the invoice.\n\nPlease try again later or contact support.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Renewal cancelled',
    renewal_text_paymentSuccess:
      '✅ Payment completed successfully!\n\nYour subscription has been renewed. Thank you! 🎉',
    renewal_error_paymentError:
      '❌ An error occurred while processing the payment.\n\nYour payment was received, but the renewal was not completed. Please contact support.',
  },

  uk: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Продовження підписки',
    renewal_text_yourSubscriptions: '📋 Ваші підписки:',
    renewal_text_until: 'до',
    renewal_text_noExpiry: 'Не закінчується',
    renewal_text_availableTariffs: '💳 Доступні тарифи',
    renewal_text_noActiveSubscriptionsShort:
      '📋 У вас поки немає активних підписок.\n\n💳 Доступні тарифи:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Продовження підписки: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `Поточне закінчення: ${date}`,
    renewal_text_subscriptionExpired: 'Підписка закінчилася',
    renewal_text_selectPeriod: 'Виберіть період продовження:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Підписка #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Скасувати',
    renewal_button_renew: '🔄 Продовжити підписку',
    renewal_button_choosePlan: '📋 Вибрати план',
    renewal_button_changePlan: '🔄 Змінити тариф',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Створюємо рахунок на оплату...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Підписка ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Помилка: користувача не знайдено',
    renewal_error_subscriptionNotFound: 'Помилка: підписку не знайдено',
    renewal_error_noTariffsAvailable:
      'На жаль, для цієї підписки немає доступних тарифів продовження.',
    renewal_error_genericError:
      'Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.',
    renewal_error_paymentCreationFailed:
      'Сталася помилка при створенні рахунку на оплату.\n\nБудь ласка, спробуйте пізніше або зверніться до підтримки.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Продовження скасовано',
    renewal_text_paymentSuccess:
      '✅ Оплата успішно завершена!\n\nВашу підписку продовжено. Дякуємо! 🎉',
    renewal_error_paymentError:
      '❌ Сталася помилка при обробці оплати.\n\nВаш платіж отримано, але продовження не завершено. Будь ласка, зверніться до підтримки.',
  },

  hi: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 सदस्यता नवीनीकरण',
    renewal_text_yourSubscriptions: '📋 आपकी सदस्यताएँ:',
    renewal_text_until: 'तक',
    renewal_text_noExpiry: 'कोई समाप्ति नहीं',
    renewal_text_availableTariffs: '💳 उपलब्ध टैरिफ',
    renewal_text_noActiveSubscriptionsShort:
      '📋 आपके पास अभी तक कोई सक्रिय सदस्यता नहीं है।\n\n💳 उपलब्ध टैरिफ:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 सदस्यता नवीनीकरण: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `वर्तमान समाप्ति: ${date}`,
    renewal_text_subscriptionExpired: 'सदस्यता समाप्त हो गई',
    renewal_text_selectPeriod: 'नवीनीकरण अवधि चुनें:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `सदस्यता #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ रद्द करें',
    renewal_button_renew: '🔄 सदस्यता नवीनीकरण',
    renewal_button_choosePlan: '📋 प्लान चुनें',
    renewal_button_changePlan: '🔄 प्लान बदलें',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ चालान बना रहे हैं...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `सदस्यता ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'त्रुटि: उपयोगकर्ता नहीं मिला',
    renewal_error_subscriptionNotFound: 'त्रुटि: सदस्यता नहीं मिली',
    renewal_error_noTariffsAvailable:
      'दुर्भाग्य से, इस सदस्यता के लिए कोई नवीनीकरण टैरिफ उपलब्ध नहीं है।',
    renewal_error_genericError:
      'एक त्रुटि हुई। कृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',
    renewal_error_paymentCreationFailed:
      'चालान बनाते समय एक त्रुटि हुई।\n\nकृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',

    // Success (text)
    renewal_text_renewalCancelled: '❌ नवीनीकरण रद्द किया गया',
    renewal_text_paymentSuccess:
      '✅ भुगतान सफलतापूर्वक पूर्ण हुआ!\n\nआपकी सदस्यता नवीनीकृत कर दी गई है। धन्यवाद! 🎉',
    renewal_error_paymentError:
      '❌ भुगतान संसाधित करते समय एक त्रुटि हुई।\n\nआपका भुगतान प्राप्त हो गया है, लेकिन नवीनीकरण पूरा नहीं हुआ। कृपया सहायता से संपर्क करें।',
  },

  fr: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Renouvellement',
    renewal_text_yourSubscriptions: '📋 Vos abonnements:',
    renewal_text_until: "jusqu'au",
    renewal_text_noExpiry: 'Sans expiration',
    renewal_text_availableTariffs: '💳 Tarifs disponibles',
    renewal_text_noActiveSubscriptionsShort:
      "📋 Vous n'avez pas encore d'abonnements actifs.\n\n💳 Tarifs disponibles:",

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Renouvellement: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) =>
      `Expiration actuelle: ${date}`,
    renewal_text_subscriptionExpired: 'Abonnement expiré',
    renewal_text_selectPeriod: 'Sélectionnez la période de renouvellement:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Abonnement #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Annuler',
    renewal_button_renew: '🔄 Renouveler',
    renewal_button_choosePlan: '📋 Choisir un plan',
    renewal_button_changePlan: '🔄 Changer de plan',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Création de la facture...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Abonnement ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Erreur: utilisateur non trouvé',
    renewal_error_subscriptionNotFound: 'Erreur: abonnement non trouvé',
    renewal_error_noTariffsAvailable:
      "Malheureusement, il n'y a pas de tarifs de renouvellement disponibles pour cet abonnement.",
    renewal_error_genericError:
      'Une erreur est survenue. Veuillez réessayer plus tard ou contacter le support.',
    renewal_error_paymentCreationFailed:
      'Une erreur est survenue lors de la création de la facture.\n\nVeuillez réessayer plus tard ou contacter le support.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Renouvellement annulé',
    renewal_text_paymentSuccess:
      '✅ Paiement effectué avec succès!\n\nVotre abonnement a été renouvelé. Merci! 🎉',
    renewal_error_paymentError:
      "❌ Une erreur est survenue lors du traitement du paiement.\n\nVotre paiement a été reçu, mais le renouvellement n'a pas été effectué. Veuillez contacter le support.",
  },

  kk: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Жазылымды жаңарту',
    renewal_text_yourSubscriptions: '📋 Сіздің жазылымдарыңыз:',
    renewal_text_until: 'дейін',
    renewal_text_noExpiry: 'Мерзімсіз',
    renewal_text_availableTariffs: '💳 Қолжетімді тарифтер',
    renewal_text_noActiveSubscriptionsShort:
      '📋 Сізде әзірше белсенді жазылымдар жоқ.\n\n💳 Қолжетімді тарифтер:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Жазылымды жаңарту: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `Ағымдағы аяқталу: ${date}`,
    renewal_text_subscriptionExpired: 'Жазылым аяқталды',
    renewal_text_selectPeriod: 'Жаңарту кезеңін таңдаңыз:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Жазылым #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Болдырмау',
    renewal_button_renew: '🔄 Жазылымды жаңарту',
    renewal_button_choosePlan: '📋 Жоспарды таңдау',
    renewal_button_changePlan: '🔄 Жоспарды өзгерту',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Шот жасалуда...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Жазылым ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Қате: пайдаланушы табылмады',
    renewal_error_subscriptionNotFound: 'Қате: жазылым табылмады',
    renewal_error_noTariffsAvailable:
      'Өкінішке орай, бұл жазылым үшін жаңарту тарифтері жоқ.',
    renewal_error_genericError:
      'Қате орын алды. Кейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',
    renewal_error_paymentCreationFailed:
      'Шот жасау кезінде қате орын алды.\n\nКейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Жаңарту болдырылмады',
    renewal_text_paymentSuccess:
      '✅ Төлем сәтті аяқталды!\n\nЖазылымыңыз жаңартылды. Рахмет! 🎉',
    renewal_error_paymentError:
      '❌ Төлемді өңдеу кезінде қате орын алды.\n\nТөлеміңіз қабылданды, бірақ жаңарту аяқталмады. Қолдау қызметіне хабарласыңыз.',
  },

  uz: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Obunani yangilash',
    renewal_text_yourSubscriptions: '📋 Sizning obunalaringiz:',
    renewal_text_until: 'gacha',
    renewal_text_noExpiry: 'Muddatsiz',
    renewal_text_availableTariffs: '💳 Mavjud tariflar',
    renewal_text_noActiveSubscriptionsShort:
      "📋 Sizda hali faol obunalar yo'q.\n\n💳 Mavjud tariflar:",

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Obunani yangilash: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) =>
      `Joriy tugash sanasi: ${date}`,
    renewal_text_subscriptionExpired: 'Obuna tugadi',
    renewal_text_selectPeriod: 'Yangilash davrini tanlang:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Obuna #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Bekor qilish',
    renewal_button_renew: '🔄 Obunani yangilash',
    renewal_button_choosePlan: '📋 Reja tanlash',
    renewal_button_changePlan: "🔄 Rejani o'zgartirish",

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Hisob yaratilmoqda...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Obuna ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Xato: foydalanuvchi topilmadi',
    renewal_error_subscriptionNotFound: 'Xato: obuna topilmadi',
    renewal_error_noTariffsAvailable:
      'Afsuski, bu obuna uchun yangilash tariflari mavjud emas.',
    renewal_error_genericError:
      "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",
    renewal_error_paymentCreationFailed:
      "Hisob yaratishda xatolik yuz berdi.\n\nKeyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",

    // Success (text)
    renewal_text_renewalCancelled: '❌ Yangilash bekor qilindi',
    renewal_text_paymentSuccess:
      "✅ To'lov muvaffaqiyatli yakunlandi!\n\nObunangiz yangilandi. Rahmat! 🎉",
    renewal_error_paymentError:
      "❌ To'lovni qayta ishlashda xatolik yuz berdi.\n\nTo'lovingiz qabul qilindi, lekin yangilash yakunlanmadi. Qo'llab-quvvatlash bilan bog'laning.",
  },

  tg: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Нав кардани обуна',
    renewal_text_yourSubscriptions: '📋 Обунаҳои шумо:',
    renewal_text_until: 'то',
    renewal_text_noExpiry: 'Бемӯҳлат',
    renewal_text_availableTariffs: '💳 Тарифҳои мавҷуд',
    renewal_text_noActiveSubscriptionsShort:
      '📋 Шумо ҳанӯз обунаҳои фаъол надоред.\n\n💳 Тарифҳои мавҷуд:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 Нав кардани обуна: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) => `Анҷоми ҷорӣ: ${date}`,
    renewal_text_subscriptionExpired: 'Обуна анҷом ёфт',
    renewal_text_selectPeriod: 'Давраи нав кардани обунаро интихоб кунед:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Обуна #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Бекор кардан',
    renewal_button_renew: '🔄 Нав кардани обуна',
    renewal_button_choosePlan: '📋 Интихоби нақша',
    renewal_button_changePlan: '🔄 Иваз кардани нақша',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Ҳисоб сохта мешавад...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Обуна ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Хато: корбар ёфт нашуд',
    renewal_error_subscriptionNotFound: 'Хато: обуна ёфт нашуд',
    renewal_error_noTariffsAvailable:
      'Мутаассифона, барои ин обуна тарифҳои нав кардан мавҷуд нестанд.',
    renewal_error_genericError:
      'Хато рӯй дод. Лутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',
    renewal_error_paymentCreationFailed:
      'Ҳангоми сохтани ҳисоб хато рӯй дод.\n\nЛутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Нав кардан бекор карда шуд',
    renewal_text_paymentSuccess:
      '✅ Пардохт бомуваффақият анҷом ёфт!\n\nОбунаи шумо нав карда шуд. Ташаккур! 🎉',
    renewal_error_paymentError:
      '❌ Ҳангоми коркарди пардохт хато рӯй дод.\n\nПардохти шумо қабул карда шуд, аммо нав кардан анҷом наёфт. Лутфан бо дастгирӣ тамос гиред.',
  },

  tl: {
    // Scene entry (text)
    renewal_text_selectTariffHeader: '🎯 Pag-renew ng Subscription',
    renewal_text_yourSubscriptions: '📋 Ang iyong mga subscription:',
    renewal_text_until: 'hanggang',
    renewal_text_noExpiry: 'Walang expiry',
    renewal_text_availableTariffs: '💳 Mga available na taripa',
    renewal_text_noActiveSubscriptionsShort:
      '📋 Wala ka pang active na subscription.\n\n💳 Mga available na taripa:',

    // Tariff selection (text)
    renewal_text_renewalTitle: (subscriptionName: string) =>
      `🎯 I-renew ang Subscription: ${subscriptionName}`,
    renewal_text_currentExpiry: (date: string) =>
      `Kasalukuyang expiration: ${date}`,
    renewal_text_subscriptionExpired: 'Nag-expire na ang subscription',
    renewal_text_selectPeriod: 'Pumili ng renewal period:',

    // Subscription display (text)
    renewal_text_subscriptionName: (subscriptionId: number) =>
      `Subscription #${subscriptionId}`,

    // Tariff button (button)
    renewal_button_tariff: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions (button)
    renewal_button_cancel: '❌ Kanselahin',
    renewal_button_renew: '🔄 I-renew ang Subscription',
    renewal_button_choosePlan: '📋 Pumili ng Plan',
    renewal_button_changePlan: '🔄 Palitan ang Plan',

    // Payment processing (text)
    renewal_text_creatingInvoice: '⏳ Ginagawa ang invoice...',
    renewal_text_invoiceTitle: (subscriptionName: string) =>
      `Subscription ${subscriptionName}`,
    renewal_text_invoiceDescription: (
      subscriptionName: string,
      period: string,
    ) => `${subscriptionName} - ${period}`,

    // Errors (error)
    renewal_error_userNotFound: 'Error: hindi nahanap ang user',
    renewal_error_subscriptionNotFound: 'Error: hindi nahanap ang subscription',
    renewal_error_noTariffsAvailable:
      'Sa kasamaang-palad, walang available na renewal taripa para sa subscription na ito.',
    renewal_error_genericError:
      'May naganap na error. Pakisubukang muli mamaya o makipag-ugnayan sa support.',
    renewal_error_paymentCreationFailed:
      'May naganap na error habang ginagawa ang invoice.\n\nPakisubukang muli mamaya o makipag-ugnayan sa support.',

    // Success (text)
    renewal_text_renewalCancelled: '❌ Nakansela ang renewal',
    renewal_text_paymentSuccess:
      '✅ Matagumpay na nakumpleto ang bayad!\n\nNa-renew na ang iyong subscription. Salamat! 🎉',
    renewal_error_paymentError:
      '❌ May naganap na error habang pinoproseso ang bayad.\n\nNatanggap ang iyong bayad, pero hindi nakumpleto ang renewal. Pakikontak ang support.',
  },
};

/**
 * Get localized message by prefixed key
 * @deprecated Use LocalizationService.forBot().use('renewal').lang().t() instead
 */
export function getRenewalMessage(
  lang: string,
  key: string,
  ...args: unknown[]
): string {
  const langMessages = renewalMessages[lang as LangCode];
  const fallbackMessages = renewalMessages.en;
  const messages = langMessages ?? fallbackMessages;

  if (!messages) {
    return key;
  }

  const message = messages[key];

  if (typeof message === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, prefer-spread
    return message.apply(null, args);
  }

  if (typeof message === 'string') {
    return message;
  }

  return key;
}

/**
 * Format days with correct plural form for each language
 */
export function formatDays(lang: string, days: number): string {
  switch (lang) {
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

    case 'tl':
      return `${days} araw`; // Tagalog doesn't have plural forms

    case 'hi':
      return `${days} दिन`; // Hindi: same for all

    case 'fr':
      return days === 1 ? `${days} jour` : `${days} jours`;

    case 'en':
    default:
      return days === 1 ? `${days} day` : `${days} days`;
  }
}
