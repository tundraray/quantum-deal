# Task: Implement Bot Loading from BotConfigurationProvider

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-006 (service skeleton)
- Provides: Bot configuration loading from database provider
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-2 (Database Loading)

## Implementation Content
Implement the `loadAndInitializeBots()` private method that queries the BotConfigurationProvider for active bot configurations and initiates bot initialization.

Design Doc Reference: Section "Data Flow" - BotConfigurationProvider loading

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update test for bot loading:
  ```typescript
  it('loads bot configurations from BotConfigurationProvider', async () => {
    const mockConfigs: DynamicBotConfig[] = [
      { id: 1, name: 'Bot1', token: '123:abc', webhookPath: '/dynamic/bot1', isActive: true, username: 'bot1', settings: null },
      { id: 2, name: 'Bot2', token: '456:def', webhookPath: '/dynamic/bot2', isActive: true, username: 'bot2', settings: null },
    ]
    mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs)

    await service.onModuleInit()

    expect(mockBotConfigProvider.loadDynamicBots).toHaveBeenCalledOnce()
  })
  ```
- [x] Run tests - confirm failure

### 2. Green Phase
- [x] Implement `loadAndInitializeBots()` method:
  ```typescript
  private async loadAndInitializeBots(): Promise<BotInitResult[]> {
    const configs = await this.botConfigProvider.loadDynamicBots()
    const results: BotInitResult[] = []

    for (const config of configs) {
      if (!config.isActive) {
        this.logger.debug(`Skipping inactive bot: ${config.name}`)
        continue
      }

      const result = await this.initializeBot(config)
      results.push(result)
    }

    return results
  }
  ```
- [x] Implement basic `onModuleInit()`:
  ```typescript
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing dynamic bots...')

    try {
      const results = await this.loadAndInitializeBots()

      this.stats = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        bots: results.map((r) => ({
          botId: r.botId,
          name: r.name,
          status: r.success ? 'running' : 'failed',
          error: r.error,
        })),
      }

      this.logger.log(
        `Dynamic bots initialized: ${this.stats.successful} success, ${this.stats.failed} failed`
      )
    } catch (error) {
      this.logger.error('Critical error during dynamic bot initialization', error)
    }
  }
  ```
- [x] Stub `initializeBot()` to return mock result for now

### 3. Refactor Phase
- [x] Extract logging to helper methods if needed (not needed, logging is minimal)
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases to Update

| Test | Status Before | Status After |
|------|---------------|--------------|
| "loads bot configurations from BotConfigurationProvider" | Fail | Pass |

## Completion Criteria
- [x] `loadAndInitializeBots()` queries BotConfigurationProvider
- [x] Inactive bots are filtered out (isActive === false)
- [x] `onModuleInit()` calls `loadAndInitializeBots()`
- [x] Statistics updated after initialization
- [x] Relevant unit test passes
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "loads bot configurations"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: initializeBot() remains stubbed until Task 2.5
- Error handling for database failures implemented in Task 2.6
