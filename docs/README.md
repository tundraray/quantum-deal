# Quantum Deal Documentation

## Overview

This directory contains all project documentation organized by type.

## Bot Features Documentation

### Bot Commands Menu System

Personalized bot command menu that displays available commands based on subscription level and language.

| Type | Document | Description |
|------|----------|-------------|
| PRD | [bot-commands-prd.md](prd/bot-commands-prd.md) | Requirements for personalized command menus |
| Design | [bot-commands-design.md](design/bot-commands-design.md) | Service implementation, Telegram API integration |

### Feature Flags System

Fine-grained control over filtering capabilities based on subscription tiers.

| Type | Document | Description |
|------|----------|-------------|
| PRD | [feature-flags-prd.md](prd/feature-flags-prd.md) | TIER_BASED_FILTERING and CUSTOM_USER_FILTERING features |
| Design | [feature-flags-design.md](design/feature-flags-design.md) | Database design, service layer, Telegram UI |

**Related ADRs:**
- [ADR-001: Feature Flag Database Design](adr/ADR-001-feature-flag-database-design.md)
- [ADR-002: Subscription Scope to Sectors Migration](adr/ADR-002-subscription-scope-to-sectors-migration.md)
- [ADR-003: User Settings JSONB Storage](adr/ADR-003-user-settings-jsonb-storage.md)

---

## Subscription System Documentation

The subscription system is documented across 7 features, each with a PRD and Design Doc.

### Product Requirements Documents (PRD)

| Feature | Document | Description |
|---------|----------|-------------|
| Core Infrastructure | [subscription-core-prd.md](prd/subscription-core-prd.md) | Base subscription system, user-subscription relationships |
| Signals | [subscription-signals-prd.md](prd/subscription-signals-prd.md) | Trading signal delivery, filtering, expiration notifications |
| Broadcast | [subscription-broadcast-prd.md](prd/subscription-broadcast-prd.md) | Manager broadcast subscriptions, message delivery |
| Trial | [subscription-trial-prd.md](prd/subscription-trial-prd.md) | 7-day free trial system |
| Statistics | [subscription-statistics-prd.md](prd/subscription-statistics-prd.md) | Onboarding statistics for new users |
| Renewal | [subscription-renewal-prd.md](prd/subscription-renewal-prd.md) | Subscription renewal via Telegram Stars |
| Codes | [subscription-codes-prd.md](prd/subscription-codes-prd.md) | Invite code generation and activation |

### Technical Design Documents

| Feature | Document | Description |
|---------|----------|-------------|
| Core Infrastructure | [subscription-core-design.md](design/subscription-core-design.md) | Repository pattern, schema design, data flows |
| Signals | [subscription-signals-design.md](design/subscription-signals-design.md) | Signal delivery pipeline, rate limiting, filtering |
| Broadcast | [subscription-broadcast-design.md](design/subscription-broadcast-design.md) | MasterBot architecture, translation pipeline |
| Trial | [subscription-trial-design.md](design/subscription-trial-design.md) | Trial activation flow, eligibility logic |
| Statistics | [subscription-statistics-design.md](design/subscription-statistics-design.md) | Materialized view, cron refresh |
| Renewal | [subscription-renewal-design.md](design/subscription-renewal-design.md) | Payment flow, state machine, Telegraf scenes |
| Codes | [subscription-codes-design.md](design/subscription-codes-design.md) | Code generation algorithm, deep links |

---

## Architecture Decision Records (ADR)

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](adr/ADR-001-feature-flag-database-design.md) | Feature Flag Database Design | Accepted |
| [ADR-002](adr/ADR-002-subscription-scope-to-sectors-migration.md) | Subscription Scope to Sectors Migration | Accepted |
| [ADR-003](adr/ADR-003-user-settings-jsonb-storage.md) | User Settings JSONB Storage | Accepted |

## Directory Structure

```
docs/
├── README.md                    # This file (navigation index)
├── prd/                         # Product Requirements Documents
│   ├── bot-commands-prd.md
│   ├── feature-flags-prd.md
│   └── subscription-*.md
├── design/                      # Technical Design Documents
│   ├── bot-commands-design.md
│   ├── feature-flags-design.md
│   └── subscription-*.md
├── adr/                         # Architecture Decision Records
│   ├── ADR-001-feature-flag-database-design.md
│   ├── ADR-002-subscription-scope-to-sectors-migration.md
│   ├── ADR-003-user-settings-jsonb-storage.md
│   └── template.md
├── plans/                       # Work Plans
│   └── *.md
├── guides/                      # Development Guides
│   └── sub-agents.md
├── archive/                     # Archived Documentation
│   ├── bot-commands/            # Original bot-commands docs (archived 2025-11-25)
│   ├── feature-flags/           # Original feature-flags docs (archived 2025-11-25)
│   ├── subscribtion/            # Original broadcast docs (archived)
│   └── subscription-v2/         # V2 docs (archived)
└── rules/                       # Project Rules
    └── *.md
```

## Quick Links

- **For Business Requirements**: Start with PRD documents in `docs/prd/`
- **For Technical Implementation**: See Design documents in `docs/design/`
- **For Architecture Decisions**: See ADRs in `docs/adr/`
- **For Historical Context**: Check `docs/archive/`

## Document Status

All subscription documents were created on **2025-11-25** by reverse-engineering the existing implementation. They accurately reflect the current state of the codebase.

### Known Code Issues (from Design Doc Reviews)

The following code issues were identified during documentation review:

1. **Core**: `findActiveBroadcastSubscriptions()` doesn't filter by broadcast type
2. **Statistics**: SQL trailing comma in `onboarding.service.ts:72`
3. **Renewal**: Payload structure mismatch in `RenewalAction`

These are code bugs, not documentation issues.
