# Telegram UI Flow for Instrument Filtering

## Overview

This document provides detailed ASCII mockups and flow diagrams for the Telegram instrument filtering user interface. It shows exactly how the menu structure appears to users and how they navigate through the filtering system.

## Main Filter Menu

When a user types `/filter`, they see the main filtering menu:

```
┌─────────────────────────────────┐
│  🎯 Фильтр инструментов        │
├─────────────────────────────────┤
│  Текущий статус:               │
│  ✅ Все инструменты (72)       │
│  или                           │
│  📊 Выбрано: 15 из 72         │
├─────────────────────────────────┤
│  Выберите категорию:           │
│                                │
│  [💱 Валюты (28)]             │
│  [🛢️ Товары (7)]              │
│  [💰 Криптовалюты (2)]        │
│  [📈 Акции (35)]              │
├─────────────────────────────────┤
│  [✅ Выбрать все]             │
│  [🗑️ Очистить фильтры]        │
│  [❌ Закрыть]                 │
└─────────────────────────────────┘
```

### Status Display Logic

**When user has NO filters configured:**
```
Текущий статус:
✅ Все инструменты (72)
```

**When user has SOME instruments selected:**
```
Текущий статус:
📊 Выбрано: 15 из 72
```

### Button Interactions

| Button | Action | Result |
|--------|--------|--------|
| 💱 Валюты (28) | `select_group:forex` | Navigate to Forex list |
| 🛢️ Товары (7) | `select_group:commodities` | Navigate to Commodities list |
| 💰 Криптовалюты (2) | `select_group:crypto` | Navigate to Crypto list |
| 📈 Акции (35) | `select_group:stocks` | Navigate to Stocks subgroups |
| ✅ Выбрать все | `select_all` | Clears all filters (default state) |
| 🗑️ Очистить фильтры | `clear_filters` | Same as "Выбрать все" |
| ❌ Закрыть | `close` | Closes the menu |

---

## Forex Group Screen

User clicked "💱 Валюты (28)":

```
┌─────────────────────────────────┐
│  💱 Валюты (28 инструментов)   │
├─────────────────────────────────┤
│  Выбрано: 5 из 28              │
├─────────────────────────────────┤
│  [✅ Выбрать все валюты]       │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  ☑️ EURUSD.a                   │
│  ☑️ GBPUSD.a                   │
│  ☐ USDJPY.a                    │
│  ☐ AUDUSD.a                    │
│  ☑️ USDCAD.a                   │
│  ☐ NZDUSD.a                    │
│  ☐ EURJPY.a                    │
│  ☐ GBPJPY.a                    │
│  ☑️ AUDJPY.a                   │
│  ☐ CADCHF.a                    │
│                                │
│  « Страница 1 из 3 »          │
│                                │
├─────────────────────────────────┤
│  [◀️ Пред] [💾 Сохранить] [▶️ След]│
│  [◀️ Назад в меню]             │
└─────────────────────────────────┘
```

### Checkbox States

- `☑️` = Selected instrument (user will receive signals for this)
- `☐` = Not selected (user will NOT receive signals for this)

### Pagination

- Shows 10 instruments per page
- Forex has 28 instruments = 3 pages
- Navigation: `[◀️ Пред]` and `[▶️ След]` buttons

### Button Interactions

| Button | Action | Result |
|--------|--------|--------|
| ☑️/☐ EURUSD.a | `toggle:EURUSD.a` | Toggle selection for EURUSD.a symbol |
| ✅ Выбрать все валюты | `select_all_group:forex` | Select all 28 Forex instruments |
| 🗑️ Отменить выбор | `deselect_all_group:forex` | Deselect all 28 Forex instruments |
| 💾 Сохранить | `save:forex` | Persist changes to database |
| ◀️ Пред | `page:forex:0` | Go to previous page |
| ▶️ След | `page:forex:2` | Go to next page |
| ◀️ Назад в меню | `back_to_main` | Return to main menu (discard changes) |

