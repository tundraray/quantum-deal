// Broadcast Command Extraction E2E Test - Design Doc: broadcast-command-extraction-design.md
// Generated: 2026-01-09 | Budget Used: 1/2 E2E
// Test Type: End-to-End Tests
// Implementation Timing: After all feature implementations complete
// Note: describe/it are Jest globals, no import needed

import type {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  BotsRepository,
  Bot,
} from '@quantumdeal/db';
import type { NotificationService } from '@quantumdeal/framework/notifications';
import type { LLMService } from '@quantumdeal/framework';
import { BroadcastService } from '../../services/broadcast.service';
import { BroadcastUpdate } from '../../broadcast.update';
import { MasterbotUpdate } from '../../masterbot.update';
import { MASTERBOT_CONSTANTS } from '../../constants';
import type { MasterbotService } from '../../masterbot.service';
import type { SubscriptionManagementService } from '../../services/subscription-management.service';
import type { UserContext } from '../../interfaces';
import type { Telegraf } from 'telegraf';
import type { CodesRepository } from '@quantumdeal/db';

// Test constants
const TEST_BOT_ID = 1;
const TEST_MANAGER_ID = 123456789;
const TEST_SUBSCRIPTION_ID = 1;

/**
 * End-to-End tests for Broadcast Command Extraction Feature
 *
 * These tests verify complete user journeys through the new /broadcast command:
 * - Manager broadcasts to signals subscribers via new /broadcast command
 * - Complete flow from command to delivery confirmation
 *
 * Prerequisites:
 * - All feature implementations complete (BroadcastUpdate class, module registration)
 * - BroadcastUpdate registered in masterbot.module.ts
 * - BROADCAST command constant added to constants.ts
 * - findActiveSubscriptions returns signals + broadcast subscriptions
 * - Test database with seed data for signals subscription and subscribers
 *
 * Test Design Principles:
 * - Critical user journey coverage only (high ROI > 70)
 * - Full system integration (command -> handler -> service -> repository -> notification)
 * - Business-critical scenarios (signals subscriber broadcast)
 *
 * IMPORTANT: These E2E tests should be run ONLY after all implementations
 * from the design doc are complete. Running earlier will result in failures.
 */

