# Subscription Renewal Flow

## User Journey Diagrams

### Entry Points

Users can access subscription renewal through three entry points:

1. **Expiration Notification** - Proactive reminders (7, 3, 0 days before expiry)
2. **/start Command** - Subscription status view with renewal button
3. **/renew Command** - Direct access to renewal scene

### Flow 1: Renewal from Expiration Notification

```
┌──────────────────────────────────────┐
│ User receives expiration notification│
│ "Your subscription expires in 3 days"│
│                                      │
│ [🔄 Продлить подписку]               │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ RenewalScene: Show available tariffs │
│                                      │
│ Выберите период продления:           │
│ • 30 дней - 100 ⭐                   │
│ • 90 дней - 250 ⭐ (-17%)           │
│ • 180 дней - 450 ⭐ (-25%)          │
│ • 365 дней - 800 ⭐ (-33%)          │
│                                      │
│ [Отмена]                             │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ User selects tariff (e.g., 30 days)  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Bot creates invoice in chat          │
│                                      │
│ 💳 Продление подписки VIP            │
│ Продление на 30 дней                 │
│ Цена: 100 ⭐                         │
│                                      │
│ [Оплатить 100 ⭐]                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Telegram payment confirmation        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Payment successful                   │
│ Subscription extended                │
│                                      │
│ ✅ Оплата завершена!                │
│ Подписка продлена на 30 дней        │
│ Новая дата окончания: 01.03.2025    │
└──────────────────────────────────────┘
```

### Flow 2: Renewal from /start Command

```
┌──────────────────────────────────────┐
│ User sends /start                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Bot shows subscription status        │
│                                      │
│ 📊 Ваши подписки:                    │
│                                      │
│ VIP Signals                          │
│ Действует до: 01.02.2025            │
│ Осталось: 10 дней                    │
│                                      │
│ [🔄 Продлить VIP]                   │
└──────────────┬───────────────────────┘
               │
               └─▶ Continue with Flow 1
```

### Flow 3: Direct /renew Command

```
┌──────────────────────────────────────┐
│ User sends /renew                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Check if user has active subscription│
└──────────────┬───────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    No active   Has active
  subscription  subscription
         │           │
         ▼           └─▶ Continue with Flow 1
┌──────────────────────────────────────┐
│ Show error message                   │
│                                      │
│ У вас нет активных подписок.        │
│ Используйте /start для активации    │
└──────────────────────────────────────┘
```

## Detailed Scene Flow

### RenewalScene States

```
[ENTER] → [TARIFF_SELECTION] → [PAYMENT_CREATED] → [COMPLETED]
                  ↓                      ↓
              [CANCELLED] ←──────────────┘
```

### State: TARIFF_SELECTION

**Display**:
```
🎯 Продление подписки: VIP Signals

Текущее окончание: 01.02.2025

Выберите период продления:
┌────────────────────────────┐
│ 📅 30 дней - 100 ⭐        │
│ Новое окончание: 03.03.2025│
└────────────────────────────┘
┌────────────────────────────┐
│ 📅 90 дней - 250 ⭐ 🔥     │
│ Экономия 17%               │
│ Новое окончание: 02.05.2025│
└────────────────────────────┘
┌────────────────────────────┐
│ 📅 180 дней - 450 ⭐ 🔥    │
│ Экономия 25%               │
│ Новое окончание: 31.07.2025│
└────────────────────────────┘
┌────────────────────────────┐
│ 📅 365 дней - 800 ⭐ 🔥🔥  │
│ Экономия 33%               │
│ Новое окончание: 01.02.2026│
└────────────────────────────┘

[❌ Отмена]
```

**Actions**:
- `select_tariff:{tariffId}` - Select tariff and create invoice
- `cancel_renewal` - Exit scene

### State: PAYMENT_CREATED

After selecting tariff, bot sends invoice directly in chat (Telegram native UI).

**No custom buttons needed** - Telegram handles payment UI.

### State: COMPLETED

**Success Message**:
```
✅ Оплата успешно завершена!

Ваша подписка VIP Signals продлена на 30 дней.

📅 Новая дата окончания: 03.03.2025

Спасибо за оплату! 🎉
```

### State: CANCELLED

**Cancellation Message**:
```
❌ Продление отменено

Вы можете продлить подписку позже через команду /renew
```

## Multi-Subscription Handling

If user has multiple active subscriptions:

```
🎯 Выберите подписку для продления:

┌────────────────────────────────┐
│ VIP Signals                    │
│ Действует до: 01.02.2025      │
│ [Продлить]                     │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Premium Analytics              │
│ Действует до: 15.02.2025      │
│ [Продлить]                     │
└────────────────────────────────┘

[Отмена]
```

## Error Scenarios

### Scenario 1: No Active Subscription

```
❌ Продление невозможно

У вас нет активных подписок для продления.

Используйте /start для активации новой подписки.
```

### Scenario 2: Payment Already Pending

```
⚠️ Незавершенная оплата

У вас уже есть незавершенная оплата для этой подписки.

Пожалуйста, завершите или отмените предыдущий платеж перед созданием нового.
```

### Scenario 3: Payment Failed

```
❌ Ошибка оплаты

К сожалению, платеж не был завершен.

Причина: Недостаточно Telegram Stars

Попробуйте еще раз или выберите другой период.

[Попробовать снова] [Отмена]
```

### Scenario 4: Subscription Extended Elsewhere

```
ℹ️ Подписка уже продлена

Пока вы оформляли оплату, подписка была продлена другим способом.

Текущее окончание: 01.03.2025

Повторное продление не требуется.
```

## Localization

### Supported Languages

All UI text supports these languages:
- 🇷🇺 Russian (ru)
- 🇬🇧 English (en)
- 🇺🇦 Ukrainian (uk)
- 🇮🇳 Hindi (hi)
- 🇫🇷 French (fr)
- 🇰🇿 Kazakh (kk)
- 🇺🇿 Uzbek (uz)
- 🇹🇯 Tajik (tg)

### Example: English Version

```
🎯 Renew Subscription: VIP Signals

Current expiration: Feb 1, 2025

Select renewal period:
┌────────────────────────────┐
│ 📅 30 days - 100 ⭐        │
│ New expiration: Mar 3, 2025│
└────────────────────────────┘
┌────────────────────────────┐
│ 📅 90 days - 250 ⭐ 🔥     │
│ Save 17%                   │
│ New expiration: May 2, 2025│
└────────────────────────────┘

[❌ Cancel]
```

## Mobile vs Desktop Experience

### Mobile (Primary)

- Large tap targets for tariff selection
- Vertical layout (stacked tariffs)
- Native Telegram Stars payment UI
- In-app payment (no browser redirect)

### Desktop

- Same vertical layout
- Telegram Desktop payment modal
- QR code option for mobile payment
- Full keyboard navigation

## Accessibility

- Clear price display with Stars symbol (⭐)
- Savings percentage highlighted
- New expiration date shown for each option
- Cancel option always visible
- Error messages include actionable next steps

## Performance Characteristics

### Response Times

| Action | Expected Time | Timeout |
|--------|---------------|---------|
| Load tariffs | < 200ms | 3s |
| Create invoice | < 500ms | 5s |
| Payment webhook | < 1s | 10s |
| Extend subscription | < 300ms | 3s |

### Network Resilience

- Invoice creation retries up to 3 times
- Payment webhooks processed idempotently
- Database transactions ensure atomicity
- User sees loading indicator during operations

---

**Version**: 1.0
**Last Updated**: 2025-01-21

