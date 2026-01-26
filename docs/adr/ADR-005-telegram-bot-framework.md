# ADR-005: Telegram Bot Framework Selection

## Status

Accepted

## Context

The Quantum Deal project requires a Telegram bot framework for its multi-bot architecture. The existing ADR-004 (Multi-Bot Database Architecture) incorrectly assumed the project uses Grammy.js, when in fact the current implementation uses **Telegraf.js** with the **nest-telegraf** NestJS wrapper.

### Current Implementation State

The project already has a working multi-bot implementation:

```typescript
// src/app.module.ts - Current configuration
TelegrafModule.forRootAsync({
  botName: BotName,  // 'QuantumDealBot'
  useFactory: (configService, userMiddleware) => ({
    token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
    middlewares: [userMiddleware.use.bind(userMiddleware), sessionMiddleware],
    webhook: { domain: '...', path: '/bot' },
    include: [BotModule],
  }),
}),
TelegrafModule.forRootAsync({
  botName: 'QuantumDealMasterBot',
  useFactory: (configService, managersMiddleware) => ({
    token: configService.getOrThrow<string>('TELEGRAM_MASTER_BOT_TOKEN'),
    middlewares: [sessionMiddleware, managersMiddleware.use.bind(managersMiddleware)],
    webhook: { domain: '...', path: '/masterbot' },
    include: [MasterbotModule],
  }),
}),
```

### Current Technology Stack

| Component | Package | Version |
|-----------|---------|---------|
| Bot Framework | telegraf | ^4.16.3 |
| NestJS Wrapper | @quantumdeal/telegraf | ^2.9.1 |
| Runtime | NestJS | ^11.0.1 |

### Technical Requirements

1. **Multi-bot support**: Run multiple bot instances (signals bot + admin bot + future branded bots)
2. **NestJS integration**: Full DI support, decorators, guards, interceptors, filters, pipes
3. **Webhook support**: Production deployment with webhooks per bot
4. **TypeScript**: Strong type definitions
5. **Maintainability**: Active development, bug fixes, security updates

### Decision Drivers

- Minimize disruption to working codebase
- Ensure long-term maintainability
- Support business requirement for unlimited branded bots
- Developer productivity and familiarity

## Decision

**Stay with Telegraf.js + nest-telegraf (Option A)**

The project will continue using the current Telegraf.js + nest-telegraf stack for the following reasons:

1. **Working multi-bot implementation exists**: The codebase already demonstrates successful multi-bot configuration with separate webhook paths
2. **Migration cost not justified**: Grammy offers incremental improvements, not transformational features
3. **nest-telegraf is actively maintained**: Latest release April 2025, 100% maintenance score
4. **Feature parity**: Both frameworks support all required features

## Options Considered

### Option A (Selected): Stay with Telegraf.js + nest-telegraf

**Overview**: Continue using current stack, extend multi-bot patterns as needed

**Pros**:
- **Zero migration cost**: No code changes required
- **Proven implementation**: Multi-bot already working in production
- **Active maintenance**: nest-telegraf v2.9.1 released April 2025
- **Large community**: 12,356 weekly downloads, 586 GitHub stars
- **Full NestJS integration**: Guards, interceptors, filters, pipes, decorators
- **Comprehensive features**: Sessions, scenes, plugins, middleware
- **Webhook support per bot**: Demonstrated in current `app.module.ts`

**Cons**:
- **Telegraf v4 support until Feb 2025**: Announced end of v4 support (though v5 development ongoing)
- **TypeScript quirks**: Some complex type definitions reported
- **Documentation**: API reference-focused, fewer guides than Grammy

**Effort**: 0 days (no migration)

### Option B: Migrate to Grammy.js + @grammyjs/nestjs

**Overview**: Replace Telegraf with Grammy and use official grammyjs/nestjs integration

**Pros**:
- **Modern TypeScript**: "Types just work" - designed TypeScript-first
- **Better documentation**: Comprehensive guides and explanations
- **Latest Bot API**: Always supports newest Telegram features
- **Memory leak detection**: Warns about listener registration issues
- **Growing ecosystem**: Active plugin development