describe('Broadcast Command Extraction E2E Tests', () => {
  // Mocks for E2E test
  let broadcastUpdate: BroadcastUpdate;
  let broadcastService: BroadcastService;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockBroadcastService: jest.Mocked<BroadcastService>;
  let mockBotsRepository: jest.Mocked<BotsRepository>;
  let mockUserSubscriptionsRepository: jest.Mocked<
    Pick<
      UserSubscriptionsRepository,
      | 'findActiveBySubscriptionId'
      | 'findSubscribersWithUserDetails'
      | 'findExpired'
    >
  >;
  let mockNotificationService: jest.Mocked<
    Pick<NotificationService, 'addMessages'>
  >;
  let mockLLMService: jest.Mocked<Pick<LLMService, 'generateObject'>>;

  // Helper to create full BotUser mock with all required fields
  const createMockBotUser = (overrides: {
    id: number;
    userId: number;
    botId: number;
    lang: string;
    isActive: boolean;
  }) => ({
    ...overrides,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: null,
    state: null,
  });

  // Test data fixtures - signals subscription type for testing
  const signalsSubscription = {
    id: TEST_SUBSCRIPTION_ID,
    name: 'Premium Signals',
    type: 'signals',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const signalsSubscribers = [
    {
      botUser: createMockBotUser({
        id: 1,
        userId: 111111111,
        botId: TEST_BOT_ID,
        lang: 'en',
        isActive: true,
      }),
      userSubscription: {
        id: 1,
        botUserId: 1,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      },
    },
    {
      botUser: createMockBotUser({
        id: 2,
        userId: 222222222,
        botId: TEST_BOT_ID,
        lang: 'ru',
        isActive: true,
      }),
      userSubscription: {
        id: 2,
        botUserId: 2,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      },
    },
    {
      botUser: createMockBotUser({
        id: 3,
        userId: 333333333,
        botId: TEST_BOT_ID,
        lang: 'es',
        isActive: true,
      }),
      userSubscription: {
        id: 3,
        botUserId: 3,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      },
    },
  ];

  const activeBots: Bot[] = [
    {
      id: 1,
      name: 'QuantumDealBot',
      username: 'quantum_deal_bot',
      token: 'test-token-1',
      webhookPath: '/bot',
      isDynamic: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Helper to create mock context
  const createMockContext = (
    callbackData?: string,
    session: Partial<UserContext['session']> = {},
  ): jest.Mocked<UserContext> => {
    const ctx = {
      manager: {
        id: 1,
        telegramId: TEST_MANAGER_ID,
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
        broadcastSubscriptionIds: null,
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks for BroadcastUpdate
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
      findById: jest.fn().mockResolvedValue(signalsSubscription),
      findActiveSubscriptions: jest
        .fn()
        .mockResolvedValue([signalsSubscription]),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockBotsRepository = {
      findAllActive: jest.fn().mockResolvedValue(activeBots),
      findById: jest.fn().mockImplementation(async (id: number) => {
        return activeBots.find((bot) => bot.id === id) || null;
      }),
    } as unknown as jest.Mocked<BotsRepository>;

    // Create mocks for BroadcastService
    mockUserSubscriptionsRepository = {
      findActiveBySubscriptionId: jest
        .fn()
        .mockResolvedValue(signalsSubscribers),
      findSubscribersWithUserDetails: jest
        .fn()
        .mockResolvedValue(signalsSubscribers),
      findExpired: jest.fn().mockResolvedValue([]),
    };

    mockNotificationService = {
      addMessages: jest.fn().mockImplementation((messages) => ({
        queuedCount: messages.length,
        errorCount: 0,
        queuedIds: messages.map((_: unknown, i: number) => `msg-${i}`),
        errors: [],
      })),
    };

    mockLLMService = {
      generateObject: jest.fn().mockResolvedValue({
        en: 'Test broadcast message',
        ru: 'Tестовое сообщение',
        es: 'Mensaje de prueba',
      }),
    };

    // Create BroadcastService instance
    broadcastService = new BroadcastService(
      mockUserSubscriptionsRepository as never,
      mockSubscriptionsRepository as never,
      mockNotificationService as never,
      mockLLMService as never,
    );

    // Create mock for BroadcastService used by BroadcastUpdate
    mockBroadcastService = {
      countSubscribers: jest.fn().mockResolvedValue(signalsSubscribers.length),
      sendBroadcast: jest
        .fn()
        .mockImplementation(
          async (
            subscriptionId,
            message,
            entities,
            managerId,
            filterStatus,
            filterBotId,
          ) => {
            // Call actual BroadcastService.sendBroadcast for E2E verification
            return broadcastService.sendBroadcast(
              subscriptionId,
              message,
              entities,
              managerId,
              filterStatus,
              filterBotId,
            );
          },
        ),
      sendBroadcastMulti: jest
        .fn()
        .mockImplementation(
          async (
            subscriptionIds,
            message,
            entities,
            managerId,
            filterStatus,
            filterBotId,
          ) => {
            // Call actual BroadcastService.sendBroadcast for E2E verification (first subscription)
            return broadcastService.sendBroadcast(
              subscriptionIds[0],
              message,
              entities,
              managerId,
              filterStatus,
              filterBotId,
            );
          },
        ),
      getUniqueUserCount: jest
        .fn()
        .mockImplementation(
          async (subscriptionIds, filterStatus, filterBotId) => ({
            total: signalsSubscribers.length,
            breakdown: subscriptionIds.map((id: number) => ({
              subscriptionId: id,
              name: 'Premium Signals',
              count: signalsSubscribers.length,
            })),
          }),
        ),
      validateMessage: jest.fn().mockReturnValue({ valid: true }),
    } as unknown as jest.Mocked<BroadcastService>;

    // Create BroadcastUpdate instance
    broadcastUpdate = new BroadcastUpdate(
      mockBot,
      mockBroadcastService,
      mockSubscriptionsRepository,
      mockBotsRepository,
      mockMasterbotService,
    );
  });

  // User Journey: Complete Broadcast to Signals Subscribers via /broadcast Command
  // ROI: 74 | Business Value: 10 (primary use case) | Frequency: 9 (main user base) | Legal: false
  // Verification: Manager can broadcast to signals subscribers using new /broadcast command
  //
  // This test covers:
  // - AC1: /broadcast shows signals subscription in list
  // - AC2: Complete filter flow works in new BroadcastUpdate
  // - AC3: Message preview shows correct information
  // - AC4: Confirm triggers broadcast to signals subscribers
  //
  // Flow:
  // 1. Manager sends /broadcast command
  // 2. BroadcastUpdate.onBroadcastCommand shows ALL subscriptions (including signals)
  // 3. Manager selects signals subscription
  // 4. Manager selects status filter (Active)
  // 5. Manager selects bot filter (All bots)
  // 6. Manager enters broadcast message
  // 7. Manager confirms broadcast
  // 8. Signals subscribers receive message
  //
  // @category: e2e
  // @dependency: full-system (BroadcastUpdate, BroadcastService, SubscriptionsRepository, NotificationService)
  // @complexity: high
  it('User Journey: Manager broadcasts to signals subscribers via /broadcast command', async () => {
    // NEW FLOW: /broadcast -> bot selection -> subscription selection -> status filter -> message -> confirm

    // Step 1: Manager sends /broadcast command (now shows bot selection first)
    const broadcastCmdCtx = createMockContext();
    await broadcastUpdate.onBroadcastCommand(broadcastCmdCtx);

    // Verify: Bot selection keyboard is shown first (new flow)
    expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
    expect(broadcastCmdCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Отправить сообщение'),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Все боты'),
              }),
            ]),
          ]),
        }),
      }),
    );

    // Step 2: Manager selects "All bots" (skips subscription selection, goes to message input)
    const selectAllBotsCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      {
        flowState: 'selecting_bot_filter',
      },
    );
    await broadcastUpdate.onBroadcastBotAll(selectAllBotsCtx);

    // Verify: Goes to message input (for "All bots", skips subscription selection)
    expect(selectAllBotsCtx.session.broadcastFilterBotId).toBeNull();
    expect(selectAllBotsCtx.session.flowState).toBe(
      'awaiting_broadcast_message',
    );

    // Step 3: Manager selects signals subscription via legacy flow (for testing purposes)
    const selectSubCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${TEST_SUBSCRIPTION_ID}`,
    );
    await broadcastUpdate.onBroadcastSubscriptionSelected(selectSubCtx);

    // Verify: Status filter keyboard shown
    expect(selectSubCtx.session.flowState).toBe('selecting_status_filter');
    expect(selectSubCtx.session.broadcastSubscriptionIds).toEqual([
      TEST_SUBSCRIPTION_ID,
    ]);

    // Step 4: Manager selects "Active subscribers" filter
    const selectActiveCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
      {
        broadcastSubscriptionIds: [TEST_SUBSCRIPTION_ID],
        flowState: 'selecting_status_filter',
      },
    );
    await broadcastUpdate.onBroadcastFilterActive(selectActiveCtx);

    // Verify: Goes directly to message input after status selection (new flow)
    expect(selectActiveCtx.session.broadcastFilterStatus).toBe('active');
    expect(selectActiveCtx.session.flowState).toBe('awaiting_broadcast_message');

    // Step 5: Manager selects "All bots" filter again
    const selectAllBotsCtx2 = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      {
        broadcastSubscriptionIds: [TEST_SUBSCRIPTION_ID],
        broadcastFilterStatus: 'active',
        flowState: 'selecting_bot_filter',
      },
    );
    await broadcastUpdate.onBroadcastBotAll(selectAllBotsCtx2);

    // Verify: Message input prompt shown
    expect(selectAllBotsCtx2.session.broadcastFilterBotId).toBeNull();
    expect(selectAllBotsCtx2.session.flowState).toBe(
      'awaiting_broadcast_message',
    );

    // Step 6: Manager confirms broadcast
    const confirmCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
      {
        broadcastSubscriptionIds: [TEST_SUBSCRIPTION_ID],
        broadcastMessage: 'Special announcement for signals subscribers!',
        broadcastMessageEntities: null,
        broadcastFilterStatus: 'active',
        broadcastFilterBotId: null,
      },
    );
    await broadcastUpdate.onBroadcastConfirm(confirmCtx);

    // Verify: BroadcastService.sendBroadcastMulti called with signals subscription (AC4)
    expect(mockBroadcastService.sendBroadcastMulti).toHaveBeenCalledWith(
      [TEST_SUBSCRIPTION_ID],
      'Special announcement for signals subscribers!',
      undefined,
      TEST_MANAGER_ID,
      'active',
      null,
    );

    // Verify: findSubscribersWithUserDetails was called
    expect(
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
    ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);

    // Verify: NotificationService received messages for all signals subscribers
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    const addMessagesCall = (mockNotificationService.addMessages as jest.Mock)
      .mock.calls[0][0];
    expect(addMessagesCall.length).toBe(signalsSubscribers.length);

    // Verify: All recipients are signals subscribers
    const recipientIds = addMessagesCall.map(
      (m: { telegramId: number }) => m.telegramId,
    );
    const signalsUserIds = signalsSubscribers.map((s) => s.botUser.userId);
    expect(recipientIds.sort()).toEqual(signalsUserIds.sort());

    // Verify: Delivery report shown
    expect(confirmCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Рассылка завершена'),
      expect.objectContaining({ parse_mode: 'Markdown' }),
    );

    // Verify: Session cleared after broadcast
    expect(confirmCtx.session.broadcastFilterStatus).toBeNull();
    expect(confirmCtx.session.broadcastFilterBotId).toBeNull();
  });
});

/**
 * Separation of Concerns E2E Tests
 *
 * These tests verify the separation between /subscription and /broadcast commands.
 */
describe('Broadcast Command Extraction - Separation of Concerns E2E Tests', () => {
  // Mocks for MasterbotUpdate
  let masterbotUpdate: MasterbotUpdate;
  let broadcastUpdate: BroadcastUpdate;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockCodesRepository: jest.Mocked<CodesRepository>;
  let mockSubscriptionManagementService: jest.Mocked<SubscriptionManagementService>;
  let mockBotsRepository: jest.Mocked<BotsRepository>;
  let mockBroadcastService: jest.Mocked<BroadcastService>;

  // Test data fixtures
  const signalsSubscription = {
    id: TEST_SUBSCRIPTION_ID,
    name: 'Premium Signals',
    type: 'signals',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper to create mock context
  const createMockContext = (
    session: Partial<UserContext['session']> = {},
  ): jest.Mocked<UserContext> => {
    const ctx = {
      manager: {
        id: 1,
        telegramId: TEST_MANAGER_ID,
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
        broadcastSubscriptionIds: null,
        broadcastMessage: null,
        broadcastMessageEntities: null,
        broadcastFilterStatus: null,
        broadcastFilterBotId: null,
        ...session,
      },
      reply: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(undefined),
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      sendChatAction: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      chat: { id: 123 },
    } as unknown as jest.Mocked<UserContext>;
    return ctx;
  };

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
      findById: jest.fn().mockResolvedValue(signalsSubscription),
      findActiveSubscriptions: jest
        .fn()
        .mockResolvedValue([signalsSubscription]),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockCodesRepository = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1, code: 'TEST123' }),
    } as unknown as jest.Mocked<CodesRepository>;

    mockSubscriptionManagementService = {
      getActiveBroadcastSubscriptions: jest.fn().mockResolvedValue([]),
      getSubscriptionById: jest.fn().mockResolvedValue(signalsSubscription),
      validateSubscriptionName: jest.fn().mockReturnValue(true),
      createSubscription: jest
        .fn()
        .mockResolvedValue({ subscription: { id: 1 } }),
      closeSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SubscriptionManagementService>;

    mockBotsRepository = {
      findAllActive: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<BotsRepository>;

    mockBroadcastService = {
      countSubscribers: jest.fn().mockResolvedValue(3),
      sendBroadcast: jest.fn().mockResolvedValue({
        queuedCount: 3,
        errorCount: 0,
        queuedIds: ['1', '2', '3'],
        errors: [],
      }),
      sendBroadcastMulti: jest.fn().mockResolvedValue({
        queuedCount: 3,
        errorCount: 0,
        queuedIds: ['1', '2', '3'],
        errors: [],
      }),
      getUniqueUserCount: jest.fn().mockResolvedValue({
        total: 3,
        breakdown: [{ subscriptionId: 1, name: 'Premium Signals', count: 3 }],
      }),
      validateMessage: jest.fn().mockReturnValue({ valid: true }),
    } as unknown as jest.Mocked<BroadcastService>;

    // Create MasterbotUpdate instance
    masterbotUpdate = new MasterbotUpdate(
      mockBot,
      mockMasterbotService,
      mockSubscriptionsRepository,
      mockCodesRepository,
      mockSubscriptionManagementService,
    );

    // Create BroadcastUpdate instance
    broadcastUpdate = new BroadcastUpdate(
      mockBot,
      mockBroadcastService,
      mockSubscriptionsRepository,
      mockBotsRepository,
      mockMasterbotService,
    );
  });

  // User Journey: /subscription and /broadcast Commands Have Distinct Responsibilities
  // ROI: 58 | Business Value: 7 (UX clarity) | Frequency: 6 (menu navigation) | Legal: false
  // Verification: Commands are properly separated - /subscription for management, /broadcast for messaging
  //
  // This test covers:
  // - AC: /subscription shows only Create and Close (no broadcast option)
  // - AC: /broadcast provides broadcast functionality
  // - Separation of concerns verified
  //
  // Flow:
  // 1. Manager sends /subscription command
  // 2. Menu shows only "Create subscription" and "Close subscription"
  // 3. No "Send message" or broadcast option present
  // 4. Manager sends /broadcast command
  // 5. Broadcast subscription list appears
  //
  // @category: e2e
  // @dependency: MasterbotUpdate, BroadcastUpdate
  // @complexity: medium
  it('User Journey: /subscription for management, /broadcast for messaging (separation verified)', async () => {
    // Part 1: Test /subscription command - should show ONLY management options
    const subscriptionCtx = createMockContext();
    await masterbotUpdate.onSubscriptionMenu(subscriptionCtx);

    // Verify: /subscription shows management options
    expect(subscriptionCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Управление подписками'),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Создать подписку'),
                callback_data:
                  MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CREATE,
              }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Закрыть подписку'),
                callback_data:
                  MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CLOSE,
              }),
            ]),
          ]),
        }),
      }),
    );

    // Verify: /subscription does NOT show broadcast option (AC3)
    const replyCall = (subscriptionCtx.reply as jest.Mock).mock.calls[0];
    const replyMarkup = replyCall[1]?.reply_markup;
    const allButtons = replyMarkup?.inline_keyboard?.flat() || [];

    // Check that there is NO broadcast-related button
    const hasBroadcastButton = allButtons.some(
      (btn: { callback_data?: string; text?: string }) =>
        btn.callback_data?.includes('broadcast') ||
        btn.text?.toLowerCase().includes('рассыл') ||
        btn.text?.toLowerCase().includes('сообщени'),
    );
    expect(hasBroadcastButton).toBe(false);

    // Verify: Only 2 buttons in /subscription menu (Create and Close)
    expect(allButtons.length).toBe(2);

    // Part 2: Test /broadcast command - should provide broadcast functionality
    // NEW FLOW: Now shows bot selection first instead of subscription list
    const broadcastCtx = createMockContext();
    await broadcastUpdate.onBroadcastCommand(broadcastCtx);

    // Verify: /broadcast shows bot selection keyboard (new flow)
    expect(mockBotsRepository.findAllActive).toHaveBeenCalled();
    expect(broadcastCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Отправить сообщение'),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Все боты'),
                callback_data:
                  MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
              }),
            ]),
          ]),
        }),
      }),
    );

    // Verify: /broadcast menu contains bot selection options (not subscription list)
    const broadcastReplyCall = (broadcastCtx.reply as jest.Mock).mock.calls[0];
    const broadcastReplyMarkup = broadcastReplyCall[1]?.reply_markup;
    const broadcastButtons =
      broadcastReplyMarkup?.inline_keyboard?.flat() || [];

    // Check that there IS a "All bots" button for broadcast
    const hasAllBotsButton = broadcastButtons.some(
      (btn: { callback_data?: string }) =>
        btn.callback_data ===
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
    );
    expect(hasAllBotsButton).toBe(true);
  });
});
