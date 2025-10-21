# Subscription Renewal via Telegram Stars - Documentation

## Overview

This documentation covers the self-service subscription renewal system that allows users to extend their subscriptions using Telegram Stars payment system. The system supports flexible renewal periods, global and subscription-specific pricing, and maintains a full audit trail of all payment transactions.

## Quick Start

**For Users:**
- Receive expiration notifications with renewal buttons
- Click "Продлить подписку" to see available tariff options
- Select desired renewal period
- Complete payment via Telegram Stars
- Subscription automatically extended

**For Developers:**
- Review [Architecture](./architecture.md) for system design
- Check [Database Schema](./database-schema.md) for data models
- See [Implementation Plan](./implementation-plan.md) for step-by-step guide
- Review [Telegram Stars Integration](./telegram-stars-integration.md) for payment API details

## Key Features

- **Flexible Renewal Periods**: Any number of days, not limited to fixed options
- **Dual Pricing Model**: Global tariffs with optional subscription-specific overrides
- **Full Audit Trail**: Complete payment state machine tracking all transitions
- **Automatic Renewal**: Subscriptions extended immediately upon successful payment
- **Multi-language Support**: Renewal UI available in all supported languages
- **Expiration Notifications**: Proactive renewal reminders with one-click access

## Documentation Index

### Architecture & Design
- **[Architecture](./architecture.md)** - System architecture, design decisions, and data flow
- **[Renewal Flow](./renewal-flow.md)** - User journey and UI flow diagrams

### Technical Implementation
- **[Database Schema](./database-schema.md)** - Tables, relationships, queries, and migrations
- **[Telegram Stars Integration](./telegram-stars-integration.md)** - Payment API integration guide
- **[API Flows](./api-flows.md)** - API interaction sequences and webhook handling
- **[Implementation Plan](./implementation-plan.md)** - Step-by-step development guide

### Testing & Operations
- **[Testing Plan](./testing-plan.md)** - Test scenarios, edge cases, and validation checklist

## Core Components

### Database Tables

1. **renewal_tariffs** - Pricing configuration
   - Global tariffs (subscriptionId = NULL)
   - Subscription-specific overrides
   - Flexible period definitions

2. **payment_transactions** - Payment audit trail
   - Full state machine (pending → paid → completed | failed | refunded | expired)
   - Telegram payment references
   - Cancellation and refund tracking

### Services

- **PaymentService** - Telegram Stars payment processing
- **RenewalTariffsRepository** - Tariff data access
- **PaymentTransactionsRepository** - Transaction management
- **RenewalScene** - User interface for tariff selection

### User Interface

- Renewal buttons in expiration notifications (7, 3, 0 days before expiry)
- Renewal buttons in /start command (subscription status view)
- /renew command for direct access
- Tariff selection scene with payment flow

## Payment States

```
pending → paid → completed (success)
         ↓
         failed
         refunded
         expired
         cancelled
```

## Pricing Model

**Global Tariffs (Default):**
- 30 days = 100 stars (1 month)
- 90 days = 250 stars (3 months, ~17% discount)
- 180 days = 450 stars (6 months, ~25% discount)
- 365 days = 800 stars (12 months, ~33% discount)

**Subscription-Specific:**
- Optional overrides for specific subscriptions
- Example: VIP 30 days = 150 stars (premium pricing)

## Related Documentation

- **Subscription System**: [docs/subscription/](../subscribtion/)
- **Feature Flags**: [docs/feature-flags/](../feature-flags/)
- **Bot Commands**: [docs/bot-commands/](../bot-commands/)

## Quick Navigation

### I want to...

**Understand the system:**
→ Start with [Architecture](./architecture.md)

**Implement the feature:**
→ Follow [Implementation Plan](./implementation-plan.md)

**Integrate Telegram Stars:**
→ Review [Telegram Stars Integration](./telegram-stars-integration.md)

**Test the system:**
→ Use [Testing Plan](./testing-plan.md)

**Query the database:**
→ See [Database Schema](./database-schema.md)

## Support

For implementation questions:
1. Review this documentation
2. Check related subscription documentation
3. Consult development team lead

---

**Version**: 1.0
**Last Updated**: 2025-01-21
**Status**: Active