---

## Commodities Group Screen

User clicked "🛢️ Товары (7)":

```
┌─────────────────────────────────┐
│  🛢️ Товары (7 инструментов)    │
├─────────────────────────────────┤
│  Выбрано: 2 из 7               │
├─────────────────────────────────┤
│  [✅ Выбрать все товары]       │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  ☐ ALUMIMIUM.a (Алюминий)      │
│  ☐ US.OIL.a (Нефть США)        │
│  ☑️ XAUUSD.a (Золото)          │
│  ☐ XPDUSD.a (Палладий)         │
│  ☐ XPTUSD.a (Платина)          │
│  ☐ COTTON.a (Хлопок)           │
│  ☑️ SUGAR.a (Сахар)            │
│                                │
├─────────────────────────────────┤
│  [💾 Сохранить]                │
│  [◀️ Назад в меню]             │
└─────────────────────────────────┘
```

### Notes

- Only 7 instruments, so no pagination needed
- All instruments fit on one screen
- Display names in Russian for better UX

---

## Crypto Group Screen

User clicked "💰 Криптовалюты (2)":

```
┌─────────────────────────────────┐
│  💰 Криптовалюты                │
│      (2 инструмента)            │
├─────────────────────────────────┤
│  Выбрано: 2 из 2               │
├─────────────────────────────────┤
│  [✅ Выбрать все крипто]       │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  ☑️ BTCUSD.a (Bitcoin)         │
│  ☑️ ETHUSD.a (Ethereum)        │
│                                │
├─────────────────────────────────┤
│  [💾 Сохранить]                │
│  [◀️ Назад в меню]             │
└─────────────────────────────────┘
```

### Notes

- Smallest group with only 2 instruments
- Very fast to select all
- Common use case: users want all crypto signals

---

## Stocks Group Screen (Subgroups)

User clicked "📈 Акции (35)":

```
┌─────────────────────────────────┐
│  📈 Акции (35 инструментов)    │
├─────────────────────────────────┤
│  Выбрано: 8 из 35              │
├─────────────────────────────────┤
│  [✅ Выбрать все акции]        │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  Выберите подгруппу:           │
│                                │
│  [🇪🇺 Европейские (7)]        │
│      Выбрано: 3 из 7           │
│                                │
│  [🇺🇸 Американские (28)]      │
│      Выбрано: 5 из 28          │
│                                │
├─────────────────────────────────┤
│  [◀️ Назад в меню]             │
└─────────────────────────────────┘
```

### Subgroup Display

Each subgroup shows:
- Flag emoji (🇪🇺 or 🇺🇸)
- Subgroup name
- Total count
- Selected count underneath

### Button Interactions

| Button | Action | Result |
|--------|--------|--------|
| 🇪🇺 Европейские (7) | `select_subgroup:european` | Navigate to European stocks |
| 🇺🇸 Американские (28) | `select_subgroup:us` | Navigate to US stocks |
| ✅ Выбрать все акции | `select_all_stocks` | Select all 35 stocks |
| 🗑️ Отменить выбор | `deselect_all_stocks` | Deselect all 35 stocks |
| ◀️ Назад в меню | `back_to_main` | Return to main menu |

---

## European Stocks Screen

User clicked "🇪🇺 Европейские (7)":

```
┌─────────────────────────────────┐
│  🇪🇺 Европейские акции          │
│      (7 инструментов)           │
├─────────────────────────────────┤
│  Выбрано: 3 из 7               │
├─────────────────────────────────┤
│  [✅ Выбрать всю подгруппу]    │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  ☑️ Adidas.a                   │
│  ☐ Airbus.a                    │
│  ☑️ BMW.a                      │
│  ☐ LouisVuit.a                 │
│  ☐ MRG.a                       │
│  ☑️ Roche.a                    │
│  ☐ Nestle.a                    │
│                                │
├─────────────────────────────────┤
│  [💾 Сохранить]                │
│  [◀️ Назад к акциям]           │
└─────────────────────────────────┘
```

