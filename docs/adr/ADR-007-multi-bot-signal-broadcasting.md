# ADR-007: Multi-Bot Signal Broadcasting Architecture

## Status

Accepted

## Context

The Quantum Deal platform currently operates a signal broadcasting system designed for a single-bot architecture. With the multi-bot infrastructure now in place (per ADR-004, ADR-006), trading signals from the MT5 source need to be distributed to users across ALL active bots simultaneously, not just a single bot.

### Current State (Single-Bot)

- `NotificationService` is injected with a single bot instance (`@InjectBot('QuantumDealBot')`)
- `NotificationService` uses a single `Bottleneck` instance for rate limiting (28 msg/sec)
- `WebhookProcessorService` sends signals through this single bot
- `SubscriptionsRepository.findBySector()` returns users without botId grouping
- No orchestration layer exists for multi-bot signal routing

### Problem Statement

The business model requires distributing a single MT5 signal source to multiple branded Telegram bots serving different broker partnerships. Users may be subscribed to multiple bots and should receive signals from EACH bot they are subscribed to (no cross-bot deduplication).

### Technical Constraints

- **Tech Stack**: NestJS, Telegraf, Bottleneck (rate limiting), PostgreSQL, Drizzle ORM
- **Performance Requirement**: Signal delivery within 5 seconds of MT5 event (per project context)
- **Telegram API Limits**: 30 messages/second per bot token
- **Existing Infrastructure**:
  - `DynamicTelegrafService` already manages multiple bot instances
  - `BotMessagesRepository.resolveMessage()` already supports bot-specific templates
  - `user_subscriptions.botId` already exists for per-bot subscription scoping

### Related Documents

- **PRD**: `docs/prd/signal-broadcasting-prd.md`
- **ADR-004**: `docs/adr/ADR-004-multi-bot-architecture.md` - Multi-bot database architecture
- **ADR-006**: `docs/adr/ADR-006-dynamic-telegraf-module-loading.md` - Dynamic bot loading pattern
- **ADR-COMMON-signal-broadcasting**: Common patterns for signal broadcasting orchestration
- **ADR-COMMON-multi-bot-context**: Multi-bot context and botId conventions

---

## Decision

This ADR documents four architectural decisions for multi-bot signal broadcasting:

1. **Rate Limiting**: Per-Bot Bottleneck Instances attached to each bot
2. **Signal Routing**: MultiBotSignalService Orchestrator pattern
3. **Data Flow**: Per-Bot User Filtering with `findBySectorForBot`
4. **Bot Access**: BotRegistryService facade for unified bot access

### Decision Summary

| Decision | Selected Approach | Rationale |
|----------|-------------------|-----------|
| Rate Limiting | Per-bot Bottleneck instances | Fault isolation, independent API limits per bot |
| Signal Routing | MultiBotSignalService orchestrator | Single responsibility, testable, parallel by design |
| Data Flow | Per-bot user filtering | Each bot only sends to its own subscribers |
| Bot Access | BotRegistryService facade | Unified interface for static and dynamic bots |

> **Implementation Playbook**: See [ADR-COMMON-signal-broadcasting](./ADR-COMMON-signal-broadcasting.md) for detailed implementation patterns, code examples, and problem mitigations.

---

## Options Considered

### Rate Limiting Options

| Option | Overview | Pros | Cons |
|--------|----------|------|------|
| **A: Per-Bot Bottleneck (Selected)** | Each bot has its own rate limiter | Fault isolation, natural API limit mapping | Slightly more memory |
| B: Shared Bottleneck Pool | Single pool with bot-aware scheduling | Simpler initialization | Cross-bot interference, complex fairness |
| C: No Rate Limiting | Rely on Telegram's backpressure | Zero overhead | Risk of API bans, unpredictable delays |

### Signal Routing Options

| Option | Overview | Pros | Cons |
|--------|----------|------|------|
| **A: Orchestrator (Selected)** | Dedicated MultiBotSignalService | Clear control flow, easy testing | Additional service |
| B: Event Bus (pub/sub) | NotificationService publishes, bots subscribe | Loose coupling | Harder result aggregation |
| C: Direct Service Calls | WebhookProcessor calls each bot directly | Simple | Tight coupling, untestable |

### Bot Access Options

| Option | Overview | Pros | Cons |
|--------|----------|------|------|
| **A: BotRegistryService (Selected)** | Facade aggregating static + dynamic bots | Single access point, mockable | New service |
| B: Direct Injection | Inject static bot + DynamicTelegrafService separately | No new abstractions | Consumer complexity |
| C: Factory Pattern | Bot factory creates on demand | Flexible | Unnecessary for known bots |

