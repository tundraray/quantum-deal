/**
 * filter.translations.ts
 *
 * Translation definitions for the instrument filter feature.
 * Supports 8 languages with complete Russian and English translations.
 */

// Language codes
export type Language = 'ru' | 'en' | 'uk' | 'hi' | 'fr' | 'kk' | 'uz' | 'tg';

// Translation structure interface
export interface Translations {
  errors: {
    user_not_found: string;
    loading_failed: string;
    session_expired: string;
    unknown_action: string;
    action_failed: string;
    saving_failed: string;
    clearing_failed: string;
  };
  ui: {
    filter_title: string;
    current_status: string;
    all_instruments: string;
    selected_count: string;
    select_category: string;
    select_subgroup: string;
    page_indicator: string;
    selected_instruments: string;
    you_will_receive: string;
    and_more: string;
    total_selected: string;
  };
  groups: {
    forex: string;
    commodities: string;
    crypto: string;
    stocks: string;
    european: string;
    us: string;
  };
  buttons: {
    select_all: string;
    clear_filters: string;
    close: string;
    select_all_group: string;
    deselect_all: string;
    save: string;
    prev_page: string;
    next_page: string;
    back_to_menu: string;
    select_all_stocks: string;
    select_all_subgroup: string;
    back_to_stocks: string;
    edit_filter: string;
    clear_filter: string;
    yes_clear: string;
    cancel: string;
  };
  messages: {
    filter_saved: string;
    filter_cleared: string;
    settings_saved: string;
    menu_closed: string;
  };
  confirmation: {
    title: string;
    clear_warning: string;
    after_clear: string;
  };
  plurals: {
    instruments: {
      one: string;
      few: string;
      many: string;
      other: string;
    };
  };
}

