# Telegram Stars Payment Integration

## Table of Contents

1. [Overview](#overview)
2. [Telegram Stars Basics](#telegram-stars-basics)
3. [Invoice Creation](#invoice-creation)
4. [Payment Flow](#payment-flow)
5. [Webhook Handlers](#webhook-handlers)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

## Overview

Telegram Stars is Telegram's native in-app currency for digital goods and services. This integration enables users to renew subscriptions directly within the Telegram app without external payment providers.

### Benefits

- **Native Integration**: No external redirects, seamless UX
- **Low Fees**: Telegram takes minimal commission
- **Instant Confirmation**: Real-time payment webhooks
- **Security**: Telegram handles payment processing and PCI compliance
- **Global Reach**: Available in most countries

### Limitations

- **Platform Lock-in**: Only works within Telegram
- **Stars Only**: Cannot accept traditional payment methods
- **Minimum Amount**: 1 Star minimum
- **Refunds**: Manual process through Telegram support

## Telegram Stars Basics

### Currency

**Telegram Stars (⭐)**:
- Virtual currency within Telegram
- Users purchase Stars from Telegram
- Stars can be spent on digital goods/services
- 1 Star ≈ $0.01-0.02 USD (varies by region)

### Purchase Flow

1. User wants to renew subscription
2. Bot creates invoice in Stars
3. User sees price in Stars
4. User confirms payment
5. Telegram deducts Stars from user's balance
6. Bot receives payment confirmation
7. Subscription extended

## Invoice Creation

### sendInvoice Method

**Telegraf API**:
```typescript
await ctx.telegram.sendInvoice({
  chat_id: userId,
  title: string,           // Invoice title
  description: string,     // Invoice description
  payload: string,         // Bot-defined invoice payload
  currency: 'XTR',        // Telegram Stars currency code
  prices: [               // Price breakdown
    {
      label: string,      // Price label
      amount: number,     // Amount in Stars
    }
  ],
  // Optional parameters
  max_tip_amount?: number,
  suggested_tip_amounts?: number[],
  photo_url?: string,
  photo_size?: number,
  photo_width?: number,
  photo_height?: number,
  need_name?: boolean,
  need_phone_number?: boolean,
  need_email?: boolean,
  need_shipping_address?: boolean,
  send_phone_number_to_provider?: boolean,
  send_email_to_provider?: boolean,
  is_flexible?: boolean,
});
```

### Invoice Parameters for Renewal

**Example**:
```typescript
await ctx.telegram.sendInvoice({
  chat_id: user.telegramId,
  title: `Продление подписки ${subscriptionName}`,
  description: `Продление на ${periodDays} дней`,
  payload: JSON.stringify({
    type: 'renewal',
    version: 1,
    transactionId: transaction.id,
    userSubscriptionId: userSubscription.id,
    tariffId: tariff.id,
    timestamp: Date.now(),
  }),
  currency: 'XTR',
  prices: [
    {
      label: `${tariff.displayName} (${periodDays} дней)`,
      amount: tariff.priceStars,
    },
  ],
});
```

**Payload Structure**:
```typescript
interface RenewalInvoicePayload {
  type: 'renewal';               // Invoice type identifier
  version: number;               // Payload version for future changes
  transactionId: number;         // payment_transactions.id
  userSubscriptionId: number;    // user_subscriptions.id
  tariffId: number;              // renewal_tariffs.id
  timestamp: number;             // Invoice creation timestamp
}
```

**Best Practices**:
- Keep payload < 256 bytes (Telegram limitation)
- Use JSON for structured data
- Include version field for future compatibility
- Add timestamp to prevent replay attacks
- Include transaction ID for state lookup

## Payment Flow

### Complete Flow Diagram

```
┌────────────────┐
│ 1. User clicks │
│ renewal button │
└───────┬────────┘
        │
        ▼
┌────────────────────┐
│ 2. Bot creates     │
│ payment_transaction│
│ (state=PENDING)    │
└───────┬────────────┘
        │
        ▼
┌────────────────────────┐
│ 3. Bot sends invoice   │
│ via sendInvoice()      │
└───────┬────────────────┘
        │
        ▼
┌─────────────────────────┐
│ 4. User sees invoice in│
│ chat with Pay button    │
└───────┬─────────────────┘
        │
        ▼
┌─────────────────────────┐
│ 5. User clicks Pay ⭐   │
└───────┬─────────────────┘
        │
        ▼
┌──────────────────────────┐
│ 6. Telegram shows        │
│ payment confirmation UI  │
└───────┬──────────────────┘
        │
        ▼
┌──────────────────────────┐
│ 7. Bot receives          │
│ pre_checkout_query       │
└───────┬──────────────────┘
        │
        ▼
┌───────────────────────────┐
│ 8. Bot validates:         │
│ • Transaction exists      │
│ • State is PENDING        │
│ • Amount matches          │
│ • User owns subscription  │
└───────┬───────────────────┘
        │
        ├─ Invalid ───┐
        │             ▼
        │    ┌─────────────────┐
        │    │ Answer error    │
        │    │ Payment cancelled│
        │    └─────────────────┘
        │
        ├─ Valid ──────┐
        │              ▼
        │    ┌──────────────────┐
        │    │ Answer OK        │
        │    └────────┬─────────┘
        │             │
        ▼             ▼
┌──────────────────────────┐
│ 9. Telegram processes    │
│ payment (deducts Stars)  │
└───────┬──────────────────┘
        │
        ├─ Success ────┐
        │              ▼
        │    ┌─────────────────────┐
        │    │ 10. Bot receives    │
        │    │ successful_payment  │
        │    └────────┬────────────┘
        │             │
        │             ▼
        │    ┌─────────────────────────┐
        │    │ 11. Update state: PAID  │
        │    │ Store Telegram IDs      │
        │    └────────┬────────────────┘
        │             │
        │             ▼
        │    ┌──────────────────────────┐
        │    │ 12. Extend subscription  │
        │    │ expiresAt += periodDays  │
        │    └────────┬─────────────────┘
        │             │
        │             ▼
        │    ┌────────────────────────────┐
        │    │ 13. Update state:COMPLETED │
        │    └────────┬───────────────────┘
        │             │
        │             ▼
        │    ┌────────────────────────┐
        │    │ 14. Send confirmation  │
        │    │ message to user        │
        │    └────────────────────────┘
        │
        └─ Failure ────┐
                       ▼
              ┌─────────────────────┐
              │ Update state: FAILED│
              │ Log failure reason  │
              └─────────────────────┘
```

## Webhook Handlers

### 1. pre_checkout_query Handler

**Triggered**: When user confirms payment in Telegram UI, before Stars deducted

**Purpose**: Validate payment before processing

**Handler**:
```typescript
@On('pre_checkout_query')
async onPreCheckoutQuery(@Ctx() ctx: UserContext) {
  const query = ctx.preCheckoutQuery;
  
  if (!query) {
    return;
  }
  
  try {
    // Parse payload
    const payload = JSON.parse(query.invoice_payload) as RenewalInvoicePayload;
    
    // Validate via PaymentService
    const isValid = await this.paymentService.validatePreCheckout(
      payload,
      query.total_amount,
      ctx.from!.id,
    );
    
    if (isValid) {
      // Allow payment to proceed
      await ctx.answerPreCheckoutQuery(true);
    } else {
      // Reject payment
      await ctx.answerPreCheckoutQuery(
        false,
        'Payment validation failed. Please try again.',
      );
    }
  } catch (error) {
    this.logger.error('Pre-checkout validation error:', error);
    await ctx.answerPreCheckoutQuery(
      false,
      'An error occurred. Please contact support.',
    );
  }
}
```

**Validation Logic**:
```typescript
async validatePreCheckout(
  payload: RenewalInvoicePayload,
  amount: number,
  userId: number,
): Promise<boolean> {
  // 1. Find transaction
  const transaction = await this.paymentTransactionsRepo.findById(
    payload.transactionId,
  );
  
  if (!transaction) {
    this.logger.warn(`Transaction ${payload.transactionId} not found`);
    return false;
  }
  
  // 2. Verify state is PENDING
  if (transaction.state !== PaymentState.PENDING) {
    this.logger.warn(`Transaction ${transaction.id} is not pending (${transaction.state})`);
    return false;
  }
  
  // 3. Verify amount matches
  if (transaction.amountStars !== amount) {
    this.logger.warn(`Amount mismatch: expected ${transaction.amountStars}, got ${amount}`);
    return false;
  }
  
  // 4. Verify user owns transaction
  if (transaction.userId !== userId) {
    this.logger.warn(`User ${userId} does not own transaction ${transaction.id}`);
    return false;
  }
  
  // 5. Verify subscription still exists
  const subscription = await this.userSubscriptionsRepo.findById(
    transaction.userSubscriptionId,
  );
  
  if (!subscription) {
    this.logger.warn(`Subscription ${transaction.userSubscriptionId} not found`);
    return false;
  }
  
  // 6. Check for duplicate pending payment
  const duplicates = await this.paymentTransactionsRepo.findPending(
    userId,
    transaction.userSubscriptionId,
  );
  
  if (duplicates.length > 1) {
    this.logger.warn(`Multiple pending payments for subscription ${transaction.userSubscriptionId}`);
    return false;
  }
  
  return true;
}
```

### 2. successful_payment Handler

**Triggered**: When payment successfully processed by Telegram

**Purpose**: Update database and extend subscription

**Handler**:
```typescript
@On('successful_payment')
async onSuccessfulPayment(@Ctx() ctx: UserContext) {
  const payment = ctx.message?.successful_payment;
  
  if (!payment) {
    return;
  }
  
  try {
    // Parse payload
    const payload = JSON.parse(payment.invoice_payload) as RenewalInvoicePayload;
    
    // Process payment via PaymentService
    await this.paymentService.handleSuccessfulPayment(
      payload,
      payment.telegram_payment_charge_id,
      payment.provider_payment_charge_id,
    );
    
    // Send confirmation to user
    await ctx.reply(
      '✅ Оплата успешно завершена!\n\n' +
      'Ваша подписка продлена. Спасибо за оплату! 🎉',
    );
    
  } catch (error) {
    this.logger.error('Payment processing error:', error);
    
    await ctx.reply(
      '❌ Произошла ошибка при обработке оплаты.\n\n' +
      'Ваш платеж получен, но продление не завершено. ' +
      'Пожалуйста, свяжитесь с поддержкой.',
    );
  }
}
```

**Processing Logic**:
```typescript
async handleSuccessfulPayment(
  payload: RenewalInvoicePayload,
  telegramChargeId: string,
  providerChargeId?: string,
): Promise<void> {
  const { transactionId, userSubscriptionId } = payload;
  
  // Use database transaction for atomicity
  await this.db.transaction(async (tx) => {
    // 1. Update payment state to PAID
    await tx
      .update(paymentTransactions)
      .set({
        state: PaymentState.PAID,
        paidAt: new Date(),
        telegramPaymentChargeId: telegramChargeId,
        metadata: {
          providerChargeId,
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentTransactions.id, transactionId),
          eq(paymentTransactions.state, PaymentState.PENDING),
        ),
      );
    
    // 2. Get transaction details
    const transaction = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId))
      .limit(1)
      .then(r => r[0]);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    // 3. Extend subscription
    await tx
      .update(userSubscriptions)
      .set({
        expiresAt: sql`
          CASE 
            WHEN ${userSubscriptions.expiresAt} > NOW() 
            THEN ${userSubscriptions.expiresAt} + INTERVAL '${transaction.periodDays} days'
            ELSE NOW() + INTERVAL '${transaction.periodDays} days'
          END
        `,
        isActive: true,  // Reactivate if expired
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, userSubscriptionId));
    
    // 4. Update payment state to COMPLETED
    await tx
      .update(paymentTransactions)
      .set({
        state: PaymentState.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, transactionId));
  });
  
  this.logger.log(
    `Payment ${transactionId} completed successfully. ` +
    `Subscription ${userSubscriptionId} extended by ${transaction.periodDays} days.`,
  );
}
```

## Error Handling

### Payment Failures

**Telegram Errors**:
```typescript
try {
  await ctx.telegram.sendInvoice({ ... });
} catch (error) {
  if (error.response?.error_code === 400) {
    // Invalid invoice parameters
    this.logger.error('Invalid invoice:', error);
    await ctx.reply('Ошибка создания счета. Попробуйте позже.');
  } else if (error.response?.error_code === 403) {
    // Bot blocked by user
    this.logger.warn(`Bot blocked by user ${userId}`);
  } else {
    // Unknown error
    this.logger.error('Invoice creation failed:', error);
    throw error;
  }
}
```

**State Transition Errors**:
```typescript
// Idempotent state updates
const result = await this.db
  .update(paymentTransactions)
  .set({ state: PaymentState.PAID })
  .where(
    and(
      eq(paymentTransactions.id, transactionId),
      eq(paymentTransactions.state, PaymentState.PENDING), // Only if still pending
    ),
  )
  .returning();

if (result.length === 0) {
  // Transaction already processed or not found
  this.logger.warn(`Cannot update transaction ${transactionId} - already processed`);
  return; // Safe to return, payment already handled
}
```

### Refunds

**Manual Process**:
Telegram Stars refunds must be initiated through Telegram support.

**Workflow**:
1. User contacts bot support
2. Admin verifies refund request
3. Admin marks transaction as REFUNDED in database
4. Admin contacts Telegram support for actual refund
5. Telegram processes refund
6. Admin updates refund_amount and refund_reason

**Database Update**:
```typescript
await this.paymentTransactionsRepo.updateState(
  transactionId,
  PaymentState.REFUNDED,
  {
    refundedAt: new Date(),
    refundReason: 'User requested refund',
    refundAmount: transaction.amountStars, // Full refund
  },
);
```

### Duplicate Payments

**Prevention**:
```typescript
// Before creating invoice, check for existing pending payment
const existing = await this.paymentTransactionsRepo.findPending(
  userId,
  userSubscriptionId,
);

if (existing.length > 0) {
  await ctx.reply(
    '⚠️ У вас уже есть незавершенная оплата для этой подписки.\n\n' +
    'Пожалуйста, завершите или отмените предыдущий платеж.',
  );
  return;
}
```

## Testing

### Test Mode

Telegram provides test payment mode for development:

**Enable Test Mode**:
```typescript
// In bot configuration
const bot = new Telegraf(process.env.BOT_TOKEN_TEST); // Use test bot token
```

**Test Cards**:
Telegram provides test payment methods in test mode:
- No real money charged
- All payments succeed
- Full webhook flow available

### Manual Testing Checklist

**Invoice Creation**:
- [ ] Invoice displays correctly in chat
- [ ] Price shows in Stars
- [ ] Description is clear
- [ ] Pay button appears

**Pre-Checkout**:
- [ ] Validation rejects invalid transactions
- [ ] Validation accepts valid transactions
- [ ] Error messages display correctly

**Payment Success**:
- [ ] Payment processes successfully
- [ ] Subscription extended correctly
- [ ] Confirmation message sent
- [ ] Transaction state updated to COMPLETED

**Edge Cases**:
- [ ] Duplicate payment prevention works
- [ ] Expired subscription reactivates
- [ ] Multiple subscriptions handled correctly
- [ ] Network errors handled gracefully

### Integration Tests

```typescript
describe('Telegram Stars Payment', () => {
  it('should create invoice successfully', async () => {
    const result = await paymentService.createRenewalInvoice(
      userId,
      userSubscriptionId,
      tariffId,
    );
    
    expect(result.transactionId).toBeDefined();
    expect(result.invoiceUrl).toBeDefined();
  });
  
  it('should validate pre-checkout correctly', async () => {
    const payload = {
      type: 'renewal',
      transactionId: 123,
      userSubscriptionId: 456,
    };
    
    const isValid = await paymentService.validatePreCheckout(
      payload,
      100, // amount
      userId,
    );
    
    expect(isValid).toBe(true);
  });
  
  it('should handle successful payment', async () => {
    await paymentService.handleSuccessfulPayment(
      payload,
      'telegram_charge_id',
    );
    
    // Verify transaction state
    const transaction = await paymentTransactionsRepo.findById(transactionId);
    expect(transaction.state).toBe(PaymentState.COMPLETED);
    
    // Verify subscription extended
    const subscription = await userSubscriptionsRepo.findById(userSubscriptionId);
    expect(subscription.expiresAt).toBeAfter(oldExpiresAt);
  });
});
```

## Best Practices

1. **Always validate pre-checkout**: Prevent invalid payments
2. **Use database transactions**: Ensure atomicity
3. **Idempotent handlers**: Safe to retry on failure
4. **Log all transactions**: Full audit trail
5. **Handle errors gracefully**: Don't break user flow
6. **Test thoroughly**: Use Telegram test mode
7. **Monitor payment states**: Track success/failure rates

## Related Documentation

- [Architecture](./architecture.md) - System design
- [Database Schema](./database-schema.md) - Data models
- [API Flows](./api-flows.md) - Complete interaction sequences
- [Testing Plan](./testing-plan.md) - Test scenarios

---

**Version**: 1.0
**Last Updated**: 2025-01-21

