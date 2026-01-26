# Task: Create Default Bot Seed Data

Metadata:
- Phase: 4 (Seed Data and Final QA)
- Dependencies: Phase 3 complete (repositories implemented)
- Provides: Default bot in database, existing records updated
- Size: Small (seed script or migration)
- Verification Level: L2 (Seed data created and verified)

## Implementation Content

Create seed data for the default bot (QuantumDealBot) and populate botId for existing records. This ensures backward compatibility with existing single-bot setup.

## Target Files
- [x] `drizzle/seeds/default-bot.seed.ts` OR migration file (implementation choice)

## Implementation Steps

### 1. Create Default Bot Record

Insert the default bot with current environment configuration:

```typescript
// Using BotsRepository
const defaultBot = await botsRepository.create({
  token: process.env.TELEGRAM_BOT_TOKEN,
  name: 'QuantumDealBot',
  username: 'QuantumDealBot',
  webhookPath: '/bot',
  isDynamic: false,  // Static bot managed by nest-telegraf
  isActive: true,
})
```

### 2. Create Default Bot Settings

```typescript
// Using BotSettingsRepository
await botSettingsRepository.upsert(defaultBot.id, {
  settings: DEFAULT_BOT_SETTINGS,
})
```

### 3. Populate botId for Existing user_subscriptions

```sql
UPDATE user_subscriptions
SET bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1)
WHERE bot_id IS NULL;
```

### 4. Populate botId for Existing codes

```sql
UPDATE codes
SET bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1)
WHERE bot_id IS NULL;
```

### 5. Create bot_users for Existing Users

```sql
INSERT INTO bot_users (user_id, bot_id, lang, is_active)
SELECT u.telegram_id, b.id, u.lang, u.is_active
FROM users u
CROSS JOIN (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1) b
ON CONFLICT (user_id, bot_id) DO NOTHING;
```

### 6. Verify Seed Data

```sql
-- Verify default bot exists
SELECT * FROM bots WHERE name = 'QuantumDealBot';

-- Verify bot settings
SELECT * FROM bot_settings WHERE bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot');

-- Verify user_subscriptions updated
SELECT COUNT(*) FROM user_subscriptions WHERE bot_id IS NOT NULL;
SELECT COUNT(*) FROM user_subscriptions WHERE bot_id IS NULL;  -- Should be 0

-- Verify codes updated
SELECT COUNT(*) FROM codes WHERE bot_id IS NOT NULL;
SELECT COUNT(*) FROM codes WHERE bot_id IS NULL;  -- Should be 0

-- Verify bot_users created
SELECT COUNT(*) FROM bot_users;
```

## Implementation Options

### Option A: Seed Script (Recommended for Development)
Create `drizzle/seeds/default-bot.seed.ts`:
```typescript
import { db } from '../../libs/db/src'
import { BotsRepository } from '../../libs/db/src/repositories'
// ... implementation
```

Run with: `npx ts-node drizzle/seeds/default-bot.seed.ts`

### Option B: Migration (Recommended for Production)
Add to migration file or create new migration:
```sql
-- drizzle/migrations/XXXX_seed_default_bot.sql
-- SQL implementation from steps above
```

## Completion Criteria
- [x] Default bot (QuantumDealBot) created in bots table
- [x] Default bot settings created in bot_settings table
- [x] All existing user_subscriptions have botId populated
- [x] All existing codes have botId populated
- [x] bot_users entries created for all existing users
- [x] No NULL botId in user_subscriptions or codes

## Verification Queries

```sql
-- 1. Verify default bot
SELECT id, name, username, is_active FROM bots WHERE name = 'QuantumDealBot';
-- Expected: 1 row

-- 2. Verify settings
SELECT id, bot_id, settings FROM bot_settings WHERE bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot');
-- Expected: 1 row

-- 3. Verify no orphan subscriptions
SELECT COUNT(*) AS orphan_count FROM user_subscriptions WHERE bot_id IS NULL;
-- Expected: 0

-- 4. Verify no orphan codes
SELECT COUNT(*) AS orphan_count FROM codes WHERE bot_id IS NULL;
-- Expected: 0

-- 5. Verify bot_users count matches users count
SELECT (SELECT COUNT(*) FROM bot_users) AS bot_users_count,
       (SELECT COUNT(*) FROM users) AS users_count;
-- Expected: Counts should match
```

## Notes
- Impact scope: Populates existing data with botId
- Constraints: Token must come from environment variable (not hardcoded)
- renewal_tariffs.bot_id intentionally left NULL (global tariffs)
- This enables backward compatibility during transition
