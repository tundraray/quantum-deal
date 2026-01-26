# Overall Design Document: User Subscriptions Migration to bot_users

Generation Date: 2025-12-02
Target Plan Document: 20251202-user-subscriptions-bot-users-migration-plan.md

## Project Overview

### Purpose and Goals
Migrate `user_subscriptions` table to use `botUserId` as the primary foreign key referencing `bot_users.id` (internal auto-generated ID). This enables:
- Per-bot subscription isolation
- Correct trial eligibility logic per bot
- Alignment with multi-bot architecture (ADR-004)

### Background and Context
Current subscription system ties subscriptions to global user identity (`users.telegramId`) rather than bot-specific user context (`bot_users.id`). This creates:
1. No per-bot subscription isolation
2. Trial eligibility logic flaw (checks ALL bots)
3. Complex join queries for bot-specific subscriptions
4. Inconsistent data model

## Task Division Design

### Division Policy
**Selected Approach**: Horizontal Slice (Foundation-driven)
- Schema changes must be complete before repository updates
- Repository updates before service changes
- Each layer depends on the previous layer's completion

**Verification Level Distribution**:
- Phase 1: L3 (Build Success)
- Phase 2: L1 (Functional Operation) - Migration SQL generation only
- Phase 3: L2 (Test Operation)
- Phase 4: L2 (Test Operation)
- Phase 5: L1 (Functional Operation)
- Phase 6: L1 (Functional Operation)

### Inter-task Relationship Map
```
Task 01: Schema Changes (Phase 1)
  |
  v
Task 02: Generate Migration SQL (Phase 2) - drizzle-kit generate
  |
  v
Task 03: Enhance Migration SQL (Phase 2) - Add orphan handling, data population
  |
  v
Task 04: Add Repository botUserId Methods (Phase 3) - New methods with TDD
  |
  v
Task 05: Deprecate Repository userId Methods (Phase 3) - Add deprecation warnings
  |
  v
Task 06: Update Repository Tests (Phase 3) - Test new methods
  |
  v
Task 07: Update TrialService (Phase 4) - Change to botUserId parameter
  |
  v
Task 08: Update SubscriptionExpirationService (Phase 4) - Verify queries
  |
  v
Task 09: Update ReminderSchedulerService (Phase 4) - Use botUserId internally
  |
  v
Task 10: Update Bot UserManagementMiddleware (Phase 5)
  |
  v
Task 11: Update Partner-Bot UserManagementMiddleware (Phase 5)
  |
  v
Task 12: Quality Assurance (Phase 6) - All checks pass
```

### Interface Change Impact Analysis
| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| `findByUserId(userId)` | `findByBotUserId(botUserId)` | Yes | Task 04 |
| `findActiveByUserId(userId)` | `findActiveByBotUserId(botUserId)` | Yes | Task 04 |
| `findByUserAndSubscription(userId, subId)` | `findByBotUserAndSubscription(botUserId, subId)` | Yes | Task 04 |
| `findActiveByUserIdWithSubscription(userId)` | `findActiveByBotUserIdWithSubscription(botUserId)` | Yes | Task 04 |
| `isUserSubscribed(userId, subId)` | `isBotUserSubscribed(botUserId, subId)` | Yes | Task 04 |
| `hasActiveSubscription(userId, subId)` | `hasActiveSubscriptionByBotUser(botUserId, subId)` | Yes | Task 04 |
| `activate(userId, subId, expiresAt)` | `activateForBotUser(botUserId, subId, expiresAt)` | Yes | Task 04 |
| `deactivate(userId, subId)` | `deactivateForBotUser(botUserId, subId)` | Yes | Task 04 |
| `findExpiredTrials(botId)` | `findExpiredTrials(botId)` | No (internal) | Task 04 |
| `TrialService.isEligible(userId)` | `TrialService.isEligible(botUserId)` | Yes | Task 07 |
| `TrialService.activate(userId)` | `TrialService.activate(botUserId)` | Yes | Task 07 |

### Common Processing Points
- **botUserId parameter pattern**: All new methods use `botUserId: number` referencing `bot_users.id`
- **Deprecation annotation pattern**: `@deprecated Use XXXForBotUser instead. Will be removed in future migration.`
- **botUser resolution**: Middleware must resolve `botUser` via `BotUsersRepository.findOrCreate(telegramId, botId)`

## Implementation Considerations

### Principles to Maintain Throughout
1. **botUserId references bot_users.id (internal ID)** - NOT telegramId
2. **Backward compatibility** - Keep deprecated methods functional during transition
3. **TDD approach** - Write failing tests before implementation for repository methods
4. **Data safety** - Migration must not lose any existing data

### Risks and Countermeasures
- Risk: Migration fails mid-execution
  Countermeasure: Use transaction, create database backup before running
- Risk: Orphan records without matching `bot_users`
  Countermeasure: Auto-create `bot_users` records in migration SQL
- Risk: FK constraint violation on new column
  Countermeasure: Create missing `bot_users` records before populating `botUserId`

### Impact Scope Management
- **Allowed change scope**:
  - `libs/db/src/schema/user-subscriptions.ts`
  - `libs/db/src/repositories/user-subscriptions.repository.ts`
  - `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`
  - `libs/db/migrations/*.sql`
  - `libs/bot/src/services/trial.service.ts`
  - `libs/bot/src/services/subscription-expiration.service.ts`
  - `libs/partner-bot/src/services/reminder-scheduler.service.ts`
  - `libs/bot/src/middleware/user-management.middleware.ts`
  - `libs/partner-bot/src/middleware/user-management.middleware.ts`
- **No-change areas**:
  - `users` table structure
  - `bot_users` table structure
  - `subscriptions` table structure
  - Payment flow logic
  - Signal broadcasting logic

## Critical Constraints

### Migration Execution Constraint
- `drizzle-kit generate` - CAN be executed by automation
- `drizzle-kit migrate` - CANNOT be executed by automation (user runs manually)

### Key Implementation Details
- `botUserId` column references `bot_users.id` (internal auto-generated ID)
- Old `userId` column referenced `users.telegramId`
- Schema-first approach: modify Drizzle schema -> generate migration -> enhance migration

## Task Summary

| Task | Phase | Description | Files | Verification |
|------|-------|-------------|-------|--------------|
| 01 | 1 | Update Drizzle schema | 1 | L3 |
| 02 | 2 | Generate migration SQL | 1 | L1 |
| 03 | 2 | Enhance migration SQL | 1 | L1 |
| 04 | 3 | Add new botUserId repository methods | 2 | L2 |
| 05 | 3 | Deprecate old userId methods | 1 | L3 |
| 06 | 3 | Update repository tests | 1 | L2 |
| 07 | 4 | Update TrialService | 1-2 | L2 |
| 08 | 4 | Update SubscriptionExpirationService | 1 | L2 |
| 09 | 4 | Update ReminderSchedulerService | 1 | L2 |
| 10 | 5 | Update bot middleware | 1 | L1 |
| 11 | 5 | Update partner-bot middleware | 1 | L1 |
| 12 | 6 | Quality Assurance | All | L1 |
