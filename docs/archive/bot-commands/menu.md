# Bot Commands Menu

## Overview

The bot implements a personalized commands menu system that displays available commands to users based on their subscription level and enabled feature flags. The menu is automatically localized to the user's preferred language.

## Architecture

### BotCommandsService

**Location**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\services\bot-commands.service.ts`

The `BotCommandsService` is responsible for managing the bot's command menu. It:

- Sets personalized commands for each user using Telegram's `setMyCommands` API
- Filters commands based on user's enabled feature flags
- Translates command descriptions to user's language
- Provides graceful error handling (menu failures don't break bot functionality)

### Command Visibility Rules

| Command | Visibility | Feature Required |
|---------|-----------|------------------|
| `/start` | Always visible | None |
| `/lang` | Always visible | None |
| `/filter` | Conditional | `CUSTOM_USER_FILTERING` |

## Supported Languages

The system supports command descriptions in 8 languages:

- 🇷🇺 Russian (`ru`)
- 🇬🇧 English (`en`)
- 🇺🇦 Ukrainian (`uk`)
- 🇮🇳 Hindi (`hi`)
- 🇫🇷 French (`fr`)
- 🇰🇿 Kazakh (`kk`)
- 🇺🇿 Uzbek (`uz`)
- 🇹🇯 Tajik (`tg`)

## When Commands Are Updated

The commands menu is automatically refreshed in the following scenarios:

### 1. On `/start` command
When a user runs `/start`, the menu is set based on their current features and language.

**Location**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.update.ts` (line 55)

```typescript
await this.botCommandsService.setUserCommands(
  user.telegramId,
  user.enabledFeatures,
  user.lang ?? 'en',
);
```

### 2. On language change
When a user changes their language via `/lang`, the menu is refreshed with the new language.

**Location**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.update.ts` (line 109)

```typescript
await this.botCommandsService.setUserCommands(
  ctx.user.telegramId,
  ctx.user.enabledFeatures,
  code,
);
```

### 3. On subscription activation
When a user activates a subscription code, the menu is updated to reflect new features.

**Location**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.service.ts` (line 54)

```typescript
if (activationResult.activatedSubscription) {
  const { enabledFeatures } = await this.featureFlagService.getUserFeatures(
    user.telegramId,
  );

  await this.botCommandsService.setUserCommands(
    user.telegramId,
    enabledFeatures,
    user.lang ?? 'en',
  );
}
```

## Telegram Bot API Integration

The service uses Telegram's `setMyCommands` method with the following parameters:

```typescript
await this.bot.telegram.setMyCommands(commands, {
  scope: { type: 'chat', chat_id: userId },  // User-specific commands
  language_code: lang,                        // Localized descriptions
});
```

This approach provides:
- **Personalization**: Each user sees only commands they have access to
- **Localization**: Command descriptions are in the user's language
- **No overlap**: Commands are scoped to specific users, not global

## Adding New Commands

To add a new command to the menu:

### 1. Add translations

Update `COMMAND_TRANSLATIONS` in `bot-commands.service.ts`:

```typescript
const COMMAND_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Existing commands...

  newcommand: {
    ru: 'Описание команды на русском',
    en: 'Command description in English',
    uk: 'Опис команди українською',
    hi: 'हिंदी में कमांड विवरण',
    fr: 'Description de la commande en français',
    kk: 'Команданың сипаттамасы қазақша',
    uz: 'Buyruq tavsifi o\'zbekcha',
    tg: 'Тавсифи фармон бо тоҷикӣ',
  },
};
```

### 2. Add command to builder method

Update `buildCommandsForUser` method:

```typescript
private buildCommandsForUser(
  enabledFeatures: Set<FeatureFlag>,
  lang: string,
): BotCommand[] {
  const commands: BotCommand[] = [
    // Existing commands...
  ];

  // Add conditional command
  if (enabledFeatures.has(FeatureFlag.SOME_FEATURE)) {
    commands.push({
      command: 'newcommand',
      description: this.translate('newcommand', lang),
    });
  }

  return commands;
}
```

### 3. Implement command handler

Add the handler in `bot.update.ts`:

```typescript
@Command('newcommand')
async onNewCommand(@Ctx() ctx: UserContext): Promise<void> {
  // Implementation
}
```

## Performance Considerations

### Optimization Strategy

Commands are only updated when necessary:
- ✅ On `/start` (initial setup or explicit refresh)
- ✅ On language change
- ✅ On subscription activation (feature flags change)
- ❌ Not on every request (would be inefficient)

### Error Handling

The service includes graceful error handling:
- Failed command updates are logged but don't break bot functionality
- Commands menu is considered a UX enhancement, not critical functionality
- If setting commands fails, users can still use commands directly

## Testing

To test the commands menu:

1. **Basic Test**: Start the bot with `/start` and check the menu (tap "/" button)
2. **Feature Test**: Activate a VIP subscription and verify `/filter` command appears
3. **Language Test**: Change language with `/lang` and verify descriptions update
4. **Subscription Test**: Activate a code and verify menu refreshes

## Related Files

- **Service**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\services\bot-commands.service.ts`
- **Update Handler**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.update.ts`
- **Bot Service**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.service.ts`
- **Module**: `D:\git\github\tg-bots\quantum-deal\libs\bot\src\bot.module.ts`
- **Feature Flags**: `D:\git\github\tg-bots\quantum-deal\libs\db\src\schema\subscription-features.ts`

## Future Enhancements

Potential improvements:
- Cache commands per user to reduce API calls
- Add more conditional commands based on new features
- Support for group-specific commands (using different scope types)
- Admin-only commands with special scope
