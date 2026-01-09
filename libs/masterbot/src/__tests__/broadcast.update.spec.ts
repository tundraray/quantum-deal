import { BroadcastUpdate } from '../broadcast.update';
import { MASTERBOT_CONSTANTS } from '../constants';
import type { UserContext } from '../interfaces';
import type { Telegraf } from 'telegraf';
import type { MasterbotService } from '../masterbot.service';
import type {
  SubscriptionsRepository,
  BotsRepository,
  Bot,
} from '@quantumdeal/db';
import type { BroadcastService } from '../services/broadcast.service';

/**
 * Unit tests for BroadcastUpdate - Filter Selection Handlers
 *
 * These tests verify the filter selection callback handlers:
 * - AC1: Status filter selection (Active/Expired)
 * - AC2: Bot filter selection (All bots/Specific bot)
 * - AC4: Keyboard helpers display correct options
 */
describe('BroadcastUpdate - Filter Selection Handlers', () => {
  let broadcastUpdate: BroadcastUpdate;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockBroadcastService: jest.Mocked<BroadcastService>;
  let mockBotsRepository: jest.Mocked<BotsRepository>;

  // Helper to create mock context
  const createMockContext = (
    callbackData?: string,
    session: Partial<UserContext['session']> = {},
  ): jest.Mocked<UserContext> => {
    const ctx = {
      manager: {
        id: 1,
        telegramId: 12345,
        username: 'testmanager',
        firstName: 'Test',
        lastName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        flowState: null,
        commandContext: null,
        broadcastSubscriptionId: null,
        broadcastMessage: null,
        broadcastMessageEntities: null,
        broadcastFilterStatus: null,
        broadcastFilterBotId: null,
        ...session,
      },
      callbackQuery: callbackData
        ? { data: callbackData, id: 'test-callback-id' }
        : undefined,
      reply: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(undefined),
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      sendChatAction: jest.fn().mockResolvedValue(undefined),
      chat: { id: 123 },
      telegram: {
        sendMessage: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as jest.Mocked<UserContext>;
    return ctx;
  };

  // Mock bot data fixtures
  const mockActiveBots: Bot[] = [
    {
      id: 1,
      name: 'QuantumDealBot',
      username: 'quantumdeal_bot',
      token: 'test-token-1',
      webhookPath: '/bot',
      isDynamic: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'SignalBot',
      username: 'signal_bot',
      token: 'test-token-2',
      webhookPath: '/dynamic/signal',
      isDynamic: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      name: 'PartnerBot',
      username: 'partner_bot',
      token: 'test-token-5',
      webhookPath: '/dynamic/partner',
      isDynamic: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockBot = {
      telegram: {
        getMe: jest.fn().mockResolvedValue({ username: 'masterbot' }),
        sendMessage: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as jest.Mocked<Telegraf<UserContext>>;

    mockMasterbotService = {
      logManagerAction: jest.fn(),
      onStart: jest.fn().mockReturnValue('Welcome message'),
      getUserStatistics: jest.fn().mockResolvedValue({}),
      formatUserStatistics: jest.fn().mockReturnValue('Stats message'),
    } as unknown as jest.Mocked<MasterbotService>;

    mockSubscriptionsRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Test Subscription' }),
      findActiveSubscriptions: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockBroadcastService = {
      countSubscribers: jest.fn().mockResolvedValue(10),
      sendBroadcast: jest
        .fn()
        .mockResolvedValue({ queuedCount: 10, errorCount: 0 }),
      validateMessage: jest.fn().mockReturnValue({ valid: true }),
    } as unknown as jest.Mocked<BroadcastService>;

    mockBotsRepository = {
      findAllActive: jest.fn().mockResolvedValue(mockActiveBots),
      findById: jest.fn().mockImplementation(async (id: number) => {
        return mockActiveBots.find((bot) => bot.id === id) || null;
      }),
    } as unknown as jest.Mocked<BotsRepository>;

    // Create service instance
    broadcastUpdate = new BroadcastUpdate(
      mockBot,
      mockBroadcastService,
      mockSubscriptionsRepository,
      mockBotsRepository,
      mockMasterbotService,
    );
  });

  describe('Status Filter Selection Handlers (AC1)', () => {
    describe('onBroadcastFilterActive', () => {
      it('should set broadcastFilterStatus to active', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterActive(ctx);
        expect(ctx.session.broadcastFilterStatus).toBe('active');
      });

      it('should set flowState to selecting_bot_filter', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterActive(ctx);
        expect(ctx.session.flowState).toBe('selecting_bot_filter');
      });

      it('should show bot selection keyboard after selection', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterActive(ctx);
        expect(ctx.editMessageText).toHaveBeenCalled();
        expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
      });

      it('should answer callback query', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterActive(ctx);
        expect(ctx.answerCbQuery).toHaveBeenCalled();
      });
    });

    describe('onBroadcastFilterExpired', () => {
      it('should set broadcastFilterStatus to expired', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterExpired(ctx);
        expect(ctx.session.broadcastFilterStatus).toBe('expired');
      });

      it('should set flowState to selecting_bot_filter', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
          { broadcastSubscriptionId: 1 },
        );
        await broadcastUpdate.onBroadcastFilterExpired(ctx);
        expect(ctx.session.flowState).toBe('selecting_bot_filter');
      });
    });
  });

  describe('Bot Filter Selection Handlers (AC2)', () => {
    describe('onBroadcastBotAll', () => {
      it('should set broadcastFilterBotId to null', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );
        await broadcastUpdate.onBroadcastBotAll(ctx);
        expect(ctx.session.broadcastFilterBotId).toBeNull();
      });

      it('should set flowState to awaiting_broadcast_message', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );
        await broadcastUpdate.onBroadcastBotAll(ctx);
        expect(ctx.session.flowState).toBe('awaiting_broadcast_message');
      });
    });

    describe('onBroadcastBotSelected', () => {
      it('should set broadcastFilterBotId to parsed bot ID', async () => {
        const botId = 5;
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${botId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );
        await broadcastUpdate.onBroadcastBotSelected(ctx);
        expect(ctx.session.broadcastFilterBotId).toBe(botId);
      });

      it('should show error when bot not found', async () => {
        const nonExistentBotId = 999;
        mockBotsRepository.findById.mockResolvedValue(null);
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${nonExistentBotId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );
        await broadcastUpdate.onBroadcastBotSelected(ctx);
        expect(ctx.editMessageText).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication', () => {
    it('should require manager authentication for status filter handlers', async () => {
      const ctx = createMockContext(
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
      );
      ctx.manager = undefined;
      await broadcastUpdate.onBroadcastFilterActive(ctx);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED,
      );
    });

    it('should require manager authentication for bot filter handlers', async () => {
      const ctx = createMockContext(
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      );
      ctx.manager = undefined;
      await broadcastUpdate.onBroadcastBotAll(ctx);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED,
      );
    });
  });

  describe('Broadcast Flow with Filters (Task 006)', () => {
    describe('onBroadcastSubscriptionSelected', () => {
      it('should set flowState to selecting_status_filter after subscription selection', async () => {
        const subscriptionId = 1;
        mockSubscriptionsRepository.findById.mockResolvedValue({
          id: subscriptionId,
          name: 'Test Subscription',
          type: 'subscription_test',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${subscriptionId}`,
        );
        await broadcastUpdate.onBroadcastSubscriptionSelected(ctx);
        expect(ctx.session.flowState).toBe('selecting_status_filter');
      });

      it('should initialize filter defaults to null after subscription selection', async () => {
        const subscriptionId = 1;
        mockSubscriptionsRepository.findById.mockResolvedValue({
          id: subscriptionId,
          name: 'Test Subscription',
          type: 'subscription_test',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${subscriptionId}`,
        );
        await broadcastUpdate.onBroadcastSubscriptionSelected(ctx);
        expect(ctx.session.broadcastFilterStatus).toBeNull();
        expect(ctx.session.broadcastFilterBotId).toBeNull();
      });
    });

    describe('onBroadcastConfirm', () => {
      it('should pass filter parameters to sendBroadcast', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
          {
            broadcastSubscriptionId: 1,
            broadcastMessage: 'Test broadcast message',
            broadcastMessageEntities: null,
            broadcastFilterStatus: 'expired',
            broadcastFilterBotId: 5,
          },
        );
        await broadcastUpdate.onBroadcastConfirm(ctx);
        expect(mockBroadcastService.sendBroadcast).toHaveBeenCalledWith(
          1,
          'Test broadcast message',
          undefined,
          12345,
          'expired',
          5,
        );
      });

      it('should pass default filter values (active/null) when not set', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
          {
            broadcastSubscriptionId: 1,
            broadcastMessage: 'Test broadcast message',
            broadcastMessageEntities: null,
            broadcastFilterStatus: null,
            broadcastFilterBotId: null,
          },
        );
        await broadcastUpdate.onBroadcastConfirm(ctx);
        expect(mockBroadcastService.sendBroadcast).toHaveBeenCalledWith(
          1,
          'Test broadcast message',
          undefined,
          12345,
          'active',
          null,
        );
      });

      it('should clear filter state after successful broadcast', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
          {
            broadcastSubscriptionId: 1,
            broadcastMessage: 'Test broadcast message',
            broadcastMessageEntities: null,
            broadcastFilterStatus: 'expired',
            broadcastFilterBotId: 5,
          },
        );
        await broadcastUpdate.onBroadcastConfirm(ctx);
        expect(ctx.session.broadcastFilterStatus).toBeNull();
        expect(ctx.session.broadcastFilterBotId).toBeNull();
      });
    });

    describe('onBroadcastCancel', () => {
      it('should reset filter state on cancel', async () => {
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
          {
            broadcastSubscriptionId: 1,
            broadcastFilterStatus: 'expired',
            broadcastFilterBotId: 5,
          },
        );
        await broadcastUpdate.onBroadcastCancel(ctx);
        expect(ctx.session.broadcastFilterStatus).toBeNull();
        expect(ctx.session.broadcastFilterBotId).toBeNull();
      });
    });
  });
});
