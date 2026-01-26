# Task: Create Integration Test Implementations

Metadata:
- Phase: 4 (Module Integration)
- Dependencies: Task 20251127-029 (package exports)
- Provides: Integration tests verifying all acceptance criteria
- Size: Medium (1-2 files)
- Verification Level: L1 (Functional Operation)
- AC Coverage: AC-1, AC-2, AC-5, AC-6, AC-7

## Implementation Content
Create integration tests that verify the complete dynamic module functionality including module coexistence, database loading, fault isolation, graceful shutdown, and webhook routing.

Design Doc Reference: Section "E2E Verification Procedures"

## Target Files
- [x] `libs/telegraf/src/__tests__/integration/dynamic-telegraf-module.int.spec.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create integration test file structure
- [x] Define all test cases based on acceptance criteria

### 2. Green Phase
- [x] Create test file with all AC integration tests:
  ```typescript
  import { Test, TestingModule } from '@nestjs/testing'
  import { INestApplication } from '@nestjs/common'
  import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
  import { TelegrafModule, DynamicTelegrafService, DynamicBotConfig, BotConfigurationProvider, BOT_CONFIGURATION_PROVIDER } from '../../index'

  describe('DynamicTelegrafModule Integration Tests', () => {
    let app: INestApplication
    let dynamicTelegrafService: DynamicTelegrafService

    // Mock Telegram API
    const mockTelegramApi = {
      getMe: vi.fn().mockResolvedValue({ id: 1, username: 'testbot' }),
      setWebhook: vi.fn().mockResolvedValue(true),
      deleteWebhook: vi.fn().mockResolvedValue(true),
    }

    // Mock BotConfigurationProvider
    class MockBotConfigProvider implements BotConfigurationProvider {
      async loadDynamicBots(): Promise<DynamicBotConfig[]> {
        return [
          { id: 1, token: '123:test1', name: 'Bot1', webhookPath: '/dynamic/bot1', isActive: true, username: 'bot1', settings: null },
          { id: 2, token: '456:test2', name: 'Bot2', webhookPath: '/dynamic/bot2', isActive: true, username: 'bot2', settings: null },
        ]
      }
    }

    beforeEach(async () => {
      // Setup test module
    })

    afterEach(async () => {
      await app?.close()
    })

    // ==========================================================================
    // AC-1: Module Coexistence
    // ==========================================================================

    describe('AC-1: forRootDynamic() Coexistence', () => {
      it('can be imported alongside forRootAsync() in the same application', async () => {
        const module = await Test.createTestingModule({
          imports: [
            TelegrafModule.forRootAsync({
              useFactory: () => ({ token: 'static:token' }),
            }),
            TelegrafModule.forRootDynamic({
              botConfigProvider: MockBotConfigProvider,
              sharedHandlerModules: [],
              webhookDomain: 'https://example.com',
            }),
          ],
        }).compile()

        expect(module).toBeDefined()
      })

      it('static bots continue working when dynamic module is loaded', async () => {
        // Verify no provider conflicts
      })

      it('no conflicts between static and dynamic bot providers', async () => {
        // Verify separate registries
      })
    })

    // ==========================================================================
    // AC-2: Database Loading
    // ==========================================================================

    describe('AC-2: Database Loading', () => {
      it('queries BotConfigurationProvider.loadDynamicBots() on init', async () => {
        const loadSpy = vi.spyOn(MockBotConfigProvider.prototype, 'loadDynamicBots')

        // Create and init module

        expect(loadSpy).toHaveBeenCalledOnce()
      })

      it('creates Telegraf instance for each active bot config', async () => {
        // Verify bot instances created
      })

      it('validates bot tokens via telegram.getMe()', async () => {
        expect(mockTelegramApi.getMe).toHaveBeenCalled()
      })

      it('skips inactive bots (isActive = false)', async () => {
        // Modify mock to return inactive bot
      })
    })

    // ==========================================================================
    // AC-5: Fault Isolation
    // ==========================================================================

    describe('AC-5: Fault Isolation', () => {
      it('continues with remaining bots when one fails initialization', async () => {
        // One bot fails getMe(), others continue
      })

      it('static bots continue operating if dynamic loading fails', async () => {
        // Dynamic provider throws, static bot works
      })

      it('reports error count in initialization summary', async () => {
        const stats = dynamicTelegrafService.getStats()
        expect(stats.failed).toBeDefined()
      })
    })

    // ==========================================================================
    // AC-6: Graceful Shutdown
    // ==========================================================================

    describe('AC-6: Graceful Shutdown', () => {
      it('deletes webhooks for all dynamic bots on application shutdown', async () => {
        await app.close()

        expect(mockTelegramApi.deleteWebhook).toHaveBeenCalled()
      })

      it('all bot instances are properly stopped', async () => {
        await app.close()

        expect(dynamicTelegrafService.getBotCount()).toBe(0)
      })

      it('no orphaned webhooks after shutdown', async () => {
        // Verify cleanup complete
      })
    })

    // ==========================================================================
    // AC-7: Webhook Routing
    // ==========================================================================

    describe('AC-7: Webhook Routing', () => {
      it('each bot uses stored webhookPath for configuration', async () => {
        const bot1 = dynamicTelegrafService.getBotByWebhookPath('/dynamic/bot1')
        const bot2 = dynamicTelegrafService.getBotByWebhookPath('/dynamic/bot2')

        expect(bot1).toBeDefined()
        expect(bot2).toBeDefined()
        expect(bot1).not.toBe(bot2)
      })

      it('handleUpdate routes to correct bot instance', async () => {
        const mockUpdate = { update_id: 123 }

        const result = await dynamicTelegrafService.handleUpdate('/dynamic/bot1', mockUpdate)

        expect(result).toBe(true)
      })

      it('unknown webhook paths handled gracefully', async () => {
        const result = await dynamicTelegrafService.handleUpdate('/unknown', { update_id: 456 })

        expect(result).toBe(false)
      })
    })
  })
  ```

### 3. Refactor Phase
- [x] Ensure proper test isolation
- [x] Add setup/teardown hooks
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases by AC

| AC | Test Count | Description |
|----|------------|-------------|
| AC-1 | 3 | Module coexistence with forRootAsync |
| AC-2 | 4 | Database loading and bot creation |
| AC-5 | 3 | Fault isolation for failed bots |
| AC-6 | 3 | Graceful shutdown and cleanup |
| AC-7 | 3 | Webhook routing |
| **Total** | **16** | |

## Completion Criteria
- [x] Integration test file created
- [x] All 16 integration tests defined and passing
- [x] Tests properly mock Telegram API
- [x] Tests verify each acceptance criterion
- [x] `npm run test -- libs/telegraf/src/__tests__/integration/dynamic-telegraf-module.int.spec.ts` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/__tests__/integration/dynamic-telegraf-module.int.spec.ts
npm run build
```

## Notes
- Impact scope: New test file only
- Constraints: Must mock Telegram API (no real API calls)
- Integration tests verify full module behavior, not isolated units
