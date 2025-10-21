# Testing Plan

## Test Environments

### Staging
- Use Telegram test bot token
- Test payment mode enabled
- Separate test database
- All features enabled

### Production
- Real bot token
- Real Telegram Stars payments
- Production database
- Gradual rollout

## Manual Testing Checklist

### Payment Flow Tests

#### ✅ Happy Path
- [ ] User receives expiration notification with renewal button
- [ ] Clicking renewal button opens tariff selection
- [ ] Tariff selection displays correctly with prices
- [ ] Selecting tariff creates invoice in chat
- [ ] Invoice shows correct subscription name and period
- [ ] Invoice shows correct price in Stars
- [ ] Clicking "Pay" button initiates payment
- [ ] Pre-checkout validation passes
- [ ] Payment completes successfully
- [ ] Subscription expires_at updated correctly
- [ ] Transaction state transitions: pending → paid → completed
- [ ] Confirmation message sent to user
- [ ] All timestamps recorded correctly

#### ❌ Error Cases
- [ ] Invalid transaction ID in pre-checkout → Payment rejected
- [ ] Transaction not in PENDING state → Payment rejected
- [ ] Amount mismatch → Payment rejected
- [ ] User doesn't own subscription → Payment rejected
- [ ] Subscription doesn't exist → Payment rejected
- [ ] Duplicate pending payment → Error message shown
- [ ] Payment failure → Transaction marked as FAILED
- [ ] Network timeout → Graceful error handling

### Entry Point Tests

#### Expiration Notifications
- [ ] 7-day notification includes renewal button
- [ ] 3-day notification includes renewal button
- [ ] 0-day notification includes renewal button
- [ ] Renewal button callback works correctly
- [ ] Button visible in all supported languages

#### /start Command
- [ ] Shows active subscriptions with renewal buttons
- [ ] Multiple subscriptions show multiple buttons
- [ ] No subscriptions → No renewal buttons
- [ ] Button click enters RenewalScene correctly

#### /renew Command
- [ ] With active subscription → Enters RenewalScene
- [ ] No active subscription → Shows error message
- [ ] Multiple subscriptions → Shows selection menu

### Subscription Extension Tests

- [ ] Extend active subscription (future expiry date)
- [ ] Extend expired subscription (reactivates)
- [ ] Multiple renewals stack correctly
- [ ] Extension calculation correct for different periods:
  - [ ] 30 days
  - [ ] 90 days
  - [ ] 180 days
  - [ ] 365 days

### Tariff Tests

- [ ] Global tariffs load correctly
- [ ] Subscription-specific tariffs override globals
- [ ] Tariffs ordered by sort_order
- [ ] Inactive tariffs not displayed
- [ ] Price calculation correct for all periods

### Multi-Subscription Tests

- [ ] User with 1 subscription → Direct to tariffs
- [ ] User with 2+ subscriptions → Shows selection menu
- [ ] Each subscription uses correct tariffs
- [ ] Can renew different subscriptions separately

### Localization Tests

Test in all supported languages:
- [ ] Russian (ru)
- [ ] English (en)
- [ ] Ukrainian (uk)
- [ ] Hindi (hi)
- [ ] French (fr)
- [ ] Kazakh (kk)
- [ ] Uzbek (uz)
- [ ] Tajik (tg)

Verify:
- [ ] Tariff names localized
- [ ] Button labels localized
- [ ] Error messages localized
- [ ] Confirmation messages localized

### Database Integrity Tests

- [ ] Payment transaction created with correct state
- [ ] All timestamps populated correctly
- [ ] Telegram IDs stored correctly
- [ ] Metadata stored correctly
- [ ] Foreign key constraints enforced
- [ ] Unique constraints enforced
- [ ] Check constraints validated (amounts > 0, etc.)

### Cron Job Tests

- [ ] Pending payments older than 24h marked as EXPIRED
- [ ] Expired payments not processed
- [ ] Cron runs on schedule (every 6 hours)
- [ ] No false positives (recent pending not expired)

## Automated Test Cases

### Unit Tests

