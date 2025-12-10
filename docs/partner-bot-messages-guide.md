# Partner Bot Messages Guide

Руководство по настройке текстов партнерского бота.

## Поток пользователя и сообщения

```
┌─────────────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ НАЖИМАЕТ /start                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  partner_welcome                                                 │
│  ─────────────────                                               │
│  Главное приветственное сообщение с призывом подписаться         │
│  на партнерский канал                                            │
│                                                                  │
│  Кнопки:                                                         │
│  • [button_i_subscribed] - "Я подписался! Активировать"          │
│  • [button_change_language] - "Язык"                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌───────────────────────────────┐
        │ Нажал "Язык"      │   │ Нажал "Я подписался"          │
        └───────────────────┘   └───────────────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│  lang_select_prompt       │   │  Проверка подписки на канал   │
│  ─────────────────────    │   └───────────────────────────────┘
│  "Выберите язык:"         │               │
│                           │       ┌───────┴───────┐
│  Кнопки с флагами языков  │       │               │
└───────────────────────────┘       ▼               ▼
                │             ┌─────────────┐ ┌─────────────────────┐
                ▼             │ НЕ подписан │ │ ПОДПИСАН            │
┌───────────────────────────┐ └─────────────┘ └─────────────────────┘
│  lang_changed             │       │               │
│  ───────────────          │       ▼               ▼
│  "✅ Русский выбран."     │  ┌─────────────┐ ┌─────────────────────┐
│                           │  │ partner_    │ │ partner_trial_      │
│  (возврат к welcome)      │  │ verification│ │ activated           │
└───────────────────────────┘  │ _failed     │ │ ─────────────────── │
                               │ ─────────── │ │ "Триал активирован!"│
                               │ "Проверка   │ │                     │
                               │ не пройдена"│ │ Плейсхолдеры:       │
                               │             │ │ • {daysRemaining}   │
                               │ Кнопка:     │ │ • {expiryDate}      │
                               │ [button_    │ └─────────────────────┘
                               │ try_again]  │
                               └─────────────┘


```

---

## Полный список сообщений

### Основные сообщения

| Ключ (`type`) | Где используется | Плейсхолдеры |
|---------------|------------------|--------------|
| `partner_welcome` | При нажатии `/start` - главное приветствие | `{channelUrl}` - ссылка на партнерский канал |
| `partner_welcome_lang` | Добавляется к приветствию - подсказка о смене языка | — |
| `partner_channel_prompt` | Повторный запрос подписки на канал (редко используется) | `{channelUrl}` |
| `partner_verification_failed` | Пользователь не подписан на канал | `{channelName}`, `{channelUrl}` |
| `partner_trial_activated` | Успешная активация триала | `{daysRemaining}`, `{expiryDate}` |
| `partner_trial_expired` | Триал истёк | `{expiryDate}` |

### Языковые сообщения

| Ключ (`type`) | Где используется |
|---------------|------------------|
| `lang_select_prompt` | Заголовок при выборе языка |
| `lang_changed` | Подтверждение смены языка |

### Кнопки

| Ключ (`type`) | Где используется |
|---------------|------------------|
| `button_change_language` | Кнопка смены языка в приветствии |
| `button_i_subscribed` | Кнопка подтверждения подписки на канал |
| `button_try_again` | Кнопка повторной проверки подписки |
| `button_extend_trial` | Кнопка продления триала (в сигналах и при истечении) |
| `button_buy_subscription` | Кнопка покупки подписки |

### Сообщения отчётов

| Ключ (`type`) | Где используется | Плейсхолдеры |
|---------------|------------------|--------------|
| `monthly_report` | Месячный отчёт подписчикам | `{TotalOrders}`, `{TotalProfit}`, `{BestSymbol_1}`, `{BestSymbol_2}`, `{BestSymbol_3}`, `{BestSymbol}`, `{BestTradeProfit}` |
| `daily_report` | Ежедневный отчёт подписчикам | `{TotalOrders}`, `{TotalProfit}`, `{BestSymbol}`, `{BestTradeProfit}` |