**Cons**:
- **Migration effort**: Requires rewriting bot handlers, middleware, scenes
- **Smaller NestJS wrapper community**: @grammyjs/nestjs has fewer users
- **Working code disruption**: Current implementation would need complete rewrite
- **Performance reports mixed**: Some users report slower response times
- **Testing burden**: All existing bot tests would need updates

**Effort**: 5-7 days (full migration + testing)

### Option C: Hybrid - Grammy for New Bots, Telegraf for Existing

**Overview**: Keep existing bots on Telegraf, create new branded bots with Grammy

**Pros**:
- **Gradual transition**: Learn Grammy without disrupting existing code
- **Risk mitigation**: New bots can fail without affecting main bot
- **Technology evaluation**: Real-world comparison opportunity

**Cons**:
- **Increased complexity**: Two bot frameworks, two sets of patterns
- **Code duplication**: Handlers cannot be shared between frameworks
- **Maintenance burden**: Must maintain expertise in both frameworks
- **Inconsistent architecture**: Different bots behave differently
- **Module isolation issues**: NestJS DI complexity with mixed frameworks

**Effort**: 3-4 days per new bot (ongoing overhead)

## Comparison Matrix

| Evaluation Axis | Weight | Option A (Telegraf) | Option B (Grammy) | Option C (Hybrid) |
|-----------------|--------|---------------------|-------------------|-------------------|
| Multi-bot Support | HIGH | Excellent (proven) | Good (documented) | Complex |
| NestJS Integration | HIGH | Excellent (mature) | Good (newer) | Poor (mixed) |
| Migration Effort | HIGH | 0 days | 5-7 days | Ongoing |
| TypeScript Quality | MEDIUM | Good | Excellent | Mixed |
| Documentation | MEDIUM | Adequate | Excellent | N/A |
| Community/Maintenance | MEDIUM | Strong | Growing | N/A |
| Performance | LOW | Good | Good | N/A |
| **Weighted Score** | | **9/10** | **7/10** | **4/10** |

## Rationale

### Why Stay with Telegraf

1. **Working Code Principle**: The current multi-bot implementation demonstrates that Telegraf + nest-telegraf fully meets the requirements. Migrating would violate the principle of "if it ain't broke, don't fix it."

2. **Migration ROI Analysis**:
   - Migration cost: 5-7 developer days
   - Risk: Breaking existing features, introducing new bugs
   - Benefit: Marginally better TypeScript, newer documentation
   - **Conclusion**: Benefits do not justify the cost and risk

3. **nest-telegraf Maturity**:
   - 878,205 total downloads
   - 36 releases over 5 years
   - Most recent release: April 2025
   - 100% maintenance score on npm

4. **Multi-bot Pattern Proven**:
   ```typescript
   // Already working in app.module.ts
   TelegrafModule.forRootAsync({ botName: 'bot1', include: [Bot1Module] })
   TelegrafModule.forRootAsync({ botName: 'bot2', include: [Bot2Module] })
   ```

5. **Future Scalability**: Adding new branded bots follows the established pattern:
   - Add new `TelegrafModule.forRootAsync()` with unique `botName`
   - Create dedicated module for bot-specific handlers
   - Configure unique webhook path

### Addressing ADR-004 Inconsistency

ADR-004 (Multi-Bot Database Architecture) incorrectly references Grammy in code examples. This ADR supersedes those references. The implementation guidance from ADR-004 remains valid - only the framework name changes from Grammy to Telegraf:

| ADR-004 Reference | Correct Implementation |
|-------------------|----------------------|
| `import { Bot } from 'grammy'` | `import { Telegraf } from 'telegraf'` |
| `new Bot(token)` | `new Telegraf(token)` |
| Grammy context | Telegraf context |

## Consequences

### Positive Consequences

- **Zero disruption**: No code changes, no testing burden
- **Continuity**: Team familiarity with existing patterns
- **Proven patterns**: Multi-bot implementation already validated
- **Focus on features**: Developer time spent on business value, not migration
- **Stable dependency**: nest-telegraf actively maintained

