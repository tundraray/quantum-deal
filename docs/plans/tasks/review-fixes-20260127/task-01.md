---
name: Review compliance fixes for signal-batching
type: fix-implementation
design_doc: docs/design/signal-batching-design.md
---

## Objective

Fix compliance issues identified by code-reviewer for the signal batching feature.

## Target Files

- Design Doc: `docs/design/signal-batching-design.md`
- Implementation files:
  - `messages/*/messages.sql` (all language files)
  - `libs/db/src/schema/bot-settings.ts`
  - `libs/framework/src/webhook/batching/signal-batching.service.ts`

## Tasks

### 1. Fix Template Placeholders (HIGH)
- [ ] Update `messages/en/messages.sql` - batch_signals template
  - Replace `{eventType}` with `{type}` (matches SignalTemplateData.type)
  - Remove `📅 Time: {time}` (timestamp is top-level, not per-signal)
  - Remove `Total signals: {count}` line (redundant with header)
  - Remove `Bot: {botName}` line (not provided by BatchTemplateData)
  - Add `⏱️ {timestamp}` at the end
- [ ] Apply same fixes to: ru, uk, hi, fr, kz, uz, tj, tl message files

### 2. Add BotSettings.batching Schema (MEDIUM)
- [ ] Import `BatchingConfig` from batching module in bot-settings.ts
- [ ] Add `batching?: BatchingConfig` to `BotSettings.features` interface
- [ ] Update `DEFAULT_BOT_SETTINGS` if needed

### 3. Add windowMs Range Validation (LOW)
- [ ] In `SignalBatchingService.startBotTimer()`:
  - Add minimum validation: 30000ms (30 seconds per user request)
  - Add maximum validation: 60000ms (per Design Doc)
  - Log warning if value was clamped

## Expected Template Format (after fix)

```sql
('en', '📊 *Trading Signals Batch*

You received {count} signals:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Symbol: {symbol}
📍 Event: {type}
💰 Profit: {profit}
---
{{/each}}

⏱️ {timestamp}', 'batch_signals')
```

## Acceptance Criteria

- [ ] All batch_signals templates use correct placeholders matching SignalTemplateData
- [ ] BotSettings TypeScript interface includes batching config
- [ ] windowMs validation enforces 30000-60000ms range
- [ ] Quality checks pass (build, lint, type-check)
- [ ] No regressions in existing signal delivery
