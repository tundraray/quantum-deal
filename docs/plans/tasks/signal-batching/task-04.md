# Task 4: Message Templates SQL

**Phase**: 4 - Message Formatting
**Verification Level**: L2 (Build success + manual template verification)
**Estimated Effort**: Small (8 files modified, simple SQL INSERT)
**Dependencies**: Task 2 (Template Engine) - defines {{#each}} syntax

## Task Overview

Add `batch_signals` message templates to all 8 language SQL files. These templates use the `{{#each signals}}...{{/each}}` syntax implemented in Task 2 to render multiple signals in a single message.

## Target Files

### Files to Modify (8)
1. `messages/en/messages.sql` - English
2. `messages/ru/messages.sql` - Russian
3. `messages/uk/messages.sql` - Ukrainian
4. `messages/hi/messages.sql` - Hindi
5. `messages/fr/messages.sql` - French
6. `messages/kk/messages.sql` - Kazakh
7. `messages/uz/messages.sql` - Uzbek
8. `messages/tg/messages.sql` - Tajik

## Implementation Steps

### Step 1: Add English Template (messages/en/messages.sql)

Add the following INSERT statement to the messages table:

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Trading Signals Batch*

You received {count} signals:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Symbol: {symbol}
📍 Event: {eventType}
💰 Profit: {profit}
📅 Time: {time}
---
{{/each}}

Total signals: {count}
Bot: {botName}',
  'en'
);
```

**Template Placeholders**:
- `{count}` - Total number of signals in batch
- `{botName}` - Name of the bot sending signals
- Inside `{{#each signals}}` block:
  - `{emoji}` - Event type emoji (🟢 open, 🔵 close, etc.)
  - `{index}` - Signal number (1, 2, 3, ...)
  - `{symbol}` - Trading symbol (EURUSD, GBPUSD, etc.)
  - `{eventType}` - Event type display text (Open, Close Profit, etc.)
  - `{profit}` - Profit amount with currency
  - `{time}` - Signal timestamp

### Step 2: Add Russian Template (messages/ru/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Пакет торговых сигналов*

Вы получили {count} сигналов:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Символ: {symbol}
📍 Событие: {eventType}
💰 Прибыль: {profit}
📅 Время: {time}
---
{{/each}}

Всего сигналов: {count}
Бот: {botName}',
  'ru'
);
```

### Step 3: Add Ukrainian Template (messages/uk/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Пакет торгових сигналів*

Ви отримали {count} сигналів:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Символ: {symbol}
📍 Подія: {eventType}
💰 Прибуток: {profit}
📅 Час: {time}
---
{{/each}}

Всього сигналів: {count}
Бот: {botName}',
  'uk'
);
```

### Step 4: Add Hindi Template (messages/hi/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *ट्रेडिंग सिग्नल बैच*

आपको {count} सिग्नल प्राप्त हुए:

{{#each signals}}
{emoji} *सिग्नल #{index}*
📈 प्रतीक: {symbol}
📍 घटना: {eventType}
💰 लाभ: {profit}
📅 समय: {time}
---
{{/each}}

कुल सिग्नल: {count}
बॉट: {botName}',
  'hi'
);
```

### Step 5: Add French Template (messages/fr/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Lot de signaux de trading*

Vous avez reçu {count} signaux:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Symbole: {symbol}
📍 Événement: {eventType}
💰 Profit: {profit}
📅 Heure: {time}
---
{{/each}}

Total des signaux: {count}
Bot: {botName}',
  'fr'
);
```

### Step 6: Add Kazakh Template (messages/kk/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Сауда сигналдарының жинағы*

Сіз {count} сигнал алдыңыз:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Символ: {symbol}
📍 Оқиға: {eventType}
💰 Пайда: {profit}
📅 Уақыт: {time}
---
{{/each}}

Барлық сигналдар: {count}
Бот: {botName}',
  'kk'
);
```

### Step 7: Add Uzbek Template (messages/uz/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Savdo signallari to\'plami*

Siz {count} ta signal oldingiz:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Belgi: {symbol}
📍 Hodisa: {eventType}
💰 Foyda: {profit}
📅 Vaqt: {time}
---
{{/each}}

Jami signallar: {count}
Bot: {botName}',
  'uz'
);
```

### Step 8: Add Tajik Template (messages/tg/messages.sql)

```sql
INSERT INTO messages (key, value, language) VALUES (
  'batch_signals',
  '📊 *Маҷмӯи сигналҳои савдо*

Шумо {count} сигнал гирифтед:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Рамз: {symbol}
📍 Ҳодиса: {eventType}
💰 Фоида: {profit}
📅 Вақт: {time}
---
{{/each}}

Ҳамаи сигналҳо: {count}
Бот: {botName}',
  'tg'
);
```

### Step 9: Verify Template Syntax

Create a test script to verify all templates parse correctly:

```typescript
import { TemplateEngine } from '../template-engine';

const templates = {
  en: '... (copy template)',
  ru: '... (copy template)',
  // ... etc
};

const engine = new TemplateEngine();
const testData = {
  count: 2,
  botName: 'Test Bot',
  signals: [
    {
      emoji: '🟢',
      index: 1,
      symbol: 'EURUSD',
      eventType: 'Open',
      profit: '+$100.00',
      time: '2026-01-27 10:30:00',
    },
    {
      emoji: '🔵',
      index: 2,
      symbol: 'GBPUSD',
      eventType: 'Close Profit',
      profit: '+$50.00',
      time: '2026-01-27 10:31:00',
    },
  ],
};

for (const [lang, template] of Object.entries(templates)) {
  console.log(`\n=== ${lang.toUpperCase()} ===`);
  const result = engine.render(template, testData);
  console.log(result);
}
```

**Expected**: All templates render correctly with no errors.

### Step 10: Verify Database Migration

If project uses database migrations, create migration file:

```bash
# Generate migration
npm run migration:generate -- AddBatchSignalsMessages

# Apply migration
npm run migration:run
```

## Completion Criteria

- [x] All 8 language files have `batch_signals` template added
  - Note: Actually 9 files updated (includes tl/Tagalog which was not in original task)
  - Actual directories: en, ru, uk, hi, fr, kz (not kk), uz, tj (not tg), tl
- [x] Template syntax matches TemplateEngine format ({{#each signals}})
- [x] All placeholders documented and consistent across languages
- [x] Templates render correctly with test data
  - TemplateEngine tests (14 tests) pass, verifying {{#each signals}} syntax works
- [N/A] Database migration applied (if applicable) - SQL files are for direct import, not migrations
- [x] Build succeeds: `npm run build` - 0 errors

## Verification Procedures

### Manual Template Test
```typescript
const engine = new TemplateEngine();
const result = engine.render(
  templates.en,
  {
    count: 3,
    botName: 'QuantumDeal Bot',
    signals: [
      { emoji: '🟢', index: 1, symbol: 'EURUSD', eventType: 'Open', profit: '+$100', time: '10:30' },
      { emoji: '🔵', index: 2, symbol: 'GBPUSD', eventType: 'Close Profit', profit: '+$50', time: '10:31' },
      { emoji: '🟡', index: 3, symbol: 'USDJPY', eventType: 'Take Profit', profit: '+$75', time: '10:32' },
    ],
  }
);
console.log(result);
```

**Expected Output** (English):
```
📊 *Trading Signals Batch*

You received 3 signals:

🟢 *Signal #1*
📈 Symbol: EURUSD
📍 Event: Open
💰 Profit: +$100
📅 Time: 10:30
---
🔵 *Signal #2*
📈 Symbol: GBPUSD
📍 Event: Close Profit
💰 Profit: +$50
📅 Time: 10:31
---
🟡 *Signal #3*
📈 Symbol: USDJPY
📍 Event: Take Profit
💰 Profit: +$75
📅 Time: 10:32
---

Total signals: 3
Bot: QuantumDeal Bot
```

### SQL Insert Verification
```bash
# Verify messages inserted correctly
psql -d quantum_deal -c "SELECT key, language, LENGTH(value) as len FROM messages WHERE key = 'batch_signals';"
```

**Expected**: 8 rows (one per language)

## Test Information

**Test Category**: N/A (SQL data insertion)
**Test Complexity**: Low (simple INSERT statements)
**Test Dependencies**: TemplateEngine (Task 2)

**Acceptance Criteria Coverage**:
- Design Doc: "batch_signals template with {{#each signals}} loop"
- Design Doc: "All 8 languages supported"

## Dependencies

**Depends on**: Task 2 (Template Engine) - defines {{#each}} syntax
**Required by**: Task 5 (Batch Message Formatter) - uses these templates

## Notes

### Template Design Decisions
- **Consistent structure**: All languages follow same placeholder layout
- **Separator line**: `---` between signals for clarity
- **Emoji prefix**: Visual distinction per signal
- **Markdown formatting**: Bold headers for Telegram rendering

### Translation Notes
- Translations should be reviewed by native speakers if possible
- Placeholder names remain in English (e.g., `{symbol}`, not `{символ}`)
- Emoji unicode characters work across all languages

### Character Limit Consideration
- Maximum message length: 4096 characters (Telegram limit)
- This template handles ~10-15 signals before needing split
- Splitting logic implemented in Task 5 (BatchMessageFormatter)

### Alternative Approaches Considered
- **Separate template per signal count**: Rejected - too many templates to maintain
- **No separator lines**: Rejected - reduces readability with many signals
- **Minimal format**: Rejected - less clear for users

## Related Documents

- [Design Doc](../../design/signal-batching-design.md) - Message template specification
- [Task 2](./task-02.md) - Template Engine implementation
- [Task 5](./task-05.md) - Batch Message Formatter (uses these templates)
- [Overall Design](./_overview.md) - Common processing points
