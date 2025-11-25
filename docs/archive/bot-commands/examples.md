# Bot Commands - Usage Examples

## Table of Contents
1. [Basic Usage](#basic-usage)
2. [Adding New Commands](#adding-new-commands)
3. [Testing Examples](#testing-examples)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting](#troubleshooting)

## Basic Usage

### Setting Commands for a User

```typescript
// In any service or handler where you have access to BotCommandsService

@Injectable()
export class YourService {
  constructor(
    private readonly botCommandsService: BotCommandsService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async updateUserCommands(userId: number, lang: string): Promise<void> {
    // Get user's current features
    const { enabledFeatures } = await this.featureFlagService.getUserFeatures(userId);

    // Set personalized commands
    await this.botCommandsService.setUserCommands(userId, enabledFeatures, lang);
  }
}
```

### Checking Available Commands in Context

```typescript
@Command('somecommand')
async onSomeCommand(@Ctx() ctx: UserContext): Promise<void> {
  const user = ctx.user;

  if (!user) {
    await ctx.reply('Please start the bot first with /start');
    return;
  }

  // Check if user has the required feature
  if (!user.enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)) {
    await ctx.reply('This command requires VIP subscription');
    return;
  }

  // User has access, proceed with command logic
  // ...
}
```

## Adding New Commands

### Example 1: Simple Command (Always Visible)

Let's add a `/help` command that's visible to all users.

#### Step 1: Add translations

```typescript
// In bot-commands.service.ts
const COMMAND_TRANSLATIONS: Record<string, Record<string, string>> = {
  // ... existing commands

  help: {
    ru: 'Показать справку по командам',
    en: 'Show help about commands',
    uk: 'Показати довідку по командах',
    hi: 'कमांड्स के बारे में मदद दिखाएं',
    fr: 'Afficher l\'aide sur les commandes',
    kk: 'Командалар туралы анықтаманы көрсету',
    uz: 'Buyruqlar haqida yordam ko\'rsatish',
    tg: 'Намоиши кӯмак дар бораи фармонҳо',
  },
};
```

#### Step 2: Add to command builder

```typescript
// In bot-commands.service.ts
private buildCommandsForUser(
  enabledFeatures: Set<FeatureFlag>,
  lang: string,
): BotCommand[] {
  const commands: BotCommand[] = [
    {
      command: 'start',
      description: this.translate('start', lang),
    },
    {
      command: 'lang',
      description: this.translate('lang', lang),
    },
    {
      command: 'help',  // ← Add this
      description: this.translate('help', lang),
    },
  ];

  // Conditional commands...
  if (enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)) {
    commands.push({
      command: 'filter',
      description: this.translate('filter', lang),
    });
  }

  return commands;
}
```

#### Step 3: Implement handler

```typescript
// In bot.update.ts
@Command('help')
async onHelp(@Ctx() ctx: UserContext): Promise<void> {
  if (!ctx.user) {
    await ctx.reply('Please start the bot first with /start');
    return;
  }

  const helpMessage = this.buildHelpMessage(ctx.user);
  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

private buildHelpMessage(user: UserWithSubscriptions): string {
  let message = '📚 *Available Commands*\n\n';
  message += '/start - Start the bot\n';
  message += '/lang - Change language\n';
  message += '/help - Show this help\n';

  if (user.enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)) {
    message += '/filter - Configure trading instruments\n';
  }

  return message;
}
```

### Example 2: Feature-Gated Command

Let's add a `/premium` command only for users with a specific feature.

#### Step 1: Add new feature flag (if needed)

```typescript
// In libs/db/src/schema/subscription-features.ts
export enum FeatureFlag {
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
  PREMIUM_ANALYTICS = 'premium_analytics',  // ← New feature
}
```

#### Step 2: Add translations

```typescript
// In bot-commands.service.ts
const COMMAND_TRANSLATIONS: Record<string, Record<string, string>> = {
  // ... existing commands

  premium: {
    ru: 'Премиум аналитика и статистика',
    en: 'Premium analytics and statistics',
    uk: 'Преміум аналітика та статистика',
    hi: 'प्रीमियम विश्लेषण और आंकड़े',
    fr: 'Analytique et statistiques premium',
    kk: 'Премиум аналитика және статистика',
    uz: 'Premium analitika va statistika',
    tg: 'Аналитикаи премиум ва омор',
  },
};
```

#### Step 3: Add conditional command

```typescript
// In bot-commands.service.ts
private buildCommandsForUser(
  enabledFeatures: Set<FeatureFlag>,
  lang: string,
): BotCommand[] {
  const commands: BotCommand[] = [
    // ... basic commands
  ];

  // Filter command
  if (enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)) {
    commands.push({
      command: 'filter',
      description: this.translate('filter', lang),
    });
  }

  // Premium command - only for premium users
  if (enabledFeatures.has(FeatureFlag.PREMIUM_ANALYTICS)) {
    commands.push({
      command: 'premium',
      description: this.translate('premium', lang),
    });
  }

  return commands;
}
```

#### Step 4: Implement handler with guard

```typescript
// In bot.update.ts
@Command('premium')
async onPremium(@Ctx() ctx: UserContext): Promise<void> {
  const user = ctx.user;

  if (!user) {
    await ctx.reply('Please start the bot first with /start');
    return;
  }

  // Double-check feature flag (defense in depth)
  if (!user.enabledFeatures.has(FeatureFlag.PREMIUM_ANALYTICS)) {
    await ctx.reply('This command requires Premium subscription.');
    return;
  }

  // Show premium analytics
  const analytics = await this.analyticsService.getPremiumAnalytics(user.telegramId);
  await ctx.reply(analytics, { parse_mode: 'Markdown' });
}
```

## Testing Examples

### Manual Testing Script

```bash
# 1. Start bot as basic user
# Expected: See /start and /lang commands only
/start

# 2. Activate VIP code
# Expected: See /start, /lang, and /filter commands
/start VIP_CODE_123

# 3. Change language to Russian
# Expected: See same commands with Russian descriptions
# Tap 🇷🇺 Русский button

# 4. Use filter command
# Expected: Enter filter scene
/filter

# 5. Change language back to English
# Expected: Commands update to English
/lang
# Tap 🇬🇧 English button
```

### Automated Testing (Jest)

```typescript
// bot-commands.service.spec.ts
describe('BotCommandsService', () => {
  let service: BotCommandsService;
  let bot: Telegraf<UserContext>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BotCommandsService,
        {
          provide: 'BotQuantumDealBot',
          useValue: {
            telegram: {
              setMyCommands: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BotCommandsService>(BotCommandsService);
    bot = module.get<Telegraf<UserContext>>('BotQuantumDealBot');
  });

  it('should set basic commands for user without features', async () => {
    const userId = 12345;
    const features = new Set<FeatureFlag>();
    const lang = 'en';

    await service.setUserCommands(userId, features, lang);

    expect(bot.telegram.setMyCommands).toHaveBeenCalledWith(
      [
        { command: 'start', description: expect.any(String) },
        { command: 'lang', description: expect.any(String) },
      ],
      {
        scope: { type: 'chat', chat_id: userId },
        language_code: lang,
      },
    );
  });

  it('should include filter command for users with CUSTOM_USER_FILTERING', async () => {
    const userId = 12345;
    const features = new Set([FeatureFlag.CUSTOM_USER_FILTERING]);
    const lang = 'en';

    await service.setUserCommands(userId, features, lang);

    expect(bot.telegram.setMyCommands).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ command: 'filter' }),
      ]),
      expect.any(Object),
    );
  });

  it('should use Russian translations for ru language', async () => {
    const userId = 12345;
    const features = new Set<FeatureFlag>();
    const lang = 'ru';

    await service.setUserCommands(userId, features, lang);

    const calls = (bot.telegram.setMyCommands as jest.Mock).mock.calls;
    const commands = calls[0][0];

    expect(commands[0].description).toContain('Запустить');
    expect(commands[1].description).toContain('Изменить');
  });
});
```

## Common Patterns

### Pattern 1: Refresh Commands After Feature Change

```typescript
// In subscription activation service
async activateSubscription(userId: number, subscriptionId: number): Promise<void> {
  // Activate subscription in database
  await this.subscriptionsRepository.activate(userId, subscriptionId);

  // Reload user features
  const { enabledFeatures } = await this.featureFlagService.getUserFeatures(userId);

  // Get user language
  const user = await this.usersRepository.findByTelegramId(userId);

  // Refresh commands menu
  await this.botCommandsService.setUserCommands(
    userId,
    enabledFeatures,
    user.lang ?? 'en',
  );
}
```

### Pattern 2: Set Default Commands for New Users

```typescript
// In user creation logic
async createUser(telegramUser: TelegramUser): Promise<User> {
  const user = await this.usersRepository.create({
    telegramId: telegramUser.id,
    username: telegramUser.username,
    lang: telegramUser.language_code || 'en',
    // ...
  });

  // Set initial commands (basic commands only)
  await this.botCommandsService.setUserCommands(
    user.telegramId,
    new Set(), // No features yet
    user.lang ?? 'en',
  );

  return user;
}
```

### Pattern 3: Bulk Update Commands

```typescript
// Admin tool to refresh commands for all users
async refreshAllUserCommands(): Promise<void> {
  const users = await this.usersRepository.findAll();

  for (const user of users) {
    try {
      const { enabledFeatures } = await this.featureFlagService.getUserFeatures(
        user.telegramId,
      );

      await this.botCommandsService.setUserCommands(
        user.telegramId,
        enabledFeatures,
        user.lang ?? 'en',
      );

      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      this.logger.error(`Failed to update commands for user ${user.telegramId}`, error);
    }
  }
}
```

## Troubleshooting

### Issue: Commands not showing in Telegram

**Possible causes:**
1. Telegram client cache (clear app data)
2. API call failed silently (check logs)
3. Commands set for wrong scope/language

**Solution:**
```typescript
// Add verbose logging
this.logger.debug(`Setting commands for user ${userId}`, {
  features: Array.from(enabledFeatures),
  lang,
  commandCount: commands.length,
});
```

### Issue: Old commands still visible after feature removal

**Cause:** Commands are cached by Telegram

**Solution:**
```typescript
// Explicitly refresh commands when feature is removed
await this.botCommandsService.setUserCommands(userId, newFeatures, lang);

// Or delete all commands (rare case)
await bot.telegram.deleteMyCommands({
  scope: { type: 'chat', chat_id: userId },
});
```

### Issue: Wrong language in command descriptions

**Cause:** User's language not properly detected or updated

**Solution:**
```typescript
// Always use latest language from context
const currentLang = ctx.user?.lang ?? ctx.from?.language_code ?? 'en';
await this.botCommandsService.setUserCommands(
  userId,
  features,
  currentLang,
);
```

### Issue: Rate limiting from Telegram API

**Cause:** Too many `setMyCommands` calls

**Solution:**
```typescript
// Implement rate limiting
private readonly commandUpdateQueue = new Map<number, NodeJS.Timeout>();

async setUserCommandsThrottled(
  userId: number,
  features: Set<FeatureFlag>,
  lang: string,
): Promise<void> {
  // Cancel pending update for this user
  const pending = this.commandUpdateQueue.get(userId);
  if (pending) {
    clearTimeout(pending);
  }

  // Schedule new update with delay
  const timeout = setTimeout(async () => {
    await this.botCommandsService.setUserCommands(userId, features, lang);
    this.commandUpdateQueue.delete(userId);
  }, 1000); // 1 second delay

  this.commandUpdateQueue.set(userId, timeout);
}
```

## Advanced Examples

### Example: Dynamic Commands Based on Time

```typescript
private buildCommandsForUser(
  enabledFeatures: Set<FeatureFlag>,
  lang: string,
): BotCommand[] {
  const commands: BotCommand[] = [/* basic commands */];

  // Add time-sensitive command (e.g., daily report only during business hours)
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 17) {
    commands.push({
      command: 'report',
      description: this.translate('report', lang),
    });
  }

  return commands;
}
```

### Example: Role-Based Commands

```typescript
// If you add roles in the future
private buildCommandsForUser(
  enabledFeatures: Set<FeatureFlag>,
  lang: string,
  roles?: string[],
): BotCommand[] {
  const commands: BotCommand[] = [/* basic commands */];

  // Admin-only commands
  if (roles?.includes('admin')) {
    commands.push({
      command: 'admin',
      description: this.translate('admin', lang),
    });
  }

  return commands;
}
```
