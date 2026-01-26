# Partner Bot Library

A NestJS library that implements a specialized partner bot flow for Telegram bots, gating trial activation behind channel subscription verification. This library enables partner-driven user acquisition by requiring users to subscribe to partner channels before accessing premium features.

## Overview

The Partner Bot library provides:

- **Channel Verification Flow**: User-initiated verification using Telegram `getChatMember` API
- **Trial Activation Integration**: Wrapper pattern reusing existing `TrialService` without modifications
- **Multi-Language Support**: 6 message types × 8 languages (48 messages)
- **Trial UI with Action Buttons**: Extend Free Period and Buy Subscription buttons
- **Daily Reminder System**: Indefinite reminders for expired trials until user action
- **Rate Limiting**: Protection against verification spam (10 attempts per hour)
- **State Management**: Atomic state transitions in `bot_users.state` JSONB field

## Prerequisites

Before using this library, ensure you have:

- **NestJS Application**: This library is built on NestJS framework
- **Telegraf Integration**: Uses Telegraf.js for Telegram Bot API
- **Existing Dependencies**:
  - `@quantumdeal/bot` - Core bot services (TrialService, BotCommandsService)
  - `@quantumdeal/db` - Database repositories
- **Bot Permissions**: Your bot must be able to call `getChatMember` on the partner channel (bot should be a member of the channel or channel must be public)

## Installation

### 1. Import PartnerBotModule

Add the `PartnerBotModule` to your application module:

```typescript
import { Module } from '@nestjs/common';
import { PartnerBotModule } from '@quantumdeal/partner-bot';

@Module({
  imports: [
    // ... other modules
    PartnerBotModule,
  ],
})
export class AppModule {}
```

### 2. Database Migration

Execute the partner bot messages SQL migration:

```bash
# Migration file: libs/db/migrations/YYYYMMDD_partner_bot_messages.sql
# This file contains 48 INSERT statements for bot_messages
psql -U your_user -d your_database -f libs/db/migrations/YYYYMMDD_partner_bot_messages.sql
```

The migration inserts 6 message types for 8 languages:
- `partner_welcome` - Welcome message sent on /start
- `partner_channel_prompt` - Prompts user to subscribe to channel
- `partner_verification_failed` - Shown when verification fails
- `partner_trial_activated` - Success message after trial activation
- `partner_trial_expired` - Daily reminder for expired trials
- `partner_coming_soon` - Placeholder for Buy Subscription button

Languages: `ru`, `en`, `uk`, `hi`, `fr`, `kk`, `uz`, `tg`

### 3. Dependency Injection Setup

The library uses NestJS dependency injection. Ensure these providers are available:

```typescript
// Required providers (from @quantumdeal/bot and @quantumdeal/db)
- BotMessagesRepository
- BotSettingsRepository
- BotUsersRepository
- UserSubscriptionsRepository
- TrialService
- BotCommandsService
- Telegraf (bot instance)
```

## Configuration

### Bot Settings Configuration

Configure your partner bot in the `bot_settings` table with the following JSON structure:

```json
{
  "features": {
    "partnerFlowEnabled": true
  },
  "partner": {
    "channelId": "@yourchannel",
    "channelUsername": "Your Channel Name",
    "referralUrl": "https://partner.example.com/referral"
  }
}
```

### Configuration Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `features.partnerFlowEnabled` | boolean | Yes | Feature flag to enable partner flow | Must be `true` |
| `partner.channelId` | string | Yes | Channel identifier (e.g., `@channelname` or numeric ID) | Must start with `@` or be numeric |
| `partner.channelUsername` | string | No | Display name for the channel | Used in messages |
| `partner.referralUrl` | string | Yes | URL for "Extend Free Period" button | Must be HTTPS |

### Configuration Example

```typescript
// Insert into bot_settings table
INSERT INTO bot_settings (bot_id, settings)
VALUES (2, '{
  "features": {
    "partnerFlowEnabled": true
  },
  "partner": {
    "channelId": "@mypartnerchannel",
    "channelUsername": "My Partner Channel",
    "referralUrl": "https://partner.example.com/extend-trial?ref=bot123"
  }
}');
```

### Validation Requirements

- **Channel ID**: Must be valid Telegram channel identifier (starts with `@` or is numeric)
- **Referral URL**: Must use HTTPS protocol
- **Feature Flag**: `partnerFlowEnabled` must be explicitly set to `true`

## Architecture

### State Machine

The partner bot flow follows this state machine:

```
undefined → awaiting_channel_subscription → channel_verified → trial_activated → trial_expired
```

State transitions are atomic and wrapped in database transactions.

### User State Structure

State is stored in `bot_users.state` JSONB field:

```typescript
{
  verificationState: 'awaiting_channel_subscription' | 'channel_verified' | 'trial_activated' | 'trial_expired',
  verificationAttempts: number,
  lastVerificationAttempt: Date,
  trialActivatedAt?: Date,
  trialExpiresAt?: Date
}
```

## API Reference

### Services

#### PartnerFlowService

Orchestrates the partner bot flow.

```typescript
import { PartnerFlowService } from '@quantumdeal/partner-bot';

// Send channel subscription prompt to user
await partnerFlowService.sendChannelPrompt(userId, botId, lang);

// Handle verification request from user
const result = await partnerFlowService.handleVerificationRequest(userId, botId);
// Returns: { verified: boolean, error?: string }

// Send trial UI with action buttons
await partnerFlowService.sendTrialUI(userId, botId, lang, expiresAt);
```

**Methods:**

- `sendChannelPrompt(userId: number, botId: number, lang: string): Promise<void>`
  - Sends channel subscription prompt with "I subscribed" button
  - Interpolates channel URL and name
  - Updates state to `awaiting_channel_subscription`

- `handleVerificationRequest(userId: number, botId: number): Promise<VerificationResult>`
  - Verifies channel membership
  - Activates trial if verified
  - Returns success/error result

- `sendTrialUI(userId: number, botId: number, lang: string, expiresAt: Date): Promise<void>`
  - Sends trial activated message
  - Includes "Extend Free Period" and "Buy Subscription" buttons
  - Sets user commands menu

#### ChannelVerifierService

Verifies user membership in partner channels.

```typescript
import { ChannelVerifierService } from '@quantumdeal/partner-bot';

// Verify user membership in channel
const isMember = await channelVerifierService.verifyMembership(channelId, userId);
// Returns: boolean

// Check if user is rate limited
const isLimited = await channelVerifierService.isRateLimited(userId, botId);
// Returns: boolean

// Get rate limit status
const status = await channelVerifierService.getRateLimitStatus(userId, botId);
// Returns: { attempts: number, resetAt: Date | null }
```

**Methods:**

- `verifyMembership(channelId: string, userId: number): Promise<boolean>`
  - Calls Telegram API `getChatMember`
  - Valid statuses: `member`, `administrator`, `creator`
  - Invalid statuses: `left`, `kicked`, `restricted`
  - Implements exponential backoff retry (3 attempts)

- `isRateLimited(userId: number, botId: number): Promise<boolean>`
  - Checks if user exceeded 10 attempts per hour
  - Returns `true` if rate limited

- `getRateLimitStatus(userId: number, botId: number): Promise<RateLimitStatus>`
  - Returns attempts count and reset timestamp

#### ReminderSchedulerService

Sends daily reminders to users with expired trials.

```typescript
import { ReminderSchedulerService } from '@quantumdeal/partner-bot';

// Process expired trials for a bot
const stats = await reminderSchedulerService.processExpiredTrials(botId);
// Returns: { sent: number, failed: number }
```

**Methods:**

- `processExpiredTrials(botId: number): Promise<ReminderStats>`
  - Queries expired trial subscriptions
  - Sends reminder messages with action buttons
  - Handles bot blocked errors gracefully
  - Returns statistics

**Cron Schedule:**
- Runs daily at 12:00 UTC
- Decorator: `@Cron('0 12 * * *')`

### Type Definitions

#### VerificationState

```typescript
type VerificationState =
  | 'awaiting_channel_subscription'
  | 'channel_verified'
  | 'trial_activated'
  | 'trial_expired';
```

#### PartnerBotSettings

```typescript
interface PartnerBotSettings {
  partner: string; // Channel ID (e.g., '@channelname')
}
```

#### PartnerBotUserState

```typescript
interface PartnerBotUserState {
  verificationState: VerificationState;
  verificationAttempts: number;
  lastVerificationAttempt?: Date;
  trialActivatedAt?: Date;
  trialExpiresAt?: Date;
}
```

#### VerificationResult

```typescript
interface VerificationResult {
  verified: boolean;
  error?: string;
}
```

#### ReminderStats

```typescript
interface ReminderStats {
  sent: number;
  skipped: number;
  failed: number;
}
```

### Command Handlers

#### StartCommandUpdate

Handles the `/start` command for partner bots.

```typescript
// Decorated with @Update() and @Command('start')
// Automatically registered by PartnerBotModule

// Flow:
// 1. Send welcome message (partner_welcome)
// 2. Initialize user state to awaiting_channel_subscription
// 3. Send channel prompt with "I subscribed" button
```

### Action Handlers

#### ChannelVerificationAction

Handles "I subscribed" button clicks.

```typescript
// Decorated with @Action('partner_verify_subscription')
// Automatically registered by PartnerBotModule

// Flow:
// 1. Check rate limit
// 2. Verify channel membership
// 3. If verified: activate trial, send success message
// 4. If not verified: send error message with retry button
```

