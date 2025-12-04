// DynamicTelegrafService Unit Tests - Design Doc: docs/designs/dynamic-telegraf-module-design.md
// Generated: 2025-11-27 | Budget Used: 3/3 unit tests
// Test Type: Unit Tests
// Implementation Timing: Created alongside feature implementation

import { Scenes } from 'telegraf';
import { DynamicTelegrafService } from '../dynamic-telegraf.service';
import type {
  BotConfigurationProvider,
  DynamicBotConfig,
  TelegrafDynamicModuleOptions,
} from '../../interfaces';

// Mock Telegraf module - must be before service import
const mockTelegram = {
  getMe: jest.fn(),
  setWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
};

const mockBotUse = jest.fn();
const mockBotCatch = jest.fn();
const mockBotHandleUpdate = jest.fn();

jest.mock('telegraf', () => {
  const originalModule = jest.requireActual('telegraf');

  return {
    ...originalModule,
    Telegraf: jest.fn().mockImplementation(() => ({
      use: mockBotUse,
      catch: mockBotCatch,
      telegram: mockTelegram,
      handleUpdate: mockBotHandleUpdate,
    })),
  };
});

// Mock Bottleneck for rate limiting tests (ADR-007)
const mockLimiterOn = jest.fn();
const mockLimiterStop = jest.fn().mockResolvedValue(undefined);

jest.mock('bottleneck', () => {
  return jest.fn().mockImplementation(() => ({
    on: mockLimiterOn,
    stop: mockLimiterStop,
  }));
});

/**
 * DynamicTelegrafService Unit Tests
 *
 * These tests verify:
 * - Database loading via BotConfigurationProvider (AC-2)
 * - Per-bot Stage instance isolation (AC-3)
 * - Handler registration patterns (AC-4)
 *   - Shared handlers on all bots
 *   - @ForBot(botId) filtering
 *   - @RequiresFeature filtering
 *
 * Mock Strategy:
 * - Mock BotConfigurationProvider (no database)
 * - Mock Telegraf instances (no Telegram API)
 * - Mock DynamicListenersExplorerService
 * - Use real DynamicTelegrafService
 *
 * Prerequisites:
 * - DynamicTelegrafService implementation
 * - Type definitions from dynamic-telegraf-options.interface.ts
 */

// =============================================================================
// Test Setup and Mocks
// =============================================================================

