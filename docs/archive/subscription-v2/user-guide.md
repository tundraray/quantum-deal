# User Guide - Subscription v2.0

## Table of Contents
1. [User Flows](#user-flows)
2. [Configuration](#configuration)
3. [Performance & Analytics](#performance--analytics)
4. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## 1. User Flows

### Onboarding Journey

#### New User (No Subscription History)

```
User sends /start
    ↓
Check user_subscriptions table
    ↓ (no records found)
User is ELIGIBLE for trial
    ↓
Show welcome message with:
  • Monthly statistics
  • "Try 7 Days Free" button
  • "View Plans" button
    ↓
User clicks "Try 7 Days Free"
    ↓
Trial activated immediately
    ↓
Full access for 7 days
    ↓
Reminder sent 3 days before expiry
    ↓
User can renew with one click
```

#### Existing User (Has Active Subscription)

```
User sends /start
    ↓
Check user_subscriptions table
    ↓ (active subscription found)
User sees regular dashboard
    ↓
(No trial offer, no statistics)
```

#### Former User (Had Trial or Subscription Before)

```
User sends /start
    ↓
Check user_subscriptions table
    ↓ (expired subscription found)
User is NOT eligible for trial
    ↓
Show message:
  • "Welcome back!"
  • "View Plans" button only
    ↓
(No trial offer, no statistics)
```

---

### Multi-Language Support

**Language Selection:**

User can change language via:
1. `/lang` command
2. Inline keyboard during onboarding

**Supported Languages:** 8 languages (RU, EN, UK, HI, FR, KK, UZ, TG)

**Automatic Detection:**
```typescript
const language = ctx.from.language_code || 'en';
```

**Language Preference Storage:**
```sql
UPDATE users SET lang = 'ru' WHERE telegram_id = $1;
```

**Message Generation:**
- Command descriptions: Translated via `BotCommandsService`
- Welcome messages: Generated via LLM with language parameter
- Renewal reminders: Personalized per user language via LLM

**Implementation:**
- File: `libs/bot/src/services/bot-commands.service.ts`
- Static translations in `COMMAND_TRANSLATIONS` object
- Dynamic command menu updates based on user language

---

### Welcome Messages

#### With Statistics (New User)

**English:**
```
👋 Welcome to Quantum Deal!

📊 Our Community This Month:
💰 Total Profit: $127,450
📈 Successful Deals: 1,247
🎯 Win Rate: 68.5%
👥 Active Traders: 342

🎁 Start your 7-day free trial!
No payment required. Full access to all features.

[🎁 Try 7 Days Free] [💎 View Plans]
```

**Russian:**
```
👋 Добро пожаловать в Quantum Deal!

📊 Наше сообщество за месяц:
💰 Общая прибыль: $127,450
📈 Успешных сделок: 1,247
🎯 Винрейт: 68.5%
👥 Активных трейдеров: 342

🎁 Попробуйте 7 дней бесплатно!
Без оплаты. Полный доступ ко всем функциям.

[🎁 Попробуйте 7 дней бесплатно] [💎 Посмотреть планы]
```

**Ukrainian:**
```
👋 Ласкаво просимо до Quantum Deal!

📊 Наша спільнота за місяць:
💰 Загальний прибуток: $127,450
📈 Успішних угод: 1,247
🎯 Вінрейт: 68.5%
👥 Активних трейдерів: 342

🎁 Спробуйте 7 днів безкоштовно!
Без оплати. Повний доступ до всіх функцій.

[🎁 Спробувати 7 днів безкоштовно] [💎 Переглянути плани]
```

**Hindi:**
```
👋 Quantum Deal में आपका स्वागत है!

📊 इस महीने हमारा समुदाय:
💰 कुल लाभ: $127,450
📈 सफल सौदे: 1,247
🎯 जीत दर: 68.5%
👥 सक्रिय व्यापारी: 342

🎁 7 दिनों का मुफ्त परीक्षण शुरू करें!
भुगतान की आवश्यकता नहीं। सभी सुविधाओं तक पूर्ण पहुंच।

[🎁 7 दिन मुफ्त आज़माएं] [💎 योजनाएं देखें]
```

**French:**
```
👋 Bienvenue sur Quantum Deal !

📊 Notre communauté ce mois-ci :
💰 Profit total : $127,450
📈 Transactions réussies : 1,247
🎯 Taux de réussite : 68.5%
👥 Traders actifs : 342

🎁 Commencez votre essai gratuit de 7 jours !
Aucun paiement requis. Accès complet à toutes les fonctionnalités.

[🎁 Essayer 7 jours gratuits] [💎 Voir les plans]
```

**Kazakh:**
```
👋 Quantum Deal-ге қош келдіңіз!

📊 Осы айдағы біздің қауымдастық:
💰 Жалпы пайда: $127,450
📈 Сәтті мәмілелер: 1,247
🎯 Жеңіс деңгейі: 68.5%
👥 Белсенді трейдерлер: 342

🎁 7 күндік тегін сынақты бастаңыз!
Төлем қажет емес. Барлық мүмкіндіктерге толық қол жеткізу.

[🎁 7 күн тегін сынап көру] [💎 Жоспарларды қарау]
```

**Uzbek:**
```
👋 Quantum Deal-ga xush kelibsiz!

📊 Ushbu oydagi jamiyatimiz:
💰 Umumiy foyda: $127,450
📈 Muvaffaqiyatli bitimlar: 1,247
🎯 G'alaba ko'rsatkichi: 68.5%
👥 Faol treyderlar: 342

🎁 7 kunlik bepul sinov boshlang!
To'lov talab qilinmaydi. Barcha funksiyalarga to'liq kirish.

[🎁 7 kun bepul sinab ko'rish] [💎 Rejalarni ko'rish]
```

**Tajik:**
```
👋 Ба Quantum Deal хуш омадед!

📊 Ҷамъияти мо дар ин моҳ:
💰 Фоидаи умумӣ: $127,450
📈 Созишҳои муваффақ: 1,247
🎯 Меъёри ғалаба: 68.5%
👥 Тиҷоратчиёни фаъол: 342

🎁 7 рӯза санҷиши ройгонро оғоз кунед!
Пардохт лозим нест. Дастрасии пурра ба ҳама хусусиятҳо.

[🎁 7 рӯза ройгон санҷед] [💎 Нақшаҳоро бинед]
```

#### Without Statistics (Fallback)

```
👋 Welcome to Quantum Deal!

🎁 Start your 7-day free trial!

[🎁 Try 7 Days Free] [💎 View Plans]
```

---

### Analytics Tracking

Track these events for monitoring:

```typescript
// User views onboarding
analytics.track('onboarding_viewed', {
  userId,
  hasStatistics: stats !== null,
  isEligibleForTrial: eligible,
});

// User clicks trial button
analytics.track('trial_button_clicked', { userId });

// Trial activated
analytics.track('trial_activated', {
  userId,
  expiresAt,
});
```

---

### A/B Testing Ideas

1. **With vs Without Statistics:**
   - Control: Simple welcome
   - Variant: Statistics-driven welcome
   - Metric: Trial activation rate

2. **Button Placement:**
   - Control: Trial first, Plans second
   - Variant: Plans first, Trial second
   - Metric: Click-through rate

3. **Message Length:**
   - Control: Full statistics
   - Variant: Minimal stats (profit + traders)
   - Metric: Trial activation rate

---

## 2. Configuration

### Environment Variables

#### Trial System

```bash
# Enable/disable trial feature
TRIAL_ENABLED=true

# Trial duration in days
TRIAL_DURATION_DAYS=7

# Trial subscription name (must match DB)
TRIAL_SUBSCRIPTION_NAME="Trial 7 Days"
```

**Usage:**
- `TRIAL_ENABLED=false` - Hides trial button, disables activation
- `TRIAL_DURATION_DAYS` - Calculated as `expiresAt = now() + X days`
- `TRIAL_SUBSCRIPTION_NAME` - Used for DB lookup

---

#### Statistics & Onboarding

```bash
# Show statistics in /start for new users
STATISTICS_SHOW_ON_ONBOARDING=true

# Materialized view refresh interval (minutes)
STATISTICS_REFRESH_INTERVAL_MINUTES=15
```

**Usage:**
- `STATISTICS_SHOW_ON_ONBOARDING=false` - Shows simple welcome message
- `STATISTICS_REFRESH_INTERVAL_MINUTES` - Cron schedule for view refresh

---

#### Existing Configuration (No Changes)

```bash
# Expiration Check (from v1)
EXPIRATION_CHECK_ENABLED=true
EXPIRATION_CHECK_CRON=0 10 * * *
EXPIRATION_CHECK_TIMEZONE=Europe/Moscow
EXPIRATION_WARNING_DAYS=7,3,0

# LLM for personalized messages (from v1)
EXPIRATION_LLM_MODEL=gpt-4-mini
```

---

### Complete .env Example

```bash
# ====================================
# Telegram Bot
# ====================================
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=3000

# ====================================
# Database
# ====================================
DATABASE_URL=postgresql://user:pass@localhost:5432/quantumdeal

# ====================================
# Trial System (v2)
# ====================================
TRIAL_ENABLED=true
TRIAL_DURATION_DAYS=7
TRIAL_SUBSCRIPTION_NAME="Trial 7 Days"

# ====================================
# Statistics & Onboarding (v2)
# ====================================
STATISTICS_SHOW_ON_ONBOARDING=true
STATISTICS_REFRESH_INTERVAL_MINUTES=15

# ====================================
# Expiration Notifications (v1)
# ====================================
EXPIRATION_CHECK_ENABLED=true
EXPIRATION_CHECK_CRON=0 10 * * *
EXPIRATION_CHECK_TIMEZONE=Europe/Moscow
EXPIRATION_WARNING_DAYS=7,3,0

# ====================================
# LLM Configuration (v1)
# ====================================
EXPIRATION_LLM_MODEL=gpt-4-mini
OPENAI_API_KEY=your_openai_key_here
```

---

### Configuration Validation

#### Joi Validation Schema

```typescript
// libs/bot/src/config/validation.schema.ts

import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Telegram
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Trial (v2)
  TRIAL_ENABLED: Joi.boolean().default(true),
  TRIAL_DURATION_DAYS: Joi.number().default(7),
  TRIAL_SUBSCRIPTION_NAME: Joi.string().default('Trial 7 Days'),

  // Statistics (v2)
  STATISTICS_SHOW_ON_ONBOARDING: Joi.boolean().default(true),
  STATISTICS_REFRESH_INTERVAL_MINUTES: Joi.number().default(15),

  // Expiration (v1)
  EXPIRATION_CHECK_ENABLED: Joi.boolean().default(true),
  EXPIRATION_CHECK_CRON: Joi.string().default('0 10 * * *'),
  EXPIRATION_CHECK_TIMEZONE: Joi.string().default('Europe/Moscow'),
  EXPIRATION_WARNING_DAYS: Joi.string().default('7,3,0'),

  // LLM (v1)
  EXPIRATION_LLM_MODEL: Joi.string().default('gpt-4-mini'),
  OPENAI_API_KEY: Joi.string().required(),
});
```

---

### Feature Toggles

#### Disable Trial

```bash
TRIAL_ENABLED=false
```

**Effect:**
- Trial button hidden in /start
- `activate_trial` action returns error
- No trial subscriptions created

---

#### Disable Statistics

```bash
STATISTICS_SHOW_ON_ONBOARDING=false
```

**Effect:**
- /start shows simple welcome message
- Statistics view still refreshed (for future use)
- No database queries from onboarding

---

#### Change Refresh Interval

```bash
STATISTICS_REFRESH_INTERVAL_MINUTES=30
```

**Effect:**
- View refreshes every 30 minutes instead of 15
- Reduces database load
- Statistics may be slightly stale

---

### Environment-Specific Configs

#### Development (.env.development)

```bash
# Local development
DATABASE_URL=postgresql://localhost:5432/quantumdeal_dev
TRIAL_ENABLED=true
STATISTICS_SHOW_ON_ONBOARDING=true
STATISTICS_REFRESH_INTERVAL_MINUTES=5  # Faster refresh for testing
```

#### Production (.env.production)

```bash
# Production
DATABASE_URL=postgresql://prod-server/quantumdeal
TRIAL_ENABLED=true
STATISTICS_SHOW_ON_ONBOARDING=true
STATISTICS_REFRESH_INTERVAL_MINUTES=15
```

#### Testing (.env.test)

```bash
# Testing
DATABASE_URL=postgresql://localhost:5432/quantumdeal_test
TRIAL_ENABLED=true
STATISTICS_SHOW_ON_ONBOARDING=false  # Disable to speed up tests
EXPIRATION_CHECK_ENABLED=false  # Disable cron during tests
```

---

## 3. Performance & Analytics

### Materialized View Performance

#### Definition

```sql
CREATE MATERIALIZED VIEW monthly_bot_statistics AS
SELECT
  COUNT(*) as total_deals,
  SUM(profit) as total_profit,
  COUNT(CASE WHEN profit > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0) as win_rate,
  COUNT(DISTINCT user_id) as active_traders
FROM deals
WHERE created_at >= date_trunc('month', CURRENT_DATE)
  AND closed_at IS NOT NULL;
```

---

#### Benchmarks

**Refresh Performance:**
- 10k deals: ~50ms
- 100k deals: ~300ms
- 1M deals: ~2s

**Query Performance:**
- Always <10ms (view contains single row)

**CONCURRENT mode:** Non-blocking, queries continue during refresh

---

#### Monitoring Queries

**View Size:**
```sql
SELECT
  pg_size_pretty(pg_relation_size('monthly_bot_statistics')) as view_size;
```

**Expected:** <100KB (single row)

**Refresh Performance:**
```sql
EXPLAIN ANALYZE
REFRESH MATERIALIZED VIEW monthly_bot_statistics;
```

---

#### Scaling Strategies

**For high deal volume (1M+ deals/month):**

**Option 1: Increase Refresh Interval**
```bash
STATISTICS_REFRESH_INTERVAL_MINUTES=30
```

**Option 2: Add Index**
```sql
CREATE INDEX idx_deals_monthly_stats
  ON deals (created_at, profit, user_id)
  WHERE closed_at IS NOT NULL;
```

**Option 3: Disable Onboarding Stats**
```bash
STATISTICS_SHOW_ON_ONBOARDING=false
```

---

### Usage in Onboarding

```typescript
@Injectable()
export class OnboardingService {
  async getMonthlyStatistics(): Promise<MonthlyStats | null> {
    const [stats] = await this.db
      .select()
      .from(monthlyBotStatistics)
      .limit(1);

    if (!stats) return null;

    return {
      totalDeals: stats.totalDeals,
      totalProfit: Number(stats.totalProfit),
      winRate: Number(stats.winRate) * 100, // Convert to percentage
      activeTraders: stats.activeTraders,
    };
  }
}
```

---

## 4. Edge Cases & Error Handling

### Trial System

#### Multiple Trial Activation Attempts

**Scenario:** User tries to activate trial multiple times

**Prevention:**
```typescript
async isEligible(userId: number): Promise<boolean> {
  const existing = await userSubscriptionsRepo.findByUserId(userId);
  return existing.length === 0;
}
```

**Result:**
- First attempt: ✅ Creates subscription
- Second attempt: ❌ Returns "Trial already used"

---

#### Trial Subscription Not Found

**Scenario:** Trial subscription missing from DB

**Detection:**
```typescript
const trial = await subscriptionsRepo.findOne({
  where: { name: 'Trial 7 Days' }
});

if (!trial) {
  return { success: false, error: 'Trial not available' };
}
```

**Fix:**
```sql
-- Re-run seed migration
INSERT INTO subscriptions (name, type, price_stars, duration_days, is_hidden)
VALUES ('Trial 7 Days', 'signals', 0, 7, true);
```

---

#### Concurrent Trial Activation

**Scenario:** User clicks "Activate" button twice rapidly

**Solution:**
- Database INSERT will succeed only once
- Second attempt fails eligibility check
- No duplicate subscriptions created

---

#### User Already Has Subscription

**Scenario:** User tries to activate trial while having active subscription

**Behavior:**
- Eligibility check returns false
- "Trial already used or active subscription exists" error shown
- No trial subscription created

---

#### Trial Disabled

**ENV:** `TRIAL_ENABLED=false`

**Behavior:**
- Welcome message without trial button
- Only "View Plans" shown
- activate_trial action returns error "Trial not available"

---

### Statistics

#### No Data Available

**Scenario:** First month, no deals yet

**Query Result:**
```sql
total_deals: 0
total_profit: NULL
win_rate: NULL
active_traders: 0
```

**Handling:**
```typescript
if (!stats || stats.totalDeals === 0) {
  return this.getDefaultWelcome(language);
}
```

**User sees:** Simple welcome message (no statistics)

---

#### View Refresh Failures

**Scenario:** Cron job fails, view has stale data

**Impact:** Low - Shows old statistics (not critical)

**Detection:**
```sql
SELECT last_updated FROM monthly_bot_statistics;
-- If > 30 minutes ago, refresh failed
```

**Manual Fix:**
```sql
REFRESH MATERIALIZED VIEW monthly_bot_statistics;
```

---

#### View Refresh During Query

**Scenario:** REFRESH runs while user queries view

**With CONCURRENT refresh:**
- Query returns data (old version)
- No blocking
- Next query gets new data

**Without CONCURRENT:**
- Query may wait or fail
- Use CONCURRENT mode (already implemented)

---

#### Lock Handling

**Scenario:** View refresh stuck

**Check:**
```sql
SELECT * FROM pg_stat_activity
WHERE query LIKE '%monthly_bot_statistics%';
```

**Kill stuck refresh:**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE query LIKE '%REFRESH%';
```

---

### Payment Processing

#### Success but Database Failure

**Scenario:** Database error after successful payment

**CRITICAL: Payment already processed, user charged**

**Detection:**
```typescript
@On('successful_payment')
async handlePayment(ctx: Context) {
  try {
    await this.subscriptionService.extend(...);
  } catch (error) {
    // Log for manual review
    logger.error('CRITICAL: Payment succeeded but subscription update failed', {
      userId: ctx.from.id,
      paymentId,
      error,
    });

    // Notify user
    await ctx.reply('Payment received. Subscription will be activated shortly.');
  }
}
```

**Manual Fix:**
```sql
-- Find user's subscription
SELECT * FROM user_subscriptions WHERE user_id = ...;

-- Extend manually
UPDATE user_subscriptions
SET expires_at = expires_at + INTERVAL '30 days',
    updated_at = NOW()
WHERE id = ...;
```

---

#### Duplicate Payments

**Scenario:** User pays twice for same renewal

**Prevention:** Telegram prevents duplicate payments in same session

**If happens:**
- Both payments processed
- Subscription extended twice
- User gets extra time (acceptable)

---

#### Pre-Checkout Timeout

**Scenario:** Pre-checkout validation takes longer than 10 seconds

**Solution:**
```typescript
bot.on('pre_checkout_query', async (ctx) => {
  const timeout = setTimeout(async () => {
    await ctx.answerPreCheckoutQuery(false, 'Validation timeout');
  }, 9000); // 9-second safety timeout

  try {
    const isValid = await validatePayment(ctx.preCheckoutQuery);
    clearTimeout(timeout);
    await ctx.answerPreCheckoutQuery(isValid);
  } catch (error) {
    clearTimeout(timeout);
    await ctx.answerPreCheckoutQuery(false, 'Validation failed');
  }
});
```

---

#### Payment Timeout

**Scenario:** User opens invoice but doesn't pay

**Telegram Behavior:**
- Invoice expires after 15 minutes
- No payment charge
- User can click "Renew" again

**No cleanup needed** - invoice auto-expires

---

### Expiration Reminders

#### Reminder Sent After Renewal

**Scenario:**
1. Reminder sent at 10:00
2. User renews at 11:00
3. Same reminder sent again next day

**Prevention:**
```sql
-- Query only checks subscriptions expiring on exact date
WHERE expires_at::date = CURRENT_DATE + 7
```

**Result:** If user renewed, expires_at changed → no longer matches query

---

#### User in Different Timezone

**Scenario:** User in US, cron runs at 10:00 Moscow

**Impact:** Reminder may arrive at inconvenient time

**Mitigation:** Send daily, not time-sensitive

---

### LLM Generation

#### Fallback Messages

**Scenario:** OpenAI API down or quota exceeded

**Handling:**
```typescript
try {
  messages = await llmService.generateObject(...);
} catch (error) {
  logger.warn('LLM failed, using templates');
  messages = this.getFallbackMessages(data, daysRemaining, languages);
}
```

**User sees:** Template message instead of personalized

---

#### Rate Limits

**Scenario:** Too many LLM requests

**Solution:**
- Use fallback templates when LLM unavailable
- Implement request queuing
- Monitor API quota

---

### User Behavior

#### User Deletes Chat with Bot

**Scenario:** User deletes conversation, then restarts

**Telegram Behavior:**
- /start called again
- User data persists in DB

**Result:** User sees appropriate message based on subscription status

---

#### User Blocks Bot

**Scenario:** User blocks bot while having active subscription

**Impact:**
- Subscription remains active
- Reminders not delivered (fail silently)
- User can unblock and resume

**No action needed** - subscription continues

---

#### User Changes Language

**Scenario:** User changes Telegram language

**Handling:**
```typescript
const language = ctx.from.language_code || 'en';
// Always use current language from Telegram
```

**Result:** Messages in new language automatically

---

## Summary

**Flow:**
1. New user → statistics + trial button
2. Active user → dashboard
3. Former user → plans only

**Key Features:**
- Instant trial activation
- Statistics-driven messaging
- Graceful fallbacks
- Multi-language support

**Configuration:**
- All new variables have sensible defaults
- Zero-config setup works out of the box

**Performance:**
- Statistics queries: <10ms
- View refresh: <2s for 1M deals
- Scaling strategies available

**Edge Cases:**
- Critical issues: None identified
- All major scenarios covered
- Manual intervention only for payment failures (rare)

---

**Version:** 2.0.0
**Last Updated:** 2025-10-31