#### TrialUIAction

Handles trial UI button clicks.

```typescript
// Decorated with @Action('partner_extend_trial')
// Handles "Extend Free Period" button
// Opens referral URL from bot_settings

// Decorated with @Action('partner_buy_subscription')
// Handles "Buy Subscription" button
// Shows "Coming soon" placeholder message
```

## Integration Guide

### How to Enable Partner Flow for a Bot

1. **Configure Bot Settings**:
   ```sql
   UPDATE bot_settings
   SET settings = settings || '{"features": {"partnerFlowEnabled": true}}'::jsonb
   WHERE bot_id = YOUR_BOT_ID;

   UPDATE bot_settings
   SET settings = settings || '{"partner": {"channelId": "@yourchannel", "referralUrl": "https://..."}}'::jsonb
   WHERE bot_id = YOUR_BOT_ID;
   ```

2. **Ensure Bot is Member of Channel**:
   - Add your bot as an administrator or member of the partner channel
   - Or ensure the channel is public

3. **Verify Message Localization**:
   ```sql
   SELECT type, lang, COUNT(*)
   FROM bot_messages
   WHERE type LIKE 'partner_%'
   GROUP BY type, lang
   ORDER BY type, lang;
   -- Should return 48 rows (6 types × 8 languages)
   ```

4. **Test the Flow**:
   - Send `/start` to your bot
   - Click "I subscribed" button
   - Verify trial activation

### Multi-Bot Architecture Compatibility

This library is fully compatible with the multi-bot architecture (ADR-006):

- **Dynamic Bot Loading**: Works with `DynamicTelegrafModule`
- **Bot Isolation**: Each bot has independent partner settings
- **Parallel Operation**: Partner bots and standard bots can run simultaneously
- **Webhook Support**: Compatible with webhook-based bot registration

### Message Localization Setup

Message resolution follows this hierarchy:

1. `bot_messages` table (bot-specific messages)
2. `messages` table (global messages)
3. English fallback
4. Hardcoded fallback

To customize messages for a specific bot:

```sql
INSERT INTO bot_messages (bot_id, type, lang, message)
VALUES (
  YOUR_BOT_ID,
  'partner_channel_prompt',
  'en',
  'To access premium features, please subscribe to our channel: {channelUrl}'
);
```

### State Management

State is stored in `bot_users.state` JSONB field:

```typescript
// Update state
await botUsersRepository.updateState(userId, botId, {
  verificationState: 'channel_verified',
  verificationAttempts: 1,
  lastVerificationAttempt: new Date(),
});

// Read state
const botUser = await botUsersRepository.findByUserAndBot(userId, botId);
const state = botUser?.state as PartnerBotUserState;
```

## Testing

### Run Unit Tests

```bash
# Run all partner-bot unit tests
npm test -- libs/partner-bot

# Run specific test file
npm test -- libs/partner-bot/src/services/__tests__/channel-verifier.service.spec.ts

# Run with coverage
npm test -- libs/partner-bot --coverage
```

### Run Integration Tests

```bash
# Run integration tests
npm test -- libs/partner-bot/src/__tests__/integration

# Specific integration test
npm test -- libs/partner-bot/src/__tests__/integration/partner-flow.int.spec.ts
```

### Run E2E Tests

```bash
# Run E2E tests (requires full application setup)
npm test -- libs/partner-bot/src/__tests__/e2e/partner-flow.e2e.spec.ts
```

### Test Coverage Requirements

The library maintains >70% test coverage:

- **Unit Tests**: All services and actions
- **Integration Tests**: Complete user flows
- **E2E Tests**: Critical user journeys

Current coverage:
- `ChannelVerifierService`: 88.6%
- `PartnerFlowService`: 92.4%
- `TrialUIAction`: 93.65%

## Troubleshooting

### Common Issues

#### 1. Channel ID Validation Errors

**Error**: `Partner configuration missing` or `Channel not found`

**Solution**:
- Verify channel ID format: Must start with `@` (e.g., `@channelname`) or be numeric
- Check bot is member/admin of the channel
- Test with: `await bot.telegram.getChatMember('@channelname', botUserId)`

#### 2. Rate Limiting Triggers

**Error**: User receives "Too many verification attempts" message

**Solution**:
- Rate limit: 10 attempts per hour per user
- Reset window: 1 hour after first attempt
- Manual reset (admin only):
  ```sql
  UPDATE bot_users
  SET state = state - 'verificationAttempts' - 'lastVerificationAttempt'
  WHERE telegram_id = USER_ID AND bot_id = BOT_ID;
  ```

#### 3. Telegram API Errors

**Error**: `USER_ID_INVALID` (400) or `CHAT_NOT_FOUND` (400)

**Solution**:
- Verify bot has access to the channel
- Check channel ID is correct
- Ensure user has interacted with the bot (started conversation)

