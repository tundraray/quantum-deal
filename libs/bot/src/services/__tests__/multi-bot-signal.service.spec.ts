// Mock uuid to avoid ESM import issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock telegramify-markdown
jest.mock('telegramify-markdown', () => ({
  __esModule: true,
  default: jest.fn((text: string) => text),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { MultiBotSignalService } from '../multi-bot-signal.service';
import { BotRegistryService } from '../bot-registry.service';
import { NotificationService } from '../notification.service';
import {
  SubscriptionsRepository,
  BotMessagesRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import type { MergedOrder } from '@quantumdeal/db/schema';
import { FeatureFlag } from '@quantumdeal/db/schema';
import type { SignalCapableBot } from '../../interfaces/bot-registry.interface';
import type { SubscriptionWithFeatures } from '@quantumdeal/db';
import type Bottleneck from 'bottleneck';

/**
 * Unit tests for MultiBotSignalService
 * Tests the orchestration of signal delivery across multiple bots
 */
describe('MultiBotSignalService', () => {
  let service: MultiBotSignalService;
  let botRegistryService: jest.Mocked<BotRegistryService>;
  let subscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let botMessagesRepository: jest.Mocked<BotMessagesRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let userSubscriptionFeaturesRepository: jest.Mocked<UserSubscriptionFeaturesRepository>;

  // Mock data factories
  const createMockOrder = (overrides: Partial<MergedOrder> = {}): MergedOrder =>
    ({
      ticketId: 12345,
      symbol: 'BTCUSD',
      orderType: 'buy',
      lots: 0.1,
      openPrice: 50000,
      closePrice: 51000,
      stopLoss: 49000,
      takeProfit: 52000,
      oldStopLoss: 48500,
      oldTakeProfit: 51500,
      profit: 100,
      sector: 'crypto',
      account: 'demo123',
      broker: 'TestBroker',
      schemaVersion: '1.0',
      eaVersion: '1.0',
      eventTimestamp: new Date(),
      createdAt: new Date(),
      closeTime: new Date(),
      ...overrides,
    }) as MergedOrder;

  const createMockBot = (
    overrides: Partial<SignalCapableBot> = {},
  ): SignalCapableBot => ({
    botId: 1,
    name: 'TestBot',
    instance: {
      telegram: { sendMessage: jest.fn() },
    } as unknown as SignalCapableBot['instance'],
    limiter: {
      schedule: jest
        .fn()
        .mockImplementation((_opts: unknown, fn: () => unknown) =>
          Promise.resolve(fn()),
        ),
    } as unknown as Bottleneck,
    type: 'dynamic',
    ...overrides,
  });

  const createMockSubscription = (
    overrides: Partial<SubscriptionWithFeatures> = {},
  ): SubscriptionWithFeatures => ({
    subscriptionId: 1,
    subscriptionName: 'VIP',
    subscriptionIsActive: true,
    hasCustomFiltering: false,
    botUserId: 1,
    botId: 1,
    userTelegramId: '123456',
    userFirstName: 'Test',
    userLastName: 'User',
    userUsername: 'testuser',
    userLang: 'en',
    userSubscriptionId: 1,
    userSubscriptionActivatedAt: new Date(),
    userSubscriptionExpiresAt: new Date(Date.now() + 86400000),
    userSubscriptionEndDate: new Date(Date.now() + 86400000),
    userSubscriptionIsActive: true,
    ...overrides,
  });

  beforeEach(async () => {
    // Create mocks
    const mockBotRegistryService = {
      getSignalCapableBots: jest.fn().mockReturnValue([]),
    };

    const mockSubscriptionsRepository = {
      findBySectorForBot: jest.fn().mockResolvedValue([]),
    };

    const mockBotMessagesRepository = {
      resolveMessage: jest
        .fn()
        .mockResolvedValue('Signal: {symbol} at {open_price}'),
    };

    const mockNotificationService = {
      sendWithBot: jest.fn().mockReturnValue('msg-123'),
    };

    const mockUserSubscriptionFeaturesRepository = {
      getUserFeatureSettings: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiBotSignalService,
        { provide: BotRegistryService, useValue: mockBotRegistryService },
        {
          provide: SubscriptionsRepository,
          useValue: mockSubscriptionsRepository,
        },
        { provide: BotMessagesRepository, useValue: mockBotMessagesRepository },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: UserSubscriptionFeaturesRepository,
          useValue: mockUserSubscriptionFeaturesRepository,
        },
      ],
    }).compile();

    service = module.get<MultiBotSignalService>(MultiBotSignalService);
    botRegistryService = module.get(BotRegistryService);
    subscriptionsRepository = module.get(SubscriptionsRepository);
    botMessagesRepository = module.get(BotMessagesRepository);
    notificationService = module.get(NotificationService);
    userSubscriptionFeaturesRepository = module.get(
      UserSubscriptionFeaturesRepository,
    );
  });

  describe('broadcastSignal', () => {
    it('AC-001: should deliver signal to ALL bots with signalsEnabled=true', async () => {
      // Arrange - setup 3 signal-capable bots
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });
      const bot2 = createMockBot({ botId: 2, name: 'Bot2' });
      const bot3 = createMockBot({
        botId: null,
        name: 'StaticBot',
        type: 'static',
      });

      botRegistryService.getSignalCapableBots.mockReturnValue([
        bot1,
        bot2,
        bot3,
      ]);

      // Each bot has 1 subscriber
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ botUserId: 100, userTelegramId: '100' }),
      ]);

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert - all 3 bots processed
      expect(result.botsProcessed).toBe(3);
      expect(subscriptionsRepository.findBySectorForBot).toHaveBeenCalledTimes(
        3,
      );
      expect(subscriptionsRepository.findBySectorForBot).toHaveBeenCalledWith(
        'crypto',
        1,
      );
      expect(subscriptionsRepository.findBySectorForBot).toHaveBeenCalledWith(
        'crypto',
        2,
      );
      expect(subscriptionsRepository.findBySectorForBot).toHaveBeenCalledWith(
        'crypto',
        null,
      );
    });

    it('AC-002: should process all bots in parallel via Promise.all', async () => {
      // Arrange - setup bots with delayed responses
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });
      const bot2 = createMockBot({ botId: 2, name: 'Bot2' });

      botRegistryService.getSignalCapableBots.mockReturnValue([bot1, bot2]);

      // Create delayed subscription responses
      let callCount = 0;
      subscriptionsRepository.findBySectorForBot.mockImplementation(
        async () => {
          callCount++;
          await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay
          return [
            createMockSubscription({
              botUserId: 100 * callCount,
              userTelegramId: `${100 * callCount}`,
            }),
          ];
        },
      );

      const order = createMockOrder();

      // Act
      const startTime = Date.now();
      await service.broadcastSignal(order, 'open');
      const duration = Date.now() - startTime;

      // Assert - total time should be close to single bot time (parallel execution)
      // If sequential, would be ~100ms. Parallel should be ~50-80ms with overhead
      expect(duration).toBeLessThan(100);
    });

    it('AC-006: should continue to other bots when one bot fails', async () => {
      // Arrange - setup 3 bots, 1 fails
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });
      const bot2 = createMockBot({ botId: 2, name: 'FailingBot' });
      const bot3 = createMockBot({ botId: 3, name: 'Bot3' });

      botRegistryService.getSignalCapableBots.mockReturnValue([
        bot1,
        bot2,
        bot3,
      ]);

      // Bot2 query fails
      subscriptionsRepository.findBySectorForBot.mockImplementation(
        async (_sector: string, botId: number | null) => {
          if (botId === 2) {
            throw new Error('Database connection error');
          }
          return [
            createMockSubscription({
              botUserId: botId ?? 999,
              userTelegramId: `${botId ?? 999}`,
            }),
          ];
        },
      );

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert - 2 bots succeeded, 1 failed
      expect(result.botsProcessed).toBe(2);
      expect(result.botsFailed).toBe(1);
      expect(
        result.perBotResults.find((r) => r.botName === 'FailingBot')?.success,
      ).toBe(false);
      expect(
        result.perBotResults.find((r) => r.botName === 'FailingBot')?.error,
      ).toContain('Database connection error');
    });

    it('AC-007: should return BroadcastResult with perBotResults', async () => {
      // Arrange
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });
      const bot2 = createMockBot({ botId: 2, name: 'Bot2' });

      botRegistryService.getSignalCapableBots.mockReturnValue([bot1, bot2]);
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription(),
      ]);

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.perBotResults).toHaveLength(2);
      expect(result.perBotResults[0]).toMatchObject({
        botId: expect.any(Number) as unknown as number,
        botName: expect.any(String) as unknown as string,
        success: expect.any(Boolean) as unknown as boolean,
        sentCount: expect.any(Number) as unknown as number,
        failedCount: expect.any(Number) as unknown as number,
        durationMs: expect.any(Number) as unknown as number,
      });
    });

    it('AC-001: should return empty BroadcastResult when no signal-capable bots', async () => {
      // Arrange - no bots registered
      botRegistryService.getSignalCapableBots.mockReturnValue([]);

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.botsProcessed).toBe(0);
      expect(result.perBotResults).toHaveLength(0);
    });

    it('AC-001: should return empty result when order has no sector', async () => {
      // Arrange
      const orderWithoutSector = createMockOrder({
        sector: null as unknown as string,
      });

      // Act
      const result = await service.broadcastSignal(orderWithoutSector, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.botsProcessed).toBe(0);
    });

    it('should aggregate totalSent and totalFailed from all bots', async () => {
      // Arrange
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });
      const bot2 = createMockBot({ botId: 2, name: 'Bot2' });

      botRegistryService.getSignalCapableBots.mockReturnValue([bot1, bot2]);

      // Bot1 has 2 subscribers, Bot2 has 3 subscribers
      subscriptionsRepository.findBySectorForBot.mockImplementation(
        (_sector: string, botId: number | null) => {
          if (botId === 1) {
            return Promise.resolve([
              createMockSubscription({ botUserId: 101, userTelegramId: '101' }),
              createMockSubscription({ botUserId: 102, userTelegramId: '102' }),
            ]);
          }
          return Promise.resolve([
            createMockSubscription({ botUserId: 201, userTelegramId: '201' }),
            createMockSubscription({ botUserId: 202, userTelegramId: '202' }),
            createMockSubscription({ botUserId: 203, userTelegramId: '203' }),
          ]);
        },
      );

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert - total 5 messages sent (2 + 3)
      expect(result.totalSent).toBe(5);
      expect(result.success).toBe(true);
    });

    it('should resolve bot-specific message templates', async () => {
      // Arrange
      const bot1 = createMockBot({ botId: 1, name: 'Bot1' });

      botRegistryService.getSignalCapableBots.mockReturnValue([bot1]);
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ userLang: 'ru' }),
      ]);

      const order = createMockOrder();

      // Act
      await service.broadcastSignal(order, 'open');

      // Assert - message resolved for bot 1 with Russian language
      expect(botMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        1,
        'open',
        'ru',
      );
    });
  });

  describe('getEligibleBotCount', () => {
    it('should return count of signal-capable bots', () => {
      // Arrange - 3 bots registered
      const bots = [
        createMockBot({ botId: 1, name: 'Bot1' }),
        createMockBot({ botId: 2, name: 'Bot2' }),
        createMockBot({ botId: null, name: 'StaticBot', type: 'static' }),
      ];
      botRegistryService.getSignalCapableBots.mockReturnValue(bots);

      // Act
      const count = service.getEligibleBotCount();

      // Assert
      expect(count).toBe(3);
    });

    it('should return 0 when no bots available', () => {
      // Arrange
      botRegistryService.getSignalCapableBots.mockReturnValue([]);

      // Act
      const count = service.getEligibleBotCount();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('custom filtering', () => {
    it('should send signal when user has no custom filtering', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);

      // User without custom filtering
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ hasCustomFiltering: false }),
      ]);

      const order = createMockOrder({ symbol: 'BTCUSD' });

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.totalSent).toBe(1);
      expect(
        userSubscriptionFeaturesRepository.getBotUserFeatureSettings,
      ).not.toHaveBeenCalled();
    });

    it('should filter signal when user symbol list does not include order symbol', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);

      // User with custom filtering enabled
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ hasCustomFiltering: true }),
      ]);

      // User's filter does not include BTCUSD
      userSubscriptionFeaturesRepository.getBotUserFeatureSettings.mockResolvedValue(
        {
          id: 1,
          botUserId: 1,
          featureKey: FeatureFlag.CUSTOM_USER_FILTERING,
          isActive: true,
          settings: { symbols: ['ETHUSD', 'XRPUSD'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const order = createMockOrder({ symbol: 'BTCUSD' });

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert - user should be filtered out
      expect(result.totalSent).toBe(0);
    });

    it('should send signal when user symbol list includes order symbol', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);

      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ hasCustomFiltering: true }),
      ]);

      // User's filter includes BTCUSD
      userSubscriptionFeaturesRepository.getBotUserFeatureSettings.mockResolvedValue(
        {
          id: 1,
          botUserId: 1,
          featureKey: FeatureFlag.CUSTOM_USER_FILTERING,
          isActive: true,
          settings: { symbols: ['BTCUSD', 'ETHUSD'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const order = createMockOrder({ symbol: 'BTCUSD' });

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.totalSent).toBe(1);
    });

    it('should send signal when user has empty symbol list (send all)', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);

      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription({ hasCustomFiltering: true }),
      ]);

      // Empty symbol list means send all
      userSubscriptionFeaturesRepository.getBotUserFeatureSettings.mockResolvedValue(
        {
          id: 1,
          botUserId: 1,
          featureKey: FeatureFlag.CUSTOM_USER_FILTERING,
          isActive: true,
          settings: { symbols: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const order = createMockOrder({ symbol: 'BTCUSD' });

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.totalSent).toBe(1);
    });
  });

  describe('placeholder replacement', () => {
    it('should replace all placeholders in message template', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription(),
      ]);
      botMessagesRepository.resolveMessage.mockResolvedValue(
        'Signal: {symbol} Open: {open_price} TP: {take_profit} SL: {stop_loss}',
      );

      const order = createMockOrder({
        symbol: 'BTCUSD',
        openPrice: 50000,
        takeProfit: 52000,
        stopLoss: 49000,
      });

      // Act
      await service.broadcastSignal(order, 'open');

      // Assert - verify sendWithBot was called with replaced message
      expect(notificationService.sendWithBot).toHaveBeenCalled();
      const callArgs = notificationService.sendWithBot.mock.calls[0];
      const messageText = callArgs[3]; // 4th argument is the message
      expect(messageText).toContain('BTCUSD');
      expect(messageText).toContain('50000');
      expect(messageText).toContain('52000');
      expect(messageText).toContain('49000');
    });

    it('should replace unknown placeholders with N/A', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription(),
      ]);
      botMessagesRepository.resolveMessage.mockResolvedValue(
        'Signal: {symbol} Unknown: {unknown_field}',
      );

      const order = createMockOrder();

      // Act
      await service.broadcastSignal(order, 'open');

      // Assert
      const callArgs = notificationService.sendWithBot.mock.calls[0];
      const messageText = callArgs[3];
      expect(messageText).toContain('N/A');
    });
  });

  describe('result timing', () => {
    it('should include durationMs for each bot result', async () => {
      // Arrange
      const bot = createMockBot({ botId: 1, name: 'Bot1' });
      botRegistryService.getSignalCapableBots.mockReturnValue([bot]);
      subscriptionsRepository.findBySectorForBot.mockResolvedValue([
        createMockSubscription(),
      ]);

      const order = createMockOrder();

      // Act
      const result = await service.broadcastSignal(order, 'open');

      // Assert
      expect(result.perBotResults[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