### Notes

- All 7 instruments fit on one screen
- No pagination needed
- "Назад к акциям" returns to Stocks subgroup menu

---

## US Stocks Screen

User clicked "🇺🇸 Американские (28)":

```
┌─────────────────────────────────┐
│  🇺🇸 Американские акции         │
│      (28 инструментов)          │
├─────────────────────────────────┤
│  Выбрано: 5 из 28              │
├─────────────────────────────────┤
│  [✅ Выбрать всю подгруппу]    │
│  [🗑️ Отменить выбор]           │
├─────────────────────────────────┤
│  ☑️ APPLE.a                    │
│  ☐ MICROSOFT.a                 │
│  ☑️ AMAZON.a                   │
│  ☐ GOOGLE.a                    │
│  ☑️ Tesla.a                    │
│  ☐ NVDA.a                      │
│  ☑️ Facebook.a                 │
│  ☐ Netflix.a                   │
│  ☐ VISA.a                      │
│  ☑️ Mastercard.a               │
│                                │
│  « Страница 1 из 3 »          │
│                                │
├─────────────────────────────────┤
│  [◀️ Пред] [💾 Сохранить] [▶️ След]│
│  [◀️ Назад к акциям]           │
└─────────────────────────────────┘
```

### Notes

- 28 instruments require 3 pages
- Pagination same as Forex group
- "Назад к акциям" returns to Stocks subgroup menu

---

## After Selection - Confirmation Screen

User clicked "💾 Сохранить" after selecting instruments:

```
┌─────────────────────────────────┐
│  ✅ Фильтр сохранён!           │
├─────────────────────────────────┤
│  Вы будете получать сигналы    │
│  только по выбранным           │
│  инструментам:                 │
│                                │
│  💱 Валюты: 5 инструментов     │
│    • EURUSD.a                  │
│    • GBPUSD.a                  │
│    • USDCAD.a                  │
│    • AUDJPY.a                  │
│    • NZDJPY.a                  │
│                                │
│  💰 Криптовалюты: 2 инструмента│
│    • BTCUSD.a                  │
│    • ETHUSD.a                  │
│                                │
│  Всего выбрано: 7 из 72        │
├─────────────────────────────────┤
│  [✏️ Изменить фильтр]          │
│  [🗑️ Очистить фильтр]         │
│  [❌ Закрыть]                 │
└─────────────────────────────────┘
```

### Display Logic

- Groups instruments by category
- Shows first 5 instruments per category
- If more than 5, shows: "... и ещё 3"
- Summary at bottom: "Всего выбрано: X из 72"

### Button Interactions

| Button | Action | Result |
|--------|--------|--------|
| ✏️ Изменить фильтр | `edit_filters` | Return to main filter menu |
| 🗑️ Очистить фильтр | `clear_filters_confirm` | Show confirmation dialog |
| ❌ Закрыть | `close` | Close the menu |

---

## Clear Filters Confirmation

User clicked "🗑️ Очистить фильтры":

```
┌─────────────────────────────────┐
│  ⚠️ Подтверждение              │
├─────────────────────────────────┤
│  Вы уверены, что хотите        │
│  очистить все фильтры?         │
│                                │
│  После очистки вы снова будете │
│  получать сигналы по всем      │
│  72 инструментам.              │
│                                │
├─────────────────────────────────┤
│  [✅ Да, очистить]             │
│  [❌ Отмена]                   │
└─────────────────────────────────┘
```

### Confirmation Required

- Prevents accidental filter deletion
- Shows impact: "по всем 72 инструментам"
- Clear consequences before action

---

## Help Screen

User clicked "ℹ️ Справка" from main menu:

