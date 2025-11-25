# Telegram Stars API Reference - Subscription v2.0

> **Quick Links:**
> - [Telegram Stars Official Docs](https://core.telegram.org/bots/payments#stars)
> - Related: [architecture-and-implementation.md](./architecture-and-implementation.md), [user-guide.md](./user-guide.md)

---

## Bot API Methods

### sendInvoice

Creates a payment invoice for Telegram Stars.

**Method Signature:**
```typescript
ctx.telegram.sendInvoice(chatId: number, {
  title: string;
  description: string;
  payload: string;
  provider_token: ''; // Always empty for Stars
  currency: 'XTR'; // Telegram Stars currency code
  prices: [{ label: string; amount: number }];
  // Optional parameters
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  reply_markup?: InlineKeyboardMarkup;
})
```

**Example (Renewal Invoice v2.0):**
```typescript
const payload: RenewalInvoicePayload = {
  type: 'renewal',
  userId: ctx.from.id,
  subscriptionId: subscription.id,
  userSubscriptionId: userSubscription.id,
  transactionId: transaction.id,
};

await ctx.replyWithInvoice({
  title: `Renew ${subscription.name}`,
  description: `Extend for ${subscription.durationDays} more days`,
  payload: JSON.stringify(payload),
  provider_token: '', // Empty for Stars
  currency: 'XTR',
  prices: [{
    label: subscription.name,
    amount: subscription.priceStars
  }],
});
```

**Response:**
Returns a `Message` object containing the invoice. Telegram displays a "Pay" button to the user.

---

### answerPreCheckoutQuery

Validates payment before Telegram processes it. **Must respond within 10 seconds.**

**Method Signature:**
```typescript
ctx.answerPreCheckoutQuery(ok: boolean, error_message?: string)
```

**Example (Validation Logic):**
```typescript
bot.on('pre_checkout_query', async (ctx) => {
  const query = ctx.preCheckoutQuery;

  try {
    const payload = JSON.parse(query.invoice_payload) as RenewalInvoicePayload;

    // Validate transaction state, amount, user ownership
    const isValid = await paymentService.validatePreCheckout(
      payload,
      query.total_amount,
      ctx.from.id
    );

    if (isValid) {
      await ctx.answerPreCheckoutQuery(true);
    } else {
      await ctx.answerPreCheckoutQuery(false, 'Payment validation failed');
    }
  } catch (error) {
    logger.error('Pre-checkout error:', error);
    await ctx.answerPreCheckoutQuery(false, 'Validation error');
  }
});
```

**Validation Checks:**
- Payload structure (`type === 'renewal'`)
- Transaction exists and state is `PENDING`
- Amount matches expected value
- User owns the transaction
- UserSubscription exists

---

### refundStarPayment

Refunds a Telegram Stars payment.

**Method Signature:**
```typescript
ctx.telegram.refundStarPayment(
  userId: number,
  telegramPaymentChargeId: string
)
```

**Example (Admin Refund):**
```typescript
async function refundPayment(userId: number, transactionId: number) {
  const transaction = await paymentTransactionsRepo.findById(transactionId);

  if (!transaction?.telegramPaymentChargeId) {
    throw new Error('No charge ID found');
  }

  // Refund via Bot API
  await bot.telegram.refundStarPayment(
    userId,
    transaction.telegramPaymentChargeId
  );

  // Update database
  await paymentTransactionsRepo.updateState(
    transactionId,
    PaymentState.REFUNDED,
    {
      refundedAt: new Date(),
      metadata: { reason: 'User request' }
    }
  );

  // Notify user
  await bot.telegram.sendMessage(
    userId,
    '✅ Your payment has been refunded.'
  );
}
```

---

### getStarTransactions

Retrieves bot's Telegram Stars transaction history.

**Method Signature:**
```typescript
ctx.telegram.getStarTransactions({
  offset?: number;
  limit?: number;
})
```

**Example:**
```typescript
async function getBotTransactions() {
  const transactions = await bot.telegram.getStarTransactions({
    offset: 0,
    limit: 100,
  });

  return transactions;
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "transactions": [
      {
        "id": "tx_123456",
        "amount": 100,
        "date": 1704067200,
        "source": "Fragment",
        "receiver": "bot"
      }
    ]
  }
}
```

---

## Webhook Handlers

### pre_checkout_query

Fires when user presses "Pay" button. **Must respond within 10 seconds.**

**Handler:**
```typescript
bot.on('pre_checkout_query', async (ctx) => {
  const { invoice_payload, total_amount, from } = ctx.preCheckoutQuery;

  const payload = JSON.parse(invoice_payload);
  const isValid = await paymentService.validatePreCheckout(
    payload,
    total_amount,
    from.id
  );

  await ctx.answerPreCheckoutQuery(isValid);
});
```

---

### successful_payment

Fires after successful payment. Process subscription extension here.

**Handler:**
```typescript
bot.on('successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = JSON.parse(payment.invoice_payload) as RenewalInvoicePayload;

  await paymentService.handleSuccessfulPayment(
    payload,
    payment.telegram_payment_charge_id,
    payment.provider_payment_charge_id
  );

  const lang = ctx.user?.lang || 'en';
  await ctx.reply(getRenewalMessage(lang, 'paymentSuccess'));
});
```

**SuccessfulPayment Object:**
```typescript
{
  currency: 'XTR',
  total_amount: 100,
  invoice_payload: '{"type":"renewal",...}',
  telegram_payment_charge_id: 'tg_charge_123',
  provider_payment_charge_id: 'provider_456'
}
```

---

## Payload Structure (v2.0)

### RenewalInvoicePayload

**TypeScript Interface:**
```typescript
export interface RenewalInvoicePayload {
  type: 'renewal';
  userId: number;
  subscriptionId: number;
  userSubscriptionId: number;
  transactionId: string;
}
```

**Example:**
```json
{
  "type": "renewal",
  "userId": 123456789,
  "subscriptionId": 1,
  "userSubscriptionId": 42,
  "transactionId": "tx_abc123"
}
```

**Field Descriptions:**
- `type`: Always `"renewal"` for subscription renewals
- `userId`: Telegram user ID
- `subscriptionId`: PK from `subscriptions` table
- `userSubscriptionId`: PK from `user_subscriptions` table
- `transactionId`: Transaction identifier (string)

---

## Payment Flow

### New Subscription
```
User clicks "View Plans" → Select plan → sendInvoice
    ↓
Telegram shows payment UI
    ↓
User confirms payment
    ↓
pre_checkout_query → answerPreCheckoutQuery(true)
    ↓
successful_payment → Create user_subscription
    ↓
Send confirmation
```

### Renewal (One-Click)
```
Expiration reminder sent → User clicks "Renew"
    ↓
RenewalAction sends invoice (pre-filled)
    ↓
Telegram shows payment UI
    ↓
pre_checkout_query → answerPreCheckoutQuery(true)
    ↓
successful_payment → Extend user_subscription
    ↓
Send confirmation with new expiry date
```

---

## Error Handling

### Pre-Checkout Timeout

**Problem:** `answerPreCheckoutQuery` must respond within 10 seconds.

**Solution:**
```typescript
bot.on('pre_checkout_query', async (ctx) => {
  const timeout = setTimeout(async () => {
    await ctx.answerPreCheckoutQuery(false, 'Validation timeout');
  }, 9000); // 9-second safety timeout

  try {
    const isValid = await validatePayment(ctx.preCheckoutQuery);
    clearTimeout(timeout);
    await ctx.answerPreCheckoutQuery(isValid);
  } catch (error) {
    clearTimeout(timeout);
    await ctx.answerPreCheckoutQuery(false, 'Validation failed');
  }
});
```

---

### Rate Limiting

**Bot API Limit:** ~30 requests/second

**Solution (Bottleneck):**
```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  minTime: 34, // Milliseconds between requests (~29 req/sec)
  maxConcurrent: 1,
});

const sendInvoice = limiter.wrap(async (userId: number, invoice: any) => {
  return await bot.telegram.sendInvoice(userId, invoice);
});
```

---

### Retry Logic

**Use Case:** Handle transient errors (network, 429 rate limit).

**Solution (Exponential Backoff):**
```typescript
async function sendInvoiceWithRetry(
  userId: number,
  invoice: any,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await bot.telegram.sendInvoice(userId, invoice);
      return;
    } catch (error) {
      if (error.response?.error_code === 429) {
        const retryAfter = error.response.parameters?.retry_after || 1;
        await sleep(retryAfter * 1000);
        continue;
      }

      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### Common Errors

#### INVOICE_PAYLOAD_INVALID

**Error:**
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: INVOICE_PAYLOAD_INVALID"
}
```

**Cause:** Payload is not valid JSON or exceeds size limit.

**Solution:**
```typescript
// Always validate payload before sending
const payload = {
  type: 'renewal',
  userId: 123,
  subscriptionId: 1,
  userSubscriptionId: 42,
  transactionId: 'tx_abc',
};

// Validate JSON serialization
const payloadString = JSON.stringify(payload);
JSON.parse(payloadString); // Throws if invalid

await bot.telegram.sendInvoice(userId, {
  payload: payloadString,
  // ... other params
});
```

---

#### AMOUNT_INVALID

**Error:**
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: AMOUNT_INVALID"
}
```

**Cause:** Amount must be a positive integer.

**Solution:**
```typescript
// Ensure amount is positive integer
const priceStars = Math.max(1, Math.round(subscription.priceStars));

