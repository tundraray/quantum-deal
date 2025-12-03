# Task: Implement Fault Isolation

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-010 (initializeBot)
- Provides: Per-bot error handling and fault isolation
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-5 (Fault Isolation)

## Implementation Content
Implement fault isolation so that a failed bot initialization does not prevent other bots from starting. Each bot initialization is wrapped in try-catch, errors are logged, and the service continues with remaining bots.

Design Doc Reference: Section "AC-5: Fault Isolation"

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Add fault isolation tests:
  ```typescript
  describe('AC-5: Fault Isolation', () => {
    it('continues with other bots when one fails to initialize', async () => {
      const mockConfigs = [
        { id: 1, name: 'Bot1', token: 'valid:token', webhookPath: '/bot1', isActive: true, username: null, settings: null },
        { id: 2, name: 'Bot2', token: 'invalid:token', webhookPath: '/bot2', isActive: true, username: null, settings: null },
        { id: 3, name: 'Bot3', token: 'valid:token2', webhookPath: '/bot3', isActive: true, username: null, settings: null },
      ]
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs)

      // Bot2 will fail getMe()
      mockTelegram.getMe
        .mockResolvedValueOnce({ id: 1, username: 'bot1' })
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce({ id: 3, username: 'bot3' })

      await service.onModuleInit()

      expect(service.getBotCount()).toBe(2) // Bot1 and Bot3
      expect(service.hasBot(1)).toBe(true)
      expect(service.hasBot(2)).toBe(false)
      expect(service.hasBot(3)).toBe(true)
    })

    it('logs errors for failed bots', async () => {
      mockTelegram.getMe.mockRejectedValue(new Error('Invalid token'))

      await service.onModuleInit()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start bot')
      )
    })

    it('reports failure count in stats', async () => {
      const mockConfigs = [
        { id: 1, name: 'Bot1', token: 'valid', webhookPath: '/bot1', isActive: true, username: null, settings: null },
        { id: 2, name: 'Bot2', token: 'invalid', webhookPath: '/bot2', isActive: true, username: null, settings: null },
      ]
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs)
      mockTelegram.getMe
        .mockResolvedValueOnce({ id: 1, username: 'bot1' })
        .mockRejectedValueOnce(new Error('Invalid token'))

      await service.onModuleInit()

      const stats = service.getStats()
      expect(stats.total).toBe(2)
      expect(stats.successful).toBe(1)
      expect(stats.failed).toBe(1)
    })

    it('masks bot tokens in error messages', async () => {
      mockTelegram.getMe.mockRejectedValue(new Error('Token 123456:ABCdef-xyz is invalid'))

      await service.onModuleInit()

      const stats = service.getStats()
      const failedBot = stats.bots.find(b => b.status === 'failed')
      expect(failedBot?.error).not.toContain('123456:ABCdef-xyz')
      expect(failedBot?.error).toContain('***:****')
    })

    it('does not throw when BotConfigurationProvider fails', async () => {
      mockBotConfigProvider.loadDynamicBots.mockRejectedValue(new Error('Database error'))

      await expect(service.onModuleInit()).resolves.not.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical error'),
        expect.anything()
      )
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Verify `initializeBot()` returns `BotInitResult` with success/failure
- [x] Verify `loadAndInitializeBots()` handles errors per-bot
- [x] Update `onModuleInit()` to log failure summary:
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

      // Log failures for debugging
      for (const result of results.filter((r) => !r.success)) {
        this.logger.error(
          `Failed to start bot "${result.name}" (ID: ${result.botId}): ${result.error}`
        )
      }
    } catch (error) {
      this.logger.error('Critical error during dynamic bot initialization', error)
      // Don't throw - allow app to start with static bots only
    }
  }
  ```
- [x] Ensure token masking in `initializeBot()`:
  ```typescript
  const safeError = errorMessage.replace(/\d+:[A-Za-z0-9_-]+/g, '***:****')
  ```

### 3. Refactor Phase
- [x] Consolidate error logging
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases (AC-5)

| Test | Description | Status |
|------|-------------|--------|
| "continues with other bots when one fails" | Fault isolation | Pass |
| "logs errors for failed bots" | Error logging | Pass |
| "reports failure count in stats" | Statistics | Pass |
| "masks bot tokens in error messages" | Security | Pass |
| "does not throw when BotConfigurationProvider fails" | Critical error handling | Pass |

## Completion Criteria
- [x] Failed bot does not prevent other bots from starting
- [x] Errors logged with masked tokens
- [x] Statistics include success/failure counts
- [x] BotConfigurationProvider failure doesn't crash app
- [x] AC-5 unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "AC-5"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: Never expose bot tokens in logs or error messages
- This ensures application stability even with misconfigured bots