---

## Плейсхолдеры

Плейсхолдеры автоматически заменяются на реальные значения:

| Плейсхолдер | Описание | Пример |
|-------------|----------|--------|
| `{channelUrl}` | Ссылка на партнерский канал | `https://t.me/your_channel` |
| `{channelName}` | Название канала | `@your_channel` |
| `{daysRemaining}` | Осталось дней триала | `7` |
| `{expiryDate}` | Дата окончания триала | `25.12.2024` |

### Плейсхолдеры отчётов

| Плейсхолдер | Описание | Пример |
|-------------|----------|--------|
| `{TotalOrders}` | Общее количество сделок за период | `156` |
| `{TotalProfit}` | Общая прибыль/убыток | `+1234.56` или `-50.00` |
| `{BestSymbol_1}` | Самый прибыльный символ #1 | `EURUSD` |
| `{BestSymbol_2}` | Самый прибыльный символ #2 | `GBPUSD` |
| `{BestSymbol_3}` | Самый прибыльный символ #3 | `XAUUSD` |
| `{BestSymbol}` | Лучший символ (один) | `EURUSD` |
| `{BestTradeProfit}` | Прибыль лучшего символа | `567.89` |

> **Примечание**: `BestSymbol_1/2/3` сортируются по **суммарной прибыли** по символу, а не по количеству сделок.

---

## HTML-форматирование

Поддерживаемые теги:

| Тег | Результат |
|-----|-----------|
| `<b>текст</b>` | **жирный** |
| `<i>текст</i>` | *курсив* |
| `<u>текст</u>` | подчёркнутый |
| `<s>текст</s>` | ~~зачёркнутый~~ |
| `<code>текст</code>` | `моноширинный` |

## Текущие тексты (English) - Референс

Используйте эти тексты как основу для своих переводов.

### `partner_welcome`
```
👋 <b>Welcome to the Inner Circle!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive high-win-rate signals
✅ Access exclusive market insights
✅ Join a community of winners

<b>Activate your FREE trial now to start profiting!</b> 👇

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

👇 <b>Click the button below once you've joined:</b>

```

### `partner_welcome_lang`
```

Also, if you want to <b>change the language</b>, click this button 👇
```

### `partner_channel_prompt`
```
🚀 <b>One Final Step to Profit!</b>

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

<i>Join now to unlock the full potential of our trading signals.</i>

👇 <b>Click the button below once you've joined:</b>
```

### `partner_verification_failed`
```
⚠️ <b>Verification Incomplete</b>

We couldn't verify your membership yet. Don't miss out on profitable opportunities! 💸

Please make sure you have joined <b>{channelName}</b>:
👉 {channelUrl}

<i>Once you join, try clicking the button again!</i>
```

### `partner_trial_activated`
```
✅ <b>Success! Trial Activated</b>

You now have <b>{daysRemaining} days</b> of full access until {expiryDate}.

🔥 <b>You're all set!</b> Premium signals will now flow directly into this chat. Get ready for your next winning trade! 💸

Enjoy! 🎉
```

### `partner_trial_expired`
```
⌛ <b>Trial Period Expired</b>

Your free access ended on {expiryDate}. You are now missing out on:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Exclusive Trading Strategies

<b>Don't leave money on the table!</b> 📉

Renew your subscription NOW to restore full access immediately! 👇
```

### `lang_select_prompt`
```
🌐 <b>Choose Language:</b>
```

### `lang_changed`
```
✅ <b>English selected.</b>
```

### Кнопки (Buttons)

| Ключ | Текст |
|------|-------|
| `button_change_language` | 🌐 Language |
| `button_i_subscribed` | ✅ I Joined! Activate Trial 🚀 |
| `button_try_again` | 🔄 Try Again |
| `button_extend_trial` | 🎁 Extend Free Period |
| `button_buy_subscription` | 💳 Buy Subscription |