### Negative Consequences

- **Telegraf v4 lifecycle**: Must monitor v5 development and plan future upgrade
- **TypeScript friction**: Some type casting may be needed in complex scenarios
- **Documentation gaps**: May need to rely on source code for edge cases

### Neutral Consequences

- **Framework lock-in**: Investment in Telegraf patterns continues
- **ADR-004 update needed**: Code examples should reference Telegraf, not Grammy

## Implementation Guidance

### Multi-bot Configuration Pattern

When adding new branded bots, follow this pattern:

```typescript
// 1. Create dedicated module for bot handlers
@Module({
  providers: [NewBrandUpdate, /* handlers */],
  exports: [NewBrandUpdate],
})
export class NewBrandBotModule {}

// 2. Register bot in AppModule
TelegrafModule.forRootAsync({
  botName: 'NewBrandBot',
  imports: [ConfigModule, NewBrandBotModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    token: configService.getOrThrow<string>('NEW_BRAND_BOT_TOKEN'),
    middlewares: [sessionMiddleware],
    webhook: {
      domain: configService.getOrThrow<string>('WEBHOOK_DOMAIN'),
      path: '/newbrand',
    },
    include: [NewBrandBotModule],
  }),
}),
```

### Bot Injection in Services

```typescript
@Injectable()
export class BroadcastService {
  constructor(
    @InjectBot('QuantumDealBot') private signalsBot: Telegraf<Context>,
    @InjectBot('QuantumDealMasterBot') private masterBot: Telegraf<Context>,
  ) {}
}
```

### Context Extension for Bot Identification

```typescript
// Middleware to inject bot ID into context
async function botIdentifierMiddleware(
  ctx: Context & { botId?: string },
  next: () => Promise<void>,
) {
  ctx.botId = 'determined-from-token-or-config'
  await next()
}
```

### Type Safety Principles

- Use explicit type annotations for context extensions
- Leverage `Scenes.SceneContext` for wizard/scene handlers
- Define session interface explicitly in each bot module

## Related Information

### Prerequisite Documents

- **ADR-004**: `docs/adr/ADR-004-multi-bot-architecture.md` - Multi-bot database design (requires code example updates)

### External References

- [@quantumdeal/telegraf npm package](https://www.npmjs.com/package/@quantumdeal/telegraf)
- [@quantumdeal/telegraf Multiple Bots Documentation](https://@quantumdeal/telegraf.0x467.com/extras/multiple-bots)
- [Telegraf.js GitHub Repository](https://github.com/telegraf/telegraf)
- [Telegraf.js Releases](https://github.com/telegraf/telegraf/releases)
- [Grammy vs Telegraf Comparison](https://grammy.dev/resources/comparison)
- [@grammyjs/nestjs package](https://www.npmjs.com/package/@grammyjs/nestjs)
- [Migration to grammY from Telegraf Guide](https://medium.com/@dimpurr/migration-to-grammy-from-telegraf-a-guide-f68de99bc8b8)
- [npm trends: Telegraf vs Grammy](https://npmtrends.com/grammy-vs-telegraf)

### Research Findings Summary

| Framework | Weekly Downloads | GitHub Stars | NestJS Wrapper | Last Release |
|-----------|------------------|--------------|----------------|--------------|
| Telegraf | ~100,000 | ~7,800 | nest-telegraf (mature) | v4.16.3 |
| Grammy | ~55,000 | ~3,100 | @grammyjs/nestjs (newer) | Active |
| nest-telegraf | ~12,000 | ~586 | N/A | April 2025 |

---

## Decision Record

| Attribute | Value |
|-----------|-------|
| **Decision Date** | 2025-11-26 |
| **Decision Status** | Accepted |
| **Supersedes** | Grammy references in ADR-004 code examples |
| **Author** | Claude Code Architecture Agent |

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Claude Code Architecture Agent | Initial version - Decision to stay with Telegraf |

---

**Document Version**: 1.0.0
**Created**: 2025-11-26
**Last Updated**: 2025-11-26
**Author**: Claude Code Architecture Agent
