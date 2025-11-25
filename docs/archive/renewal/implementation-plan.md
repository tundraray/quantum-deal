# Implementation Plan

## Quick Reference

This is a quick reference implementation plan. For the complete detailed plan with all phases, see the root `telegram-stars-renewal.plan.md` file.

## Implementation Phases

### Phase 1: Documentation ✅
- [x] Create docs/renewal/ directory structure
- [x] Write all documentation files

### Phase 2: Database Schema
- [ ] Create renewal_tariffs schema
- [ ] Create payment_transactions schema
- [ ] Generate and run migrations
- [ ] Create seed script for default tariffs

### Phase 3: Repository Layer
- [ ] Implement RenewalTariffsRepository
- [ ] Implement PaymentTransactionsRepository
- [ ] Update UserSubscriptionsRepository with extendSubscription()

### Phase 4: Service Layer
- [ ] Create PaymentService
- [ ] Implement invoice creation
- [ ] Implement pre-checkout validation
- [ ] Implement payment processing

### Phase 5: Bot Handlers
- [ ] Add @On('pre_checkout_query') handler
- [ ] Add @On('successful_payment') handler
- [ ] Create RenewalScene
- [ ] Add /renew command

### Phase 6: UI Integration
- [ ] Update subscription-expiration.service.ts (add renewal buttons)
- [ ] Update bot.update.ts /start command (add renewal buttons)
- [ ] Add cron job for expiring pending payments

### Phase 7: Testing
- [ ] Manual testing with Telegram test mode
- [ ] Edge cases testing
- [ ] Payment flow testing

### Phase 8: Deployment
- [ ] Deploy to staging
- [ ] Run migrations on staging
- [ ] Seed tariffs on staging
- [ ] Production deployment

## Key Implementation Files

**New Files**:
- `libs/db/src/schema/renewal-tariffs.ts`
- `libs/db/src/schema/payment-transactions.ts`
- `libs/db/src/repositories/renewal-tariffs.repository.ts`
- `libs/db/src/repositories/payment-transactions.repository.ts`
- `libs/bot/src/services/payment.service.ts`
- `libs/bot/src/scenes/renewal.scene.ts`
- `scripts/seed-renewal-tariffs.ts`

**Modified Files**:
- `libs/db/src/repositories/user-subscriptions.repository.ts`
- `libs/bot/src/services/subscription-expiration.service.ts`
- `libs/bot/src/bot.update.ts`
- `libs/bot/src/bot.module.ts`

## Quick Start Commands

```bash
# Generate migration
pnpm db:generate

# Run migration
pnpm db:migrate

# Seed tariffs
npx ts-node scripts/seed-renewal-tariffs.ts

# Build
pnpm build

# Run
pnpm start
```

## Related Documentation

- Complete implementation plan: See root `telegram-stars-renewal.plan.md`
- [Architecture](./architecture.md)
- [Database Schema](./database-schema.md)
- [Testing Plan](./testing-plan.md)

---

**Version**: 1.0

