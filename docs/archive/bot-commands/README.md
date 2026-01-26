# Bot Commands Menu - Quick Start

## What is This?

A personalized commands menu system for the Telegram bot that shows users only the commands they have access to based on their subscription level.

## Visual Example

### Basic User (No Subscription)
When user opens command menu (`/` button):
```
/start - Start the bot and view subscription information
/lang - Change interface language
```

### VIP User (With CUSTOM_USER_FILTERING Feature)
When user opens command menu (`/` button):
```
/start - Start the bot and view subscription information
/lang - Change interface language
/filter - Configure trading instrument filters
```

### Russian User
When user opens command menu (`/` button):
```
/start - Запустить бота и увидеть информацию о подписке
/lang - Изменить язык интерфейса
/filter - Настроить фильтр торговых инструментов
```

## How It Works

1. **User starts bot** → System loads user's features → Sets appropriate commands
2. **User activates VIP code** → System adds VIP features → Updates commands to include `/filter`
3. **User changes language** → System updates command descriptions to new language

## Key Features

- ✅ **Personalized**: Each user sees only their commands
- ✅ **Localized**: Command descriptions in 8 languages
- ✅ **Dynamic**: Updates automatically when features change
- ✅ **Resilient**: Failures don't break bot functionality

## Quick Reference

### Commands by Feature

| Command | Always Shown | Requires Feature |
|---------|-------------|------------------|
| `/start` | ✅ | - |
| `/lang` | ✅ | - |
| `/filter` | ❌ | CUSTOM_USER_FILTERING |

### Supported Languages

🇷🇺 Russian • 🇬🇧 English • 🇺🇦 Ukrainian • 🇮🇳 Hindi • 🇫🇷 French • 🇰🇿 Kazakh • 🇺🇿 Uzbek • 🇹🇯 Tajik

## Files Changed

```
Modified:
  libs/bot/src/bot.module.ts         - Added BotCommandsService
  libs/bot/src/bot.update.ts         - Set commands on /start and /lang
  libs/bot/src/bot.service.ts        - Set commands after code activation

Created:
  libs/bot/src/services/bot-commands.service.ts  - Main service
```

## Testing

```bash
# Build and verify
pnpm run build
pnpm run lint

# Manual test
1. Start bot: /start
2. Check menu: Tap "/" button → Should see /start and /lang
3. Activate VIP: /start VIP123 → Menu should now show /filter
4. Change language: /lang → Select 🇷🇺 → Descriptions should be in Russian
```

## Documentation

- 📘 **Full Documentation**: [menu.md](./menu.md)
- 📊 **Flow Diagrams**: [flow.md](./flow.md)
- 💡 **Usage Examples**: [examples.md](./examples.md)
- 📋 **Implementation Summary**: [implementation-summary.md](./implementation-summary.md)

## Need Help?

- Commands not showing? Check [Troubleshooting](./examples.md#troubleshooting)
- Want to add a command? See [Adding New Commands](./examples.md#adding-new-commands)
- Architecture questions? Read [Full Documentation](./menu.md)
