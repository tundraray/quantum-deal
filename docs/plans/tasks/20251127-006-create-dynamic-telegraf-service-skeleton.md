# Task: Create DynamicTelegrafService Skeleton

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Phase 1 completion (interfaces, constants)
- Provides: Service class structure for bot registry and lifecycle
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Create the skeleton structure of DynamicTelegrafService with constructor injection and stub methods. This establishes the service foundation for subsequent implementation tasks.

Design Doc Reference: Section "Component Specifications" - DynamicTelegrafService

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Unit tests from Phase 0 still in Red state
- [x] Service doesn't exist yet - imports will fail in tests

### 2. Green Phase
- [x] Create new file `dynamic-telegraf.service.ts`
- [x] Add imports from interfaces and constants
- [x] Define `@Injectable()` class `DynamicTelegrafService`
- [x] Implement `OnModuleInit` and `OnApplicationShutdown` interfaces
- [x] Add constructor with dependency injection:
  ```typescript
  constructor(
    @Inject(DYNAMIC_TELEGRAF_MODULE_OPTIONS)
    private readonly options: TelegrafDynamicModuleOptions,
    @Inject(BOT_CONFIGURATION_PROVIDER)
    private readonly botConfigProvider: BotConfigurationProvider,
    // DynamicListenersExplorerService will be added in Phase 3
  ) {}
  ```
- [x] Add private properties:
  - `logger: Logger`
  - `bots: Map<number, DynamicBotInstance>`
  - `webhookPathIndex: Map<string, number>`
  - `stats: DynamicBotStats`
- [x] Add stub methods (throw NotImplementedError):
  - `async onModuleInit(): Promise<void>`
  - `async onApplicationShutdown(signal?: string): Promise<void>`
  - `async handleUpdate(webhookPath: string, update: Update): Promise<boolean>`
  - `getBot(botId: number): Telegraf<Context> | undefined`
  - `getBotByWebhookPath(webhookPath: string): Telegraf<Context> | undefined`
  - `getAllBots(): Map<number, DynamicBotInstance>`
  - `getBotCount(): number`
  - `getStats(): DynamicBotStats`
  - `hasBot(botId: number): boolean`

### 3. Refactor Phase
- [x] Ensure consistent method ordering
- [x] Add JSDoc comments to all public methods
- [x] Run build to verify compilation

## Class Structure
```typescript
@Injectable()
export class DynamicTelegrafService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DynamicTelegrafService.name)
  private readonly bots = new Map<number, DynamicBotInstance>()
  private readonly webhookPathIndex = new Map<string, number>()
  private stats: DynamicBotStats = { total: 0, successful: 0, failed: 0, bots: [] }

  constructor(...) {}

  // Lifecycle
  async onModuleInit(): Promise<void> { throw new Error('Not implemented') }
  async onApplicationShutdown(signal?: string): Promise<void> { throw new Error('Not implemented') }

  // Private methods (stubs)
  private async loadAndInitializeBots(): Promise<BotInitResult[]> { throw new Error('Not implemented') }
  private async initializeBot(config: DynamicBotConfig): Promise<BotInitResult> { throw new Error('Not implemented') }
  private async setupWebhook(...): Promise<void> { throw new Error('Not implemented') }
  private async stopBot(...): Promise<void> { throw new Error('Not implemented') }

  // Public API
  async handleUpdate(...): Promise<boolean> { throw new Error('Not implemented') }
  getBot(botId: number): Telegraf<Context> | undefined { return undefined }
  getBotByWebhookPath(...): Telegraf<Context> | undefined { return undefined }
  getAllBots(): Map<number, DynamicBotInstance> { return new Map() }
  getBotCount(): number { return 0 }
  getStats(): DynamicBotStats { return { ...this.stats } }
  hasBot(botId: number): boolean { return false }
}
```

## Completion Criteria
- [x] Service class created with all stub methods
- [x] Constructor injection configured
- [x] Implements OnModuleInit and OnApplicationShutdown
- [x] `npm run build` passes
- [x] Service importable from `./services/dynamic-telegraf.service`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Do not implement actual logic - skeleton only
- DynamicListenersExplorerService injection will be added after Phase 3
- This task establishes the class structure; implementation follows in tasks 2.2-2.8
