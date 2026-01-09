import { MasterbotUpdate } from '../masterbot.update';
import { MASTERBOT_CONSTANTS } from '../constants';
import type { UserContext } from '../interfaces';
import type { Telegraf } from 'telegraf';
import type { MasterbotService } from '../masterbot.service';
import type {
  SubscriptionsRepository,
  CodesRepository,
  BotsRepository,
  Bot,
} from '@quantumdeal/db';
import type { SubscriptionManagementService } from '../services/subscription-management.service';
import type { BroadcastService } from '../services/broadcast.service';

/**
 * Unit tests for MasterbotUpdate - Filter Selection Handlers
 *
 * These tests verify the filter selection callback handlers:
 * - AC1: Status filter selection (Active/Expired)
 * - AC2: Bot filter selection (All bots/Specific bot)
 * - AC4: Keyboard helpers display correct options
 */
describe('MasterbotUpdate - Filter Selection Handlers', () => {
  let masterbotUpdate: MasterbotUpdate;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockCodesRepository: jest.Mocked<CodesRepository>;
  let mockSubscriptionManagementService: jest.Mocked<SubscriptionManagementService>;
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

    mockCodesRepository = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1, code: 'TEST123' }),
    } as unknown as jest.Mocked<CodesRepository>;

    mockSubscriptionManagementService = {
      getActiveBroadcastSubscriptions: jest.fn().mockResolvedValue([]),
      getSubscriptionById: jest.fn().mockResolvedValue(null),
      validateSubscriptionName: jest.fn().mockReturnValue(true),
      createSubscription: jest
        .fn()
        .mockResolvedValue({ subscription: { id: 1 } }),
      closeSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SubscriptionManagementService>;

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

    // Create service instance - note: need to check actual constructor signature
    masterbotUpdate = new MasterbotUpdate(
      mockBot,
      mockMasterbotService,
      mockSubscriptionsRepository,
      mockCodesRepository,
      mockSubscriptionManagementService,
      mockBroadcastService,
      mockBotsRepository,
    );
  });

  describe('Status Filter Selection Handlers (AC1)', () => {
    describe('onBroadcastFilterActive', () => {
      it('should set broadcastFilterStatus to active', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterActive(ctx);

        // Assert
        expect(ctx.session.broadcastFilterStatus).toBe('active');
      });

      it('should set flowState to selecting_bot_filter', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterActive(ctx);

        // Assert
        expect(ctx.session.flowState).toBe('selecting_bot_filter');
      });

      it('should show bot selection keyboard after selection', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterActive(ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
      });

      it('should answer callback query', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterActive(ctx);

        // Assert
        expect(ctx.answerCbQuery).toHaveBeenCalled();
      });
    });

    describe('onBroadcastFilterExpired', () => {
      it('should set broadcastFilterStatus to expired', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterExpired(ctx);

        // Assert
        expect(ctx.session.broadcastFilterStatus).toBe('expired');
      });

      it('should set flowState to selecting_bot_filter', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterExpired(ctx);

        // Assert
        expect(ctx.session.flowState).toBe('selecting_bot_filter');
      });

      it('should show bot selection keyboard after selection', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
          { broadcastSubscriptionId: 1 },
        );

        // Act
        await masterbotUpdate.onBroadcastFilterExpired(ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
      });
    });
  });

  describe('Bot Filter Selection Handlers (AC2)', () => {
    describe('onBroadcastBotAll', () => {
      it('should set broadcastFilterBotId to null', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotAll(ctx);

        // Assert
        expect(ctx.session.broadcastFilterBotId).toBeNull();
      });

      it('should set flowState to awaiting_broadcast_message', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotAll(ctx);

        // Assert
        expect(ctx.session.flowState).toBe('awaiting_broadcast_message');
      });

      it('should send message input prompt', async () => {
        // Arrange
        const ctx = createMockContext(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotAll(ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        expect(callArgs[0]).toContain('сообщение');
      });
    });

    describe('onBroadcastBotSelected', () => {
      it('should parse bot ID from callback data', async () => {
        // Arrange
        const botId = 5;
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${botId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotSelected(ctx);

        // Assert
        expect(mockBotsRepository.findById).toHaveBeenCalledWith(botId);
      });

      it('should set broadcastFilterBotId to parsed bot ID', async () => {
        // Arrange
        const botId = 5;
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${botId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotSelected(ctx);

        // Assert
        expect(ctx.session.broadcastFilterBotId).toBe(botId);
      });

      it('should set flowState to awaiting_broadcast_message', async () => {
        // Arrange
        const botId = 5;
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${botId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotSelected(ctx);

        // Assert
        expect(ctx.session.flowState).toBe('awaiting_broadcast_message');
      });

      it('should show error when bot ID is invalid', async () => {
        // Arrange
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}invalid`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotSelected(ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        // Should show error message (Russian: "Неверный формат" = "Invalid format")
        expect(callArgs[0]).toMatch(/неверн|ошибка|error|invalid/i);
      });

      it('should show error when bot not found', async () => {
        // Arrange
        const nonExistentBotId = 999;
        mockBotsRepository.findById.mockResolvedValue(null);
        const ctx = createMockContext(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${nonExistentBotId}`,
          { broadcastSubscriptionId: 1, broadcastFilterStatus: 'active' },
        );

        // Act
        await masterbotUpdate.onBroadcastBotSelected(ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        // Should show error about bot not found
        expect(callArgs[0]).toMatch(/не найден|not found/i);
      });
    });
  });

  describe('Keyboard Helper Methods (AC4)', () => {
    describe('showStatusFilterKeyboard', () => {
      it('should display Active and Expired options', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
        });

        // Act
        await masterbotUpdate['showStatusFilterKeyboard'](ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        // Check for keyboard with Active/Expired buttons
        const markup = callArgs[1]?.reply_markup;
        expect(markup?.inline_keyboard).toBeDefined();

        // Flatten keyboard buttons and check for expected callback data
        const buttons = markup.inline_keyboard.flat();
        const callbackDataValues = buttons.map(
          (b: { callback_data: string }) => b.callback_data,
        );
        expect(callbackDataValues).toContain(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
        );
        expect(callbackDataValues).toContain(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
        );
      });

      it('should include Cancel button', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
        });

        // Act
        await masterbotUpdate['showStatusFilterKeyboard'](ctx);

        // Assert
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        const markup = callArgs[1]?.reply_markup;
        const buttons = markup.inline_keyboard.flat();
        const callbackDataValues = buttons.map(
          (b: { callback_data: string }) => b.callback_data,
        );
        expect(callbackDataValues).toContain(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
        );
      });
    });

    describe('showBotFilterKeyboard', () => {
      it('should display All bots option', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
          broadcastFilterStatus: 'active',
        });

        // Act
        await masterbotUpdate['showBotFilterKeyboard'](ctx);

        // Assert
        expect(ctx.editMessageText).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        const markup = callArgs[1]?.reply_markup;
        const buttons = markup.inline_keyboard.flat();
        const callbackDataValues = buttons.map(
          (b: { callback_data: string }) => b.callback_data,
        );
        expect(callbackDataValues).toContain(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
        );
      });

      it('should fetch and display list of active bots', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
          broadcastFilterStatus: 'active',
        });

        // Act
        await masterbotUpdate['showBotFilterKeyboard'](ctx);

        // Assert
        expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        const markup = callArgs[1]?.reply_markup;
        const buttons = markup.inline_keyboard.flat();
        const callbackDataValues = buttons.map(
          (b: { callback_data: string }) => b.callback_data,
        );

        // Check that bot-specific buttons are present
        expect(callbackDataValues).toContain(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}1`,
        );
        expect(callbackDataValues).toContain(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}2`,
        );
        expect(callbackDataValues).toContain(
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}5`,
        );
      });

      it('should include bot names in button text', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
          broadcastFilterStatus: 'active',
        });

        // Act
        await masterbotUpdate['showBotFilterKeyboard'](ctx);

        // Assert
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        const markup = callArgs[1]?.reply_markup;
        const buttons = markup.inline_keyboard.flat();
        const buttonTexts = buttons.map((b: { text: string }) => b.text);

        // Check bot names are in button text
        expect(
          buttonTexts.some((t: string) => t.includes('QuantumDealBot')),
        ).toBe(true);
        expect(buttonTexts.some((t: string) => t.includes('SignalBot'))).toBe(
          true,
        );
        expect(buttonTexts.some((t: string) => t.includes('PartnerBot'))).toBe(
          true,
        );
      });

      it('should include Cancel button', async () => {
        // Arrange
        const ctx = createMockContext(undefined, {
          broadcastSubscriptionId: 1,
          broadcastFilterStatus: 'active',
        });

        // Act
        await masterbotUpdate['showBotFilterKeyboard'](ctx);

        // Assert
        const callArgs = (ctx.editMessageText as jest.Mock).mock.calls[0];
        const markup = callArgs[1]?.reply_markup;
        const buttons = markup.inline_keyboard.flat();
        const callbackDataValues = buttons.map(
          (b: { callback_data: string }) => b.callback_data,
        );
        expect(callbackDataValues).toContain(
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
        );
      });
    });
  });

  describe('Authentication', () => {
    it('should require manager authentication for status filter handlers', async () => {
      // Arrange
      const ctx = createMockContext(
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
      );
      ctx.manager = undefined;

      // Act
      await masterbotUpdate.onBroadcastFilterActive(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED,
      );
    });

    it('should require manager authentication for bot filter handlers', async () => {
      // Arrange
      const ctx = createMockContext(
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      );
      ctx.manager = undefined;

      // Act
      await masterbotUpdate.onBroadcastBotAll(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED,
      );
    });
  });
});
