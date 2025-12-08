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
import { WebhookProcessorService } from '../webhook.service';
import { MultiBotSignalService } from '../multi-bot-signal.service';
import { NotificationService } from '@quantumdeal/framework/notifications';
import {
  SubscriptionsRepository,
  MessagesRepository,
  UserSubscriptionsRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import type { BroadcastResult } from '../../interfaces/multi-bot-signal.interface';

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;
  let mockMultiBotSignalService: jest.Mocked<MultiBotSignalService>;

  // Helper to create a mock order
  const createMockOrder = (overrides: Partial<MergedOrder> = {}): MergedOrder =>
    ({
      ticketId: 12345,
      positionId: 67890,
      symbol: 'EURUSD',
      sector: 'forex',
      orderType: 'buy',
      lots: 0.1,
      openPrice: 1.1234,
      closePrice: 1.1256,
      stopLoss: 1.12,
      takeProfit: 1.13,
      profit: 22.0,
      account: 'test-account',
      broker: 'TestBroker',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      closeTime: new Date('2025-01-15T12:00:00Z'),
      ...overrides,
    }) as MergedOrder;

  // Helper to create a mock BroadcastResult
  const createMockBroadcastResult = (
    overrides: Partial<BroadcastResult> = {},
  ): BroadcastResult => ({
    success: true,
    totalSent: 10,
    totalFailed: 0,
    botsProcessed: 2,
    botsFailed: 0,
    perBotResults: [
      {
        botId: null,
        botName: 'QuantumDealBot',
        success: true,
        sentCount: 5,
        failedCount: 0,
        durationMs: 50,
      },
      {
        botId: 1,
        botName: 'TestBot',
        success: true,
        sentCount: 5,
        failedCount: 0,
        durationMs: 45,
      },
    ],
    totalDurationMs: 100,
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock MultiBotSignalService
    mockMultiBotSignalService = {
      broadcastSignal: jest.fn(),
      getEligibleBotCount: jest.fn(),
    } as unknown as jest.Mocked<MultiBotSignalService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        {
          provide: MultiBotSignalService,
          useValue: mockMultiBotSignalService,
        },
        {
          provide: NotificationService,
          useValue: {},
        },
        {
          provide: SubscriptionsRepository,
          useValue: {},
        },
        {
          provide: MessagesRepository,
          useValue: {},
        },
        {
          provide: UserSubscriptionsRepository,
          useValue: {},
        },
        {
          provide: UserSubscriptionFeaturesRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  describe('sendOrderNotifications', () => {
    it('should route through MultiBotSignalService.broadcastSignal', async () => {
      // Arrange
      const order = createMockOrder();
      const eventType: MessageType = 'open';
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult(),
      );

      // Act
      await service.sendOrderNotifications(order, eventType);

      // Assert
      expect(mockMultiBotSignalService.broadcastSignal).toHaveBeenCalledWith(
        order,
        eventType,
      );
      expect(mockMultiBotSignalService.broadcastSignal).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should convert BroadcastResult to NotificationResult with success=true', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          success: true,
          totalSent: 10,
          totalFailed: 2,
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(10);
      expect(result.failedCount).toBe(2);
      expect(result.retryCount).toBe(0);
      expect(result.processedIds).toEqual([]);
    });

    it('should convert BroadcastResult to NotificationResult with success=false', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          success: false,
          totalSent: 0,
          totalFailed: 10,
          botsProcessed: 0,
          botsFailed: 2,
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(10);
    });

    it('should include bot-level errors in NotificationResult.errors', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          success: false,
          perBotResults: [
            {
              botId: null,
              botName: 'QuantumDealBot',
              success: false,
              sentCount: 0,
              failedCount: 0,
              error: 'Bot initialization failed',
              durationMs: 10,
            },
            {
              botId: 1,
              botName: 'TestBot',
              success: false,
              sentCount: 0,
              failedCount: 0,
              error: 'Rate limit exceeded',
              durationMs: 15,
            },
          ],
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        telegramId: 0,
        error: 'Bot QuantumDealBot: Bot initialization failed',
        retry: false,
      });
      expect(result.errors[1]).toEqual({
        telegramId: 0,
        error: 'Bot TestBot: Rate limit exceeded',
        retry: false,
      });
    });

    it('should not include successful bots in errors', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          perBotResults: [
            {
              botId: null,
              botName: 'QuantumDealBot',
              success: true,
              sentCount: 5,
              failedCount: 0,
              durationMs: 50,
            },
            {
              botId: 1,
              botName: 'FailedBot',
              success: false,
              sentCount: 0,
              failedCount: 0,
              error: 'Connection error',
              durationMs: 100,
            },
          ],
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('FailedBot');
    });

    it('should handle errors gracefully and return failure result', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockRejectedValue(
        new Error('Network timeout'),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Network timeout');
    });

    it('should handle unknown error types gracefully', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockRejectedValue(
        'Unknown error string',
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('System error');
    });

    it('should process different event types correctly', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult(),
      );

      const eventTypes: MessageType[] = [
        'open',
        'close_plus',
        'close_minus',
        'position_sltp_update',
      ];

      // Act & Assert
      for (const eventType of eventTypes) {
        await service.sendOrderNotifications(order, eventType);
        expect(mockMultiBotSignalService.broadcastSignal).toHaveBeenCalledWith(
          order,
          eventType,
        );
      }
    });

    it('should return empty result for order with no sector', async () => {
      // Arrange
      const order = createMockOrder({ sector: undefined });
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          success: false,
          totalSent: 0,
          totalFailed: 0,
          botsProcessed: 0,
          botsFailed: 0,
          perBotResults: [],
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
    });

    it('should return empty errors array when all bots succeed', async () => {
      // Arrange
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          perBotResults: [
            {
              botId: null,
              botName: 'QuantumDealBot',
              success: true,
              sentCount: 5,
              failedCount: 0,
              durationMs: 50,
            },
          ],
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.errors).toEqual([]);
    });

    it('AC-002: should process signals in parallel via MultiBotSignalService', async () => {
      // Arrange - This AC is verified at MultiBotSignalService level
      // Here we verify the integration point works correctly
      const order = createMockOrder();
      mockMultiBotSignalService.broadcastSignal.mockResolvedValue(
        createMockBroadcastResult({
          success: true,
          totalSent: 30, // 10 + 8 + 12 total
          totalFailed: 0,
          botsProcessed: 3,
          botsFailed: 0,
          totalDurationMs: 100, // Fast due to parallel processing
          perBotResults: [
            {
              botId: null,
              botName: 'QuantumDealBot',
              success: true,
              sentCount: 10,
              failedCount: 0,
              durationMs: 90,
            },
            {
              botId: 1,
              botName: 'Bot1',
              success: true,
              sentCount: 8,
              failedCount: 0,
              durationMs: 85,
            },
            {
              botId: 2,
              botName: 'Bot2',
              success: true,
              sentCount: 12,
              failedCount: 0,
              durationMs: 95,
            },
          ],
        }),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.sentCount).toBe(30); // 10 + 8 + 12
      expect(mockMultiBotSignalService.broadcastSignal).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
