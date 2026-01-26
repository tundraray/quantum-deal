/**
 * Renewal Scene Internationalization
 *
 * Multi-language support for subscription renewal UI
 */

const renewalMessages = {
  ru: {
    // Scene entry
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
    subscriptionName: (subscriptionId: number) => `Подписка #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Отмена',
    renewButton: '🔄 Продлить подписку',
    choosePlanButton: '📋 Выбрать план',
    changePlanButton: '🔄 Сменить тариф',

    // Promocode
    enterPromocode: '🏷️ Ввести промокод',
    promocodePrompt: '🏷️ Введите промокод:',
    promocodeSuccess: (discount: string) =>
      `✅ Промокод применен! Скидка: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ У вас есть скидка: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Неверный промокод',
      CODE_INACTIVE: '❌ Этот промокод больше не активен',
      CODE_NOT_VALID_FOR_BOT:
        '❌ Этот промокод недействителен для данного бота',
      CODE_NOT_YET_VALID: '❌ Этот промокод еще не действителен',
      CODE_EXPIRED: '❌ Срок действия промокода истек',
      CODE_ALREADY_USED: '❌ Этот промокод уже был использован',
      CODE_ALREADY_USED_BY_YOU: '❌ Вы уже использовали этот промокод',
      CODE_LIMIT_REACHED: '❌ Достигнут лимит активаций промокода',
    },
    backToTariffs: '⬅️ Назад к тарифам',

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
    // Scene entry
    selectTariffHeader: '🎯 Subscription Renewal',
    yourSubscriptions: '📋 Your subscriptions:',
    until: 'until',
    noExpiry: 'No expiry',
    availableTariffs: '💳 Available tariffs',
    noActiveSubscriptionsShort:
      '📋 You have no active subscriptions yet.\n\n💳 Available tariffs:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Renew Subscription: ${subscriptionName}`,
    currentExpiry: (date: string) => `Current expiration: ${date}`,
    subscriptionExpired: 'Subscription expired',
    selectPeriod: 'Select renewal period:',

    // Subscription display
    subscriptionName: (subscriptionId: number) =>
      `Subscription #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Cancel',
    renewButton: '🔄 Renew Subscription',
    choosePlanButton: '📋 Choose Plan',
    changePlanButton: '🔄 Change Plan',

    // Promocode
    enterPromocode: '🏷️ Enter promocode',
    promocodePrompt: '🏷️ Enter your promocode:',
    promocodeSuccess: (discount: string) =>
      `✅ Promocode applied! Discount: ${discount}`,
    activeDiscount: (discount: string) =>
      `🏷️ You have an active discount: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Invalid promocode',
      CODE_INACTIVE: '❌ This promocode is no longer active',
      CODE_NOT_VALID_FOR_BOT: '❌ This promocode is not valid for this bot',
      CODE_NOT_YET_VALID: '❌ This promocode is not yet valid',
      CODE_EXPIRED: '❌ This promocode has expired',
      CODE_ALREADY_USED: '❌ This promocode has already been used',
      CODE_ALREADY_USED_BY_YOU: '❌ You have already used this promocode',
      CODE_LIMIT_REACHED: '❌ Promocode activation limit reached',
    },
    backToTariffs: '⬅️ Back to tariffs',

    // Payment processing
    creatingInvoice: '⏳ Creating invoice...',
    invoiceTitle: (subscriptionName: string) =>
      `Subscription ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Error: user not found',
    subscriptionNotFound: 'Error: subscription not found',
    noTariffsAvailable:
      'Unfortunately, there are no renewal tariffs available for this subscription.',
    genericError:
      'An error occurred. Please try again later or contact support.',
    paymentCreationFailed:
      'An error occurred while creating the invoice.\n\nPlease try again later or contact support.',

    // Success
    renewalCancelled: '❌ Renewal cancelled',
    paymentSuccess:
      '✅ Payment completed successfully!\n\nYour subscription has been renewed. Thank you! 🎉',
    paymentError:
      '❌ An error occurred while processing the payment.\n\nYour payment was received, but the renewal was not completed. Please contact support.',
  },

  uk: {
    // Scene entry
    selectTariffHeader: '🎯 Продовження підписки',
    yourSubscriptions: '📋 Ваші підписки:',
    until: 'до',
    noExpiry: 'Не закінчується',
    availableTariffs: '💳 Доступні тарифи',
    noActiveSubscriptionsShort:
      '📋 У вас поки немає активних підписок.\n\n💳 Доступні тарифи:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Продовження підписки: ${subscriptionName}`,
    currentExpiry: (date: string) => `Поточне закінчення: ${date}`,
    subscriptionExpired: 'Підписка закінчилася',
    selectPeriod: 'Виберіть період продовження:',

    // Subscription display
    subscriptionName: (subscriptionId: number) => `Підписка #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Скасувати',
    renewButton: '🔄 Продовжити підписку',
    choosePlanButton: '📋 Вибрати план',
    changePlanButton: '🔄 Змінити тариф',

    // Promocode
    enterPromocode: '🏷️ Ввести промокод',
    promocodePrompt: '🏷️ Введіть промокод:',
    promocodeSuccess: (discount: string) =>
      `✅ Промокод застосовано! Знижка: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ У вас є знижка: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Невірний промокод',
      CODE_INACTIVE: '❌ Цей промокод більше не активний',
      CODE_NOT_VALID_FOR_BOT: '❌ Цей промокод недійсний для цього бота',
      CODE_NOT_YET_VALID: '❌ Цей промокод ще не дійсний',
      CODE_EXPIRED: '❌ Термін дії промокоду закінчився',
      CODE_ALREADY_USED: '❌ Цей промокод вже був використаний',
      CODE_ALREADY_USED_BY_YOU: '❌ Ви вже використали цей промокод',
      CODE_LIMIT_REACHED: '❌ Досягнуто ліміт активацій промокоду',
    },
    backToTariffs: '⬅️ Назад до тарифів',

    // Payment processing
    creatingInvoice: '⏳ Створюємо рахунок на оплату...',
    invoiceTitle: (subscriptionName: string) => `Підписка ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Помилка: користувача не знайдено',
    subscriptionNotFound: 'Помилка: підписку не знайдено',
    noTariffsAvailable:
      'На жаль, для цієї підписки немає доступних тарифів продовження.',
    genericError:
      'Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.',
    paymentCreationFailed:
      'Сталася помилка при створенні рахунку на оплату.\n\nБудь ласка, спробуйте пізніше або зверніться до підтримки.',

    // Success
    renewalCancelled: '❌ Продовження скасовано',
    paymentSuccess:
      '✅ Оплата успішно завершена!\n\nВашу підписку продовжено. Дякуємо! 🎉',
    paymentError:
      '❌ Сталася помилка при обробці оплати.\n\nВаш платіж отримано, але продовження не завершено. Будь ласка, зверніться до підтримки.',
  },

  hi: {
    // Scene entry
    selectTariffHeader: '🎯 सदस्यता नवीनीकरण',
    yourSubscriptions: '📋 आपकी सदस्यताएँ:',
    until: 'तक',
    noExpiry: 'कोई समाप्ति नहीं',
    availableTariffs: '💳 उपलब्ध टैरिफ',
    noActiveSubscriptionsShort:
      '📋 आपके पास अभी तक कोई सक्रिय सदस्यता नहीं है।\n\n💳 उपलब्ध टैरिफ:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 सदस्यता नवीनीकरण: ${subscriptionName}`,
    currentExpiry: (date: string) => `वर्तमान समाप्ति: ${date}`,
    subscriptionExpired: 'सदस्यता समाप्त हो गई',
    selectPeriod: 'नवीनीकरण अवधि चुनें:',

    // Subscription display
    subscriptionName: (subscriptionId: number) => `सदस्यता #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ रद्द करें',
    changePlanButton: '🔄 प्लान बदलें',
    renewButton: '🔄 सदस्यता नवीनीकरण',
    choosePlanButton: '📋 प्लान चुनें',

    // Promocode
    enterPromocode: '🏷️ प्रोमोकोड दर्ज करें',
    promocodePrompt: '🏷️ अपना प्रोमोकोड दर्ज करें:',
    promocodeSuccess: (discount: string) =>
      `✅ प्रोमोकोड लागू! छूट: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ आपके पास छूट है: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ अमान्य प्रोमोकोड',
      CODE_INACTIVE: '❌ यह प्रोमोकोड अब सक्रिय नहीं है',
      CODE_NOT_VALID_FOR_BOT: '❌ यह प्रोमोकोड इस बॉट के लिए मान्य नहीं है',
      CODE_NOT_YET_VALID: '❌ यह प्रोमोकोड अभी मान्य नहीं है',
      CODE_EXPIRED: '❌ इस प्रोमोकोड की समय सीमा समाप्त हो गई है',
      CODE_ALREADY_USED: '❌ यह प्रोमोकोड पहले ही उपयोग किया जा चुका है',
      CODE_ALREADY_USED_BY_YOU: '❌ आपने पहले ही इस प्रोमोकोड का उपयोग किया है',
      CODE_LIMIT_REACHED: '❌ प्रोमोकोड सक्रियण सीमा पूरी हो गई',
    },
    backToTariffs: '⬅️ टैरिफ पर वापस',

    // Payment processing
    creatingInvoice: '⏳ चालान बना रहे हैं...',
    invoiceTitle: (subscriptionName: string) => `सदस्यता ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'त्रुटि: उपयोगकर्ता नहीं मिला',
    subscriptionNotFound: 'त्रुटि: सदस्यता नहीं मिली',
    noTariffsAvailable:
      'दुर्भाग्य से, इस सदस्यता के लिए कोई नवीनीकरण टैरिफ उपलब्ध नहीं है।',
    genericError:
      'एक त्रुटि हुई। कृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',
    paymentCreationFailed:
      'चालान बनाते समय एक त्रुटि हुई।\n\nकृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',

    // Success
    renewalCancelled: '❌ नवीनीकरण रद्द किया गया',
    paymentSuccess:
      '✅ भुगतान सफलतापूर्वक पूर्ण हुआ!\n\nआपकी सदस्यता नवीनीकृत कर दी गई है। धन्यवाद! 🎉',
    paymentError:
      '❌ भुगतान संसाधित करते समय एक त्रुटि हुई।\n\nआपका भुगतान प्राप्त हो गया है, लेकिन नवीनीकरण पूरा नहीं हुआ। कृपया सहायता से संपर्क करें।',
  },

  fr: {
    // Scene entry
    selectTariffHeader: '🎯 Renouvellement',
    yourSubscriptions: '📋 Vos abonnements:',
    until: "jusqu'au",
    noExpiry: 'Sans expiration',
    availableTariffs: '💳 Tarifs disponibles',
    noActiveSubscriptionsShort:
      "📋 Vous n'avez pas encore d'abonnements actifs.\n\n💳 Tarifs disponibles:",

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Renouvellement: ${subscriptionName}`,
    currentExpiry: (date: string) => `Expiration actuelle: ${date}`,
    subscriptionExpired: 'Abonnement expiré',
    selectPeriod: 'Sélectionnez la période de renouvellement:',

    // Subscription display
    subscriptionName: (subscriptionId: number) =>
      `Abonnement #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Annuler',
    changePlanButton: '🔄 Changer de plan',
    renewButton: '🔄 Renouveler',
    choosePlanButton: '📋 Choisir un plan',

    // Promocode
    enterPromocode: '🏷️ Entrer un code promo',
    promocodePrompt: '🏷️ Entrez votre code promo:',
    promocodeSuccess: (discount: string) =>
      `✅ Code promo appliqué! Réduction: ${discount}`,
    activeDiscount: (discount: string) =>
      `🏷️ Vous avez une réduction: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Code promo invalide',
      CODE_INACTIVE: "❌ Ce code promo n'est plus actif",
      CODE_NOT_VALID_FOR_BOT: "❌ Ce code promo n'est pas valide pour ce bot",
      CODE_NOT_YET_VALID: "❌ Ce code promo n'est pas encore valide",
      CODE_EXPIRED: '❌ Ce code promo a expiré',
      CODE_ALREADY_USED: '❌ Ce code promo a déjà été utilisé',
      CODE_ALREADY_USED_BY_YOU: '❌ Vous avez déjà utilisé ce code promo',
      CODE_LIMIT_REACHED: "❌ Limite d'activation du code promo atteinte",
    },
    backToTariffs: '⬅️ Retour aux tarifs',

    // Payment processing
    creatingInvoice: '⏳ Création de la facture...',
    invoiceTitle: (subscriptionName: string) =>
      `Abonnement ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Erreur: utilisateur non trouvé',
    subscriptionNotFound: 'Erreur: abonnement non trouvé',
    noTariffsAvailable:
      "Malheureusement, il n'y a pas de tarifs de renouvellement disponibles pour cet abonnement.",
    genericError:
      'Une erreur est survenue. Veuillez réessayer plus tard ou contacter le support.',
    paymentCreationFailed:
      'Une erreur est survenue lors de la création de la facture.\n\nVeuillez réessayer plus tard ou contacter le support.',

    // Success
    renewalCancelled: '❌ Renouvellement annulé',
    paymentSuccess:
      '✅ Paiement effectué avec succès!\n\nVotre abonnement a été renouvelé. Merci! 🎉',
    paymentError:
      "❌ Une erreur est survenue lors du traitement du paiement.\n\nVotre paiement a été reçu, mais le renouvellement n'a pas été effectué. Veuillez contacter le support.",
  },

  kk: {
    // Scene entry
    selectTariffHeader: '🎯 Жазылымды жаңарту',
    yourSubscriptions: '📋 Сіздің жазылымдарыңыз:',
    until: 'дейін',
    noExpiry: 'Мерзімсіз',
    availableTariffs: '💳 Қолжетімді тарифтер',
    noActiveSubscriptionsShort:
      '📋 Сізде әзірше белсенді жазылымдар жоқ.\n\n💳 Қолжетімді тарифтер:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Жазылымды жаңарту: ${subscriptionName}`,
    currentExpiry: (date: string) => `Ағымдағы аяқталу: ${date}`,
    subscriptionExpired: 'Жазылым аяқталды',
    selectPeriod: 'Жаңарту кезеңін таңдаңыз:',

    // Subscription display
    subscriptionName: (subscriptionId: number) => `Жазылым #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Болдырмау',
    changePlanButton: '🔄 Жоспарды өзгерту',
    renewButton: '🔄 Жазылымды жаңарту',
    choosePlanButton: '📋 Жоспарды таңдау',

    // Promocode
    enterPromocode: '🏷️ Промокод енгізу',
    promocodePrompt: '🏷️ Промокодыңызды енгізіңіз:',
    promocodeSuccess: (discount: string) =>
      `✅ Промокод қолданылды! Жеңілдік: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ Сізде жеңілдік бар: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Жарамсыз промокод',
      CODE_INACTIVE: '❌ Бұл промокод енді белсенді емес',
      CODE_NOT_VALID_FOR_BOT: '❌ Бұл промокод осы бот үшін жарамсыз',
      CODE_NOT_YET_VALID: '❌ Бұл промокод әлі жарамды емес',
      CODE_EXPIRED: '❌ Бұл промокодтың мерзімі өтті',
      CODE_ALREADY_USED: '❌ Бұл промокод әлдеқашан пайдаланылған',
      CODE_ALREADY_USED_BY_YOU: '❌ Сіз бұл промокодты әлдеқашан пайдаландыңыз',
      CODE_LIMIT_REACHED: '❌ Промокод белсендіру шегіне жетті',
    },
    backToTariffs: '⬅️ Тарифтерге оралу',

    // Payment processing
    creatingInvoice: '⏳ Шот жасалуда...',
    invoiceTitle: (subscriptionName: string) => `Жазылым ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Қате: пайдаланушы табылмады',
    subscriptionNotFound: 'Қате: жазылым табылмады',
    noTariffsAvailable:
      'Өкінішке орай, бұл жазылым үшін жаңарту тарифтері жоқ.',
    genericError:
      'Қате орын алды. Кейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',
    paymentCreationFailed:
      'Шот жасау кезінде қате орын алды.\n\nКейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',

    // Success
    renewalCancelled: '❌ Жаңарту болдырылмады',
    paymentSuccess:
      '✅ Төлем сәтті аяқталды!\n\nЖазылымыңыз жаңартылды. Рахмет! 🎉',
    paymentError:
      '❌ Төлемді өңдеу кезінде қате орын алды.\n\nТөлеміңіз қабылданды, бірақ жаңарту аяқталмады. Қолдау қызметіне хабарласыңыз.',
  },

  uz: {
    // Scene entry
    selectTariffHeader: '🎯 Obunani yangilash',
    yourSubscriptions: '📋 Sizning obunalaringiz:',
    until: 'gacha',
    noExpiry: 'Muddatsiz',
    availableTariffs: '💳 Mavjud tariflar',
    noActiveSubscriptionsShort:
      "📋 Sizda hali faol obunalar yo'q.\n\n💳 Mavjud tariflar:",

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Obunani yangilash: ${subscriptionName}`,
    currentExpiry: (date: string) => `Joriy tugash sanasi: ${date}`,
    subscriptionExpired: 'Obuna tugadi',
    selectPeriod: 'Yangilash davrini tanlang:',

    // Subscription display
    subscriptionName: (subscriptionId: number) => `Obuna #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Bekor qilish',
    changePlanButton: "🔄 Rejani o'zgartirish",
    renewButton: '🔄 Obunani yangilash',
    choosePlanButton: '📋 Reja tanlash',

    // Promocode
    enterPromocode: '🏷️ Promokod kiriting',
    promocodePrompt: '🏷️ Promokodingizni kiriting:',
    promocodeSuccess: (discount: string) =>
      `✅ Promokod qo'llanildi! Chegirma: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ Sizda chegirma bor: ${discount}`,
    promocodeError: {
      INVALID_CODE: "❌ Noto'g'ri promokod",
      CODE_INACTIVE: '❌ Bu promokod endi faol emas',
      CODE_NOT_VALID_FOR_BOT: '❌ Bu promokod ushbu bot uchun yaroqsiz',
      CODE_NOT_YET_VALID: '❌ Bu promokod hali yaroqli emas',
      CODE_EXPIRED: '❌ Bu promokodning muddati tugagan',
      CODE_ALREADY_USED: '❌ Bu promokod allaqachon ishlatilgan',
      CODE_ALREADY_USED_BY_YOU: '❌ Siz bu promokodni allaqachon ishlatgansiz',
      CODE_LIMIT_REACHED: '❌ Promokod faollashtirish chegarasiga yetdi',
    },
    backToTariffs: '⬅️ Tariflarga qaytish',

    // Payment processing
    creatingInvoice: '⏳ Hisob yaratilmoqda...',
    invoiceTitle: (subscriptionName: string) => `Obuna ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Xato: foydalanuvchi topilmadi',
    subscriptionNotFound: 'Xato: obuna topilmadi',
    noTariffsAvailable:
      'Afsuski, bu obuna uchun yangilash tariflari mavjud emas.',
    genericError:
      "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",
    paymentCreationFailed:
      "Hisob yaratishda xatolik yuz berdi.\n\nKeyinroq qayta urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",

    // Success
    renewalCancelled: '❌ Yangilash bekor qilindi',
    paymentSuccess:
      "✅ To'lov muvaffaqiyatli yakunlandi!\n\nObunangiz yangilandi. Rahmat! 🎉",
    paymentError:
      "❌ To'lovni qayta ishlashda xatolik yuz berdi.\n\nTo'lovingiz qabul qilindi, lekin yangilash yakunlanmadi. Qo'llab-quvvatlash bilan bog'laning.",
  },

  tg: {
    // Scene entry
    selectTariffHeader: '🎯 Нав кардани обуна',
    yourSubscriptions: '📋 Обунаҳои шумо:',
    until: 'то',
    noExpiry: 'Бемӯҳлат',
    availableTariffs: '💳 Тарифҳои мавҷуд',
    noActiveSubscriptionsShort:
      '📋 Шумо ҳанӯз обунаҳои фаъол надоред.\n\n💳 Тарифҳои мавҷуд:',

    // Tariff selection
    renewalTitle: (subscriptionName: string) =>
      `🎯 Нав кардани обуна: ${subscriptionName}`,
    currentExpiry: (date: string) => `Анҷоми ҷорӣ: ${date}`,
    subscriptionExpired: 'Обуна анҷом ёфт',
    selectPeriod: 'Давраи нав кардани обунаро интихоб кунед:',

    // Subscription display
    subscriptionName: (subscriptionId: number) => `Обуна #${subscriptionId}`,

    // Tariff button
    tariffButton: (displayName: string, stars: number) =>
      `📅 ${displayName} - ${stars} ⭐`,

    // Actions
    cancel: '❌ Бекор кардан',
    renewButton: '🔄 Нав кардани обуна',
    changePlanButton: '🔄 Иваз кардани нақша',
    choosePlanButton: '📋 Интихоби нақша',

    // Promocode
    enterPromocode: '🏷️ Промокод ворид кунед',
    promocodePrompt: '🏷️ Промокоди худро ворид кунед:',
    promocodeSuccess: (discount: string) =>
      `✅ Промокод татбиқ шуд! Тахфиф: ${discount}`,
    activeDiscount: (discount: string) => `🏷️ Шумо тахфиф доред: ${discount}`,
    promocodeError: {
      INVALID_CODE: '❌ Промокоди нодуруст',
      CODE_INACTIVE: '❌ Ин промокод дигар фаъол нест',
      CODE_NOT_VALID_FOR_BOT: '❌ Ин промокод барои ин бот эътибор надорад',
      CODE_NOT_YET_VALID: '❌ Ин промокод ҳанӯз эътибор надорад',
      CODE_EXPIRED: '❌ Мӯҳлати ин промокод гузашт',
      CODE_ALREADY_USED: '❌ Ин промокод аллакай истифода шудааст',
      CODE_ALREADY_USED_BY_YOU:
        '❌ Шумо аллакай ин промокодро истифода кардаед',
      CODE_LIMIT_REACHED: '❌ Ҳадди фаъолсозии промокод расид',
    },
    backToTariffs: '⬅️ Ба тарифҳо баргаштан',

    // Payment processing
    creatingInvoice: '⏳ Ҳисоб сохта мешавад...',
    invoiceTitle: (subscriptionName: string) => `Обуна ${subscriptionName}`,
    invoiceDescription: (subscriptionName: string, period: string) =>
      `${subscriptionName} - ${period}`,

    // Errors
    userNotFound: 'Хато: корбар ёфт нашуд',
    subscriptionNotFound: 'Хато: обуна ёфт нашуд',
    noTariffsAvailable:
      'Мутаассифона, барои ин обуна тарифҳои нав кардан мавҷуд нестанд.',
    genericError:
      'Хато рӯй дод. Лутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',
    paymentCreationFailed:
      'Ҳангоми сохтани ҳисоб хато рӯй дод.\n\nЛутфан баъдтар кӯшиш кунед ё бо дастгирӣ тамос гиред.',

    // Success
    renewalCancelled: '❌ Нав кардан бекор карда шуд',
    paymentSuccess:
      '✅ Пардохт бомуваффақият анҷом ёфт!\n\nОбунаи шумо нав карда шуд. Ташаккур! 🎉',
    paymentError:
      '❌ Ҳангоми коркарди пардохт хато рӯй дод.\n\nПардохти шумо қабул карда шуд, аммо нав кардан анҷом наёфт. Лутфан бо дастгирӣ тамос гиред.',
  },
};

type RenewalLang = keyof typeof renewalMessages;

/**
 * Promocode error codes from ValidationResult
 */
export type PromocodeErrorCode =
  | 'INVALID_CODE'
  | 'CODE_INACTIVE'
  | 'CODE_NOT_VALID_FOR_BOT'
  | 'CODE_NOT_YET_VALID'
  | 'CODE_EXPIRED'
  | 'CODE_ALREADY_USED'
  | 'CODE_ALREADY_USED_BY_YOU'
  | 'CODE_LIMIT_REACHED';

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

  return message as string;
}

/**
 * Get localized promocode error message
 */
export function getPromocodeErrorMessage(
  lang: string,
  errorCode: PromocodeErrorCode,
): string {
  const messages = renewalMessages[lang as RenewalLang] || renewalMessages.en;
  return (
    messages.promocodeError[errorCode] || messages.promocodeError.INVALID_CODE
  );
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