```
┌─────────────────────────────────┐
│  ℹ️ Справка по фильтрам        │
├─────────────────────────────────┤
│  Фильтр инструментов позволяет │
│  выбрать, по каким инструментам│
│  вы хотите получать сигналы.   │
│                                │
│  📊 По умолчанию:              │
│  Вы получаете сигналы по ВСЕМ │
│  инструментам (72 шт)          │
│                                │
│  🎯 После настройки:           │
│  Сигналы только по выбранным   │
│  инструментам                  │
│                                │
│  💡 Примеры использования:     │
│  • Торгуете только криптой?    │
│    Выберите 💰 Криптовалюты    │
│  • Нужны основные валютные     │
│    пары? Выберите несколько    │
│    из 💱 Валюты                │
│  • Интересуют только FAANG?    │
│    Выберите в 📈 Акции →       │
│    🇺🇸 Американские            │
│                                │
├─────────────────────────────────┤
│  [◀️ Назад в меню]             │
└─────────────────────────────────┘
```

---

## Navigation Flow Diagram

```
┌────────────────┐
│   /filter      │
│   command      │
└───────┬────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Main Menu                        │
│  - Status (All/Selected count)   │
│  - 4 Group buttons               │
│  - Select All                    │
│  - Clear Filters                 │
│  - Help                          │
└───────┬───────────────────────────┘
        │
        ├──────────► [💱 Валюты] ────────► Forex List (28)
        │                                     │
        │                                     ├─ Page 1/3: 10 instruments
        │                                     ├─ Page 2/3: 10 instruments
        │                                     └─ Page 3/3: 8 instruments
        │                                          │
        │                                          ├─ Toggle instruments
        │                                          ├─ Select all group
        │                                          ├─ [💾 Сохранить] ─► Confirmation
        │                                          └─ [◀️ Назад] ─────► Main Menu
        │
        ├──────────► [🛢️ Товары] ────────► Commodities List (7)
        │                                     │
        │                                     └─ Single page: 7 instruments
        │                                          │
        │                                          └─ [💾 Сохранить] ─► Confirmation
        │
        ├──────────► [💰 Крипто] ────────► Crypto List (2)
        │                                     │
        │                                     └─ Single page: 2 instruments
        │                                          │
        │                                          └─ [💾 Сохранить] ─► Confirmation
        │
        └──────────► [📈 Акции] ──────────► Stocks Subgroups
                                               │
                                               ├─► [🇪🇺 Европейские] ──► EU Stocks (7)
                                               │                            │
                                               │                            └─ [💾 Сохранить] ─► Confirmation
                                               │
                                               └─► [🇺🇸 Американские] ──► US Stocks (28)
                                                                            │
                                                                            ├─ Page 1/3: 10 stocks
                                                                            ├─ Page 2/3: 10 stocks
                                                                            └─ Page 3/3: 8 stocks
                                                                                 │
                                                                                 └─ [💾 Сохранить] ─► Confirmation
```

---

## Button State Visualization

### Group Button States

**No instruments selected from group:**
```
[💱 Валюты (28)]
```

**Some instruments selected:**
```
[💱 Валюты (5/28)]
```

**All instruments selected:**
```
[💱 Валюты ✅ (28)]
```

### Instrument Checkbox States

**Not selected:**
```
☐ EURUSD.a
```

**Selected:**
```
☑️ EURUSD.a
```

**Highlighted (when toggling):**
```
☑️ EURUSD.a  ← Выбрано
☐ GBPUSD.a   ← Не выбрано
```

---

## Session State During Navigation

### Data Structure

```typescript
interface FilterSessionState {
  userId: number;
  sessionId: string;

  // Original state (from database)
  originalFilters: Set<string>; // Symbol names (e.g., 'EURUSD.a', 'GBPUSD.a')

  // Working copy (in session)
  sessionFilters: Set<string>;  // Modified during navigation

  // Navigation state
  currentScreen: ScreenType;
  currentPage: number;
  breadcrumb: string[];         // ['main', 'stocks', 'us_stocks']

  // Metadata
  isDirty: boolean;             // Has unsaved changes
  createdAt: Date;
  lastModified: Date;
}
```

