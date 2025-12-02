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
- [ ] `libs/partner-bot/src/middleware/user-management.middleware.ts`

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
- [ ] Import `BotUsersRepository` from `@quantumdeal/db`
- [ ] Add to constructor injection

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
- [ ] Partner-bot middleware should have access to `botId` from dynamic bot context
- [ ] Check if `ctx.botInfo` or similar contains bot identifier

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
- [ ] Resolve `botUser` using `BotUsersRepository.findOrCreate(telegramId, botId)`
- [ ] Use `findActiveByBotUserIdWithSubscription(botUserId)` for subscription query
- [ ] Attach `botUser` to context

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
- [ ] Extract `botId` from context
- [ ] Pass `botId` to `loadUserWithSubscriptions`
- [ ] Attach `botUser` to context

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
- [ ] Update `partner-bot.module.ts` to provide `BotUsersRepository` to middleware
- [ ] Ensure `DbModule` is imported with `BotUsersRepository` exported

### 4. Update Interface Types
- [ ] Ensure `UserContext` includes `botUser` property in partner-bot interfaces
- [ ] Or extend context type

```typescript
// In interfaces/index.ts or similar
export interface PartnerBotContext extends Context {
  user: UserWithSubscriptions;
  botUser: BotUser; // Add this
  botId: number;
}
```

## Completion Criteria
- [ ] `BotUsersRepository` injected into middleware
- [ ] `botUser` resolved using `findOrCreate(telegramId, botId)`
- [ ] Subscription queries use `findActiveByBotUserIdWithSubscription(botUserId)`
- [ ] `botUser` attached to context for downstream use
- [ ] Module updated to provide `BotUsersRepository`
- [ ] Build passes: `npm run build`
- [ ] **AC-5.1**: Partner-bot middleware passes `botUser.id` to subscription operations
- [ ] **AC-5.2**: Context includes `botUser` with valid `id`

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