---

## Rationale

### Why Per-Bot Bottleneck?

- Each bot token has its own Telegram API rate limit (30 msg/sec)
- Fault isolation ensures one bot's rate limits do not block others
- Clean lifecycle management - limiter destroyed with bot instance

### Why Orchestrator Pattern?

- Single Responsibility - `WebhookProcessorService` remains focused on event validation
- Testable - orchestration logic isolated in dedicated service
- Parallel by design - all bots process independently via `Promise.all()`

### Why BotRegistryService?

- Single point of access abstracts static vs dynamic bot differences
- Easy to add new bot types in future
- Testable - mock single interface for unit tests

### Why Per-Bot User Filtering?

- Each bot only sends to its own subscribers
- Queries use bot's database ID for simple equality conditions
- Backward compatible with existing repository methods

---

## Consequences

### Positive

- Multi-bot signal distribution to ALL active bots
- Per-bot rate limiting respecting Telegram API limits
- Fault isolation between bots
- Bot-specific branding via message templates
- Users subscribed to multiple bots receive from EACH bot
- Clean architecture with testable components

### Negative

- Increased complexity (2 new services: MultiBotSignalService, BotRegistryService)
- Memory overhead (minimal - Bottleneck is lightweight)
- Per-bot database queries (mitigated by indexes)

### Neutral

- No cross-bot deduplication (business requirement - users receive from each subscribed bot)

---

## Implementation Reference

> **Implementation Playbook**: See [ADR-COMMON-signal-broadcasting](./ADR-COMMON-signal-broadcasting.md) for:
> - Per-bot Bottleneck configuration (28 msg/sec reservoir pattern)
> - MultiBotSignalService orchestration pattern
> - BotRegistryService facade implementation
> - Data flow sequence diagram
> - User filtering pipeline with fail-open pattern
> - Error handling and fault isolation
> - Problem patterns and mitigations
> - Testing patterns

> **Bot ID Convention**: See [ADR-COMMON-multi-bot-context](./ADR-COMMON-multi-bot-context.md) for:
> - botId convention: `1` for static bot, `2+` for dynamic bots
> - SignalCapableBot interface: `botId: number` (not `number | null`)
> - Bot-scoped query patterns
> - Per-bot rate limiting lifecycle

### Key Interfaces (Summary)

```typescript
interface SignalCapableBot {
  botId: number;                    // Database ID (1 for static, 2+ for dynamic)
  name: string;
  instance: Telegraf<Context>;
  limiter: Bottleneck;
  type: 'static' | 'dynamic';
  settings?: BotSettings;
}

interface BroadcastResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  botsProcessed: number;
  botsFailed: number;
  perBotResults: BotDeliveryResult[];
  totalDurationMs: number;
}
```

---

## Files to Create

- `libs/framework/src/webhook/multi-bot-signal.service.ts`
- `libs/framework/src/webhook/bot-registry.service.ts`
- `libs/framework/src/webhook/bot-registry.interface.ts`
- `libs/framework/src/webhook/multi-bot-signal.interface.ts`

## Files to Modify

- `libs/telegraf/src/interfaces/dynamic-telegraf-options.interface.ts` - Add `limiter`
- `libs/telegraf/src/services/dynamic-telegraf.service.ts` - Initialize Bottleneck
- `libs/db/src/repositories/subscriptions.repository.ts` - Add `findBySectorForBot`
- `libs/framework/src/notifications/notification.service.ts` - Bot-parameterized methods
- `libs/framework/src/webhook/webhook.service.ts` - Route to `MultiBotSignalService`

---

## Related Information

### Related ADRs

- **ADR-004**: Multi-Bot Database Architecture
- **ADR-006**: Dynamic Telegraf Module Loading Pattern
- **ADR-COMMON-signal-broadcasting**: Signal Broadcasting Orchestration Patterns
- **ADR-COMMON-multi-bot-context**: Multi-Bot Context Patterns

---

## Decision Record

| Attribute | Value |
|-----------|-------|
| **Decision Date** | 2025-12-01 |
| **Status** | Accepted |
| **Related ADRs** | ADR-004, ADR-006, ADR-COMMON-signal-broadcasting, ADR-COMMON-multi-bot-context |

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-01 | - | Initial version |
| 1.3.0 | 2025-12-01 | - | Detailed architecture with code examples |
| 2.0.0 | 2025-12-11 | Claude Code Architecture Agent | Refactored to reference ADR-COMMON documents; removed detailed code examples; fixed botId: null to botId: 1 per ADR-COMMON-multi-bot-context |

---

**Document Version**: 2.0.0
**Last Updated**: 2025-12-11
