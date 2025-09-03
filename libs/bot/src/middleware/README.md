# User Management Middleware

This middleware provides automatic user management for the Telegram bot using the NestJS-Telegraf integration.

## Features

- **Automatic User Detection**: Checks if a Telegram user exists in the database
- **User Creation**: Creates new users automatically if they don't exist
- **User Updates**: Updates user information when Telegram data changes
- **Context Enhancement**: Attaches the user object to the Telegraf context
- **Error Handling**: Graceful error handling that doesn't break bot functionality
- **TypeScript Support**: Full TypeScript support with proper typing

## Usage

### 1. Basic Usage in Update Handlers

```typescript
import { Injectable } from '@nestjs/common';
import { Ctx, Start, Update } from 'nestjs-telegraf';
import { UserContext, UserManagementMiddleware } from '@quantumdeal/bot';

@Update()
export class MyBotUpdate {
  constructor(
    private readonly userMiddleware: UserManagementMiddleware,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: UserContext): Promise<void> {
    // Apply middleware
    await this.userMiddleware.use(ctx, async () => {
      // User is now available in ctx.user
      const { user } = ctx;
      
      await ctx.reply(`Welcome ${user.firstName || user.username}!`);
    });
  }
}
```

### 2. Global Middleware Registration

For better performance when all handlers need user context, register the middleware globally:

```typescript
import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { UserManagementMiddleware } from '@quantumdeal/bot';

@Injectable()
export class BotConfigService {
  constructor(
    private readonly userMiddleware: UserManagementMiddleware,
  ) {}

  configureBot(bot: Telegraf) {
    // Register middleware globally
    bot.use((ctx, next) => this.userMiddleware.use(ctx, next));
  }
}
```

### 3. Using UserContext Type

Always use the `UserContext` type instead of the base `Context` to get proper TypeScript support:

```typescript
import { UserContext } from '@quantumdeal/bot';

// ✅ Correct - with user property
async handler(@Ctx() ctx: UserContext) {
  const user = ctx.user; // TypeScript knows this exists
}

// ❌ Incorrect - missing user property
async handler(@Ctx() ctx: Context) {
  const user = ctx.user; // TypeScript error
}
```

## User Data

The middleware automatically manages the following user fields:

- `telegramId`: Telegram user ID (primary key)
- `username`: Telegram username (nullable)
- `firstName`: User's first name (nullable)
- `lastName`: User's last name (nullable)
- `lang`: User's language code (defaults to 'en')
- `isPremium`: Premium status from Telegram (defaults to false)
- `createdAt`: Automatically set on user creation
- `subscribeId`: Subscription ID (nullable)
- `subscribeExpirationDate`: Subscription expiration (nullable)

## Error Handling

The middleware includes comprehensive error handling:

- Logs errors but doesn't break bot functionality
- Continues middleware chain even if user management fails
- Provides detailed logging for debugging
- Graceful degradation when user data is unavailable

## Module Registration

The middleware is automatically registered in the `BotModule`:

```typescript
@Module({
  imports: [DbModule, FrameworkModule],
  providers: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware, // ✅ Already registered
  ],
  exports: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware,
  ],
})
export class BotModule {}
```

## Dependencies

The middleware depends on:

- `@quantumdeal/db` - For the UsersRepository
- `nestjs-telegraf` - For Telegraf integration
- NestJS dependency injection system

## Best Practices

1. **Always use UserContext**: Use the `UserContext` type for proper TypeScript support
2. **Handle middleware errors**: The middleware handles its own errors, but always wrap your handlers in try-catch
3. **Global vs Local**: Use global registration for better performance if all handlers need user context
4. **User data freshness**: The middleware updates user information on each interaction
5. **Logging**: Check logs for user creation and update events