```typescript
describe('PaymentService', () => {
  describe('createRenewalInvoice', () => {
    it('should create transaction and invoice', async () => {
      const result = await paymentService.createRenewalInvoice(
        userId,
        userSubscriptionId,
        tariffId,
      );
      
      expect(result.transactionId).toBeDefined();
      expect(result.invoiceUrl).toBeDefined();
    });
    
    it('should reject duplicate pending payment', async () => {
      await expect(
        paymentService.createRenewalInvoice(userId, userSubscriptionId, tariffId)
      ).rejects.toThrow('Payment already in progress');
    });
  });
  
  describe('validatePreCheckout', () => {
    it('should validate correct payment', async () => {
      const result = await paymentService.validatePreCheckout(
        payload,
        100,
        userId,
      );
      
      expect(result).toBe(true);
    });
    
    it('should reject invalid transaction', async () => {
      const result = await paymentService.validatePreCheckout(
        { ...payload, transactionId: 99999 },
        100,
        userId,
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('handleSuccessfulPayment', () => {
    it('should extend subscription and update state', async () => {
      await paymentService.handleSuccessfulPayment(
        payload,
        'telegram_charge_id',
      );
      
      const transaction = await paymentTransactionsRepo.findById(transactionId);
      expect(transaction.state).toBe('completed');
      
      const subscription = await userSubscriptionsRepo.findById(userSubscriptionId);
      expect(subscription.expiresAt).toBeAfter(originalExpiresAt);
    });
  });
});
```

### Integration Tests

```typescript
describe('Renewal Flow Integration', () => {
  it('should complete full renewal flow', async () => {
    // 1. Create invoice
    const { transactionId } = await paymentService.createRenewalInvoice(...);
    
    // 2. Validate pre-checkout
    const isValid = await paymentService.validatePreCheckout(...);
    expect(isValid).toBe(true);
    
    // 3. Process payment
    await paymentService.handleSuccessfulPayment(...);
    
    // 4. Verify subscription extended
    const subscription = await userSubscriptionsRepo.findById(...);
    expect(subscription.expiresAt).toEqual(expectedDate);
    
    // 5. Verify transaction completed
    const transaction = await paymentTransactionsRepo.findById(transactionId);
    expect(transaction.state).toBe('completed');
  });
});
```

## Performance Tests

- [ ] Invoice creation < 500ms
- [ ] Pre-checkout validation < 200ms
- [ ] Payment processing < 1s
- [ ] Subscription extension < 300ms
- [ ] Handle 100 concurrent renewals
- [ ] Database queries optimized (use EXPLAIN ANALYZE)

## Security Tests

- [ ] User cannot renew other user's subscription
- [ ] Amount tampering detected in pre-checkout
- [ ] Invalid payload rejected
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented in user-generated content
- [ ] Rate limiting on renewal attempts

## Edge Cases

- [ ] Renewal while subscription already expired
- [ ] Renewal while notification still queued
- [ ] Multiple renewal attempts (idempotency)
- [ ] Network failure during payment
- [ ] Database connection lost during transaction
- [ ] Telegram API timeout
- [ ] Invalid tariff ID
- [ ] Deleted subscription
- [ ] Inactive tariff selected

## Regression Tests

After any code changes:
- [ ] Existing features still work
- [ ] Payment flow unchanged
- [ ] Database schema compatible
- [ ] No new lint errors
- [ ] No new type errors
- [ ] Build succeeds

## Test Data

### Test Users

```typescript
const testUsers = [
  {
    telegramId: 111111,
    subscription: 'VIP',
    expiresAt: '2025-02-01',
    scenario: 'Active subscription, not expired',
  },
  {
    telegramId: 222222,
    subscription: 'Basic',
    expiresAt: '2025-01-15',
    scenario: 'Active subscription, expiring soon',
  },
  {
    telegramId: 333333,
    subscription: 'VIP',
    expiresAt: '2025-01-01',
    scenario: 'Expired subscription',
  },
  {
    telegramId: 444444,
    subscription: null,
    scenario: 'No subscription',
  },
];
```

### Test Tariffs

```typescript
const testTariffs = [
  {
    periodDays: 30,
    priceStars: 100,
    displayName: '1 month',
    type: 'global',
  },
  {
    periodDays: 30,
    priceStars: 150,
    displayName: '1 month VIP',
    type: 'subscription-specific',
    subscriptionId: 2, // VIP
  },
];
```

## Monitoring

### Metrics to Track

- Payment success rate
- Payment failure rate by reason
- Average payment completion time
- Revenue by period (Stars)
- Number of renewals per day
- Pending payment expiration rate

### Alerts

Set up alerts for:
- Payment success rate < 95%
- Payment processing time > 2s
- Failed payments > 10/hour
- Database transaction rollbacks
- Telegram API errors > 5/hour

## Related Documentation

- [Architecture](./architecture.md)
- [Database Schema](./database-schema.md)
- [Telegram Stars Integration](./telegram-stars-integration.md)
- [Implementation Plan](./implementation-plan.md)

---

**Version**: 1.0
**Last Updated**: 2025-01-21

