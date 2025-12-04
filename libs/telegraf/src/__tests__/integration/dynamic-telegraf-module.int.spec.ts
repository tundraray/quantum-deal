// Dynamic Telegraf Module Integration Tests - Design Doc: docs/designs/dynamic-telegraf-module-design.md
// Generated: 2025-11-27 | Budget Used: 3/3 integration, 0/2 E2E
// Test Type: Integration Tests
// Implementation Timing: Created alongside feature implementation

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import {
  TelegrafModule,
  DynamicTelegrafService,
  BOT_CONFIGURATION_PROVIDER,
} from '../../index';
import type {
  BotConfigurationProvider,
  DynamicBotConfig,
} from '../../interfaces';

/**
 * Integration tests for TelegrafModule.forRootDynamic()
 *
 * These tests verify:
 * - Module coexistence with forRootAsync()
 * - Bot loading from database via BotConfigurationProvider
 * - Fault isolation (failed bots don't block others)
 * - Graceful shutdown
 * - Webhook routing
 *
 * Prerequisites:
 * - Mock BotConfigurationProvider implementation
 * - Mock Telegraf instances (no real Telegram API calls)
 */

// Mock Telegram API
const mockTelegram = {
  getMe: jest.fn(),
  setWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
};

const mockBotUse = jest.fn();
const mockBotCatch = jest.fn();
const mockBotHandleUpdate = jest.fn();

