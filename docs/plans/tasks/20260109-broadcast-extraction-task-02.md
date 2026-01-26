# Task: Create BroadcastUpdate Class Structure

Metadata:
- Phase: 1 (Foundation)
- Dependencies: Task 01 (BROADCAST constant)
- Provides: BroadcastUpdate class skeleton for handler implementation
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content

Create the `BroadcastUpdate` class file with proper decorators, constructor dependencies, and method stubs. This establishes the class structure that will be populated with handler implementations in Task 3.

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts` (NEW)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No test needed for class structure (L3 verification)
- [x] Verify file does not exist yet

### 2. Green Phase
- [x] Create new file `libs/masterbot/src/broadcast.update.ts`
- [x] Add required imports
- [x] Define class with decorators:
  - `@Update()`
  - `@UseInterceptors(ResponseTimeInterceptor)`
  - `@UseFilters(TelegrafExceptionFilter)`
- [x] Add constructor with dependencies:
  - `@InjectBot(BotName) bot: Telegraf<UserContext>`
  - `broadcastService: BroadcastService`
  - `subscriptionsRepository: SubscriptionsRepository`
  - `botsRepository: BotsRepository`
  - `masterbotService: MasterbotService`
- [x] Add `ensureSession(ctx)` helper method (copy from MasterbotUpdate)
- [x] Add method stubs for all handlers (empty implementations returning void)

### 3. Refactor Phase
- [x] Verify consistent formatting with MasterbotUpdate
- [x] Ensure all imports are properly organized

## Code Template

```typescript
// libs/masterbot/src/broadcast.update.ts
import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import { Action, Command, Ctx, On, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

import { BotsRepository, SubscriptionsRepository } from '@quantum-deal/db';
import { InjectBot, ResponseTimeInterceptor, TelegrafExceptionFilter } from '@quantum-deal/telegraf';

import { BotName } from './constants';
import { UserContext } from './interfaces';
import { BroadcastService } from './services/broadcast.service';
import { MasterbotService } from './services/masterbot.service';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BroadcastUpdate {
  private readonly logger = new Logger(BroadcastUpdate.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Telegraf<UserContext>,
    private readonly broadcastService: BroadcastService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botsRepository: BotsRepository,
    private readonly masterbotService: MasterbotService,
  ) {}

  // Command handler
  @Command('broadcast')
  async onBroadcastCommand(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  // Action handlers
  @Action(/^broadcast_sub_(\d+)$/)
  async onBroadcastSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action('broadcast_filter_active')
  async onBroadcastFilterActive(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action('broadcast_filter_expired')
  async onBroadcastFilterExpired(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action('broadcast_bot_all')
  async onBroadcastBotAll(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action(/^broadcast_bot_(\d+)$/)
  async onBroadcastBotSelected(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action('broadcast_confirm')
  async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  @Action('broadcast_cancel')
  async onBroadcastCancel(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  // Text handler for broadcast flow
  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  // Private helpers
  private ensureSession(ctx: UserContext): void {
    // Copy from MasterbotUpdate
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.flowState = ctx.session.flowState ?? null;
    ctx.session.broadcastSubscriptionId = ctx.session.broadcastSubscriptionId ?? null;
    ctx.session.broadcastMessage = ctx.session.broadcastMessage ?? null;
    ctx.session.broadcastMessageEntities = ctx.session.broadcastMessageEntities ?? null;
    ctx.session.broadcastFilterStatus = ctx.session.broadcastFilterStatus ?? null;
    ctx.session.broadcastFilterBotId = ctx.session.broadcastFilterBotId ?? null;
  }

  private async showStatusFilterKeyboard(ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  private async showBotFilterKeyboard(ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }

  private async handleBroadcastMessageInput(ctx: UserContext): Promise<void> {
    // TODO: Implement in Task 3
  }
}
```

## Completion Criteria

- [x] `broadcast.update.ts` file exists
- [x] Class has correct decorators (@Update, @UseInterceptors, @UseFilters)
- [x] Constructor has all required dependencies
- [x] All method stubs defined with proper decorators
- [x] `ensureSession` helper implemented
- [x] Build succeeds: `npm run build`
- [x] Type check passes: `npm run check` (N/A - script not present, verified via tsc --noEmit)

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- Pattern Reference: Follow `MasterbotUpdate` class structure exactly
- Impact scope: New file only, no changes to existing files
- Constraints: Do not register in module yet (Task 4)
- Estimated time: 15 minutes
