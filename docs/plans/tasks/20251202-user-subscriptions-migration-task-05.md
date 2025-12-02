# Task: Add Deprecation Annotations to Old userId Methods

Metadata:
- Phase: 3 (Repository Updates)
- Dependencies: Task 04 (New botUserId Methods)
- Provides: Deprecated methods with warnings
- Size: Small (1 file)

## Implementation Content
Add `@deprecated` JSDoc annotations to all existing repository methods that use `userId` parameter. This marks them for future removal while maintaining backward compatibility during the transition period.

## Target Files
- [ ] `libs/db/src/repositories/user-subscriptions.repository.ts`

## Implementation Steps

### 1. Identify Methods to Deprecate
Methods using `userId` parameter that now have `botUserId` equivalents:
- `findByUserId(userId)` -> `findByBotUserId(botUserId)`
- `findActiveByUserId(userId)` -> `findActiveByBotUserId(botUserId)`
- `findByUserAndSubscription(userId, subscriptionId)` -> `findByBotUserAndSubscription(botUserId, subscriptionId)`
- `findActiveByUserIdWithSubscription(userId)` -> `findActiveByBotUserIdWithSubscription(botUserId)`
- `isUserSubscribed(userId, subscriptionId)` -> `isBotUserSubscribed(botUserId, subscriptionId)`
- `hasActiveSubscription(userId, subscriptionId)` -> `hasActiveSubscriptionByBotUser(botUserId, subscriptionId)`
- `activate(userId, subscriptionId, expiresAt)` -> `activateForBotUser(botUserId, subscriptionId, expiresAt)`
- `deactivate(userId, subscriptionId)` -> `deactivateForBotUser(botUserId, subscriptionId)`

### 2. Add Deprecation Annotations
- [ ] Add `@deprecated` JSDoc to `findByUserId`:
  ```typescript
  /**
   * Find all subscriptions for a specific user
   * @param userId - The user's Telegram ID
   * @returns Array of user subscriptions
   * @deprecated Use findByBotUserId(botUserId) instead.
   * This method queries by users.telegramId which is being replaced by bot_users.id.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `findActiveByUserId`:
  ```typescript
  /**
   * Find all active subscriptions for a specific user
   * @param userId - The user's Telegram ID
   * @returns Array of active user subscriptions
   * @deprecated Use findActiveByBotUserId(botUserId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `findByUserAndSubscription`:
  ```typescript
  /**
   * Find user subscription by user ID and subscription ID
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns User subscription or null if not found
   * @deprecated Use findByBotUserAndSubscription(botUserId, subscriptionId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `findActiveByUserIdWithSubscription`:
  ```typescript
  /**
   * Find active user subscriptions with full subscription details
   * @param userId - The user's Telegram ID
   * @returns Array of objects containing userSubscription and subscription
   * @deprecated Use findActiveByBotUserIdWithSubscription(botUserId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `isUserSubscribed`:
  ```typescript
  /**
   * Check if a user is subscribed to a specific subscription
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns true if the user is subscribed (active or inactive)
   * @deprecated Use isBotUserSubscribed(botUserId, subscriptionId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `hasActiveSubscription`:
  ```typescript
  /**
   * Check if a user has an active subscription to a specific subscription
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns true if the user has an active subscription
   * @deprecated Use hasActiveSubscriptionByBotUser(botUserId, subscriptionId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `activate`:
  ```typescript
  /**
   * Activate a subscription for a user
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @param expiresAt - Optional expiration date
   * @returns The created or updated user subscription
   * @deprecated Use activateForBotUser(botUserId, subscriptionId, expiresAt) instead.
   * Will be removed in future migration after validation period.
   */
  ```

- [ ] Add `@deprecated` JSDoc to `deactivate`:
  ```typescript
  /**
   * Deactivate a user's subscription (soft delete)
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns void
   * @deprecated Use deactivateForBotUser(botUserId, subscriptionId) instead.
   * Will be removed in future migration after validation period.
   */
  ```

### 3. Verify Deprecation Warnings
- [ ] Build project and verify deprecation warnings appear when methods are called
- [ ] Ensure existing tests still pass (methods should remain functional)

## Completion Criteria
- [ ] All 8 methods have `@deprecated` JSDoc annotations
- [ ] Deprecation annotations reference the new `botUserId` method names
- [ ] Existing functionality preserved (backward compatibility)
- [ ] Build passes: `npm run build`
- [ ] Existing tests pass: `npm test`
- [ ] **AC-3.5**: Existing methods with `userId` parameter are deprecated with warnings

## Verification Commands
```bash
# Build check
npm run build

# Run tests to ensure backward compatibility
npm test -- --testPathPattern=user-subscriptions.repository

# Lint check
npm run check
```

## Notes
- Impact scope: JSDoc annotations only (no behavioral changes)
- Constraints: Methods must remain functional for backward compatibility
- The deprecated methods will be removed in a future cleanup migration after validation period
- TypeScript IDE will show strikethrough on deprecated methods
