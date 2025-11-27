# Task: Implement Graceful Shutdown

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-011 (fault isolation)
- Provides: Clean shutdown with webhook deletion
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-6 (Graceful Shutdown)

## Implementation Content
Implement `onApplicationShutdown()` to properly cleanup all dynamic bots by deleting webhooks and clearing registries when the application shuts down.

Design Doc Reference: Section "AC-6: Graceful Shutdown"

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Add graceful shutdown tests:
  ```typescript
  describe('AC-6: Graceful Shutdown', () => {
    it('deletes webhooks for all dynamic bots on shutdown', async () => {
      await service.onModuleInit()

      await service.onApplicationShutdown('SIGTERM')

      expect(mockTelegram.deleteWebhook).toHaveBeenCalledTimes(2) // For 2 bots
    })

    it('clears bot registry on shutdown', async () => {
      await service.onModuleInit()
      expect(service.getBotCount()).toBe(2)

      await service.onApplicationShutdown('SIGTERM')

      expect(service.getBotCount()).toBe(0)
    })

    it('clears webhook path index on shutdown', async () => {
      await service.onModuleInit()
      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeDefined()

      await service.onApplicationShutdown('SIGTERM')

      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeUndefined()
    })

    it('logs shutdown signal', async () => {
      await service.onModuleInit()

      await service.onApplicationShutdown('SIGTERM')

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('shutting down')
      )
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('SIGTERM')
      )
    })

    it('continues shutdown even if deleteWebhook fails for some bots', async () => {
      await service.onModuleInit()
      mockTelegram.deleteWebhook
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined)

      await expect(service.onApplicationShutdown('SIGTERM')).resolves.not.toThrow()

      expect(service.getBotCount()).toBe(0) // Registry still cleared
    })

    it('logs warning when bots fail to stop cleanly', async () => {
      await service.onModuleInit()
      mockTelegram.deleteWebhook.mockRejectedValue(new Error('Network error'))

      await service.onApplicationShutdown('SIGTERM')

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to stop cleanly')
      )
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `stopBot()` helper method:
  ```typescript
  private async stopBot(
    botId: number,
    instance: DynamicBotInstance
  ): Promise<void> {
    try {
      await instance.bot.telegram.deleteWebhook()
      this.logger.debug(`Webhook deleted for bot "${instance.name}"`)
    } catch (error) {
      this.logger.error(
        `Error deleting webhook for bot "${instance.name}":`,
        error
      )
      throw error // Re-throw for Promise.allSettled to catch
    }
  }
  ```
- [x] Implement `onApplicationShutdown()`:
  ```typescript
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Application shutting down (signal: ${signal}), stopping ${this.bots.size} dynamic bots...`
    )

    const stopPromises: Promise<void>[] = []

    for (const [botId, instance] of this.bots) {
      stopPromises.push(this.stopBot(botId, instance))
    }

    const results = await Promise.allSettled(stopPromises)

    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      this.logger.warn(`${failures.length} bots failed to stop cleanly`)
    }

    this.bots.clear()
    this.webhookPathIndex.clear()

    this.logger.log('All dynamic bots stopped')
  }
  ```

### 3. Refactor Phase
- [x] Use Promise.allSettled for parallel webhook deletion
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases (AC-6)

| Test | Description | Status |
|------|-------------|--------|
| "deletes webhooks for all dynamic bots" | Webhook cleanup | Pass |
| "clears bot registry on shutdown" | Registry cleanup | Pass |
| "clears webhook path index on shutdown" | Index cleanup | Pass |
| "logs shutdown signal" | Logging | Pass |
| "continues shutdown even if deleteWebhook fails" | Error tolerance | Pass |
| "logs warning when bots fail to stop cleanly" | Warning logging | Pass |

## Completion Criteria
- [x] `onApplicationShutdown()` deletes all webhooks
- [x] Bot registry cleared after shutdown
- [x] Webhook path index cleared after shutdown
- [x] Shutdown signal logged
- [x] Failures don't prevent cleanup
- [x] AC-6 unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "AC-6"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: Must use Promise.allSettled to handle partial failures
- Webhook deletion prevents orphaned webhooks causing Telegram to retry
