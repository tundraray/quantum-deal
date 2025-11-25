# Quantum Deal Documentation

## Overview

This directory contains all project documentation organized by type.

## Subscription System Documentation

The subscription system is documented across 7 features, each with a PRD (Product Requirements Document) and Design Doc (Technical Design Document).

### Product Requirements Documents (PRD)

| Feature | Document | Description |
|---------|----------|-------------|
| Core Infrastructure | [subscription-core-prd.md](prd/subscription-core-prd.md) | Base subscription system, user-subscription relationships, feature flags |
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

## Directory Structure

```
docs/
├── README.md                    # This file
├── prd/                         # Product Requirements Documents
│   └── subscription-*.md
├── design/                      # Technical Design Documents
│   └── subscription-*.md
├── plans/                       # Work Plans
│   └── *.md
├── guides/                      # Development Guides
│   └── sub-agents.md
├── archive/                     # Archived Documentation
│   ├── subscribtion/            # Original broadcast docs (archived)
│   └── subscription-v2/         # V2 docs (archived)
└── rules/                       # Project Rules
    └── *.md
```

## Quick Links

- **For Business Requirements**: Start with PRD documents in `docs/prd/`
- **For Technical Implementation**: See Design documents in `docs/design/`
- **For Historical Context**: Check `docs/archive/`

## Document Status

All subscription documents were created on **2025-11-25** by reverse-engineering the existing implementation. They accurately reflect the current state of the codebase.

### Known Code Issues (from Design Doc Reviews)

The following code issues were identified during documentation review:

1. **Core**: `findActiveBroadcastSubscriptions()` doesn't filter by broadcast type
2. **Statistics**: SQL trailing comma in `onboarding.service.ts:72`
3. **Renewal**: Payload structure mismatch in `RenewalAction`

These are code bugs, not documentation issues.
