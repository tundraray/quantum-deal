# Overall Design Document: Multi-Bot Database Schema

Generation Date: 2025-11-26
Target Plan Document: 20251126-feature-multi-bot-database-schema.md

## Project Overview

### Purpose and Goals
Implement the database schema foundation for multi-bot architecture, enabling the system to manage multiple Telegram bots from a single codebase. This includes creating new tables (bots, bot_settings, bot_users, bot_messages), modifying existing tables (user_subscriptions, renewal_tariffs, codes), and implementing corresponding repositories.

### Background and Context
The quantum-deal project needs to support a multi-brand bot network for broker lead generation. This requires:
- Shared user identity across bots (global profile + per-bot settings)
- Per-bot subscriptions and pricing
- Per-bot message overrides
- Backward compatibility with existing single-bot code

## Task Division Design

### Division Policy
**Horizontal Slice (Foundation-driven)** approach selected because:
1. ALL schema files must be created BEFORE running `drizzle-kit generate`
2. Migration must be applied BEFORE repositories can be tested
3. Repositories depend on database schema existence
4. Verification at appropriate L3/L2/L1 levels per phase

### Inter-task Relationship Map
```
Phase 1: Create All Schema Files (L3 Verification)
Task 1.1: Create bots.ts schema
  |
Task 1.2: Create bot-settings.ts schema (depends on bots)
  |
Task 1.3: Create bot-users.ts schema (depends on bots, users)
  |
Task 1.4: Create bot-messages.ts schema (depends on bots)
  |
Task 1.5: Modify user-subscriptions.ts (depends on bots)
  |
Task 1.6: Modify renewal-tariffs.ts (depends on bots)
  |
Task 1.7: Modify codes.ts (depends on bots)
  |
Task 1.8: Update schema/index.ts exports
  |
Phase 1 Completion: Build verification

Phase 2: Generate and Apply Migration (L2 Verification)
Task 2.1: Run drizzle-kit generate
  |
Task 2.2: Review generated SQL migration
  |
Task 2.3: Add manual SQL (partial unique index)
  |
Task 2.4: Run drizzle-kit migrate
  |
Task 2.5: Verify database schema
  |
Phase 2 Completion: Database verification

Phase 3: Create Repositories (L2 Verification)
Task 3.1: BotsRepository + tests
Task 3.2: BotSettingsRepository + tests
Task 3.3: BotUsersRepository + tests
Task 3.4: BotMessagesRepository + tests
Task 3.5: Update repositories/index.ts
  |
Phase 3 Completion: All repository tests pass

Phase 4: Seed Data and Final QA (L1/L2 Verification)
Task 4.1: Create default bot seed data
  |
Task 4.2: Run all integration tests
  |
Task 4.3: Final quality verification
  |
Phase 4 Completion: Full system verification
```

### Interface Change Impact Analysis
| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|---------------------|-------------------|
| UserSubscription | UserSubscription (with botId) | No (nullable) | Task 1.5 |
| RenewalTariff | RenewalTariff (with botId) | No (nullable) | Task 1.6 |
| Code | Code (with botId) | No (nullable) | Task 1.7 |
| N/A | Bot | New type | Task 1.1 |
| N/A | BotSettingsRecord | New type | Task 1.2 |
| N/A | BotUser | New type | Task 1.3 |
| N/A | BotMessage | New type | Task 1.4 |

### Common Processing Points
- **bots schema**: Referenced by all other new schemas and modified tables
- **BaseRepository pattern**: All new repositories extend BaseRepository
- **Drizzle type patterns**: All schemas use $inferSelect/$inferInsert
- **Timestamp patterns**: All tables use withTimezone: true

## Implementation Considerations

### Principles to Maintain Throughout
1. **Drizzle ORM Workflow**: Schema files first, then generate, then migrate
2. **Backward Compatibility**: All new botId columns are nullable initially
3. **Type Safety**: Use $type<T>() for JSONB columns
4. **Existing Patterns**: Follow users.ts schema pattern, BaseRepository pattern

### Risks and Countermeasures
- Risk: Migration breaks existing data
  Countermeasure: Nullable columns, review generated SQL before applying
- Risk: Drizzle cannot generate partial index
  Countermeasure: Manual SQL addition in Task 2.3
- Risk: FK constraint violations during migration
  Countermeasure: Create bots table first, then dependent tables

### Impact Scope Management
- Allowed change scope: libs/db/src/schema/, libs/db/src/repositories/
- No-change areas: libs/bot/*, src/*, libs/framework/* (Phase 2 scope)

## Phase Summary

| Phase | Tasks | Test Cases | Verification Level |
|-------|-------|------------|-------------------|
| Phase 1 | 8 | 0 | L3 (Build success) |
| Phase 2 | 5 | 0 | L2 (Migration applied) |
| Phase 3 | 5 | 34 | L2 (Tests pass) |
| Phase 4 | 3 | 13 | L1+L2 (Full verification) |
| **Total** | **21** | **47** | - |

## Task File Naming Convention

Files follow pattern: `20251126-feature-multi-bot-database-schema-task-{phase}-{number}.md`

Example:
- `20251126-feature-multi-bot-database-schema-task-1-1.md` (Phase 1, Task 1)
- `20251126-feature-multi-bot-database-schema-phase1-completion.md` (Phase 1 completion)

## Execution Order

Tasks must be executed in strict order:
1. Phase 1 tasks sequentially (1.1 through 1.8)
2. Phase 1 completion verification
3. Phase 2 tasks sequentially (2.1 through 2.5)
4. Phase 2 completion verification
5. Phase 3 tasks can be parallelized (3.1-3.4), then 3.5
6. Phase 3 completion verification
7. Phase 4 tasks sequentially (4.1 through 4.3)
8. Phase 4 completion verification

---

**Document Version**: 1.0.0
**Created**: 2025-11-26
