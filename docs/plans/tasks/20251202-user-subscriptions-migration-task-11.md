# Task: Update Partner-Bot UserManagementMiddleware

Metadata:
- Phase: 5 (Middleware Updates)
- Dependencies: Task 10 (Bot Middleware Updated)
- Provides: Middleware that uses botUserId for subscription queries
- Size: Small (1 file)

## Implementation Content
Update the partner-bot's `UserManagementMiddleware` to:
1. Resolve `botUser` via `BotUsersRepository`
2. Query subscriptions using `botUserId` instead of `userId`
3. Attach `botUser` to context for downstream services

**Key Understanding**: Partner-bot already operates in multi-bot context and should have `botId` available.

## Target Files
- [x] `libs/partner-bot/src/middleware/user-management.middleware.ts`

## Implementation Steps

### 1. Analyze Current Implementation
Current flow (similar to bot middleware):
```typescript
// 1. Upsert user
const user = await this.upsertUser(ctx.from);

// 2. Load subscriptions using userId (telegramId)
const subscriptions = await this.userSubscriptionsRepository.findActiveByUserIdWithSubscription(
  user.telegramId,
);
```

### 2. Update Implementation

#### Add BotUsersRepository Dependency
- [x] Import `BotUsersRepository` from `@quantumdeal/db`
- [x] Add to constructor injection

```typescript
import {
  UsersRepository,
  NewUser,
  UserSubscriptionsRepository,
  BotUsersRepository, // Add import
} from '@quantumdeal/db';

constructor(
  private readonly usersRepository: UsersRepository,
  private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
  private readonly botUsersRepository: BotUsersRepository, // Add injection
) {
  // ...
}
```

#### Get botId from Context
- [x] Partner-bot middleware should have access to `botId` from dynamic bot context
- [x] Check if `ctx.botInfo` or similar contains bot identifier

```typescript
// Get botId from context (dynamic bot scenario)
const botId = (ctx as any).botInfo?.id || (ctx as any).botId;

if (!botId) {
  this.logger.error('botId not available in context');
  await next();
  return;
}
```

#### Update `loadUserWithSubscriptions` Method
- [x] Resolve `botUser` using `BotUsersRepository.findOrCreate(telegramId, botId)`
- [x] Use `findActiveByBotUserIdWithSubscription(botUserId)` for subscription query
- [x] Attach `botUser` to context

```typescript
private async loadUserWithSubscriptions(
  user: {...},
  botId: number,
): Promise<UserWithSubscriptions> {
  // Resolve botUser
  const botUser = await this.botUsersRepository.findOrCreate(user.telegramId, botId);

  // Load active subscriptions with subscription details using botUserId
  const subscriptions = await this.userSubscriptionsRepository.findActiveByBotUserIdWithSubscription(
    botUser.id, // Use bot_users.id (internal ID)
  );

  // ... rest of method
}
```

#### Update `use` Method
- [x] Extract `botId` from context
- [x] Pass `botId` to `loadUserWithSubscriptions`
- [x] Attach `botUser` to context

```typescript
async use(ctx: Context, next: () => Promise<void>): Promise<void> {
  this.logger.debug('User management middleware started');
  try {
    if (!ctx.from) {
      this.logger.warn('Context does not contain user information');
      await next();
      return;
    }

    // Get botId from context
    const botId = (ctx as any).botInfo?.id || (ctx as any).botId;
    if (!botId) {
      this.logger.error('botId not available in partner-bot context');
      await next();
      return;
    }

    // Upsert user
    const user = await this.upsertUser(ctx.from);

    // Resolve botUser
    const botUser = await this.botUsersRepository.findOrCreate(user.telegramId, botId);

    // Attach user with subscriptions to context
    const userWithSubscriptions = await this.loadUserWithSubscriptions(user, botId);
    (ctx as UserContext).user = userWithSubscriptions;

    // Attach botUser to context for downstream services
    (ctx as any).botUser = botUser;

    await next();
  } catch (error) {
    // ... error handling
  }
}
```

### 3. Update Module to Inject BotUsersRepository
- [x] Update `partner-bot.module.ts` to provide `BotUsersRepository` to middleware
- [x] Ensure `DbModule` is imported with `BotUsersRepository` exported

### 4. Update Interface Types
- [x] Ensure `UserContext` includes `botUser` property in partner-bot interfaces
- [x] Or extend context type

```typescript
// In interfaces/index.ts or similar
export interface PartnerBotContext extends Context {
  user: UserWithSubscriptions;
  botUser: BotUser; // Add this
  botId: number;
}
```

## Completion Criteria
- [x] `BotUsersRepository` injected into middleware
- [x] `botUser` resolved using `findOrCreate(telegramId, botId)`
- [x] Subscription queries use `findActiveByBotUserIdWithSubscription(botUserId)`
- [x] `botUser` attached to context for downstream use
- [x] Module updated to provide `BotUsersRepository`
- [x] Build passes: `npm run build`
- [x] **AC-5.1**: Partner-bot middleware passes `botUser.id` to subscription operations
- [x] **AC-5.2**: Context includes `botUser` with valid `id`

## Verification Commands
```bash
# Build check
npm run build

# Lint check
npm run check
```

## Notes
- Impact scope: Partner-bot middleware, possibly module configuration
- Constraints: Must have `botId` available in context
- Partner-bot operates in multi-bot context, so `botId` should be available
- The `botUser` context attachment enables downstream services (like TrialService) to access the correct `botUserId`
- May need to check how `botId` is passed to partner-bot middleware (via DynamicTelegrafService context)
