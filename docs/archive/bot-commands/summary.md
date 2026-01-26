# Bot Commands Menu Implementation Summary

## What Was Implemented

A personalized bot commands menu system that:
- Shows commands based on user's subscription level and feature flags
- Automatically localizes command descriptions to user's language
- Updates dynamically when user changes language or activates subscriptions

## Files Created

### 1. BotCommandsService
**Path**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\services\bot-commands.service.ts`

Core service that manages the bot's command menu:
- `setUserCommands()`: Sets personalized commands for a user
- `buildCommandsForUser()`: Builds command list based on features
- `translate()`: Translates command descriptions to user's language

**Command translations** included for 8 languages:
- Russian, English, Ukrainian, Hindi, French, Kazakh, Uzbek, Tajik

## Files Modified

### 1. BotModule
**Path**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.module.ts`

- Added `BotCommandsService` to providers and exports

### 2. BotUpdate
**Path**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.update.ts`

- Injected `BotCommandsService` into constructor
- Updated `onStart()`: Sets commands when user starts bot (without activation code)
- Updated `onLangAction()`: Refreshes commands when user changes language

### 3. BotService
**Path**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.service.ts`

- Injected `BotCommandsService` and `FeatureFlagService`
- Updated `onStart()`: Refreshes commands after subscription code activation

## Command Visibility Matrix

| Command | Always Visible | Requires Feature | Feature Flag |
|---------|---------------|------------------|--------------|
| `/start` | ✅ Yes | ❌ No | - |
| `/lang` | ✅ Yes | ❌ No | - |
| `/filter` | ❌ No | ✅ Yes | `CUSTOM_USER_FILTERING` |

## When Commands Update

1. **On `/start` without code**: Commands set with current features
2. **On `/start` with activation code**: Commands set after code activation (with new features)
3. **On language change**: Commands refreshed with new language
4. **Automatic**: NOT updated on every request (performance optimization)

## How It Works

### User Journey Example 1: New User
1. User sends `/start`
2. Middleware loads user with basic features (empty set)
3. `BotUpdate.onStart()` calls `BotService.onStart()`
4. `BotUpdate.onStart()` sets commands: `/start`, `/lang` (no `/filter`)
5. User sees 2 commands in menu

### User Journey Example 2: Code Activation
1. User sends `/start ABC123` (activation code)
2. Middleware loads user with current features
3. `BotUpdate.onStart()` calls `BotService.onStart(user, 'ABC123')`
4. `BotService.onStart()` activates code → user gets VIP subscription
5. `BotService.onStart()` loads new features → includes `CUSTOM_USER_FILTERING`
6. `BotService.onStart()` updates commands with new features
7. User sees 3 commands: `/start`, `/lang`, `/filter`

### User Journey Example 3: Language Change
1. User taps language button (e.g., 🇷🇺 Русский)
2. `BotUpdate.onLangAction()` calls `BotService.onLang()` → updates language in DB
3. `BotUpdate.onLangAction()` refreshes commands with new language (`ru`)
4. User sees same commands but with Russian descriptions

## Technical Details

### Telegram API Usage
```typescript
bot.telegram.setMyCommands(commands, {
  scope: { type: 'chat', chat_id: userId },  // User-specific
  language_code: lang,                        // Localized
});
```

### Advantages
- **Personalization**: Each user sees only their commands
- **Localization**: Descriptions in user's language
- **Feature-based**: Commands adapt to subscription level
- **Non-blocking**: Failures don't break bot functionality

### Performance
- Commands NOT set on every request (would be ~100 API calls/second)
- Only updated when necessary (start, lang change, subscription change)
- Errors are logged but don't break bot flow

## Testing Checklist

- [x] Project builds successfully (`pnpm run build`)
- [x] Linter passes (`pnpm run lint`)
- [ ] Manual test: `/start` shows basic commands
- [ ] Manual test: Activate VIP code, verify `/filter` appears
- [ ] Manual test: Change language, verify descriptions update
- [ ] Manual test: Commands persist across sessions

## Future Enhancements

1. **Caching**: Cache commands per user to reduce API calls
2. **More commands**: Add conditional commands for new features
3. **Group support**: Different commands for groups vs private chats
4. **Admin commands**: Special commands for bot administrators
5. **Analytics**: Track command usage statistics
