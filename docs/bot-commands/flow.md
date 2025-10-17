# Bot Commands Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram User                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ /start, /lang, /filter
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UserManagementMiddleware                       │
│  • Loads user from database                                     │
│  • Loads active subscriptions                                   │
│  • Loads feature flags via FeatureFlagService                   │
│  • Attaches UserContext                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BotUpdate                                │
│  • onStart() - Handles /start command                           │
│  • onLang() - Handles /lang command                             │
│  • onFilter() - Handles /filter command                         │
│  • onLangAction() - Handles language change callback            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌────────────────────┐              ┌──────────────────────┐
│    BotService      │              │ BotCommandsService   │
│  • onStart()       │              │  • setUserCommands() │
│  • onLang()        │              │  • buildCommands...()│
│  • activateCode()  │              │  • translate()       │
└────────┬───────────┘              └──────────────────────┘
         │                                     │
         │ Calls when code activated          │
         └─────────────────┬───────────────────┘
                           │
                           ▼
                 ┌──────────────────────┐
                 │ FeatureFlagService   │
                 │  • getUserFeatures() │
                 └──────────────────────┘
                           │
                           ▼
                 ┌──────────────────────┐
                 │  Telegram Bot API    │
                 │  • setMyCommands()   │
                 └──────────────────────┘
```

## Command Update Flow

### Scenario 1: User Starts Bot (No Code)

```
User sends: /start
    │
    ▼
UserManagementMiddleware
    │ Loads user with features: Set{}
    ▼
BotUpdate.onStart(ctx)
    │
    ├─▶ BotService.onStart(user) → Generate welcome message
    │
    └─▶ BotCommandsService.setUserCommands(userId, Set{}, 'en')
            │
            └─▶ Commands: [/start, /lang]
```

### Scenario 2: User Activates VIP Code

```
User sends: /start VIP123
    │
    ▼
UserManagementMiddleware
    │ Loads user with features: Set{}
    ▼
BotUpdate.onStart(ctx, args=['start', 'VIP123'])
    │
    ├─▶ BotService.onStart(user, 'VIP123')
    │       │
    │       ├─▶ activateCode('VIP123')
    │       │       └─▶ UserSubscriptionsRepository.activate()
    │       │
    │       └─▶ FeatureFlagService.getUserFeatures(userId)
    │               └─▶ Returns Set{CUSTOM_USER_FILTERING}
    │       │
    │       └─▶ BotCommandsService.setUserCommands(userId, Set{...}, 'en')
    │               └─▶ Commands: [/start, /lang, /filter]
    │
    └─▶ Skip BotCommandsService (already called in BotService)
```

### Scenario 3: User Changes Language

```
User clicks: 🇷🇺 Русский
    │
    ▼
BotUpdate.onLangAction(ctx, args=['/lang', 'ru'])
    │
    ├─▶ BotService.onLang(ctx, 'ru')
    │       └─▶ UsersRepository.update(userId, {lang: 'ru'})
    │
    └─▶ BotCommandsService.setUserCommands(userId, features, 'ru')
            └─▶ Commands: [
                  {command: 'start', description: 'Запустить бота...'},
                  {command: 'lang', description: 'Изменить язык...'},
                  {command: 'filter', description: 'Настроить фильтр...'}
                ]
```

## Feature Flag Decision Tree

```
User Feature Flags
    │
    ├─▶ Has CUSTOM_USER_FILTERING?
    │       │
    │       ├─▶ YES → Show [/start, /lang, /filter]
    │       │
    │       └─▶ NO → Show [/start, /lang]
    │
    └─▶ Future features can add more conditional commands
```

## Language Selection Matrix

```
┌──────────┬────────────────────────────────────────────────┐
│ Language │ Example /start description                     │
├──────────┼────────────────────────────────────────────────┤
│ ru       │ Запустить бота и увидеть информацию о подписке │
│ en       │ Start the bot and view subscription information│
│ uk       │ Запустити бота і переглянути інформацію...    │
│ hi       │ बॉट शुरू करें और सदस्यता जानकारी देखें        │
│ fr       │ Démarrer le bot et voir les informations...   │
│ kk       │ Ботты іске қосу және жазылым туралы...         │
│ uz       │ Botni ishga tushirish va obuna ma'lumotlarini..│
│ tg       │ Ботро оғоз кардан ва маълумоти обуна           │
└──────────┴────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│   Database  │
│             │
│ ┌─────────┐ │     ┌──────────────────┐
│ │  Users  │─┼────▶│ UserManagement   │
│ └─────────┘ │     │   Middleware     │
│             │     └────────┬─────────┘
│ ┌─────────┐ │              │
│ │UserSubs │─┼──────────────┤
│ └─────────┘ │              │
│             │              ▼
│ ┌─────────┐ │     ┌──────────────────┐
│ │SubFeatu │─┼────▶│ FeatureFlagSvc   │
│ └─────────┘ │     └────────┬─────────┘
└─────────────┘              │
                             ▼
                    ┌──────────────────┐
                    │ BotCommandsSvc   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Telegram API    │
                    │  setMyCommands   │
                    └──────────────────┘
```

## Error Handling Flow

```
BotCommandsService.setUserCommands()
    │
    ├─▶ Try to set commands
    │       │
    │       ├─▶ SUCCESS → Log debug message
    │       │              Continue bot flow
    │       │
    │       └─▶ ERROR → Log error
    │                   DON'T throw exception
    │                   Continue bot flow
    │                   (User can still use commands manually)
    │
    └─▶ Return (void)
```

## Performance Characteristics

```
Request Type          │ Commands Updated? │ Reason
──────────────────────┼───────────────────┼────────────────────
/start (no code)      │ ✅ YES            │ Initial setup
/start (with code)    │ ✅ YES            │ Features changed
/lang change          │ ✅ YES            │ Language changed
/filter               │ ❌ NO             │ No changes needed
Regular message       │ ❌ NO             │ Not in middleware
Callback query        │ Conditional       │ Only for /lang
```

## Summary

The bot commands menu system provides:
- ✅ Personalized commands per user
- ✅ Feature-based command visibility
- ✅ Multi-language support (8 languages)
- ✅ Automatic updates on relevant events
- ✅ Graceful error handling
- ✅ Performance optimization (no redundant updates)