await bot.telegram.sendInvoice(userId, {
  prices: [{ label: subscription.name, amount: priceStars }],
  // ... other params
});
```

---

#### USER_BLOCKED_BOT

**Error:**
```json
{
  "ok": false,
  "error_code": 403,
  "description": "Forbidden: bot was blocked by the user"
}
```

**Solution:**
```typescript
try {
  await bot.telegram.sendInvoice(userId, invoice);
} catch (error) {
  if (error.response?.error_code === 403) {
    logger.warn(`User ${userId} blocked the bot`);
    // Mark user as inactive or remove pending invoices
    await handleBlockedUser(userId);
  }
}
```

---

## Deployment

### Webhook Configuration

**Production (Recommended):**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set webhook in production
  if (process.env.NODE_ENV === 'production') {
    const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
    const bot = app.get<Telegraf>('QuantumDealBot');

    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      drop_pending_updates: false,
    });

    logger.log(`Webhook set: ${webhookUrl}`);
  }

  await app.listen(3000);
}
```

**Development (Long Polling):**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV !== 'production') {
    const bot = app.get<Telegraf>('QuantumDealBot');
    await bot.launch();
    logger.log('Bot launched with long polling');
  }

  await app.listen(3000);
}
```

---

### Webhook Secret Token

**Setup:**
```bash
# .env
TELEGRAM_WEBHOOK_SECRET=your_random_secret_token_here
```

**Validation (NestJS Guard):**
```typescript
@Injectable()
export class TelegramWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-telegram-bot-api-secret-token'];

    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}
```

---

## See Also

- [architecture-and-implementation.md](./architecture-and-implementation.md) - Payment flow implementation
- [user-guide.md](./user-guide.md) - Edge cases and error handling
- [database-schema.md](./database-schema.md) - Table structures

---

**Version:** 2.0.0
**Last Updated:** 2025-10-31
