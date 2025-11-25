# Subscription System v2.0 - Simplified Enhancement

## Overview

Subscription System v2.0 is a **minimal, practical extension** of the existing subscription system. It adds three focused features while preserving everything that already works.

**Core Philosophy**: Don't break what works. Add only what's needed.

### What v2.0 Actually Adds

v2.0 is **NOT a rewrite**. It's three targeted improvements plus a refactoring:

| Feature | Description | Implementation Cost |
|---------|-------------|---------------------|
| **Trial System** | 7-day free trial for new users | 1 DB column + service |
| **Onboarding Statistics** | Show monthly stats on /start | Materialized view + cron |
| **One-Click Renewal** | Pre-filled invoice in reminders | Button handler improvement |
| **BotStartService** | Refactored /start logic (separation of concerns) | New service (no new features) |

**What Stays The Same:**
- ✅ Existing SubscriptionExpirationService (already perfect)
- ✅ Current reminder system (7, 3, 0 days)
- ✅ LLM-generated personalized messages
- ✅ Multi-language support (8 languages: RU, EN, UK, HI, FR, KK, UZ, TG)
- ✅ Telegram Stars payments
- ✅ All existing database tables
- ✅ /start functionality (refactored, not changed)

---

## Current System (Already Working)

### SubscriptionExpirationService

**File:** `libs/bot/src/services/subscription-expiration.service.ts`

This service is **production-ready and requires NO changes** (except button callback_data for Feature 3).

**Already implements:**
- Daily cron job (10:00 Moscow time)
- Exact date matching for expiration (7, 3, 0 days)
- LLM-generated personalized messages
- Multi-language support

See [architecture-and-implementation.md](./architecture-and-implementation.md) for service details.

---

## What We're Adding (3 Features)

### Feature 1: Trial System

**Goal:** Let new users try premium for 7 days without payment.

**Implementation:** See [user-guide.md](./user-guide.md) for user flows and [architecture-and-implementation.md](./architecture-and-implementation.md) for service architecture.

**Key Points:**
- TrialService handles eligibility and activation
- BotStartService coordinates /start flow
- Uses existing `user_subscriptions` table
- Trial marked in `subscription_features`

---

### Feature 2: Onboarding Statistics

**Goal:** Show impressive community stats to new users.

**Implementation:** See [user-guide.md](./user-guide.md) for configuration and [database-schema.md](./database-schema.md) for schema details.

**Key Points:**
- Materialized view for performance
- StatisticsRefreshService runs every 15 minutes
- OnboardingService formats messages
- Graceful fallback if no data

---

### Feature 3: One-Click Renewal

**Goal:** Simplify renewal from button click to payment.

**Implementation:** See [telegram-api-reference.md](./telegram-api-reference.md) for payment flow and [architecture-and-implementation.md](./architecture-and-implementation.md) for action handlers.

**Key Points:**
- Updated button callback_data in SubscriptionExpirationService
- RenewalAction sends invoice immediately
- PaymentService handles renewal payments
- One-tap renewal experience

---

## Database Schema Changes Summary

**ONLY ONE TABLE CHANGE:**
- Add `is_hidden BOOLEAN DEFAULT false` to subscriptions table

**ADD ONE VIEW:**
- Materialized view: `monthly_bot_statistics`

**USE EXISTING TABLES:**
- ✅ `user_subscriptions` - NO changes needed
- ✅ `subscription_features` - for trial marker
- ✅ `subscriptions` - only 1 column added

**NO NEW TABLES. NO user_subscription_cycles. NO trial_usage.**

See [database-schema.md](./database-schema.md) for complete details.

---

## Configuration

**New Environment Variables:**
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

See [user-guide.md](./user-guide.md) for complete configuration reference.

---

## Implementation Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Database + Refactoring | is_hidden, view, BotStartService |
| 2 | Trial System | TrialService + eligibility |
| 3 | Statistics | OnboardingService + refresh |
| 4 | Renewal | One-click buttons |
| 5 | Testing | Production ready |

See [architecture-and-implementation.md](./architecture-and-implementation.md) for detailed timeline.

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| **README.md** (this file) | Overview and core concepts |
| [database-schema.md](./database-schema.md) | Complete schema reference and migrations |
| [architecture-and-implementation.md](./architecture-and-implementation.md) | Service architecture and 5-week plan |
| [user-guide.md](./user-guide.md) | User flows, configuration, edge cases |
| [telegram-api-reference.md](./telegram-api-reference.md) | Telegram Bot API methods and payment flow |

---

## Key Principles

1. **Minimal Changes** - Only 1 column + 1 view
2. **Use Existing Code** - SubscriptionExpirationService is perfect
3. **3 Features + 1 Refactoring** - Trial, Statistics, One-click renewal, BotStartService
4. **No Complexity** - No cycles, no tracking flags, no monitor jobs
5. **Separation of Concerns** - BotStartService extracts /start logic from BotService
6. **Multi-Language Support** - All messages support 8 languages via LLM
7. **Production Ready** - Simple, testable, maintainable

---

## Testing Checklist

### Trial System
- [ ] New user sees trial offer on /start
- [ ] Existing user does NOT see trial offer
- [ ] Trial activates immediately
- [ ] Expiration reminders work for trial (3 days before)
- [ ] Trial-to-paid conversion works

### Statistics
- [ ] Materialized view refreshes every 15 minutes
- [ ] Statistics show in onboarding message
- [ ] Handles zero data gracefully
- [ ] Performance acceptable (<100ms query)

### One-Click Renewal
- [ ] Button in reminder sends invoice directly
- [ ] Invoice has correct subscription details
- [ ] Payment extends subscription correctly
- [ ] Works for all subscription types

---

**Version:** 2.0.0
**Status:** Implementation Ready
**Last Updated:** 2025-10-31