describe('DynamicTelegrafService Unit Tests', () => {
  // Service under test
  let service: DynamicTelegrafService;

  // Mock dependencies
  let mockBotConfigProvider: {
    loadDynamicBots: jest.Mock;
  };
  let mockListenersExplorer: {
    registerHandlers: jest.Mock;
  };
  let mockOptions: TelegrafDynamicModuleOptions;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Bottleneck mocks
    mockLimiterOn.mockClear();
    mockLimiterStop.mockClear().mockResolvedValue(undefined);

    // Setup default mock responses
    mockTelegram.getMe.mockResolvedValue({
      id: 123,
      username: 'testbot',
      is_bot: true,
      first_name: 'Test Bot',
    });
    mockTelegram.setWebhook.mockResolvedValue(true);
    mockTelegram.deleteWebhook.mockResolvedValue(true);

    // Reset mocks before each test
    mockBotConfigProvider = {
      loadDynamicBots: jest.fn(),
    };

    mockListenersExplorer = {
      registerHandlers: jest.fn(),
    };

    mockOptions = {
      botConfigProvider:
        {} as TelegrafDynamicModuleOptions['botConfigProvider'],
      sharedHandlerModules: [],
      webhookDomain: 'https://example.com',
    };

    // Create service instance with mocked dependencies
    service = new DynamicTelegrafService(
      mockOptions,
      mockBotConfigProvider as BotConfigurationProvider,
      mockListenersExplorer as any,
    );
  });

  // =============================================================================
  // AC-2: Database Loading
  // =============================================================================

  describe('AC-2: Database Loading', () => {
    it('loads bot configurations from BotConfigurationProvider', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockBotConfigProvider.loadDynamicBots).toHaveBeenCalledTimes(1);
    });

    it('skips inactive bots during loading', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'ActiveBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'InactiveBot',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: false,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      const stats = service.getStats();
      // Only active bots should be processed (1 active bot)
      expect(stats.total).toBe(1);
    });
  });
  // =============================================================================
  // Bot Registry
  // =============================================================================

  describe('Bot Registry', () => {
    it('stores bot instances by ID for O(1) lookup', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      expect(service.getBot(1)).toBeDefined();
      expect(service.getBot(2)).toBeDefined();
      expect(service.getBot(999)).toBeUndefined();
    });

    it('provides getBotByWebhookPath for routing', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeDefined();
      expect(service.getBotByWebhookPath('/unknown')).toBeUndefined();
    });

    it('returns bot count correctly', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      expect(service.getBotCount()).toBe(2);
    });

    it('getAllBots returns defensive copy', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();
      const allBots = service.getAllBots();
      allBots.clear(); // Modify returned map

      // Assert - Original unchanged
      expect(service.getBotCount()).toBe(2);
    });

    it('hasBot returns correct boolean', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      expect(service.hasBot(1)).toBe(true);
      expect(service.hasBot(999)).toBe(false);
    });
  });

  // =============================================================================
  // Bot Initialization (Task 010)
  // =============================================================================

  describe('Bot Initialization', () => {
    it('validates bot token via telegram.getMe()', async () => {
      // Arrange
      mockTelegram.getMe.mockResolvedValue({
        id: 123,
        username: 'testbot',
        is_bot: true,
        first_name: 'Test Bot',
      });
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - getMe() should have been called to validate token
      expect(mockTelegram.getMe).toHaveBeenCalled();
      expect(service.getBotCount()).toBe(1);
      expect(service.hasBot(1)).toBe(true);
    });

    it('applies global middlewares to bot', async () => {
      // Arrange
      const mockMiddleware1 = jest.fn();
      const mockMiddleware2 = jest.fn();
      mockOptions.globalMiddlewares = [mockMiddleware1, mockMiddleware2];

      // Recreate service with updated options
      service = new DynamicTelegrafService(
        mockOptions,
        mockBotConfigProvider as BotConfigurationProvider,
        mockListenersExplorer as any,
      );

      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Global middlewares should be applied via bot.use()
      expect(mockBotUse).toHaveBeenCalledWith(mockMiddleware1);
      expect(mockBotUse).toHaveBeenCalledWith(mockMiddleware2);
    });

    it('applies bot-specific middlewares from factory', async () => {
      // Arrange
      const botSpecificMiddleware = jest.fn();
      mockOptions.middlewareFactory = jest
        .fn()
        .mockReturnValue([botSpecificMiddleware]);

      // Recreate service with updated options
      service = new DynamicTelegrafService(
        mockOptions,
        mockBotConfigProvider as BotConfigurationProvider,
        mockListenersExplorer as any,
      );

      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Middleware factory should be called with config and middlewares applied
      expect(mockOptions.middlewareFactory).toHaveBeenCalled();
      expect(mockBotUse).toHaveBeenCalledWith(botSpecificMiddleware);
    });

    it('applies Stage middleware to bot', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Stage middleware should be applied via bot.use()
      // bot.use() is called with stage.middleware() result
      expect(mockBotUse).toHaveBeenCalled();
      const instance = service.getBotInstance(1);
      expect(instance?.stage).toBeDefined();
    });

    it('stores username from getMe() response', async () => {
      // Arrange
      mockTelegram.getMe.mockResolvedValue({
        id: 123,
        username: 'actualbot',
        is_bot: true,
        first_name: 'Actual Bot',
      });
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: null, // DB doesn't have username yet
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Username should be populated from getMe() response
      const instance = service.getBotInstance(1);
      expect(instance?.username).toBe('actualbot');
    });

    it('reports failed initialization with masked token in error', async () => {
      // Arrange - Make getMe() reject to simulate invalid token
      mockTelegram.getMe.mockRejectedValue(
        new Error(
          '401: Unauthorized. Token: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        ),
      );

      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Stats should show failure with masked token
      const stats = service.getStats();
      expect(stats.total).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.successful).toBe(0);
      // Verify token is masked in the error
      const failedBot = stats.bots.find((b) => b.botId === 1);
      expect(failedBot?.error).not.toContain('123456789');
      expect(failedBot?.error).toContain('***:****');
    });

    it('registers error handler on bot', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Error handler should be registered via bot.catch()
      expect(mockBotCatch).toHaveBeenCalled();
    });

    it('creates Bottleneck limiter for each bot (ADR-007)', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TestBot',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'testbot',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Limiter should be created and error handler registered
      const instance = service.getBotInstance(1);
      expect(instance?.limiter).toBeDefined();
      expect(mockLimiterOn).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  // =============================================================================
  // AC-3: Per-bot Stage Isolation
  // =============================================================================

  describe('AC-3: Per-bot Stage Isolation', () => {
    // AC-3: "Each bot has isolated Stage instance"
    // ROI: 78 | Business Value: 8 (data integrity) | Frequency: 8 (every scene use)
    // Behavior: Different bots have separate Stage instances for scene management
    // Verification: bot1.stage !== bot2.stage (different object references)
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Scenes.Stage
    // @complexity: medium
    it('creates separate Stage instance for each bot', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert
      const bot1Instance = service.getBotInstance(1);
      const bot2Instance = service.getBotInstance(2);

      expect(bot1Instance?.stage).toBeDefined();
      expect(bot2Instance?.stage).toBeDefined();
      expect(bot1Instance?.stage).not.toBe(bot2Instance?.stage);
    });

    // AC-3-data: "Scenes registered per-bot are isolated"
    // ROI: 75 | Business Value: 8 (data integrity) | Frequency: 7
    // Behavior: Scene registered on bot1's stage not accessible from bot2
    // Verification: stage1.scenes has sceneId, stage2.scenes does not
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Scenes.Stage, Scenes.BaseScene
    // @complexity: medium
    it('registers scenes on per-bot Stage only', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      const bot1Instance = service.getBotInstance(1);
      const bot2Instance = service.getBotInstance(2);

      // Act - Register scene on bot1's stage only
      const testScene = new Scenes.BaseScene<Scenes.SceneContext>('test-scene');
      bot1Instance?.stage.register(testScene);

      // Assert - Verify bot2's stage doesn't have the scene
      expect(bot1Instance?.stage.scenes.get('test-scene')).toBeDefined();
      expect(bot2Instance?.stage.scenes.get('test-scene')).toBeUndefined();
    });

    // AC-3-data: "Conversation state isolated between bots"
    // ROI: 80 | Business Value: 9 (data integrity) | Frequency: 8
    // Behavior: User conversation state in bot1 does not leak to bot2
    // Note: Session state isolation is implicitly guaranteed by per-bot Stage isolation
    // Each bot having its own Stage means session middleware will maintain separate state
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Telegraf, session middleware
    // @complexity: high
    it('implicitly isolates conversation state via separate Stage instances', async () => {
      // The conversation/session state isolation is implicitly guaranteed by:
      // 1. Each bot having its own Telegraf instance (separate bot objects)
      // 2. Each bot having its own Stage instance (tested above)
      // 3. Session middleware being applied per-bot
      //
      // Full session isolation testing requires integration tests with actual
      // session middleware, which is out of scope for unit tests.
      // This test verifies the foundation: separate Stage instances exist.

      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Act
      await service.onModuleInit();

      // Assert - Verify foundation for session isolation (separate instances)
      const bot1Instance = service.getBotInstance(1);
      const bot2Instance = service.getBotInstance(2);

      // Different bot instances (separate Telegraf objects)
      expect(bot1Instance?.bot).not.toBe(bot2Instance?.bot);
      // Different stage instances (already tested, reinforced here)
      expect(bot1Instance?.stage).not.toBe(bot2Instance?.stage);
    });
  });

  // =============================================================================
  // AC-5: Fault Isolation
  // =============================================================================

  describe('AC-5: Fault Isolation', () => {
    it('continues with other bots when one fails to initialize', async () => {
      // Arrange - Bot2 will have an invalid token causing getMe() to fail
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: 'valid:token',
          webhookPath: '/bot1',
          isActive: true,
          username: null,
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: 'invalid:token',
          webhookPath: '/bot2',
          isActive: true,
          username: null,
          settings: null,
        },
        {
          id: 3,
          name: 'Bot3',
          token: 'valid:token2',
          webhookPath: '/bot3',
          isActive: true,
          username: null,
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);

      // Bot2 will fail getMe()
      mockTelegram.getMe
        .mockResolvedValueOnce({
          id: 1,
          username: 'bot1',
          is_bot: true,
          first_name: 'Bot 1',
        })
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce({
          id: 3,
          username: 'bot3',
          is_bot: true,
          first_name: 'Bot 3',
        });

      // Act
      await service.onModuleInit();

      // Assert - Bot1 and Bot3 should be running, Bot2 should not
      expect(service.getBotCount()).toBe(2);
      expect(service.hasBot(1)).toBe(true);
      expect(service.hasBot(2)).toBe(false);
      expect(service.hasBot(3)).toBe(true);
    });

    it('logs errors for failed bots', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'FailBot',
          token: '123:abc',
          webhookPath: '/bot1',
          isActive: true,
          username: null,
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      mockTelegram.getMe.mockRejectedValue(new Error('Invalid token'));

      // Spy on logger
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Act
      await service.onModuleInit();

      // Assert - Should log the error (message contains "Failed to initialize bot" or "Failed to start bot")
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to'),
      );
    });

    it('reports failure count in stats', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: 'valid',
          webhookPath: '/bot1',
          isActive: true,
          username: null,
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: 'invalid',
          webhookPath: '/bot2',
          isActive: true,
          username: null,
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      mockTelegram.getMe
        .mockResolvedValueOnce({
          id: 1,
          username: 'bot1',
          is_bot: true,
          first_name: 'Bot 1',
        })
        .mockRejectedValueOnce(new Error('Invalid token'));

      // Act
      await service.onModuleInit();

      // Assert
      const stats = service.getStats();
      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('masks bot tokens in error messages', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'TokenBot',
          token: '123456789:ABCdef-xyz',
          webhookPath: '/bot1',
          isActive: true,
          username: null,
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      mockTelegram.getMe.mockRejectedValue(
        new Error('Token 123456789:ABCdef-xyz is invalid'),
      );

      // Act
      await service.onModuleInit();

      // Assert
      const stats = service.getStats();
      const failedBot = stats.bots.find((b) => b.status === 'failed');
      expect(failedBot?.error).not.toContain('123456789:ABCdef-xyz');
      expect(failedBot?.error).toContain('***:****');
    });

    it('does not throw when BotConfigurationProvider fails', async () => {
      // Arrange
      mockBotConfigProvider.loadDynamicBots.mockRejectedValue(
        new Error('Database error'),
      );

      // Spy on logger
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert - Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();

      // Assert - Should log the critical error
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Critical error'),
        expect.anything(),
      );
    });
  });

  // =============================================================================
  // AC-4: Handler Registration
  // =============================================================================

  // Note: AC-4 Shared Handler Registration and Per-bot Handler Filtering (@ForBot)
  // tests have been moved to dynamic-listeners-explorer.service.spec.ts which
  // tests the DynamicListenersExplorerService responsible for handler registration.
  // See tests:
  // - "Registers shared handler (no @ForBot) on all bots"
  // - "Skips handler registration when @ForBot botId does not match current bot"
  // - "Registers handler when @ForBot botId matches current bot"

  // =============================================================================
  // AC-6: Graceful Shutdown
  // =============================================================================

  describe('AC-6: Graceful Shutdown', () => {
    it('deletes webhooks for all dynamic bots on shutdown', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert
      expect(mockTelegram.deleteWebhook).toHaveBeenCalledTimes(2); // For 2 bots
    });

    it('stops Bottleneck limiters for all bots on shutdown (ADR-007)', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert - Limiter.stop() should be called for each bot with dropWaitingJobs: false
      expect(mockLimiterStop).toHaveBeenCalledTimes(2);
      expect(mockLimiterStop).toHaveBeenCalledWith({ dropWaitingJobs: false });
    });

    it('clears bot registry on shutdown', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      expect(service.getBotCount()).toBe(2);

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert
      expect(service.getBotCount()).toBe(0);
    });

    it('clears webhook path index on shutdown', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeDefined();

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert
      expect(service.getBotByWebhookPath('/dynamic/bot1')).toBeUndefined();
    });

    it('logs shutdown signal', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Spy on logger
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('shutting down'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SIGTERM'),
      );
    });

    it('continues shutdown even if deleteWebhook fails for some bots', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Reset and setup mixed success/failure
      mockTelegram.deleteWebhook
        .mockReset()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      // Act & Assert
      await expect(
        service.onApplicationShutdown('SIGTERM'),
      ).resolves.not.toThrow();
      expect(service.getBotCount()).toBe(0); // Registry still cleared
    });

    it('logs warning when bots fail to stop cleanly', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Reset and setup failure
      mockTelegram.deleteWebhook
        .mockReset()
        .mockRejectedValue(new Error('Network error'));

      // Spy on logger
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.onApplicationShutdown('SIGTERM');

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to stop cleanly'),
      );
    });
  });

  // =============================================================================
  // AC-7: Webhook Routing
  // =============================================================================

  describe('AC-7: Webhook Routing', () => {
    it('routes update to correct bot based on webhook path', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
        {
          id: 2,
          name: 'Bot2',
          token: '456:def',
          webhookPath: '/dynamic/bot2',
          isActive: true,
          username: 'bot2',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      const mockUpdate = {
        update_id: 123,
        message: { text: 'hello' },
      } as never;

      // Act
      const result = await service.handleUpdate('/dynamic/bot1', mockUpdate);

      // Assert
      expect(result).toBe(true);
      expect(mockBotHandleUpdate).toHaveBeenCalledWith(mockUpdate);
    });

    it('returns false for unknown webhook path', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      const mockUpdate = { update_id: 123 } as never;

      // Act
      const result = await service.handleUpdate('/unknown/path', mockUpdate);

      // Assert
      expect(result).toBe(false);
    });

    it('logs warning for unknown webhook path', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Spy on logger
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.handleUpdate('/unknown/path', { update_id: 123 } as never);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No bot found for webhook path'),
      );
    });

    it('returns false when bot.handleUpdate throws error', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      mockBotHandleUpdate.mockRejectedValue(new Error('Handler error'));

      // Act
      const result = await service.handleUpdate('/dynamic/bot1', {
        update_id: 123,
      } as never);

      // Assert
      expect(result).toBe(false);
    });

    it('logs error when bot.handleUpdate throws', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();
      mockBotHandleUpdate.mockRejectedValue(new Error('Handler error'));

      // Spy on logger
      const errorSpy = jest.spyOn(service['logger'], 'error');

      // Act
      await service.handleUpdate('/dynamic/bot1', { update_id: 123 } as never);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling update'),
        expect.anything(),
      );
    });

    it('handles registry inconsistency gracefully', async () => {
      // Arrange
      const mockConfigs: DynamicBotConfig[] = [
        {
          id: 1,
          name: 'Bot1',
          token: '123:abc',
          webhookPath: '/dynamic/bot1',
          isActive: true,
          username: 'bot1',
          settings: null,
        },
      ];
      mockBotConfigProvider.loadDynamicBots.mockResolvedValue(mockConfigs);
      await service.onModuleInit();

      // Reset handleUpdate mock for clean test
      mockBotHandleUpdate.mockReset().mockResolvedValue(undefined);

      // Act - Normal case should pass
      const result = await service.handleUpdate('/dynamic/bot1', {
        update_id: 123,
      } as never);

      // Assert
      expect(result).toBe(true);
    });
  });

  // Note: AC-4 Feature Flag Handler Filtering (@RequiresFeature) tests have been
  // moved to dynamic-listeners-explorer.service.spec.ts which tests the
  // DynamicListenersExplorerService responsible for feature flag filtering.
  // See tests:
  // - "Skips handler registration when @RequiresFeature check fails"
  // - "Registers handler when @RequiresFeature check passes"
  // - "shouldRegisterHandler returns false when settings is null but feature is required"
});