// Translation data
export const translations: Record<Language, Translations> = {
  // Russian (complete)
  ru: {
    errors: {
      user_not_found: 'Ошибка: не удалось определить пользователя',
      loading_failed:
        'Произошла ошибка при загрузке фильтров. Попробуйте позже.',
      session_expired:
        'Сессия истекла. Используйте /filter для повторного входа.',
      unknown_action: 'Неизвестное действие',
      action_failed: 'Произошла ошибка',
      saving_failed: 'Ошибка при сохранении',
      clearing_failed: 'Ошибка при очистке фильтров',
    },
    ui: {
      filter_title: '🎯 *Фильтр инструментов*',
      current_status: 'Текущий статус:',
      all_instruments: '✅ Все инструменты ({count})',
      selected_count: '📊 Выбрано: {count} из {total}',
      select_category: 'Выберите категорию:',
      select_subgroup: 'Выберите подгруппу:',
      page_indicator: '« Страница {current} из {total} »',
      selected_instruments: 'Выбрано: {count} из {total}',
      you_will_receive: 'Вы будете получать сигналы по следующим инструментам:',
      and_more: 'и ещё {count} {plural}',
      total_selected: '*Всего выбрано:* {count} из {total} {plural}',
    },
    groups: {
      forex: 'Валюты',
      commodities: 'Товары',
      crypto: 'Криптовалюты',
      stocks: 'Акции',
      european: 'Европейские акции',
      us: 'Американские акции',
    },
    buttons: {
      select_all: '✅ Выбрать все',
      clear_filters: '🗑️ Очистить фильтры',
      close: '❌ Закрыть',
      select_all_group: '✅ Выбрать всю группу',
      deselect_all: '🗑️ Отменить выбор',
      save: '💾 Сохранить',
      prev_page: '◀️ Пред',
      next_page: 'След ▶️',
      back_to_menu: '◀️ Назад в меню',
      select_all_stocks: '✅ Выбрать все акции',
      select_all_subgroup: '✅ Выбрать всю подгруппу',
      back_to_stocks: '◀️ Назад к акциям',
      edit_filter: '✏️ Изменить фильтр',
      clear_filter: '🗑️ Очистить фильтр',
      yes_clear: '✅ Да, очистить',
      cancel: '❌ Отмена',
    },
    messages: {
      filter_saved: '✅ *Фильтр сохранён!*',
      filter_cleared: '✅ *Фильтр очищен!*',
      settings_saved: 'Настройки сохранены',
      menu_closed: 'Меню закрыто',
    },
    confirmation: {
      title: '⚠️ *Подтверждение*',
      clear_warning:
        'Вы уверены, что хотите очистить все фильтры?\n\nПосле очистки вы снова будете получать сигналы по всем {count} инструментам.',
      after_clear: 'Вы будете получать сигналы по всем {count} инструментам.',
    },
    plurals: {
      instruments: {
        one: 'инструмент',
        few: 'инструмента',
        many: 'инструментов',
        other: 'инструментов',
      },
    },
  },

  // English (complete)
  en: {
    errors: {
      user_not_found: 'Error: unable to identify user',
      loading_failed:
        'An error occurred while loading filters. Please try again later.',
      session_expired: 'Session expired. Use /filter to re-enter.',
      unknown_action: 'Unknown action',
      action_failed: 'An error occurred',
      saving_failed: 'Error saving filters',
      clearing_failed: 'Error clearing filters',
    },
    ui: {
      filter_title: '🎯 *Instrument Filter*',
      current_status: 'Current status:',
      all_instruments: '✅ All instruments ({count})',
      selected_count: '📊 Selected: {count} of {total}',
      select_category: 'Select category:',
      select_subgroup: 'Select subgroup:',
      page_indicator: '« Page {current} of {total} »',
      selected_instruments: 'Selected: {count} of {total}',
      you_will_receive:
        'You will receive signals for the following instruments:',
      and_more: 'and {count} more {plural}',
      total_selected: '*Total selected:* {count} of {total} {plural}',
    },
    groups: {
      forex: 'Currencies',
      commodities: 'Commodities',
      crypto: 'Cryptocurrencies',
      stocks: 'Stocks',
      european: 'European Stocks',
      us: 'US Stocks',
    },
    buttons: {
      select_all: '✅ Select All',
      clear_filters: '🗑️ Clear Filters',
      close: '❌ Close',
      select_all_group: '✅ Select All in Group',
      deselect_all: '🗑️ Deselect All',
      save: '💾 Save',
      prev_page: '◀️ Previous',
      next_page: 'Next ▶️',
      back_to_menu: '◀️ Back to Menu',
      select_all_stocks: '✅ Select All Stocks',
      select_all_subgroup: '✅ Select All in Subgroup',
      back_to_stocks: '◀️ Back to Stocks',
      edit_filter: '✏️ Edit Filter',
      clear_filter: '🗑️ Clear Filter',
      yes_clear: '✅ Yes, Clear',
      cancel: '❌ Cancel',
    },
    messages: {
      filter_saved: '✅ *Filter Saved!*',
      filter_cleared: '✅ *Filter Cleared!*',
      settings_saved: 'Settings saved',
      menu_closed: 'Menu closed',
    },
    confirmation: {
      title: '⚠️ *Confirmation*',
      clear_warning:
        'Are you sure you want to clear all filters?\n\nAfter clearing, you will receive signals for all {count} instruments.',
      after_clear: 'You will receive signals for all {count} instruments.',
    },
    plurals: {
      instruments: {
        one: 'instrument',
        few: 'instruments',
        many: 'instruments',
        other: 'instruments',
      },
    },
  },

  // Ukrainian (complete)
  uk: {
    errors: {
      user_not_found: 'Помилка: не вдалося визначити користувача',
      loading_failed:
        'Виникла помилка при завантаженні фільтрів. Спробуйте пізніше.',
      session_expired:
        'Сесія закінчилася. Використовуйте /filter для повторного входу.',
      unknown_action: 'Невідома дія',
      action_failed: 'Сталася помилка',
      saving_failed: 'Помилка при збереженні',
      clearing_failed: 'Помилка при очищенні фільтрів',
    },
    ui: {
      filter_title: '🎯 *Фільтр інструментів*',
      current_status: 'Поточний статус:',
      all_instruments: '✅ Всі інструменти ({count})',
      selected_count: '📊 Вибрано: {count} з {total}',
      select_category: 'Виберіть категорію:',
      select_subgroup: 'Виберіть підгрупу:',
      page_indicator: '« Сторінка {current} з {total} »',
      selected_instruments: 'Вибрано: {count} з {total}',
      you_will_receive:
        'Ви будете отримувати сигнали по наступних інструментах:',
      and_more: 'та ще {count} {plural}',
      total_selected: '*Всього вибрано:* {count} з {total} {plural}',
    },
    groups: {
      forex: 'Валюти',
      commodities: 'Товари',
      crypto: 'Криптовалюти',
      stocks: 'Акції',
      european: 'Європейські акції',
      us: 'Американські акції',
    },
    buttons: {
      select_all: '✅ Вибрати всі',
      clear_filters: '🗑️ Очистити фільтри',
      close: '❌ Закрити',
      select_all_group: '✅ Вибрати всю групу',
      deselect_all: '🗑️ Скасувати вибір',
      save: '💾 Зберегти',
      prev_page: '◀️ Попередня',
      next_page: 'Наступна ▶️',
      back_to_menu: '◀️ Назад до меню',
      select_all_stocks: '✅ Вибрати всі акції',
      select_all_subgroup: '✅ Вибрати всю підгрупу',
      back_to_stocks: '◀️ Назад до акцій',
      edit_filter: '✏️ Змінити фільтр',
      clear_filter: '🗑️ Очистити фільтр',
      yes_clear: '✅ Так, очистити',
      cancel: '❌ Скасувати',
    },
    messages: {
      filter_saved: '✅ *Фільтр збережено!*',
      filter_cleared: '✅ *Фільтр очищено!*',
      settings_saved: 'Налаштування збережено',
      menu_closed: 'Меню закрито',
    },
    confirmation: {
      title: '⚠️ *Підтвердження*',
      clear_warning:
        'Ви впевнені, що хочете очистити всі фільтри?\n\nПісля очищення ви знову будете отримувати сигнали по всіх {count} інструментах.',
      after_clear: 'Ви будете отримувати сигнали по всіх {count} інструментах.',
    },
    plurals: {
      instruments: {
        one: 'інструмент',
        few: 'інструменти',
        many: 'інструментів',
        other: 'інструментів',
      },
    },
  },

  // Hindi (complete)
  hi: {
    errors: {
      user_not_found: 'त्रुटि: उपयोगकर्ता की पहचान करने में असमर्थ',
      loading_failed:
        'फ़िल्टर लोड करते समय त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।',
      session_expired:
        'सत्र समाप्त हो गया। पुनः प्रवेश के लिए /filter का उपयोग करें।',
      unknown_action: 'अज्ञात कार्रवाई',
      action_failed: 'त्रुटि हुई',
      saving_failed: 'सहेजने में त्रुटि',
      clearing_failed: 'फ़िल्टर साफ़ करने में त्रुटि',
    },
    ui: {
      filter_title: '🎯 *इंस्ट्रूमेंट फ़िल्टर*',
      current_status: 'वर्तमान स्थिति:',
      all_instruments: '✅ सभी इंस्ट्रूमेंट ({count})',
      selected_count: '📊 चयनित: {count} / {total}',
      select_category: 'श्रेणी चुनें:',
      select_subgroup: 'उपसमूह चुनें:',
      page_indicator: '« पृष्ठ {current} / {total} »',
      selected_instruments: 'चयनित: {count} / {total}',
      you_will_receive:
        'आप निम्नलिखित इंस्ट्रूमेंट के लिए सिग्नल प्राप्त करेंगे:',
      and_more: 'और {count} और {plural}',
      total_selected: '*कुल चयनित:* {count} / {total} {plural}',
    },
    groups: {
      forex: 'मुद्राएं',
      commodities: 'कमोडिटीज़',
      crypto: 'क्रिप्टोकरेंसी',
      stocks: 'स्टॉक्स',
      european: 'यूरोपीय स्टॉक्स',
      us: 'अमेरिकी स्टॉक्स',
    },
    buttons: {
      select_all: '✅ सभी चुनें',
      clear_filters: '🗑️ फ़िल्टर साफ़ करें',
      close: '❌ बंद करें',
      select_all_group: '✅ समूह में सभी चुनें',
      deselect_all: '🗑️ सभी अचयनित करें',
      save: '💾 सहेजें',
      prev_page: '◀️ पिछला',
      next_page: 'अगला ▶️',
      back_to_menu: '◀️ मेनू पर वापस',
      select_all_stocks: '✅ सभी स्टॉक्स चुनें',
      select_all_subgroup: '✅ उपसमूह में सभी चुनें',
      back_to_stocks: '◀️ स्टॉक्स पर वापस',
      edit_filter: '✏️ फ़िल्टर संपादित करें',
      clear_filter: '🗑️ फ़िल्टर साफ़ करें',
      yes_clear: '✅ हां, साफ़ करें',
      cancel: '❌ रद्द करें',
    },
    messages: {
      filter_saved: '✅ *फ़िल्टर सहेजा गया!*',
      filter_cleared: '✅ *फ़िल्टर साफ़ किया गया!*',
      settings_saved: 'सेटिंग्स सहेजी गईं',
      menu_closed: 'मेनू बंद हुआ',
    },
    confirmation: {
      title: '⚠️ *पुष्टि*',
      clear_warning:
        'क्या आप वाकई सभी फ़िल्टर साफ़ करना चाहते हैं?\n\nसाफ़ करने के बाद, आप सभी {count} इंस्ट्रूमेंट के लिए सिग्नल प्राप्त करेंगे।',
      after_clear: 'आप सभी {count} इंस्ट्रूमेंट के लिए सिग्नल प्राप्त करेंगे।',
    },
    plurals: {
      instruments: {
        one: 'इंस्ट्रूमेंट',
        few: 'इंस्ट्रूमेंट',
        many: 'इंस्ट्रूमेंट',
        other: 'इंस्ट्रूमेंट',
      },
    },
  },

  // French (complete)
  fr: {
    errors: {
      user_not_found: "Erreur : impossible d'identifier l'utilisateur",
      loading_failed:
        "Une erreur s'est produite lors du chargement des filtres. Veuillez réessayer plus tard.",
      session_expired:
        'Session expirée. Utilisez /filter pour vous reconnecter.',
      unknown_action: 'Action inconnue',
      action_failed: "Une erreur s'est produite",
      saving_failed: "Erreur lors de l'enregistrement",
      clearing_failed: "Erreur lors de l'effacement des filtres",
    },
    ui: {
      filter_title: '🎯 *Filtre des Instruments*',
      current_status: 'État actuel :',
      all_instruments: '✅ Tous les instruments ({count})',
      selected_count: '📊 Sélectionné : {count} sur {total}',
      select_category: 'Sélectionnez une catégorie :',
      select_subgroup: 'Sélectionnez un sous-groupe :',
      page_indicator: '« Page {current} sur {total} »',
      selected_instruments: 'Sélectionné : {count} sur {total}',
      you_will_receive:
        'Vous recevrez des signaux pour les instruments suivants :',
      and_more: 'et {count} de plus {plural}',
      total_selected: '*Total sélectionné :* {count} sur {total} {plural}',
    },
    groups: {
      forex: 'Devises',
      commodities: 'Matières premières',
      crypto: 'Cryptomonnaies',
      stocks: 'Actions',
      european: 'Actions Européennes',
      us: 'Actions Américaines',
    },
    buttons: {
      select_all: '✅ Tout sélectionner',
      clear_filters: '🗑️ Effacer les filtres',
      close: '❌ Fermer',
      select_all_group: '✅ Sélectionner tout le groupe',
      deselect_all: '🗑️ Tout désélectionner',
      save: '💾 Enregistrer',
      prev_page: '◀️ Précédent',
      next_page: 'Suivant ▶️',
      back_to_menu: '◀️ Retour au menu',
      select_all_stocks: '✅ Sélectionner toutes les actions',
      select_all_subgroup: '✅ Sélectionner tout le sous-groupe',
      back_to_stocks: '◀️ Retour aux actions',
      edit_filter: '✏️ Modifier le filtre',
      clear_filter: '🗑️ Effacer le filtre',
      yes_clear: '✅ Oui, effacer',
      cancel: '❌ Annuler',
    },
    messages: {
      filter_saved: '✅ *Filtre Enregistré !*',
      filter_cleared: '✅ *Filtre Effacé !*',
      settings_saved: 'Paramètres enregistrés',
      menu_closed: 'Menu fermé',
    },
    confirmation: {
      title: '⚠️ *Confirmation*',
      clear_warning:
        "Êtes-vous sûr de vouloir effacer tous les filtres ?\n\nAprès l'effacement, vous recevrez des signaux pour tous les {count} instruments.",
      after_clear:
        'Vous recevrez des signaux pour tous les {count} instruments.',
    },
    plurals: {
      instruments: {
        one: 'instrument',
        few: 'instruments',
        many: 'instruments',
        other: 'instruments',
      },
    },
  },

  // Kazakh (complete)
  kk: {
    errors: {
      user_not_found: 'Қате: пайдаланушыны анықтау мүмкін болмады',
      loading_failed:
        'Сүзгілерді жүктеу кезінде қате орын алды. Кейінірек қайталап көріңіз.',
      session_expired: 'Сеанс аяқталды. Қайта кіру үшін /filter пайдаланыңыз.',
      unknown_action: 'Белгісіз әрекет',
      action_failed: 'Қате орын алды',
      saving_failed: 'Сақтау қатесі',
      clearing_failed: 'Сүзгілерді тазалау қатесі',
    },
    ui: {
      filter_title: '🎯 *Құралдар Сүзгісі*',
      current_status: 'Ағымдағы күй:',
      all_instruments: '✅ Барлық құралдар ({count})',
      selected_count: '📊 Таңдалған: {count} / {total}',
      select_category: 'Санатты таңдаңыз:',
      select_subgroup: 'Топшаны таңдаңыз:',
      page_indicator: '« {current} бет / {total} »',
      selected_instruments: 'Таңдалған: {count} / {total}',
      you_will_receive: 'Сіз келесі құралдар бойынша сигналдар аласыз:',
      and_more: 'және тағы {count} {plural}',
      total_selected: '*Барлығы таңдалған:* {count} / {total} {plural}',
    },
    groups: {
      forex: 'Валюталар',
      commodities: 'Тауарлар',
      crypto: 'Криптовалюталар',
      stocks: 'Акциялар',
      european: 'Еуропалық Акциялар',
      us: 'АҚШ Акциялары',
    },
    buttons: {
      select_all: '✅ Барлығын таңдау',
      clear_filters: '🗑️ Сүзгілерді тазалау',
      close: '❌ Жабу',
      select_all_group: '✅ Барлық топты таңдау',
      deselect_all: '🗑️ Таңдауды болдырмау',
      save: '💾 Сақтау',
      prev_page: '◀️ Алдыңғы',
      next_page: 'Келесі ▶️',
      back_to_menu: '◀️ Мәзірге оралу',
      select_all_stocks: '✅ Барлық акцияларды таңдау',
      select_all_subgroup: '✅ Барлық топшаны таңдау',
      back_to_stocks: '◀️ Акцияларға оралу',
      edit_filter: '✏️ Сүзгіді өзгерту',
      clear_filter: '🗑️ Сүзгіні тазалау',
      yes_clear: '✅ Иә, тазалау',
      cancel: '❌ Болдырмау',
    },
    messages: {
      filter_saved: '✅ *Сүзгі Сақталды!*',
      filter_cleared: '✅ *Сүзгі Тазаланды!*',
      settings_saved: 'Параметрлер сақталды',
      menu_closed: 'Мәзір жабылды',
    },
    confirmation: {
      title: '⚠️ *Растау*',
      clear_warning:
        'Барлық сүзгілерді тазалағыңыз келетініне сенімдісіз бе?\n\nТазалаудан кейін сіз барлық {count} құралдар бойынша сигналдар аласыз.',
      after_clear: 'Сіз барлық {count} құралдар бойынша сигналдар аласыз.',
    },
    plurals: {
      instruments: {
        one: 'құрал',
        few: 'құрал',
        many: 'құралдар',
        other: 'құралдар',
      },
    },
  },

  // Uzbek (complete)
  uz: {
    errors: {
      user_not_found: "Xato: foydalanuvchini aniqlab bo'lmadi",
      loading_failed:
        "Filtrlarni yuklashda xato yuz berdi. Keyinroq qayta urinib ko'ring.",
      session_expired:
        'Sessiya tugadi. Qayta kirish uchun /filter dan foydalaning.',
      unknown_action: "Noma'lum harakat",
      action_failed: 'Xato yuz berdi',
      saving_failed: 'Saqlashda xato',
      clearing_failed: 'Filtrlarni tozalashda xato',
    },
    ui: {
      filter_title: '🎯 *Vositalar Filtri*',
      current_status: 'Joriy holat:',
      all_instruments: '✅ Barcha vositalar ({count})',
      selected_count: '📊 Tanlangan: {count} / {total}',
      select_category: 'Kategoriyani tanlang:',
      select_subgroup: 'Kichik guruhni tanlang:',
      page_indicator: '« {current} sahifa / {total} »',
      selected_instruments: 'Tanlangan: {count} / {total}',
      you_will_receive: 'Siz quyidagi vositalar uchun signallar olasiz:',
      and_more: 'va yana {count} {plural}',
      total_selected: '*Jami tanlangan:* {count} / {total} {plural}',
    },
    groups: {
      forex: 'Valyutalar',
      commodities: 'Tovarlar',
      crypto: 'Kriptovalyutalar',
      stocks: 'Aksiyalar',
      european: 'Yevropa Aksiyalari',
      us: 'AQSh Aksiyalari',
    },
    buttons: {
      select_all: '✅ Hammasini tanlash',
      clear_filters: '🗑️ Filtrlarni tozalash',
      close: '❌ Yopish',
      select_all_group: '✅ Butun guruhni tanlash',
      deselect_all: '🗑️ Tanlovni bekor qilish',
      save: '💾 Saqlash',
      prev_page: '◀️ Oldingi',
      next_page: 'Keyingi ▶️',
      back_to_menu: '◀️ Menyuga qaytish',
      select_all_stocks: '✅ Barcha aksiyalarni tanlash',
      select_all_subgroup: '✅ Butun kichik guruhni tanlash',
      back_to_stocks: '◀️ Aksiyalarga qaytish',
      edit_filter: "✏️ Filtrni o'zgartirish",
      clear_filter: '🗑️ Filtrni tozalash',
      yes_clear: '✅ Ha, tozalash',
      cancel: '❌ Bekor qilish',
    },
    messages: {
      filter_saved: '✅ *Filtr Saqlandi!*',
      filter_cleared: '✅ *Filtr Tozalandi!*',
      settings_saved: 'Sozlamalar saqlandi',
      menu_closed: 'Menyu yopildi',
    },
    confirmation: {
      title: '⚠️ *Tasdiqlash*',
      clear_warning:
        'Barcha filtrlarni tozalashni xohlaysizmi?\n\nTozalashdan keyin siz barcha {count} vositalar uchun signallar olasiz.',
      after_clear: 'Siz barcha {count} vositalar uchun signallar olasiz.',
    },
    plurals: {
      instruments: {
        one: 'vosita',
        few: 'vositalar',
        many: 'vositalar',
        other: 'vositalar',
      },
    },
  },

  // Tajik (complete)
  tg: {
    errors: {
      user_not_found: 'Хато: истифодабарандаро муайян кардан натавонист',
      loading_failed:
        'Ҳангоми боркунии филтрҳо хато ба амал омад. Баъдтар кӯшиш кунед.',
      session_expired:
        'Ҷаласа анҷом ёфт. Барои воридшавии дубора /filter истифода баред.',
      unknown_action: 'Амали номаълум',
      action_failed: 'Хато ба амал омад',
      saving_failed: 'Хатои нигоҳдорӣ',
      clearing_failed: 'Хатои тозакунии филтрҳо',
    },
    ui: {
      filter_title: '🎯 *Филтри Асбобҳо*',
      current_status: 'Вазъи ҷорӣ:',
      all_instruments: '✅ Ҳамаи асбобҳо ({count})',
      selected_count: '📊 Интихобшуда: {count} аз {total}',
      select_category: 'Категорияро интихоб кунед:',
      select_subgroup: 'Зергурӯҳро интихоб кунед:',
      page_indicator: '« Саҳифаи {current} аз {total} »',
      selected_instruments: 'Интихобшуда: {count} аз {total}',
      you_will_receive: 'Шумо барои асбобҳои зерин сигналҳо мегиред:',
      and_more: 'ва боз {count} {plural}',
      total_selected: '*Ҳамагӣ интихобшуда:* {count} аз {total} {plural}',
    },
    groups: {
      forex: 'Асъорҳо',
      commodities: 'Молҳо',
      crypto: 'Криптоасъорҳо',
      stocks: 'Аксияҳо',
      european: 'Аксияҳои Аврупоӣ',
      us: 'Аксияҳои ИМА',
    },
    buttons: {
      select_all: '✅ Ҳамаро интихоб кунед',
      clear_filters: '🗑️ Филтрҳоро тоза кунед',
      close: '❌ Пӯшидан',
      select_all_group: '✅ Ҳамаи гурӯҳро интихоб кунед',
      deselect_all: '🗑️ Интихобро бекор кунед',
      save: '💾 Нигоҳ доштан',
      prev_page: '◀️ Қаблӣ',
      next_page: 'Оянда ▶️',
      back_to_menu: '◀️ Бозгашт ба меню',
      select_all_stocks: '✅ Ҳамаи аксияҳоро интихоб кунед',
      select_all_subgroup: '✅ Ҳамаи зергурӯҳро интихоб кунед',
      back_to_stocks: '◀️ Бозгашт ба аксияҳо',
      edit_filter: '✏️ Филтрро тағйир диҳед',
      clear_filter: '🗑️ Филтрро тоза кунед',
      yes_clear: '✅ Бале, тоза кунед',
      cancel: '❌ Бекор кардан',
    },
    messages: {
      filter_saved: '✅ *Филтр Нигоҳ Дошта Шуд!*',
      filter_cleared: '✅ *Филтр Тоза Карда Шуд!*',
      settings_saved: 'Танзимот нигоҳ дошта шуд',
      menu_closed: 'Меню пӯшида шуд',
    },
    confirmation: {
      title: '⚠️ *Тасдиқ*',
      clear_warning:
        'Шумо мутмаин ҳастед, ки мехоҳед ҳамаи филтрҳоро тоза кунед?\n\nПас аз тозакунӣ шумо барои ҳамаи {count} асбобҳо сигналҳо мегиред.',
      after_clear: 'Шумо барои ҳамаи {count} асбобҳо сигналҳо мегиред.',
    },
    plurals: {
      instruments: {
        one: 'асбоб',
        few: 'асбобҳо',
        many: 'асбобҳо',
        other: 'асбобҳо',
      },
    },
  },
};