**Error**: Network errors (500, 503, 429)

**Solution**:
- Library implements automatic retry with exponential backoff
- Retries: 3 attempts with 1s, 2s, 4s delays
- Check Telegram API status if persistent

#### 4. Missing Partner Configuration

**Error**: Trial activation fails with "Configuration error"

**Solution**:
```sql
-- Check bot_settings
SELECT settings->'partner' FROM bot_settings WHERE bot_id = YOUR_BOT_ID;

-- Should return:
-- {"channelId": "@channel", "referralUrl": "https://..."}

-- If missing, add configuration
UPDATE bot_settings
SET settings = settings || '{"partner": {"channelId": "@channel", "referralUrl": "https://partner.com"}}'::jsonb
WHERE bot_id = YOUR_BOT_ID;
```

#### 5. Trial Activation Failures

**Error**: Verification succeeds but trial not activated

**Solution**:
- Check TrialService logs
- Verify user doesn't have existing subscription
- Check database transaction succeeded:
  ```sql
  SELECT * FROM user_subscriptions WHERE user_id = USER_ID AND bot_id = BOT_ID;
  ```
- Verify state transitions:
  ```sql
  SELECT state FROM bot_users WHERE telegram_id = USER_ID AND bot_id = BOT_ID;
  ```

#### 6. Reminder Job Not Executing

**Error**: Expired users not receiving daily reminders

**Solution**:
- Check cron job is enabled in NestJS scheduler
- Verify bot ID is configured in cron handler
- Check logs for job execution:
  ```
  [ReminderSchedulerService] Starting expired trial reminder job
  ```
- Manually trigger for testing:
  ```typescript
  await reminderSchedulerService.processExpiredTrials(botId);
  ```

#### 7. Message Not Found Errors

**Error**: Message resolution fails with "Message not found"

**Solution**:
```sql
-- Verify messages exist
SELECT type, lang, COUNT(*)
FROM bot_messages
WHERE bot_id = YOUR_BOT_ID AND type LIKE 'partner_%'
GROUP BY type, lang;

-- Should return 6 rows (one per message type)
-- If missing, re-run migration
```

## Performance Considerations

### Verification Response Time

- **Target**: < 3 seconds from button click to user feedback
- **Factors**:
  - Telegram API latency (~500ms-1s)
  - Database queries (~50-100ms)
  - Rate limit check (~10ms)
  - State updates (~50ms)

### Reminder Job Performance

- **Batch Size**: Process 100 users per batch
- **Execution Time**: ~1-5 minutes for 1000 expired users
- **Error Isolation**: Failed sends don't block other users
- **Graceful Degradation**: Bot blocked errors logged but not failed

### Rate Limiting

- **Verification Attempts**: 10 per hour per user
- **Reset Window**: 1 hour after first attempt in window
- **Storage**: Tracked in `bot_users.state` (no additional tables)

## Contributing

### Code Standards

- **TypeScript**: Strict type checking, no `any` types (except for wrapper pattern)
- **Testing**: TDD process (Red-Green-Refactor)
- **Coverage**: Maintain >70% line coverage
- **Linting**: Follow ESLint configuration
- **Formatting**: Use Prettier for code formatting

### TDD Process

1. **Red**: Write failing test
2. **Green**: Implement minimum code to pass
3. **Refactor**: Improve code quality

### Commit Message Conventions

Follow conventional commits:

```
feat(partner-bot): add channel verification rate limiting
fix(partner-bot): handle bot blocked errors in reminder job
test(partner-bot): add integration test for verification flow
docs(partner-bot): update API reference for ReminderSchedulerService
```

### Pull Request Process

1. Create feature branch: `feature/partner-bot-<feature-name>`
2. Implement with tests (>70% coverage)
3. Run quality checks:
   ```bash
   npm run typecheck
   npm run lint
   npm run format
   npm run test
   npm run build
   ```
4. Create PR with description
5. Request review
6. Address feedback
7. Merge after approval

## Related Documentation

- **Design Document**: `docs/design/partner-bot-flow-design.md` (v1.1.0, Approved)
- **Architecture Decision Record**: `docs/adr/ADR-008-partner-bot-flow-architecture.md` (v1.0.0, Proposed)
- **Product Requirements**: `docs/prd/partner-bot-flow-prd.md` (v1.1.0, Approved)
- **Work Plan**: `docs/plans/20251202-feature-partner-bot-flow.md`
- **Multi-Bot Architecture**: `docs/adr/ADR-006-dynamic-telegraf-module.md`

## License

[Your License Here]

## Support

For issues or questions:
- Create an issue in the repository
- Contact the development team
- Check troubleshooting section above

---

**Version**: 1.0.0
**Last Updated**: 2025-12-02
**Status**: Production Ready
