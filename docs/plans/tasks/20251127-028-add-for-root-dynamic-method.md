# Task: Add forRootDynamic() to TelegrafModule

Metadata:
- Phase: 4 (Module Integration)
- Dependencies: Task 20251127-027 (DynamicTelegrafCoreModule)
- Provides: Public API entry point for dynamic bot loading
- Size: Small (1 file)
- Verification Level: L1 (Functional Operation)
- AC Coverage: AC-1 (forRootDynamic Coexistence)

## Implementation Content
Add the `forRootDynamic()` static method to TelegrafModule that creates a DynamicModule importing DynamicTelegrafCoreModule. This is the public API for enabling database-driven bot loading.

Design Doc Reference: Section "TelegrafModule Extension"

## Target Files
- [x] `libs/telegraf/src/telegraf.module.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Integration tests for forRootDynamic will verify in Task 4.4

### 2. Green Phase
- [x] Read existing `telegraf.module.ts`
- [x] Add import for DynamicTelegrafCoreModule and new interfaces:
  ```typescript
  import { DynamicTelegrafCoreModule } from './dynamic-telegraf-core.module'
  import { TelegrafDynamicModuleOptions } from './interfaces'
  ```
- [x] Add `forRootDynamic()` method:
  ```typescript
  /**
   * Dynamic bot loading from database
   *
   * Creates a DynamicTelegrafCoreModule that:
   * 1. Loads bot configurations from BotConfigurationProvider at startup
   * 2. Creates Telegraf instances for each active bot
   * 3. Registers shared handlers on each bot
   * 4. Sets up webhooks
   * 5. Provides bot registry for update routing
   *
   * @param options Dynamic module configuration
   * @returns DynamicModule for NestJS registration
   *
   * @example
   * ```typescript
   * // app.module.ts
   * @Module({
   *   imports: [
   *     // Static bot (existing)
   *     TelegrafModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (config: ConfigService) => ({
   *         token: config.get('MAIN_BOT_TOKEN'),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *
   *     // Dynamic bots (new)
   *     TelegrafModule.forRootDynamic({
   *       botConfigProvider: BotsRepository,
   *       sharedHandlerModules: [SharedHandlersModule],
   *       webhookDomain: process.env.WEBHOOK_DOMAIN,
   *       imports: [DbModule],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRootDynamic(
    options: TelegrafDynamicModuleOptions,
  ): DynamicModule {
    return {
      module: TelegrafModule,
      imports: [DynamicTelegrafCoreModule.forRoot(options)],
      exports: [DynamicTelegrafCoreModule],
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure consistent formatting with existing methods
- [x] Verify JSDoc example is accurate
- [x] Run build to verify compilation

## TelegrafModule API After Change

```typescript
TelegrafModule.forRoot(options)       // Static sync configuration
TelegrafModule.forRootAsync(options)  // Static async configuration
TelegrafModule.forRootDynamic(options) // Database-driven dynamic loading (NEW)
```

## Completion Criteria
- [x] `forRootDynamic()` method added to TelegrafModule
- [x] Method returns DynamicModule importing DynamicTelegrafCoreModule
- [x] JSDoc documentation with usage example
- [x] Coexists with existing forRoot/forRootAsync methods
- [x] `npm run build` passes

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: TelegrafModule only
- Constraints: Must not modify existing forRoot/forRootAsync behavior
- This completes AC-1: forRootDynamic coexistence with forRootAsync