### Example Session

**User navigating through Forex selection:**

```typescript
{
  userId: 123456789,
  sessionId: 'sess_abc123',

  originalFilters: Set(['EURUSD.a', 'GBPUSD.a', 'USDCAD.a']), // From DB

  sessionFilters: Set(['EURUSD.a', 'GBPUSD.a', 'USDCAD.a', 'USDJPY.a', 'EURJPY.a']), // Added USDJPY, EURJPY in session

  currentScreen: 'forex_list',
  currentPage: 1,
  breadcrumb: ['main', 'forex'],

  isDirty: true,  // Has unsaved changes (2 new symbols)
  createdAt: '2025-10-15T10:30:00Z',
  lastModified: '2025-10-15T10:32:15Z'
}
```

### State Transitions

1. **User enters filter menu:**
   ```typescript
   originalFilters = loadFromDB(userId)
   sessionFilters = new Set(originalFilters)  // Create working copy
   isDirty = false
   ```

2. **User toggles instrument:**
   ```typescript
   if (sessionFilters.has(instrumentId)) {
     sessionFilters.delete(instrumentId)
   } else {
     sessionFilters.add(instrumentId)
   }
   isDirty = (sessionFilters !== originalFilters)
   ```

3. **User clicks "Сохранить":**
   ```typescript
   saveToDatabase(userId, sessionFilters)
   originalFilters = new Set(sessionFilters)
   isDirty = false
   showConfirmation()
   ```

4. **User clicks "Назад":**
   ```typescript
   sessionFilters = new Set(originalFilters)  // Discard changes
   isDirty = false
   navigateToMainMenu()
   ```

5. **Session expires (15 min):**
   ```typescript
   deleteSession(sessionId)
   // On next action: create new session with originalFilters
   ```

---

## Callback Data Format

### Main Menu

```typescript
// Select group
{
  action: 'select_group',
  group: 'forex' | 'commodities' | 'crypto' | 'stocks'
}

// Select all
{
  action: 'select_all'
}

// Clear filters
{
  action: 'clear_filters'
}

// Show help
{
  action: 'show_help'
}

// Close
{
  action: 'close'
}
```

### Group List (Forex, Commodities, Crypto)

```typescript
// Toggle instrument
{
  action: 'toggle_instrument',
  symbol: 'EURUSD.a'
}

// Select all in group
{
  action: 'select_all_group',
  group: 'forex'
}

// Deselect all in group
{
  action: 'deselect_all_group',
  group: 'forex'
}

// Pagination
{
  action: 'page',
  group: 'forex',
  page: 2
}

// Save
{
  action: 'save',
  group: 'forex'
}

// Back to main
{
  action: 'back_to_main'
}
```

### Stocks Subgroup Menu

```typescript
// Select subgroup
{
  action: 'select_subgroup',
  subgroup: 'european' | 'us'
}

// Select all stocks
{
  action: 'select_all_stocks'
}

// Deselect all stocks
{
  action: 'deselect_all_stocks'
}

// Back to main
{
  action: 'back_to_main'
}
```

### Subgroup List (European/US Stocks)

```typescript
// Toggle instrument
{
  action: 'toggle_instrument',
  symbol: 'Adidas.a'
}

// Select all in subgroup
{
  action: 'select_all_subgroup',
  subgroup: 'european'
}

// Deselect all in subgroup
{
  action: 'deselect_all_subgroup',
  subgroup: 'european'
}

// Pagination (US stocks only)
{
  action: 'page',
  subgroup: 'us',
  page: 2
}

// Save
{
  action: 'save',
  subgroup: 'european'
}

// Back to stocks menu
{
  action: 'back_to_stocks'
}
```

### Confirmation Screen

```typescript
// Edit filters
{
  action: 'edit_filters'
}

// Clear filters (with confirmation)
{
  action: 'clear_filters_confirm'
}

// Close
{
  action: 'close'
}
```

---

## Inline Keyboard Builder Examples

