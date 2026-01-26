# Architecture & Implementation Guide - Subscription v2.0

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Services & Components](#services--components)
3. [Module Organization](#module-organization)
4. [Implementation Timeline](#implementation-timeline)
5. [Testing Strategy](#testing-strategy)

---

## System Architecture

### Overview

v2.0 extends the existing Bot API architecture with minimal additions. **No architectural changes. Just 4 new services.**

```
┌──────────────────────────────────────────────────────────────┐
│                      Telegram Bot API                         │
│                     (Telegraf Framework)                      │
└────────┬────────────────────────────┬─────────────────────────┘
         │                            │
         ▼                            ▼
  ┌─────────────────┐        ┌──────────────────┐
  │  Bot Commands   │        │  Action Handlers │
  │  /start, etc    │        │  Button clicks   │
  └────────┬────────┘        └────────┬─────────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
           ┌─────────────────────┐
           │   Service Layer     │
           ├─────────────────────┤
           │ • BotStartService   │ ← NEW (refactoring)
           │ • TrialService      │ ← NEW
           │ • OnboardingService │ ← NEW
           │ • StatisticsRefresh │ ← NEW
           │ • SubscriptionExp   │ ← EXISTS (updated button)
           │ • PaymentService    │ ← EXISTS
           └────────┬────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │    Database Layer    │
         ├──────────────────────┤
         │ • subscriptions      │ (+1 column)
         │ • user_subscriptions │ (no changes)
         │ • monthly_stats view │ (new)
         └──────────────────────┘
```

---

### Cron Jobs

**1. Expiration Check (Existing):**
- Service: SubscriptionExpirationService
- Schedule: Daily at 10:00 Moscow
- Query: Exact date matching (expires_at::date = CURRENT_DATE + N)

**2. Statistics Refresh (NEW):**
- Service: StatisticsRefreshService
- Schedule: Every 15 minutes
- Operation: `REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics`

---

## Multi-Language Support

### Supported Languages

The bot supports **8 languages** for all user-facing messages:

| Code | Language | Native Name |
|------|----------|-------------|
| `ru` | Russian | Русский |
| `en` | English | English |
| `uk` | Ukrainian | Українська |
| `hi` | Hindi | हिन्दी |
| `fr` | French | Français |
| `kk` | Kazakh | Қазақша |
| `uz` | Uzbek | O'zbek |
| `tg` | Tajik | Тоҷикӣ |

### Language Detection

**Automatic detection:**
```typescript
const language = ctx.from.language_code || 'en';
```

**User preference:**
```sql
SELECT lang FROM users WHERE telegram_id = $1;
```

### Message Generation

**Command descriptions:**
- Translated via `BotCommandsService`
- Static translations in `COMMAND_TRANSLATIONS` object

**Welcome messages:**
- Generated via LLM (`gpt-4-mini`)
- Language parameter passed to LLM
- Fallback to English if LLM fails

**Renewal reminders:**
- Generated via LLM (`SubscriptionExpirationService`)
- Personalized per user language
- Multi-language support in notification templates

### Implementation

**File:** `libs/bot/src/services/bot-commands.service.ts`

**Features:**
- Command menu updates based on user language
- Dynamic translation lookup
- Fallback to English for missing translations

---

## Services & Components

### Existing Services (No Changes)

#### SubscriptionExpirationService
**File:** `libs/bot/src/services/subscription-expiration.service.ts`

**Purpose:** Send renewal reminders via cron

**Already implements:**
- Daily cron job (10:00 Moscow)
- Exact date matching for expiration
- LLM-generated personalized messages
- Multi-language support

**v2 update:** Change button callback_data only
```typescript
// Before:
callback_data: 'open_renewal_scene'

// After:
callback_data: `renew_now:${userSubscriptionId}:${subscriptionId}`
```

---

#### PaymentService
**File:** `libs/bot/src/services/payment.service.ts`

**Purpose:** Handle Telegram Stars payments

**Already implements:**
- Invoice generation
- Payment verification
- Subscription activation

**v2 update:** Add renewal payment type handling

---

### New Services

#### 1. BotStartService
**File:** `libs/bot/src/commands/start/start.service.ts`

**Purpose:** Coordinate /start command logic - separation of concerns from BotService

**Responsibilities:**
- Check active subscriptions status
- Activate subscription codes if provided
- Verify trial eligibility via TrialService
- Generate welcome messages (LLM + statistics)
- Integrate with FeatureFlagService for command menu updates

**Methods:**
- `handleStart(user, code?)` - Main coordinator for /start flow
- `activateCode(user, code)` - Activate subscription codes (moved from BotService)

**Why separate service?**
- BotService was becoming too large with mixed concerns
- /start logic deserves dedicated service (eligibility checks, code activation, LLM generation)
- Easier testing and maintenance
- Clear integration point with TrialService, OnboardingService, FeatureFlagService

**Integration Flow:**
```
User sends /start
    ↓
BotUpdate.onStart() extracts user and code parameter
    ↓
BotStartService.handleStart(user, code)
    ↓
  • Activate code if provided
  • Check active subscriptions
  • Check trial eligibility via TrialService
  • Get statistics via OnboardingService
  • Generate welcome message (LLM)
    ↓
BotUpdate sends message to user
```

**Service Integration:**
- `TrialService.isEligible()` - Check if user can activate trial
- `OnboardingService.getMonthlyStatistics()` - Get statistics for welcome message
- `UserSubscriptionsRepository` - Fetch active subscriptions
- `CodesRepository` - Activate subscription codes
- `FeatureFlagService` - Update user features after code activation
- `BotCommandsService` - Update command menu
- `LlmService` - Generate personalized welcome message

---

#### 2. TrialService
**File:** `libs/bot/src/services/trial.service.ts`

**Purpose:** Manage 7-day free trials

**Methods:**
- `isEligible(userId)` - Check if user can activate trial
- `activate(userId)` - Create trial subscription

**Logic:**
```typescript
async isEligible(userId: number): Promise<boolean> {
  // Simple: no subscription history = eligible
  const existing = await userSubscriptionsRepo.findByUserId(userId);
  return existing.length === 0;
}
```

**Trial Activation Flow:**
```
User clicks "Try 7 Days Free"
    ↓
TrialAction.handleActivateTrial()
    ↓
Check eligibility (double-check)
    ↓ (eligible)
Get trial subscription from DB
    ↓
Create user_subscription record:
  • subscription_id = trial ID
  • starts_at = NOW()
  • expires_at = NOW() + 7 days
  • is_active = true
    ↓
Send confirmation:
"🎉 Your 7-day free trial is now active!"
    ↓
User has full access
```

---

#### 3. OnboardingService
**File:** `libs/bot/src/services/onboarding.service.ts`

**Purpose:** Format welcome messages with statistics

**Methods:**
- `getMonthlyStatistics()` - Query materialized view
- `getWelcomeMessage(language)` - Format message with stats

**Data Flow:**
```
Monthly deals → Materialized view (refreshed every 15min) → OnboardingService → /start command
```

**Statistics Display Logic:**
- Check if `STATISTICS_SHOW_ON_ONBOARDING` is enabled
- Query materialized view for current month stats
- Fallback to simple message if stats unavailable
- Format with multi-language support

---

#### 4. StatisticsRefreshService
**File:** `libs/bot/src/services/statistics-refresh.service.ts`

**Purpose:** Auto-refresh statistics view

**Implementation:**
```typescript
@Cron('*/15 * * * *') // Every 15 minutes
async refreshStatistics() {
  await db.execute(sql`
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics
  `);
}
```

**Performance:**
- 10k deals: ~50ms
- 100k deals: ~300ms
- 1M deals: ~2s

**CONCURRENT mode:** Non-blocking, queries continue during refresh

---

## Module Organization

### New Structure (v2.0)

```
libs/bot/src/
├── bot.update.ts                  (Telegraf entry point)
│
├── commands/                       (Command handlers)
│   ├── start/
│   │   └── start.service.ts       (BotStartService - NEW refactoring)
│   │
│   ├── lang/
│   │   └── lang.service.ts        (Language switcher)
│   │
│   ├── filter/
│   │   └── filter.scene.ts        (Filter scene - existing)
│   │
│   └── renew/
│       └── renewal.scene.ts       (Renewal scene - existing)
│
├── services/                       (Domain services)
│   ├── trial.service.ts           (NEW - Trial eligibility & activation)
│   ├── onboarding.service.ts      (NEW - Welcome messages & stats)
│   ├── statistics-refresh.service.ts  (NEW - Materialized view refresh)
│   ├── subscription-expiration.service.ts  (updated button callback)
│   ├── payment.service.ts         (updated with renewal handling)
│   ├── bot-commands.service.ts    (existing - command menu)
│   └── bot.service.ts             (other methods: onLang, etc)
│
├── actions/                        (Button click handlers)
│   ├── trial.action.ts            (NEW - activate_trial callback)
│   └── renewal.action.ts          (NEW - renew_now callback)
│
└── bot.module.ts                  (register all services & commands)
```

### Structure Explanation

**commands/** - Each command gets its own folder:
- Contains command-specific service (business logic)
- Contains scene if the command uses Telegraf scenes
- Example: `/start` → `commands/start/start.service.ts`

**services/** - Shared domain services:
- Trial system logic
- Statistics handling
- Payment processing
- Not tied to specific commands

**actions/** - Callback query handlers:
- Handle button clicks from inline keyboards
- Example: `activate_trial` → `actions/trial.action.ts`

**Refactoring Notes:**
- `BotService.onStart()` → `BotStartService.handleStart()`
- `BotService.activateCode()` → `BotStartService.activateCode()`
- `BotService` keeps other methods (onLang, etc)

---

## Implementation Timeline

### 5-Week Plan

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Database + Refactoring | is_hidden, view, BotStartService |
| 2 | Trial System | TrialService + eligibility |
| 3 | Statistics | OnboardingService + refresh |
| 4 | Renewal | One-click buttons |
| 5 | Testing | Production ready |

---

### Week 1: Database Setup + Refactoring

**Day 1: Add is_hidden Column**
- Create migration file: `libs/db/migrations/0001_add_is_hidden.sql`
- Add `is_hidden BOOLEAN DEFAULT false` to subscriptions table
- Verify column exists via information_schema
- **Estimated Time:** 1 hour

**Day 2: Create Statistics View**
- Create materialized view: `monthly_bot_statistics`
- Add unique index on total_deals
- Test query performance (<10ms target)
- Test refresh operation (CONCURRENT mode)
- **Estimated Time:** 2 hours

**Day 3: Seed Trial Subscription**
- Insert trial subscription (price_stars=0, duration_days=7, is_hidden=true)
- Add `is_trial` marker in subscription_features
- Verify trial exists via query
- **Estimated Time:** 1 hour

**Day 4: Update Drizzle Schema**
- Update `libs/db/src/schema/subscriptions.ts` with isHidden field
- Create new `libs/db/src/schema/statistics.ts` for materialized view
- Run `drizzle-kit generate` and `drizzle-kit migrate`
- **Estimated Time:** 2 hours

**Day 5: BotStartService Refactoring**

**Tasks:**
1. Create `commands/start/` folder structure
2. Implement BotStartService with handleStart() and activateCode() methods
3. Move logic from BotService.onStart() to BotStartService.handleStart()
4. Update BotUpdate to use BotStartService
5. Register BotStartService in BotModule
6. Run integration tests

**Responsibilities of BotStartService:**
- Coordinate all /start dependencies
- Activate subscription codes if provided
- Fetch active subscriptions
- Check trial eligibility (prepared for Week 2)
- Update command menu via FeatureFlagService
- Generate personalized welcome message via LLM

**Testing:**
- /start command works
- Code activation works
- Welcome message generated correctly
- Command menu updates properly

**Estimated Time:** 4 hours

---

### Week 2: Trial System

**Day 1-2: Implement TrialService**
- Create TrialService with isEligible() and activate() methods
- Implement eligibility check (no subscription history)
- Implement trial activation (create user_subscription)
- Integration with BotStartService for eligibility checks
- Unit tests for trial logic
- **Estimated Time:** 8 hours

**Day 3: Add Trial Activation Action**
- Create TrialAction handler for `activate_trial` callback
- Handle trial activation with error handling
- Send confirmation message
- Manual testing (click button, verify activation)
- **Estimated Time:** 4 hours

**Day 4-5: Integration Tests**
- End-to-end trial flow tests
- Test trial activation for new user
- Test expiration reminder 3 days before trial ends
- Test trial eligibility rejection
- **Estimated Time:** 8 hours

---

### Week 3: Statistics & Onboarding

**Day 1-2: StatisticsRefreshService**
- Implement cron job for materialized view refresh (every 15 min)
- Add manual refresh method
- Test refresh without errors
- Verify statistics data updates
- **Estimated Time:** 8 hours

**Day 3: OnboardingService + Multi-Language**

**Tasks:**
- Implement OnboardingService.getMonthlyStatistics() method
- Implement OnboardingService.getWelcomeMessage(language) with formatting
- Add multi-language support (8 languages: RU, EN, UK, HI, FR, KK, UZ, TG)
- LLM prompt includes language parameter for personalized welcome messages
- Test all 8 language variants
- Fallback to English if LLM fails
- Fallback to simple message if stats unavailable

**Estimated time:** 6 hours

**Day 4: Integration Testing**
- Test /start with statistics in different languages
- Verify LLM generates correct language messages
- Test fallback scenarios (no stats, LLM failure)
- **Estimated Time:** 2 hours

**Day 5: Update BotStartService Integration**
- Integrate TrialService.isEligible() in BotStartService
- Integrate OnboardingService.getMonthlyStatistics()
- Pass eligibility and statistics to LLM prompt
- Test /start with trial eligible user
- Test /start with existing user
- **Estimated Time:** 4 hours

---

### Week 4: One-Click Renewal

**Day 1-2: Update Expiration Service Button**
- Update sendNotificationToUser() method in SubscriptionExpirationService
- Change callback_data to include userSubscriptionId and subscriptionId
- Format: `renew_now:${userSubscriptionId}:${subscriptionId}`
- **Estimated Time:** 4 hours

**Day 3: Implement Renewal Action**
- Create RenewalAction handler for `renew_now:*:*` pattern
- Get subscription details from database
- Send pre-filled invoice immediately
- Handle errors (subscription not found, database errors)
- **Estimated Time:** 6 hours

**Day 4: Update Payment Handler**
- Update payment handler to detect `type: 'renewal'` in payload
- Implement subscription extension logic
- Send confirmation with new expiry date
- **Estimated Time:** 6 hours

**Day 5: End-to-End Testing**
- Test complete renewal flow (reminder → click → invoice → payment → extension)
- Verify subscription extended correctly
- Test error scenarios
- **Estimated Time:** 4 hours

---

### Week 5: Testing & Polish

**Day 1-2: Integration Tests**
- Trial System tests (activation, rejection, reminders)
- Statistics tests (refresh, display, fallback)
- One-Click Renewal tests (invoice, payment, extension)
- **Estimated Time:** 12 hours

**Day 3: Load Testing**
- Test statistics view performance with large datasets
- Benchmark query times (target: <10ms average)
- Test refresh performance
- **Estimated Time:** 4 hours

**Day 4: Documentation Review**
- Update all documentation files
- Verify accuracy of implementation details
- **Estimated Time:** 4 hours

**Day 5: Production Deployment**
- Run migrations
- Verify database changes
- Deploy code
- Verify cron jobs running
- Monitor for errors in first 24 hours
- **Estimated Time:** 4 hours

---

## Testing Strategy

### Integration Tests

**Test Structure:**
```typescript
describe('Subscription v2.0 (E2E)', () => {
  describe('Trial System', () => {
    it('should activate trial for new user');
    it('should reject trial for existing user');
    it('should send reminder 3 days before trial expires');
  });

  describe('Statistics', () => {
    it('should refresh statistics every 15 minutes');
    it('should show statistics in /start');
    it('should handle missing statistics gracefully');
  });

  describe('One-Click Renewal', () => {
    it('should send invoice from renewal button');
    it('should extend subscription after payment');
    it('should handle renewal errors');
  });
});
```

### Load Testing

**Statistics Performance Script:**
```typescript
async function testStatisticsPerformance() {
  const iterations = 1000;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await db.select().from(monthlyBotStatistics).limit(1);
    times.push(Date.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);

  console.log(`Average query time: ${avg.toFixed(2)}ms`);
  console.log(`Max query time: ${max}ms`);

  // Should be <10ms average
  expect(avg).toBeLessThan(10);
}
```

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trial activations | >50/week | Count activations |
| Trial→Paid conversion | >15% | Track payments after trial |
| Statistics load time | <10ms | Monitor query performance |
| One-click renewal rate | >70% | Compare renew_now vs show_plans |
| Cron job reliability | 100% | Monitor cron execution |

---

## Deployment Considerations

### Environment Variables

**Required Configuration:**
```bash
# Trial System
TRIAL_ENABLED=true
TRIAL_DURATION_DAYS=7
TRIAL_SUBSCRIPTION_NAME="Trial 7 Days"

# Statistics
STATISTICS_SHOW_ON_ONBOARDING=true
STATISTICS_REFRESH_INTERVAL_MINUTES=15

# Existing (no changes)
EXPIRATION_CHECK_ENABLED=true
EXPIRATION_CHECK_CRON=0 10 * * *
EXPIRATION_CHECK_TIMEZONE=Europe/Moscow
EXPIRATION_WARNING_DAYS=7,3,0
```

### Deployment Architecture

**Development:**
```
Local → PostgreSQL → NestJS → Telegraf → Telegram Bot API
```

**Production:**
```
VPS/Cloud → PostgreSQL → NestJS (PM2) → Telegraf → Telegram Bot API
```

**No additional infrastructure needed. Uses existing setup.**

### Cron Jobs

**1. Expiration Check (Existing):**
- Service: SubscriptionExpirationService
- Schedule: Daily at 10:00 Moscow
- Query: Exact date matching (expires_at::date = CURRENT_DATE + N)

**2. Statistics Refresh (NEW):**
- Service: StatisticsRefreshService
- Schedule: Every 15 minutes
- Operation: `REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics`

### Security Considerations

1. **Trial Abuse Prevention:**
   - Check via `user_subscriptions` table (no prior subscription)
   - Based on Telegram user ID (unique)

2. **Payment Verification:**
   - Existing PaymentService handles all verification
   - No changes to security model

3. **Statistics Privacy:**
   - Only aggregate monthly data shown
   - No individual user data exposed

### Scalability

**Current Limits:**
- PostgreSQL materialized view: <10ms queries even with 1M+ deals
- Cron jobs: Non-blocking CONCURRENT refresh
- Bot API: Same limits as existing system

**Bottlenecks:** None identified
- Statistics refresh: Runs concurrently, doesn't block queries
- Expiration check: Daily job, same as v1
- Trial activation: Simple INSERT, instant

### Rollback Plan

If issues occur:

```sql
-- Rollback migrations
BEGIN;

-- 1. Drop statistics view
DROP MATERIALIZED VIEW IF EXISTS monthly_bot_statistics;

-- 2. Remove is_hidden column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_hidden;

-- 3. Remove trial subscription (optional)
DELETE FROM subscription_features
WHERE subscription_id IN (
  SELECT id FROM subscriptions WHERE name = 'Trial 7 Days'
);

DELETE FROM subscriptions WHERE name = 'Trial 7 Days';

COMMIT;
```

Then redeploy previous version:
```bash
git checkout v1.0.0
pnpm run build
pnpm run start:prod
```

**Risk:** Low - all changes are additive, no data loss

---

## Summary

**Architectural Changes:** Minimal
- 4 new services (BotStartService, TrialService, OnboardingService, StatisticsRefreshService)
- 2 new action handlers (trial, renewal)
- 1 refactored handler (BotUpdate.onStart → BotStartService)
- 1 cron job added (statistics refresh)

**Complexity:** Low
**Risk:** Minimal
**Performance Impact:** Negligible

**Total Timeline:** 5 weeks

**Key Deliverables:**
1. Trial system (week 2)
2. Statistics on onboarding (week 3)
3. One-click renewal (week 4)

**Database Changes:**
- 1 column: `subscriptions.is_hidden`
- 1 view: `monthly_bot_statistics`

**No breaking changes. No complex migrations. Production ready.**

---

**Version:** 2.0.0
**Last Updated:** 2025-10-31
