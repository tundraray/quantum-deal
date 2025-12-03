# Task: Implement StartCommandUpdate Handler for Partner Bot /start Command

Metadata:
- Dependencies: Task 1.2 (SQL messages), Task 1.4 (PartnerFlowService)
- Provides: libs/partner-bot/src/commands/start/start.update.ts
- Size: Small (1-2 files)

## Implementation Content

Implement NestJS Update handler for partner bot /start command. Sends welcome message and initiates channel subscription prompt flow.

**Reference dependency deliverables:**
- Task 1.2: migrations/partner_bot_messages.sql (partner_welcome message)
- Task 1.4: services/partner-flow.service.ts

## Target Files

- [x] `libs/partner-bot/src/commands/start/start.update.ts`
- [x] `libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.2 deliverable: migrations/partner_bot_messages.sql
- [x] Review Task 1.4 deliverable: services/partner-flow.service.ts
- [x] Create `libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts`
- [x] Write failing tests:
  - User sends /start command
  - BotMessagesRepository.resolveMessage() called with type 'partner_welcome'
  - Welcome message sent to user
  - bot_users.state.verification initialized to 'awaiting_channel_subscription'
  - PartnerFlowService.sendChannelPrompt() called
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/commands/start/start.update.ts`
- [x] Implement NestJS Update handler class with @Update() decorator
- [x] Add @Injectable() decorator for dependency injection
- [x] Inject dependencies: BotMessagesRepository, PartnerFlowService, BotUsersRepository
- [x] Implement @Command('start') decorated method handleStart(@Ctx() ctx: UserContext):
  - Get userId, botId, lang from context
  - Retrieve partner_welcome message via BotMessagesRepository.resolveMessage()
  - Send welcome message to user via ctx.reply()
  - Initialize bot_users.state.verification to 'awaiting_channel_subscription'
  - Call PartnerFlowService.sendChannelPrompt(userId, botId, lang)
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Add error handling for missing messages
- [x] Add structured logging for /start command usage
- [x] Extract common context extraction logic if needed
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: Unit tests verify correct flow)
- [x] State persisted correctly in database (via BotUsersRepository.updateState)
- [x] Message resolution works with fallback chain (via BotMessagesRepository.resolveMessage)
- [x] PartnerFlowService integration works (tested in unit tests)

## Notes

**Impact Scope:**
- Entry point for partner bot user flow
- Registered in PartnerBotModule (Task 1.7)
- Integration tested in Task 1.10

**Constraints:**
- Must use NestJS Telegraf decorators (@Update, @Command, @Ctx)
- Must inject dependencies via constructor
- Follow existing command handler patterns in libs/bot

**NestJS Framework Requirement:**
Class-based handler required for @Update and @Command decorators (NestJS Telegraf integration pattern)