### Main Menu Keyboard

```typescript
function buildMainMenuKeyboard(
  userFilters: Set<number>,
  groupCounts: Map<string, { selected: number; total: number }>
): InlineKeyboardMarkup {
  const buttons: InlineKeyboardButton[][] = [];

  // Group buttons (4 rows)
  buttons.push([
    Markup.button.callback(
      `💱 Валюты (${groupCounts.get('forex')?.selected}/${groupCounts.get('forex')?.total})`,
      JSON.stringify({ action: 'select_group', group: 'forex' })
    )
  ]);

  buttons.push([
    Markup.button.callback(
      `🛢️ Товары (${groupCounts.get('commodities')?.selected}/${groupCounts.get('commodities')?.total})`,
      JSON.stringify({ action: 'select_group', group: 'commodities' })
    )
  ]);

  buttons.push([
    Markup.button.callback(
      `💰 Криптовалюты (${groupCounts.get('crypto')?.selected}/${groupCounts.get('crypto')?.total})`,
      JSON.stringify({ action: 'select_group', group: 'crypto' })
    )
  ]);

  buttons.push([
    Markup.button.callback(
      `📈 Акции (${groupCounts.get('stocks')?.selected}/${groupCounts.get('stocks')?.total})`,
      JSON.stringify({ action: 'select_group', group: 'stocks' })
    )
  ]);

  // Action buttons (1 row with 2 buttons)
  buttons.push([
    Markup.button.callback(
      '✅ Выбрать все',
      JSON.stringify({ action: 'select_all' })
    ),
    Markup.button.callback(
      '🗑️ Очистить фильтры',
      JSON.stringify({ action: 'clear_filters' })
    )
  ]);

  // Help button (1 row)
  buttons.push([
    Markup.button.callback(
      'ℹ️ Справка',
      JSON.stringify({ action: 'show_help' })
    )
  ]);

  return Markup.inlineKeyboard(buttons);
}
```

### Group List Keyboard

```typescript
function buildGroupListKeyboard(
  group: InstrumentGroup,
  instruments: Instrument[],
  userSelection: Set<string>,  // Set of symbol names
  currentPage: number
): InlineKeyboardMarkup {
  const buttons: InlineKeyboardButton[][] = [];
  const itemsPerPage = 10;
  const startIdx = currentPage * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, instruments.length);
  const pageInstruments = instruments.slice(startIdx, endIdx);

  // Select/Deselect all group buttons (1 row with 2 buttons)
  buttons.push([
    Markup.button.callback(
      '✅ Выбрать всю группу',
      JSON.stringify({ action: 'select_all_group', group })
    ),
    Markup.button.callback(
      '🗑️ Отменить выбор',
      JSON.stringify({ action: 'deselect_all_group', group })
    )
  ]);

  // Instrument buttons (10 rows, 1 per instrument)
  for (const instrument of pageInstruments) {
    const isSelected = userSelection.has(instrument.symbol);
    const checkbox = isSelected ? '☑️' : '☐';

    buttons.push([
      Markup.button.callback(
        `${checkbox} ${instrument.symbol}`,
        JSON.stringify({ action: 'toggle_instrument', symbol: instrument.symbol })
      )
    ]);
  }

  // Pagination info (1 row, non-clickable)
  const totalPages = Math.ceil(instruments.length / itemsPerPage);
  if (totalPages > 1) {
    const paginationRow: InlineKeyboardButton[] = [];

    // Previous button
    if (currentPage > 0) {
      paginationRow.push(
        Markup.button.callback(
          '◀️ Пред',
          JSON.stringify({ action: 'page', group, page: currentPage - 1 })
        )
      );
    }

    // Save button (always in middle)
    paginationRow.push(
      Markup.button.callback(
        '💾 Сохранить',
        JSON.stringify({ action: 'save', group })
      )
    );

    // Next button
    if (currentPage < totalPages - 1) {
      paginationRow.push(
        Markup.button.callback(
          'След ▶️',
          JSON.stringify({ action: 'page', group, page: currentPage + 1 })
        )
      );
    }

    buttons.push(paginationRow);
  } else {
    // No pagination, just save button
    buttons.push([
      Markup.button.callback(
        '💾 Сохранить',
        JSON.stringify({ action: 'save', group })
      )
    ]);
  }

  // Back button (1 row)
  buttons.push([
    Markup.button.callback(
      '◀️ Назад в меню',
      JSON.stringify({ action: 'back_to_main' })
    )
  ]);

  return Markup.inlineKeyboard(buttons);
}
```

