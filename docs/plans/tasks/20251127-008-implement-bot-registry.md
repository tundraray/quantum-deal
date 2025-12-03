# Task: Implement Bot Registry

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-007 (bot loading)
- Provides: Bot instance storage and lookup methods
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)

## Implementation Content
Implement the bot registry using `Map<number, DynamicBotInstance>` for O(1) bot lookup by ID, plus a `webhookPathIndex` map for fast webhook routing.

Design Doc Reference: Section "DynamicTelegrafService" - Registry implementation

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Add/update registry tests:
  ```typescript
  describe('Bot Registry', () => {
    it('stores bot instances by ID for O(1) lookup', async () => {
      // Setup 2 bots
      await service.onModuleInit()

      expect(service.getBot(1)).toBeDefined()
      expect(service.getBot(2)).toBeDefined()
      expect(service.getBot(999)).toBeUndefined()
    })

    it('provides getBotByWebhookPath for routing', async () => {
      await service.onModuleInit()

      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeDefined()
      expect(service.getBotByWebhookPath('/unknown')).toBeUndefined()
    })

    it('returns bot count correctly', async () => {
      await service.onModuleInit()

      expect(service.getBotCount()).toBe(2)
    })

    it('getAllBots returns defensive copy', async () => {
      await service.onModuleInit()

      const allBots = service.getAllBots()
      allBots.clear() // Modify returned map

      expect(service.getBotCount()).toBe(2) // Original unchanged
    })

    it('hasBot returns correct boolean', async () => {
      await service.onModuleInit()

      expect(service.hasBot(1)).toBe(true)
      expect(service.hasBot(999)).toBe(false)
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `getBot(botId: number)` (already implemented in previous task):
  ```typescript
  getBot(botId: number): Telegraf<Context> | undefined {
    return this.bots.get(botId)?.bot
  }
  ```
- [x] Implement `getBotByWebhookPath(webhookPath: string)` (already implemented in previous task):
  ```typescript
  getBotByWebhookPath(webhookPath: string): Telegraf<Context> | undefined {
    const botId = this.webhookPathIndex.get(webhookPath)
    if (botId === undefined) return undefined
    return this.bots.get(botId)?.bot
  }
  ```
- [x] Implement `getAllBots()` (already implemented in previous task):
  ```typescript
  getAllBots(): Map<number, DynamicBotInstance> {
    return new Map(this.bots) // Return copy
  }
  ```
- [x] Implement `getBotCount()` (already implemented in previous task):
  ```typescript
  getBotCount(): number {
    return this.bots.size
  }
  ```
- [x] Implement `hasBot(botId: number)` (already implemented in previous task):
  ```typescript
  hasBot(botId: number): boolean {
    return this.bots.has(botId)
  }
  ```
- [x] Update mock `initializeBot()` to populate registry:
  ```typescript
  // In initializeBot (temporary):
  this.bots.set(config.id, mockInstance)
  this.webhookPathIndex.set(config.webhookPath, config.id)
  ```

### 3. Refactor Phase
- [x] Ensure consistent return types
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases to Update

| Test | Status Before | Status After |
|------|---------------|--------------|
| "stores bot instances by ID for O(1) lookup" | Fail | Pass |
| "provides getBotByWebhookPath for routing" | Fail | Pass |
| "returns bot count correctly" | Fail | Pass |
| "getAllBots returns defensive copy" | Fail | Pass |
| "hasBot returns correct boolean" | Fail | Pass |

## Completion Criteria
- [x] `getBot()` returns bot instance by ID
- [x] `getBotByWebhookPath()` returns bot by webhook path
- [x] `getAllBots()` returns defensive copy of registry
- [x] `getBotCount()` returns correct count
- [x] `hasBot()` returns boolean
- [x] All registry unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "Bot Registry"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: Return defensive copies to prevent external modification
- webhookPathIndex enables O(1) routing in handleUpdate()
