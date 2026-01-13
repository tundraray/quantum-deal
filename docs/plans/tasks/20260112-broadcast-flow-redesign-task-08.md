# Task: Update Preview with Breakdown

Metadata:
- Dependencies: Task 3 (getUniqueUserCount), Task 7 (selection complete)
- Provides: Updated preview message in `broadcast.update.ts`
- Size: Small (1 file)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC5 (Preview with User Count Breakdown)

## Implementation Content

Update the broadcast preview message generation to:
1. Call `getUniqueUserCount` with selected subscription IDs
2. Display total unique user count (deduplicated)
3. Show per-subscription breakdown with names and counts
4. Display overlap information ("N users in multiple subscriptions")

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Locate existing preview generation code (in message handler or confirmation flow)
- [x] Understand current preview message format
- [x] Study `getUniqueUserCount` return type from Task 3

### 2. Green Phase

- [x] Modify preview generation in message handler:
  ```typescript
  // After message is entered and validated
  private async showBroadcastPreview(ctx: UserContext): Promise<void> {
    const subscriptionIds = ctx.session.broadcastSubscriptionIds || [];
    const filterStatus = ctx.session.broadcastFilterStatus || 'active';
    const filterBotId = ctx.session.broadcastFilterBotId;
    const message = ctx.session.broadcastMessage || '';

    // Get unique user count with breakdown
    const { total, breakdown } = await this.broadcastService.getUniqueUserCount(
      subscriptionIds,
      filterStatus,
      filterBotId,
    );

    // Calculate overlap
    const sumOfCounts = breakdown.reduce((sum, b) => sum + b.count, 0);
    const overlap = sumOfCounts - total;

    // Build preview message
    let previewText = `Broadcast Preview\n\n`;
    previewText += `Bot: ${await this.getBotName(filterBotId)}\n`;
    previewText += `Target: ${filterStatus === 'active' ? 'Active' : 'Expired'} subscribers\n`;
    previewText += `Subscriptions:\n`;

    for (const item of breakdown) {
      previewText += `  - ${item.name}: ${item.count} users\n`;
    }

    previewText += `\nTotal recipients: ${total} unique users\n`;
    if (overlap > 0) {
      previewText += `(${overlap} users in multiple subscriptions)\n`;
    }

    previewText += `\nMessage:\n${message}\n`;
    previewText += `\nSend this message?`;

    // Build keyboard
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Send', CALLBACK_ACTIONS.BROADCAST_CONFIRM),
        Markup.button.callback('Cancel', CALLBACK_ACTIONS.BROADCAST_CANCEL),
      ],
    ]);

    await ctx.editMessageText(previewText, keyboard);
  }
  ```

- [x] Add helper method to get bot name:
  ```typescript
  private async getBotName(botId: number | null): Promise<string> {
    if (!botId) return 'All Bots';
    const bot = await this.botsRepository.findById(botId);
    return bot?.name || `Bot #${botId}`;
  }
  ```
  Note: Bot name logic is inline in handleBroadcastMessageInput (no separate helper needed)

- [x] Manual test: Preview shows breakdown correctly

### 3. Refactor Phase

- [x] Ensure preview message is within Telegram limits (4096 chars)
- [x] Add truncation for very long subscription lists if needed
- [x] Verify formatting is clean and readable

## UI Specification

```
Broadcast Preview

Bot: QuantumDealBot
Target: Active subscribers
Subscriptions:
  - Basic Signals: 120 users
  - Free Tier: 230 users

Total recipients: 312 unique users
(38 users in both subscriptions)

Message:
[Message content here]

Send this message?

[Send]  [Cancel]
```

## Expected Preview Structure

```typescript
interface PreviewData {
  botName: string;
  filterStatus: 'active' | 'expired';
  breakdown: Array<{ name: string; count: number }>;
  total: number;
  overlap: number;
  message: string;
}
```

## Completion Criteria

- [x] Preview calls `getUniqueUserCount` with selected subscriptions
- [x] Total unique user count displayed (deduplicated)
- [x] Per-subscription breakdown shown with names and counts
- [x] Overlap count shown if users in multiple subscriptions
- [x] Bot name and filter status shown
- [x] Message content displayed
- [x] Send and Cancel buttons present
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`) - Note: pre-existing type errors in codebase, not related to this task

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: This updates the final preview before sending
- **Constraints**: Keep within Telegram 4096 char message limit
- **Pattern Reference**: Follow existing preview message patterns
- **Edge Case**: Handle case where all users are in single subscription (no overlap message)