---

## Implementation Guide

### Handler Structure

```typescript
@Injectable()
export class InstrumentFilterScene {
  constructor(
    private readonly filterService: InstrumentFilterService,
    private readonly instrumentService: InstrumentService,
    private readonly sessionService: SessionService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: SceneContext) {
    // Initialize session state
    await this.sessionService.initializeSession(ctx.from.id);

    // Show main menu
    await this.showMainMenu(ctx);
  }

  @Action(/^select_group:(.+)$/)
  async onSelectGroup(@Ctx() ctx: SceneContext) {
    const callbackData = JSON.parse(ctx.callbackQuery.data);
    const group = callbackData.group;

    // Navigate to group list
    await this.showGroupList(ctx, group);
  }

  @Action(/^toggle_instrument:(.+)$/)
  async onToggleInstrument(@Ctx() ctx: SceneContext) {
    const callbackData = JSON.parse(ctx.callbackQuery.data);
    const symbol = callbackData.symbol;

    // Toggle in session state
    await this.sessionService.toggleInstrument(ctx.from.id, symbol);

    // Refresh current screen
    await this.refreshCurrentScreen(ctx);
  }

  @Action(/^save:(.+)$/)
  async onSave(@Ctx() ctx: SceneContext) {
    const callbackData = JSON.parse(ctx.callbackQuery.data);

    // Save to database
    const sessionState = await this.sessionService.getSession(ctx.from.id);
    await this.filterService.saveUserFilters(ctx.from.id, sessionState.sessionFilters);

    // Invalidate cache
    await this.filterService.invalidateUserCache(ctx.from.id);

    // Show confirmation
    await this.showConfirmation(ctx);
  }

  @Action('back_to_main')
  async onBackToMain(@Ctx() ctx: SceneContext) {
    // Discard session changes
    await this.sessionService.discardChanges(ctx.from.id);

    // Show main menu
    await this.showMainMenu(ctx);
  }
}
```

### State Management

```typescript
@Injectable()
export class FilterSessionService {
  private sessions = new Map<number, FilterSessionState>();

  async initializeSession(userId: number): Promise<void> {
    // Load current filters from DB (user_subscription_features.settings.symbols)
    const userFilters = await this.filterService.getUserFilters(userId);
    const filterSymbols = new Set(userFilters.map(f => f.symbol));

    // Create session state
    const session: FilterSessionState = {
      userId,
      sessionId: uuidv4(),
      originalFilters: new Set(filterSymbols),
      sessionFilters: new Set(filterSymbols),
      currentScreen: 'main',
      currentPage: 0,
      breadcrumb: ['main'],
      isDirty: false,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.sessions.set(userId, session);

    // Auto-cleanup after 15 minutes
    setTimeout(() => {
      this.cleanupSession(userId);
    }, 15 * 60 * 1000);
  }

  async toggleInstrument(userId: number, symbol: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error('Session not found');

    if (session.sessionFilters.has(symbol)) {
      session.sessionFilters.delete(symbol);
    } else {
      session.sessionFilters.add(symbol);
    }

    session.isDirty = !this.areEqual(session.originalFilters, session.sessionFilters);
    session.lastModified = new Date();
  }

  async selectAllInGroup(userId: number, group: InstrumentGroup): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error('Session not found');

    const groupInstruments = await this.instrumentService.getInstrumentsByGroup(group);
    for (const instrument of groupInstruments) {
      session.sessionFilters.add(instrument.symbol);
    }

    session.isDirty = true;
    session.lastModified = new Date();
  }

  async deselectAllInGroup(userId: number, group: InstrumentGroup): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error('Session not found');

    const groupInstruments = await this.instrumentService.getInstrumentsByGroup(group);
    for (const instrument of groupInstruments) {
      session.sessionFilters.delete(instrument.symbol);
    }

    session.isDirty = true;
    session.lastModified = new Date();
  }

  async discardChanges(userId: number): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) return;

    // Restore original state
    session.sessionFilters = new Set(session.originalFilters);
    session.isDirty = false;
  }

  private areEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  private cleanupSession(userId: number): void {
    this.sessions.delete(userId);
  }
}
```