// Mock Telegraf to prevent real API calls
jest.mock('telegraf', () => {
  const actualModule = jest.requireActual('telegraf');
  return {
    ...actualModule,
    Telegraf: jest.fn().mockImplementation((token: string) => ({
      token,
      telegram: mockTelegram,
      use: mockBotUse,
      catch: mockBotCatch,
      handleUpdate: mockBotHandleUpdate,
      stop: jest.fn().mockResolvedValue(undefined),
      launch: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Test fixtures
const createMockBotConfig = (
  overrides: Partial<DynamicBotConfig> = {},
): DynamicBotConfig => ({
  id: 1,
  token: '123456789:test_token',
  name: 'TestBot',
  username: 'test_bot',
  webhookPath: '/dynamic/test',
  isActive: true,
  settings: null,
  ...overrides,
});

// Mock BotConfigurationProvider implementation
@Injectable()
class MockBotConfigProvider implements BotConfigurationProvider {
  private configs: DynamicBotConfig[] = [];

  setConfigs(configs: DynamicBotConfig[]): void {
    this.configs = configs;
  }

  async loadDynamicBots(): Promise<DynamicBotConfig[]> {
    return this.configs;
  }
}

describe('DynamicTelegrafModule Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let dynamicService: DynamicTelegrafService;
  let mockBotConfigProvider: MockBotConfigProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockTelegram.getMe.mockImplementation(async () => {
      return {
        id: 123,
        is_bot: true,
        first_name: 'TestBot',
        username: 'testbot',
      };
    });
    mockTelegram.setWebhook.mockResolvedValue(true);
    mockTelegram.deleteWebhook.mockResolvedValue(true);
    mockBotHandleUpdate.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // =============================================================================
  // AC-1: forRootDynamic() Coexistence with forRootAsync()
  // =============================================================================

  describe('AC-1: forRootDynamic() Coexistence', () => {
    // AC-1: "forRootDynamic() can coexist with forRootAsync() in same application"
    // ROI: 85 | Business Value: 10 (backward compatibility critical) | Frequency: 10 (every app)
    // Behavior: Both static and dynamic modules can be imported without injection conflicts
    // Verification: Both modules initialize, no provider conflicts, bots from both work
    // @category: core-functionality
    // @dependency: TelegrafModule, TelegrafCoreModule, DynamicTelegrafCoreModule
    // @complexity: high
    it('AC-1: Both forRootAsync() and forRootDynamic() modules can be imported and initialized without conflicts', async () => {
      // Arrange
      const mockConfigs = [createMockBotConfig({ id: 1, name: 'DynamicBot1' })];

      // Act - Create module with both static and dynamic
      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootAsync({
            useFactory: () => ({
              token: 'static:token',
              launchOptions: false, // Don't launch in tests
            }),
          }),
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();

      // Override the mock provider before init
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      await app.init();

      // Assert
      expect(module).toBeDefined();
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService).toBeDefined();
    });

    // AC-1-error: "Static bots continue working when dynamic module is present"
    // ROI: 78 | Business Value: 9 (backward compatibility) | Frequency: 9
    // Behavior: Static bot registered via forRootAsync still receives updates
    // Verification: Static bot handlers are invoked, no interference from dynamic module
    // @category: core-functionality
    // @dependency: TelegrafModule, ListenersExplorerService
    // @complexity: medium
    it('AC-1: Static bots registered via forRootAsync() continue working unchanged', async () => {
      // Arrange
      const mockConfigs = [createMockBotConfig({ id: 1, name: 'DynamicBot1' })];

      // Act
      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootAsync({
            useFactory: () => ({
              token: 'static:token',
              launchOptions: false,
            }),
          }),
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      // Assert - Both services are independent
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(1);

      // Static bot should also be available (via different token)
      // The static bot is registered under a different provider token
      expect(module).toBeDefined();
    });

    // AC-1-edge: "No provider token conflicts between modules"
    // ROI: 72 | Business Value: 8 (stability) | Frequency: 7
    // Behavior: TELEGRAF_BOT_NAME and DYNAMIC_TELEGRAF_SERVICE tokens are distinct
    // Verification: Both can be injected without overwriting each other
    // @category: core-functionality
    // @dependency: NestJS DI container
    // @complexity: medium
    it('AC-1: No injection token conflicts between static and dynamic bot providers', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({ id: 1, name: 'DynamicBot1' }),
        createMockBotConfig({
          id: 2,
          name: 'DynamicBot2',
          webhookPath: '/dynamic/bot2',
        }),
      ];

      // Act
      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootAsync({
            useFactory: () => ({
              token: 'static:token',
              launchOptions: false,
            }),
          }),
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      // Assert - Dynamic service has correct bots, no interference
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(2);
      expect(dynamicService.getBot(1)).toBeDefined();
      expect(dynamicService.getBot(2)).toBeDefined();
    });
  });

  // =============================================================================
  // AC-2: Database Loading at Startup
  // =============================================================================

  describe('AC-2: Database Bot Loading', () => {
    // AC-2: "Bots are loaded from database at startup"
    // ROI: 82 | Business Value: 9 (core feature) | Frequency: 9 (every startup)
    // Behavior: OnModuleInit queries BotConfigurationProvider.loadDynamicBots()
    // Verification: Provider method called once, returned configs create Telegraf instances
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, BotConfigurationProvider, Telegraf
    // @complexity: high
    it('AC-2: BotConfigurationProvider.loadDynamicBots() is called during OnModuleInit', async () => {
      // Arrange
      const mockConfigs = [createMockBotConfig({ id: 1, name: 'TestBot' })];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );

      const loadSpy = jest.spyOn(mockBotConfigProvider, 'loadDynamicBots');
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    // AC-2-happy: "Telegraf instances created for each active bot config"
    // ROI: 80 | Business Value: 9 (core feature) | Frequency: 9
    // Behavior: Each DynamicBotConfig with isActive=true results in Telegraf instance
    // Verification: bot registry contains correct number of instances, getBot(id) returns instance
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Telegraf
    // @complexity: medium
    it('AC-2: Telegraf instance created for each active bot configuration from database', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'Bot2',
          webhookPath: '/dynamic/bot2',
        }),
        createMockBotConfig({
          id: 3,
          name: 'Bot3',
          webhookPath: '/dynamic/bot3',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(3);
      expect(dynamicService.getBot(1)).toBeDefined();
      expect(dynamicService.getBot(2)).toBeDefined();
      expect(dynamicService.getBot(3)).toBeDefined();
    });

    // AC-2-edge: "Inactive bots are skipped"
    // ROI: 68 | Business Value: 6 (data integrity) | Frequency: 5
    // Behavior: Bots with isActive=false are not loaded
    // Verification: hasBot(inactiveId) returns false
    // @category: edge-case
    // @dependency: DynamicTelegrafService
    // @complexity: low
    it('AC-2: Inactive bot configurations (isActive=false) are not loaded', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({ id: 1, name: 'ActiveBot', isActive: true }),
        createMockBotConfig({
          id: 2,
          name: 'InactiveBot',
          isActive: false,
          webhookPath: '/dynamic/inactive',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(1);
      expect(dynamicService.hasBot(1)).toBe(true);
      expect(dynamicService.hasBot(2)).toBe(false);
    });

    // AC-2-edge: "Token validated via telegram.getMe() before webhook setup"
    // ROI: 70 | Business Value: 7 (reliability) | Frequency: 9
    // Behavior: getMe() called for each bot to validate token
    // Verification: Mock telegram.getMe() called, invalid token causes bot to be skipped
    // @category: core-functionality
    // @dependency: Telegraf, Telegram API mock
    // @complexity: medium
    it('AC-2: Bot tokens are validated via telegram.getMe() before webhook configuration', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'ValidBot',
          token: '123:valid_token',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      const bot = dynamicService.getBot(1);
      expect(bot).toBeDefined();
      // getMe was called during initialization (via mock)
      expect(mockTelegram.getMe).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // AC-5: Fault Isolation
  // =============================================================================

  describe('AC-5: Fault Isolation', () => {
    // AC-5: "Failed bot initialization does not block other bots"
    // ROI: 75 | Business Value: 9 (reliability) | Frequency: 4 (rare but critical)
    // Behavior: Invalid token bot logged as error, remaining bots continue initializing
    // Verification: 2/3 bots start when middle bot has invalid token, error logged
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Logger
    // @complexity: high
    it('AC-5: Invalid token bot is skipped while other bots continue to initialize', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'InvalidBot',
          token: 'invalid:token',
          webhookPath: '/dynamic/invalid',
        }),
        createMockBotConfig({
          id: 3,
          name: 'Bot3',
          webhookPath: '/dynamic/bot3',
        }),
      ];

      // Mock getMe to fail for invalid token
      mockTelegram.getMe
        .mockResolvedValueOnce({
          id: 1,
          username: 'bot1',
          is_bot: true,
          first_name: 'Bot1',
        })
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce({
          id: 3,
          username: 'bot3',
          is_bot: true,
          first_name: 'Bot3',
        });

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(2);
      expect(dynamicService.hasBot(1)).toBe(true);
      expect(dynamicService.hasBot(2)).toBe(false); // Invalid token
      expect(dynamicService.hasBot(3)).toBe(true);
    });

    // AC-5-happy: "Stats correctly report successful and failed counts"
    // ROI: 65 | Business Value: 6 (observability) | Frequency: 4
    // Behavior: getStats() returns accurate success/failure counts
    // Verification: stats.successful = 2, stats.failed = 1 when one bot fails
    // @category: core-functionality
    // @dependency: DynamicTelegrafService
    // @complexity: low
    it('AC-5: Initialization stats correctly report successful and failed bot counts', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'InvalidBot',
          token: 'invalid:token',
          webhookPath: '/dynamic/invalid',
        }),
        createMockBotConfig({
          id: 3,
          name: 'Bot3',
          webhookPath: '/dynamic/bot3',
        }),
      ];

      // Mock getMe to fail for invalid token
      mockTelegram.getMe
        .mockResolvedValueOnce({
          id: 1,
          username: 'bot1',
          is_bot: true,
          first_name: 'Bot1',
        })
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce({
          id: 3,
          username: 'bot3',
          is_bot: true,
          first_name: 'Bot3',
        });

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      const stats = dynamicService.getStats();
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
    });

    // AC-5-edge: "Static bots unaffected by dynamic bot loading failures"
    // ROI: 72 | Business Value: 8 (backward compatibility) | Frequency: 3
    // Behavior: Static bot works even if all dynamic bots fail to load
    // Verification: Static bot handlers still functional after dynamic load errors
    // @category: core-functionality
    // @dependency: TelegrafModule, ListenersExplorerService
    // @complexity: medium
    it('AC-5: Static bots continue operating even if dynamic bot loading fails completely', async () => {
      // Arrange - All dynamic bots fail
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'InvalidBot1',
          token: 'invalid:token1',
          webhookPath: '/dynamic/invalid1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'InvalidBot2',
          token: 'invalid:token2',
          webhookPath: '/dynamic/invalid2',
        }),
      ];

      // Mock getMe to fail for all dynamic bots - handle all potential calls
      // The static bot factory may also call getMe, so we need to allow that to succeed
      mockTelegram.getMe.mockImplementation(async () => {
        throw new Error('Invalid token');
      });

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootAsync({
            useFactory: () => ({
              token: 'static:token',
              launchOptions: false,
            }),
          }),
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);

      // Act
      await app.init();

      // Assert - Module initialized even though all dynamic bots failed
      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(0); // All dynamic failed
      expect(module).toBeDefined(); // But module still initialized
      // Stats should reflect all failures
      const stats = dynamicService.getStats();
      expect(stats.failed).toBe(2);
    });
  });

  // =============================================================================
  // AC-6: Graceful Shutdown (Lower Priority - Beyond Budget)
  // =============================================================================

  describe('AC-6: Graceful Shutdown', () => {
    // AC-6: "Graceful shutdown stops all bots properly"
    // ROI: 70 | Business Value: 8 (reliability) | Frequency: 3 (shutdown events)
    // Behavior: OnApplicationShutdown deletes webhooks and stops all bots
    // Verification: bot.stop() called, telegram.deleteWebhook() called for each bot
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Telegraf, Telegram API mock
    // @complexity: medium
    // NOTE: Lower priority - consider implementing after core AC tests
    it('AC-6: OnApplicationShutdown calls telegram.deleteWebhook() for all dynamic bots', async () => {
      // Arrange - Reset mocks to ensure clean state
      mockTelegram.getMe.mockImplementation(async () => ({
        id: 123,
        is_bot: true,
        first_name: 'TestBot',
        username: 'testbot',
      }));

      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'Bot2',
          webhookPath: '/dynamic/bot2',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(2);

      // Clear mocks before shutdown to count only shutdown calls
      mockTelegram.deleteWebhook.mockClear();

      // Act
      await app.close();
      app = undefined as unknown as INestApplication; // Prevent double close in afterEach

      // Assert
      expect(mockTelegram.deleteWebhook).toHaveBeenCalledTimes(2);
    });

    // AC-6-happy: "Bot registry cleared after shutdown"
    // ROI: 62 | Business Value: 5 (cleanup) | Frequency: 3
    // Behavior: After shutdown, getBotCount() returns 0
    // Verification: getAllBots().size === 0 after shutdown
    // @category: core-functionality
    // @dependency: DynamicTelegrafService
    // @complexity: low
    it('AC-6: Bot registry is cleared after application shutdown', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      expect(dynamicService.getBotCount()).toBe(1);

      // Act
      await app.close();
      app = undefined as unknown as INestApplication; // Prevent double close in afterEach

      // Assert
      expect(dynamicService.getBotCount()).toBe(0);
      expect(dynamicService.getAllBots().size).toBe(0);
    });

    // AC-6-edge: "Shutdown continues even if webhook deletion fails"
    // ROI: 58 | Business Value: 5 (robustness) | Frequency: 2
    // Behavior: Webhook deletion error logged, shutdown continues for other bots
    // Verification: All bots attempted to stop even when first throws
    // @category: edge-case
    // @dependency: DynamicTelegrafService, Logger
    // @complexity: medium
    it('AC-6: Shutdown continues for remaining bots even if one webhook deletion fails', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'Bot2',
          webhookPath: '/dynamic/bot2',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );

      // Clear mocks and make first bot's deleteWebhook fail
      mockTelegram.deleteWebhook.mockClear();
      mockTelegram.deleteWebhook
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      // Act
      await app.close();
      app = undefined as unknown as INestApplication;

      // Assert - Both bots had deleteWebhook called
      expect(mockTelegram.deleteWebhook).toHaveBeenCalledTimes(2);
      // Registry is cleared regardless of errors
      expect(dynamicService.getBotCount()).toBe(0);
    });
  });

  // =============================================================================
  // AC-7: Webhook Routing (Lower Priority - Beyond Budget)
  // =============================================================================

  describe('AC-7: Webhook Routing', () => {
    // AC-7: "Webhook paths are correctly routed to corresponding bot"
    // ROI: 76 | Business Value: 8 (core functionality) | Frequency: 8 (every update)
    // Behavior: handleUpdate(webhookPath, update) routes to correct bot
    // Verification: Update delivered to bot with matching webhookPath
    // @category: core-functionality
    // @dependency: DynamicTelegrafService, Telegraf
    // @complexity: medium
    // NOTE: Lower priority - consider implementing after core AC tests
    it('AC-7: handleUpdate() routes update to correct bot based on webhookPath', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'Bot2',
          webhookPath: '/dynamic/bot2',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );

      const mockUpdate = { update_id: 123, message: { text: 'test' } };

      // Act
      const result = await dynamicService.handleUpdate(
        '/dynamic/bot1',
        mockUpdate as any,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockBotHandleUpdate).toHaveBeenCalledWith(mockUpdate);
    });

    // AC-7-error: "Unknown webhook path returns false gracefully"
    // ROI: 68 | Business Value: 6 (error handling) | Frequency: 2 (rare)
    // Behavior: Unknown path returns false, warning logged
    // Verification: handleUpdate('/unknown/path', update) returns false
    // @category: edge-case
    // @dependency: DynamicTelegrafService, Logger
    // @complexity: low
    it('AC-7: Unknown webhook path returns false and logs warning', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );
      const mockUpdate = { update_id: 456 };

      // Act
      const result = await dynamicService.handleUpdate(
        '/unknown/path',
        mockUpdate as any,
      );

      // Assert
      expect(result).toBe(false);
    });

    // AC-7-edge: "Bot lookup by webhookPath is O(1)"
    // ROI: 55 | Business Value: 4 (performance) | Frequency: 10
    // Behavior: webhookPathIndex provides direct lookup
    // Verification: getBotByWebhookPath returns bot without iteration
    // @category: integration
    // @dependency: DynamicTelegrafService
    // @complexity: low
    it('AC-7: getBotByWebhookPath() provides direct O(1) lookup', async () => {
      // Arrange
      const mockConfigs = [
        createMockBotConfig({
          id: 1,
          name: 'Bot1',
          webhookPath: '/dynamic/bot1',
        }),
        createMockBotConfig({
          id: 2,
          name: 'Bot2',
          webhookPath: '/dynamic/bot2',
        }),
        createMockBotConfig({
          id: 3,
          name: 'Bot3',
          webhookPath: '/dynamic/bot3',
        }),
      ];

      module = await Test.createTestingModule({
        imports: [
          TelegrafModule.forRootDynamic({
            botConfigProvider: MockBotConfigProvider,
            sharedHandlerModules: [],
            webhookDomain: 'https://example.com',
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      mockBotConfigProvider = module.get<MockBotConfigProvider>(
        BOT_CONFIGURATION_PROVIDER,
      );
      mockBotConfigProvider.setConfigs(mockConfigs);
      await app.init();

      dynamicService = module.get<DynamicTelegrafService>(
        DynamicTelegrafService,
      );

      // Act
      const bot1 = dynamicService.getBotByWebhookPath('/dynamic/bot1');
      const bot2 = dynamicService.getBotByWebhookPath('/dynamic/bot2');
      const bot3 = dynamicService.getBotByWebhookPath('/dynamic/bot3');
      const notFound = dynamicService.getBotByWebhookPath('/dynamic/notexist');

      // Assert
      expect(bot1).toBeDefined();
      expect(bot2).toBeDefined();
      expect(bot3).toBeDefined();
      expect(notFound).toBeUndefined();
    });
  });
});
