# Task: Update Bot UserManagementMiddleware

Metadata:
- Phase: 5 (Middleware Updates)
- Dependencies: Task 07 (TrialService Updated)
- Provides: Middleware that uses botUserId for subscription queries
- Size: Small (1 file)

## Implementation Content
Update the main bot's `UserManagementMiddleware` to:
1. Resolve `botUser` via `BotUsersRepository`
2. Query subscriptions using `botUserId` instead of `userId`
3. Attach `botUser` to context for downstream services

**Key Understanding**: This middleware needs access to `botUser.id` (auto-generated internal ID) for subscription queries, not just `user.telegramId`.

## Target Files
- [ ] `libs/bot/src/middleware/user-management.middleware.ts`

## Implementation Steps

### 1. Analyze Current Implementation
Current flow:
```typescript
// 1. Upsert user (creates/updates users table)
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
  private readonly featureFlagService: FeatureFlagService,
  private readonly botUsersRepository: BotUsersRepository, // Add injection
) {
  // ...
}
```

#### Update `loadUserWithSubscriptions` Method
- [ ] Resolve `botUser` first (need `botId` from context)
- [ ] Use `findActiveByBotUserIdWithSubscription(botUserId)` instead of `findActiveByUserIdWithSubscription(userId)`

**Challenge**: The main bot middleware may not have `botId` in context easily. Options:
1. Get `botId` from environment config (main bot ID)
2. Store `botId` in context during bot initialization
3. For main bot, may continue using `userId` if it's a single-bot deployment

**Decision for Main Bot**:
- If main bot is single-bot deployment: Can continue using `userId` temporarily
- If multi-bot deployment: Need to resolve `botId` and `botUser`

### 3. Conditional Update Based on Context
- [ ] Check if `botId` is available in context
- [ ] If available: Use `botUserId` flow
- [ ] If not available: Fall back to `userId` flow (with deprecation warning)

```typescript
private async loadUserWithSubscriptions(user: {...}, ctx: Context): Promise<UserWithSubscriptions> {
  let subscriptions;

  // Check if botId is available in context (multi-bot scenario)
  const botId = (ctx as any).botInfo?.botId || this.configService.get<number>('BOT_ID');

  if (botId) {
    // Multi-bot flow: Use botUserId
    const botUser = await this.botUsersRepository.findOrCreate(user.telegramId, botId);

    subscriptions = await this.userSubscriptionsRepository.findActiveByBotUserIdWithSubscription(
      botUser.id, // Use bot_users.id
    );

    // Attach botUser to context for downstream use
    (ctx as any).botUser = botUser;
  } else {
    // Legacy flow: Use userId (deprecated)
    this.logger.warn('botId not available, using deprecated userId flow');
    subscriptions = await this.userSubscriptionsRepository.findActiveByUserIdWithSubscription(
      user.telegramId,
    );
  }

  // ... rest of method
}
```

### 4. Update Context Types (If Needed)
- [ ] Ensure `UserContext` interface includes optional `botUser` property
- [ ] Or add to existing context type

## Alternative: Simple Update for Single-Bot Deployment
If main bot is always single-bot deployment:

```typescript
// Get bot ID from config (simpler approach)
private readonly botId = this.configService.get<number>('BOT_ID');

private async loadUserWithSubscriptions(user: {...}): Promise<UserWithSubscriptions> {
  // Resolve botUser
  const botUser = await this.botUsersRepository.findOrCreate(user.telegramId, this.botId);

  // Use botUserId for subscriptions
  const subscriptions = await this.userSubscriptionsRepository.findActiveByBotUserIdWithSubscription(
    botUser.id,
  );

  // ... rest of method
}
```

## Completion Criteria
- [ ] Middleware resolves `botUser` from `BotUsersRepository`
- [ ] Subscription queries use `findActiveByBotUserIdWithSubscription(botUserId)`
- [ ] `botUser` attached to context (if applicable)
- [ ] Build passes: `npm run build`
- [ ] **AC-5.1**: Bot middleware passes `botUser.id` to subscription operations
- [ ] **AC-5.2**: Context includes `botUser` with valid `id`

## Verification Commands
```bash
# Build check
npm run build

# Lint check
npm run check
```

## Notes
- Impact scope: Bot middleware subscription loading
- Constraints: Need to determine `botId` resolution strategy for main bot
- The main bot may have simpler setup (single bot ID from config)
- Context attachment allows downstream services (like TrialService) to access `botUser`
- May require module updates to inject `BotUsersRepository`
