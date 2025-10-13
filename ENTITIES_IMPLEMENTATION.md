# Message Entities Support Implementation

## Overview

This implementation adds support for Telegram message entities (formatting) in the broadcast system. Managers can now send formatted messages (bold, italic, links, code, etc.) and the formatting will be preserved across translations and delivered to subscribers.

## Changes Made

### 1. Session Interface Update

**File:** `libs/masterbot/src/interfaces/user-context.interface.ts`

**Changes:**
- Added `MessageEntity` type extraction from Telegraf types
- Added `broadcastMessageEntities` field to session interface to store message entities

**Key Addition:**
```typescript
export type MessageEntity = NonNullable<Message.TextMessage['entities']>[number];

session: Context['session'] & {
  // ... existing fields
  broadcastMessageEntities?: MessageEntity[] | null;
}
```

### 2. Entity Converter Utility

**File:** `libs/masterbot/src/utils/entity-converter.ts` (NEW)

**Purpose:** Convert Telegram message entities to Markdown format for translation preservation

**Key Functions:**
- `convertEntitiesToMarkdown(text, entities)` - Converts entities to Markdown syntax
- `hasFormattingEntities(entities)` - Checks if message has formatting entities

**Supported Entity Types:**
- `bold` → `**text**`
- `italic` → `*text*`
- `code` → `` `text` ``
- `pre` → ` ```language\ntext\n``` `
- `text_link` → `[text](url)`
- `underline` → `__text__`
- `strikethrough` → `~~text~~`
- And more...

### 3. MasterBot Update Handler

**File:** `libs/masterbot/src/masterbot.update.ts`

**Changes:**

#### A. Capture Entities in Message Input (line 961)
```typescript
const entities =
  ctx.message && 'entities' in ctx.message
    ? ctx.message.entities
    : undefined;
```

#### B. Store Entities in Session (line 995)
```typescript
ctx.session.broadcastMessageEntities = entities || null;
```

#### C. Enhanced Preview Display (line 1000-1030)
- If entities exist, shows formatted preview by sending message with entities
- Sends separate confirmation buttons
- If no entities, shows plain text preview as before

#### D. Pass Entities to BroadcastService (line 817)
```typescript
const result = await this.broadcastService.sendBroadcast(
  subscriptionId,
  message,
  entities || undefined,
  managerId,
);
```

#### E. Session Cleanup
- Updated `ensureSession()` to initialize `broadcastMessageEntities`
- Updated all session cleanup points to clear entities

### 4. Broadcast Service

**File:** `libs/masterbot/src/services/broadcast.service.ts`

**Changes:**

#### A. Updated Method Signature (line 120)
```typescript
async sendBroadcast(
  subscriptionId: number,
  message: string,
  entities: MessageEntity[] | undefined,  // NEW PARAMETER
  managerId: number,
): Promise<BroadcastResultDto>
```

#### B. Entity Processing Logic (line 154-164)
```typescript
// Check if message has formatting entities
const hasFormatting = hasFormattingEntities(entities);

// Convert entities to Markdown for translation if present
const messageForTranslation = hasFormatting
  ? convertEntitiesToMarkdown(message, entities)
  : message;
```

#### C. Translation with Formatting Preservation (line 175)
- Translates the Markdown-formatted message
- LLM preserves Markdown syntax (`**bold**`, `*italic*`, etc.)
- Translated messages maintain formatting structure

#### D. Message Type Selection (line 194)
```typescript
messageType: hasFormatting
  ? QueuedMessageType.MARKDOWN
  : QueuedMessageType.TEXT,
```

## How It Works

### Flow Diagram

```
Manager sends formatted message
          ↓
Capture text + entities
          ↓
Store in session
          ↓
Show formatted preview to manager
          ↓
Manager confirms
          ↓
Convert entities → Markdown
          ↓
Translate Markdown to all languages
          ↓
Send as MARKDOWN to subscribers
          ↓
Telegram renders formatting
```

### Entity Conversion Example

**Original Message:**
- Text: "Hello World"
- Entities: `[{ type: "bold", offset: 0, length: 5 }]`