---

## User Experience Best Practices

### 1. Visual Feedback

- Use ☑️ and ☐ for clear selection state
- Show counts: "(5/28)" to indicate progress
- Use emoji for visual grouping: 💱, 🛢️, 💰, 📈

### 2. Navigation Clarity

- Breadcrumb in screen title: "📈 Акции → 🇺🇸 Американские"
- Consistent "Назад" button placement (bottom left)
- Clear "Сохранить" button (bottom center or right)

### 3. Performance

- Paginate long lists (>10 items)
- Cache session state in memory
- Batch database updates
- Invalidate cache only after save

### 4. Error Handling

- Show clear error messages
- Allow retry on failure
- Don't lose session state on error
- Auto-cleanup expired sessions

### 5. Confirmation

- Require confirmation for destructive actions
- Show clear summary after save
- Provide undo option (edit filters)

---

## Testing Scenarios

### Test Case 1: First-Time User

1. User has no filters configured
2. User opens `/filter`
3. Verify: Status shows "✅ Все инструменты (72)"
4. User selects 3 Forex pairs
5. User clicks "Сохранить"
6. Verify: Database has 3 records
7. Verify: Confirmation shows selected instruments

### Test Case 2: Modify Existing Filters

1. User has 5 instruments selected
2. User opens `/filter`
3. Verify: Status shows "📊 Выбрано: 5 из 72"
4. User navigates to Forex
5. Verify: 5 instruments show ☑️
6. User toggles 2 off, adds 3 new
7. User clicks "Назад" (discard)
8. Verify: Database still has 5 original instruments

### Test Case 3: Select All Group

1. User opens `/filter`
2. User navigates to Crypto
3. User clicks "✅ Выбрать всю группу"
4. Verify: Both BTCUSD and ETHUSD show ☑️
5. User clicks "Сохранить"
6. Verify: Database has 2 crypto records

### Test Case 4: Pagination

1. User navigates to US Stocks
2. Verify: Page 1 shows 10 stocks
3. Verify: Page indicator shows "1 из 3"
4. User clicks "След ▶️"
5. Verify: Page 2 shows next 10 stocks
6. User toggles 2 stocks on page 2
7. User clicks "Сохранить"
8. Verify: Database has 2 stocks from page 2

### Test Case 5: Session Timeout

1. User opens `/filter`
2. User makes changes but doesn't save
3. Wait 15+ minutes
4. User clicks any button
5. Verify: Session expired message
6. Verify: Changes are discarded
7. Verify: Database unchanged

---

## Summary

This Telegram UI flow provides:

1. **Clear Visual Hierarchy** - Main menu → Groups → Subgroups → Instruments
2. **Intuitive Navigation** - Consistent button placement and labeling
3. **Visual Feedback** - Checkboxes, counts, and status indicators
4. **Confirmation** - Summary screen after save
5. **Safety** - Confirmation for destructive actions
6. **Performance** - Pagination, caching, and optimized queries
7. **User Control** - Explicit save, easy undo, clear help

The UI is designed for efficiency and ease of use, making it simple for VIP users to configure their instrument filtering preferences while maintaining a clean and professional appearance.
