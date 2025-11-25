# API Flows

## Payment Flow Sequence Diagram

```
User          RenewalScene    PaymentService    TelegramAPI    Database
 │                 │                 │               │            │
 │ Select tariff   │                 │               │            │
 │────────────────>│                 │               │            │
 │                 │                 │               │            │
 │                 │ createRenewalInvoice(...)       │            │
 │                 │────────────────>│               │            │
 │                 │                 │               │            │
 │                 │                 │ CREATE payment_transaction  │
 │                 │                 │──────────────────────────> │
 │                 │                 │ (state=PENDING)            │
 │                 │                 │<────────────────────────── │
 │                 │                 │               │            │
 │                 │                 │ sendInvoice() │            │
 │                 │                 │──────────────>│            │
 │                 │                 │               │            │
 │<────────────────────────────────────── Invoice displayed       │
 │                 │                 │               │            │
 │ Click Pay       │                 │               │            │
 │────────────────────────────────────────────────> │            │
 │                 │                 │               │            │
 │                 │                 │ pre_checkout_query         │
 │                 │ validatePreCheckout(...)        │            │
 │                 │<────────────────────────────────│            │
 │                 │                 │               │            │
 │                 │                 │ SELECT payment_transaction │
 │                 │                 │──────────────────────────> │
 │                 │                 │<────────────────────────── │
 │                 │                 │               │            │
 │                 │                 │ answerOK      │            │
 │                 │                 │──────────────>│            │
 │                 │                 │               │            │
 │                 │                 │ successful_payment         │
 │                 │ handleSuccessfulPayment(...)    │            │
 │                 │<────────────────────────────────│            │
 │                 │                 │               │            │
 │                 │                 │ BEGIN TRANSACTION          │
 │                 │                 │──────────────────────────> │
 │                 │                 │               │            │
 │                 │                 │ UPDATE payment (state=PAID)│
 │                 │                 │──────────────────────────> │
 │                 │                 │               │            │
 │                 │                 │ UPDATE subscription        │
 │                 │                 │ (expiresAt += days)       │
 │                 │                 │──────────────────────────> │
 │                 │                 │               │            │
 │                 │                 │ UPDATE payment (COMPLETED) │
 │                 │                 │──────────────────────────> │
 │                 │                 │               │            │
 │                 │                 │ COMMIT TRANSACTION         │
 │                 │                 │<────────────────────────── │
 │                 │                 │               │            │
 │<──────────────────────────────────────── Confirmation message  │
```

## Repository Method Calls

### RenewalTariffsRepository.findBySubscription()

```typescript
// Input
subscriptionId: number

// Query
SELECT * FROM renewal_tariffs
WHERE is_active = true
  AND (subscription_id = $1 OR subscription_id IS NULL)
ORDER BY subscription_id NULLS LAST, sort_order, period_days

// Output
RenewalTariff[]
```

### PaymentTransactionsRepository.create()

```typescript
// Input
{
  userId: number,
  userSubscriptionId: number,
  tariffId: number,
  amountStars: number,
  periodDays: number,
  state: 'pending',
}

// Query
INSERT INTO payment_transactions (...) VALUES (...) RETURNING *

// Output
PaymentTransaction { id, state: 'pending', ... }
```

### PaymentTransactionsRepository.updateState()

```typescript
// Input
{
  id: number,
  state: PaymentState,
  details: { paidAt?, completedAt?, ... }
}

// Query
UPDATE payment_transactions
SET state = $2, paid_at = $3, updated_at = NOW()
WHERE id = $1 AND state = 'pending'
RETURNING *

// Output
PaymentTransaction { id, state: 'paid', ... }
```

### UserSubscriptionsRepository.extendSubscription()

```typescript
// Input
{
  userSubscriptionId: number,
  additionalDays: number,
  transactionId: number,
}

// Query
UPDATE user_subscriptions
SET expires_at = CASE
    WHEN expires_at > NOW() THEN expires_at + INTERVAL '$2 days'
    ELSE NOW() + INTERVAL '$2 days'
  END,
  is_active = true,
  updated_at = NOW()
WHERE id = $1
RETURNING *

// Output
UserSubscription { id, expiresAt: newDate, ... }
```

## Related Documentation

- [Telegram Stars Integration](./telegram-stars-integration.md)
- [Database Schema](./database-schema.md)
- [Architecture](./architecture.md)

---

**Version**: 1.0