**Converted to Markdown:**
```
**Hello** World
```

**Translated to Russian:**
```
**Привет** Мир
```

**Sent to Subscriber:**
- Text: "**Привет** Мир"
- Parse Mode: Markdown
- Result: **Привет** Мир (bold rendering)

## Benefits

1. **Formatting Preservation:** Bold, italic, links, and code blocks are preserved
2. **Translation Safety:** Using Markdown ensures formatting survives translation
3. **Language-Agnostic:** Works for all languages without offset recalculation
4. **Preview Accuracy:** Managers see exactly what subscribers will receive
5. **Backward Compatible:** Plain text messages still work as before

## Testing Scenarios

### 1. Bold Text
**Manager sends:** `**Important** message`
**Subscribers receive:** **Important** message (in their language)

### 2. Links
**Manager sends:** `Check [our website](https://example.com)`
**Subscribers receive:** Check [our website](https://example.com) (clickable link)

### 3. Code
**Manager sends:** `` Use `npm install` to install ``
**Subscribers receive:** Use `npm install` to install (monospace code)

### 4. Mixed Formatting
**Manager sends:** `**Bold** and *italic* with [link](url)`
**Subscribers receive:** **Bold** and *italic* with [link](url) (all preserved)

### 5. Multilingual
**Manager sends:** `**Hello** world`
**Russian subscriber receives:** **Привет** мир (bold preserved)

## Technical Details

### Markdown vs HTML vs Entities

We chose **Markdown conversion** over other approaches:

| Approach | Pros | Cons |
|----------|------|------|
| **Markdown** ✓ | LLM-friendly, simple, widely supported | Limited formatting options |
| HTML | More options | LLM may break tags |
| Entity Recalculation | Native Telegram | Complex, error-prone with translations |

### Entity Offset Problem

When translating, text length changes:
- English: "Hello" (5 chars)
- Russian: "Привет" (6 chars)

**Problem:** Entity offsets become invalid after translation

**Solution:** Convert to Markdown before translation, so the LLM preserves `**bold**` syntax naturally

### Message Type Selection

```typescript
messageType: hasFormatting
  ? QueuedMessageType.MARKDOWN  // Send with parse_mode: 'Markdown'
  : QueuedMessageType.TEXT       // Send as plain text
```

This ensures:
- Formatted messages render correctly
- Plain messages don't trigger Markdown parser
- No performance overhead for plain text

## Future Enhancements

### Possible Improvements

1. **HTML Mode Support:** Add option for HTML formatting if needed
2. **Entity Validation:** Warn managers about unsupported entity types
3. **Preview Enhancement:** Show side-by-side comparison of all language versions
4. **Custom Markdown:** Support custom markdown extensions (e.g., colored text)
5. **Media with Captions:** Extend to support formatted photo/video captions

### Known Limitations

1. **Spoiler Tags:** Not supported in Markdown, rendered as plain text
2. **Custom Emojis:** Telegram custom emojis may not convert perfectly
3. **Nested Formatting:** Complex nested formatting may need testing
4. **Long Code Blocks:** Very long code blocks may hit Telegram limits

## Files Changed

1. `libs/masterbot/src/interfaces/user-context.interface.ts` - Session interface
2. `libs/masterbot/src/utils/entity-converter.ts` - NEW utility file
3. `libs/masterbot/src/masterbot.update.ts` - Update handler
4. `libs/masterbot/src/services/broadcast.service.ts` - Broadcast service

## Dependencies

No new dependencies required. Uses existing:
- `telegraf` - Already provides MessageEntity types
- `@quantumdeal/bot` - Already supports MARKDOWN message type

## Deployment Notes

1. **No Database Changes:** No schema migrations required
2. **Session Compatibility:** New session fields are optional, backward compatible
3. **Runtime Safe:** Graceful fallback if entities are undefined
4. **No Breaking Changes:** Existing broadcast functionality unchanged

## Conclusion

The implementation successfully adds message entity support to the broadcast system, preserving formatting across translations while maintaining backward compatibility. Managers can now send rich formatted messages that look professional in all languages.
