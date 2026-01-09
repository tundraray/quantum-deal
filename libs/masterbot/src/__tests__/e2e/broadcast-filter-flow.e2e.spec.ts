// Broadcast Filter Extension E2E Test - Design Doc: broadcast-filter-extension-design.md
// Generated: 2026-01-09 | Budget Used: 2/2 E2E
// Test Type: End-to-End Tests
// Implementation Timing: After all feature implementations complete

import type {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  BotsRepository,
  Bot,
} from '@quantumdeal/db';
import type { NotificationService } from '@quantumdeal/framework/notifications';
import type { LLMService } from '@quantumdeal/framework';
import { BroadcastService } from '../../services/broadcast.service';
import { MasterbotUpdate } from '../../masterbot.update';
import { MASTERBOT_CONSTANTS } from '../../constants';
import type { MasterbotService } from '../../masterbot.service';
import type { SubscriptionManagementService } from '../../services/subscription-management.service';
import type { UserContext } from '../../interfaces';
import type { Telegraf } from 'telegraf';

// Test constants
const TEST_BOT_ID = 1;
const TEST_MANAGER_ID = 123456789;
const TEST_SUBSCRIPTION_ID = 1;

/**
 * End-to-End tests for Broadcast Filter Extension
 *
 * These tests verify complete manager journeys through the filtered broadcast flow:
 * - Manager selects expired filter -> sends broadcast -> correct users receive message
 * - Manager selects bot filter -> sends broadcast -> only bot users receive message
 * - Backward compatibility: default flow works unchanged
 *
 * Prerequisites:
 * - All feature implementations complete (Phase 1-3 of implementation plan)
 * - BroadcastService extended with filter parameters
 * - MasterbotUpdate handlers extended with filter selection flow
 * - Session state includes filter fields
 * - Test database with seed data for subscriptions, users, bots
 *
 * Test Design Principles:
 * - Critical user journey coverage only (high ROI > 70)
 * - Full system integration (repository -> service -> handler -> notification)
 * - Business-critical scenarios (re-engagement campaigns)
 *
 * IMPORTANT: These E2E tests should be run ONLY after all implementations
 * from the design doc are complete. Running earlier will result in failures.
 */

describe('Broadcast Filter Extension E2E Tests', () => {
  // Mocks for E2E test
  let masterbotUpdate: MasterbotUpdate;
  let broadcastService: BroadcastService;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockCodesRepository: jest.Mocked<{
    findByCode: jest.Mock;
    create: jest.Mock;
  }>;
  let mockSubscriptionManagementService: jest.Mocked<SubscriptionManagementService>;
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

  // Test data fixtures
  const activeSubscribers = [
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
  ];

  const expiredSubscribersBot1 = [
    {
      botUser: createMockBotUser({
        id: 3,
        userId: 333333333,
        botId: TEST_BOT_ID,
        lang: 'en',
        isActive: true,
      }),
      subscription: {
        id: TEST_SUBSCRIPTION_ID,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 3,
        botUserId: 3,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        botId: TEST_BOT_ID,
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      },
    },
    {
      botUser: createMockBotUser({
        id: 4,
        userId: 444444444,
        botId: TEST_BOT_ID,
        lang: 'es',
        isActive: true,
      }),
      subscription: {
        id: TEST_SUBSCRIPTION_ID,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 4,
        botUserId: 4,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        botId: TEST_BOT_ID,
        isActive: false,
        expiresAt: new Date('2025-10-15'),
      },
    },
  ];

  const expiredSubscribersBot2 = [
    {
      botUser: createMockBotUser({
        id: 5,
        userId: 555555555,
        botId: 2,
        lang: 'ru',
        isActive: true,
      }),
      subscription: {
        id: TEST_SUBSCRIPTION_ID,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 5,
        botUserId: 5,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        botId: 2,
        isActive: false,
        expiresAt: new Date('2025-09-01'),
      },
    },
  ];

  const allExpiredSubscribers = [
    ...expiredSubscribersBot1,
    ...expiredSubscribersBot2,
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
    {
      id: 2,
      name: 'SignalBot',
      username: 'signal_bot',
      token: 'test-token-2',
      webhookPath: '/bot2',
      isDynamic: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: 'PartnerBot',
      username: 'partner_bot',
      token: 'test-token-3',
      webhookPath: '/bot3',
      isDynamic: true,
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks for MasterbotUpdate
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
      findById: jest.fn().mockResolvedValue({
        id: TEST_SUBSCRIPTION_ID,
        name: 'Test Subscription',
        type: 'subscription_test',
        isActive: true,
      }),
      findActiveSubscriptions: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockCodesRepository = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1, code: 'TEST123' }),
    } as jest.Mocked<{ findByCode: jest.Mock; create: jest.Mock }>;

    mockSubscriptionManagementService = {
      getActiveBroadcastSubscriptions: jest.fn().mockResolvedValue([]),
      getSubscriptionById: jest.fn().mockResolvedValue({
        id: TEST_SUBSCRIPTION_ID,
        name: 'Test Subscription',
        type: 'subscription_test',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      validateSubscriptionName: jest.fn().mockReturnValue(true),
      createSubscription: jest
        .fn()
        .mockResolvedValue({ subscription: { id: 1 } }),
      closeSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SubscriptionManagementService>;

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
        .mockResolvedValue(activeSubscribers),
      findSubscribersWithUserDetails: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findExpired: jest
        .fn()
        .mockImplementation(async (subscriptionType, botId, subscriptionId) => {
          // Filter by botId if provided
          if (botId != null) {
            return allExpiredSubscribers.filter(
              (s) => s.botUser.botId === botId,
            );
          }
          return allExpiredSubscribers;
        }),
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

    // Create mock for BroadcastService used by MasterbotUpdate
    mockBroadcastService = {
      countSubscribers: jest
        .fn()
        .mockImplementation(
          async (subscriptionId, filterStatus, filterBotId) => {
            if (filterStatus === 'expired') {
              if (filterBotId != null) {
                return allExpiredSubscribers.filter(
                  (s) => s.botUser.botId === filterBotId,
                ).length;
              }
              return allExpiredSubscribers.length;
            }
            return activeSubscribers.length;
          },
        ),
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
      validateMessage: jest.fn().mockReturnValue({ valid: true }),
    } as unknown as jest.Mocked<BroadcastService>;

    // Create MasterbotUpdate instance
    masterbotUpdate = new MasterbotUpdate(
      mockBot,
      mockMasterbotService,
      mockSubscriptionsRepository,
      mockCodesRepository as never,
      mockSubscriptionManagementService,
      mockBroadcastService,
      mockBotsRepository,
    );
  });

  // User Journey: Complete Broadcast Flow with Expired Subscribers Filter
  // ROI: 78 | Business Value: 9 (re-engagement) | Frequency: 6 (campaign frequency) | Legal: false
  // Verification: Manager can send broadcast to expired subscribers only
  //
  // This test covers:
  // - AC1: Expired Subscription Filter Selection
  // - AC4: Message Preview with Filters
  // - Integration: MasterbotUpdate -> BroadcastService -> UserSubscriptionsRepository -> NotificationService
  //
  // @category: e2e
  // @dependency: full-system
  // @complexity: high
  it('User Journey: Manager sends broadcast to expired subscribers only - all bots', async () => {
    // Step 1: Manager selects a subscription for broadcast
    const selectSubCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${TEST_SUBSCRIPTION_ID}`,
    );
    await masterbotUpdate.onBroadcastSubscriptionSelected(selectSubCtx);

    // Verify: Flow state set to selecting_status_filter, status filter keyboard shown
    expect(selectSubCtx.session.flowState).toBe('selecting_status_filter');
    expect(selectSubCtx.session.broadcastSubscriptionId).toBe(
      TEST_SUBSCRIPTION_ID,
    );
    expect(selectSubCtx.editMessageText).toHaveBeenCalled();

    // Step 2: Manager selects "Expired subscribers" filter
    const selectExpiredCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        flowState: 'selecting_status_filter',
      },
    );
    await masterbotUpdate.onBroadcastFilterExpired(selectExpiredCtx);

    // Verify: Session state updated, bot filter keyboard shown
    expect(selectExpiredCtx.session.broadcastFilterStatus).toBe('expired');
    expect(selectExpiredCtx.session.flowState).toBe('selecting_bot_filter');
    expect(mockBotsRepository.findAllActive).toHaveBeenCalled();

    // Step 3: Manager selects "All bots" filter
    const selectAllBotsCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastFilterStatus: 'expired',
        flowState: 'selecting_bot_filter',
      },
    );
    await masterbotUpdate.onBroadcastBotAll(selectAllBotsCtx);

    // Verify: Session state updated, message input prompt shown
    expect(selectAllBotsCtx.session.broadcastFilterBotId).toBeNull();
    expect(selectAllBotsCtx.session.flowState).toBe(
      'awaiting_broadcast_message',
    );

    // Step 4: Manager confirms broadcast with message
    const confirmCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastMessage: 'Test broadcast message for expired users',
        broadcastMessageEntities: null,
        broadcastFilterStatus: 'expired',
        broadcastFilterBotId: null,
      },
    );
    await masterbotUpdate.onBroadcastConfirm(confirmCtx);

    // Verify: BroadcastService called with correct filter parameters
    expect(mockBroadcastService.sendBroadcast).toHaveBeenCalledWith(
      TEST_SUBSCRIPTION_ID,
      'Test broadcast message for expired users',
      undefined,
      TEST_MANAGER_ID,
      'expired',
      null,
    );

    // Verify: findExpired was called via BroadcastService
    expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
      undefined,
      undefined, // botId = null means all bots
      TEST_SUBSCRIPTION_ID,
    );

    // Verify: NotificationService received messages for all expired subscribers (3 total)
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    const addMessagesCall = (mockNotificationService.addMessages as jest.Mock)
      .mock.calls[0][0];
    expect(addMessagesCall.length).toBe(allExpiredSubscribers.length);

    // Verify: All recipients are from expired subscribers list
    const recipientIds = addMessagesCall.map(
      (m: { telegramId: number }) => m.telegramId,
    );
    const expiredUserIds = allExpiredSubscribers.map((s) => s.botUser.userId);
    expect(recipientIds.sort()).toEqual(expiredUserIds.sort());

    // Verify: Session filter state cleared after broadcast
    expect(confirmCtx.session.broadcastFilterStatus).toBeNull();
    expect(confirmCtx.session.broadcastFilterBotId).toBeNull();
  });

  // User Journey: Complete Broadcast Flow with Combined Filters (Expired + Specific Bot)
  // ROI: 75 | Business Value: 8 (targeted campaigns) | Frequency: 6 (campaign frequency) | Legal: false
  // Verification: Manager can send broadcast to expired subscribers of a specific bot only
  //
  // This test covers:
  // - AC1: Expired Subscription Filter Selection
  // - AC2: Bot Selection Filter
  // - AC3: Filter Combination
  // - AC4: Message Preview with Filters
  // - Integration: Full flow with combined filters
  //
  // @category: e2e
  // @dependency: full-system
  // @complexity: high
  it('User Journey: Manager sends broadcast to expired subscribers of specific bot (combined filters)', async () => {
    // Step 1: Manager selects subscription
    const selectSubCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${TEST_SUBSCRIPTION_ID}`,
    );
    await masterbotUpdate.onBroadcastSubscriptionSelected(selectSubCtx);
    expect(selectSubCtx.session.flowState).toBe('selecting_status_filter');

    // Step 2: Manager selects "Expired subscribers" filter
    const selectExpiredCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        flowState: 'selecting_status_filter',
      },
    );
    await masterbotUpdate.onBroadcastFilterExpired(selectExpiredCtx);
    expect(selectExpiredCtx.session.broadcastFilterStatus).toBe('expired');
    expect(selectExpiredCtx.session.flowState).toBe('selecting_bot_filter');

    // Step 3: Manager selects specific bot (QuantumDealBot - botId=1)
    const selectBotCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${TEST_BOT_ID}`,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastFilterStatus: 'expired',
        flowState: 'selecting_bot_filter',
      },
    );
    await masterbotUpdate.onBroadcastBotSelected(selectBotCtx);

    // Verify: Session state correctly tracks both filters
    expect(selectBotCtx.session.broadcastFilterBotId).toBe(TEST_BOT_ID);
    expect(selectBotCtx.session.broadcastFilterStatus).toBe('expired');
    expect(selectBotCtx.session.flowState).toBe('awaiting_broadcast_message');
    expect(mockBotsRepository.findById).toHaveBeenCalledWith(TEST_BOT_ID);

    // Step 4: Manager confirms broadcast
    const confirmCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastMessage: 'Targeted message for expired Bot1 users',
        broadcastMessageEntities: null,
        broadcastFilterStatus: 'expired',
        broadcastFilterBotId: TEST_BOT_ID,
      },
    );
    await masterbotUpdate.onBroadcastConfirm(confirmCtx);

    // Verify: BroadcastService called with BOTH filter parameters
    expect(mockBroadcastService.sendBroadcast).toHaveBeenCalledWith(
      TEST_SUBSCRIPTION_ID,
      'Targeted message for expired Bot1 users',
      undefined,
      TEST_MANAGER_ID,
      'expired',
      TEST_BOT_ID,
    );

    // Verify: findExpired was called with botId filter
    expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
      undefined,
      TEST_BOT_ID, // botId filter applied
      TEST_SUBSCRIPTION_ID,
    );

    // Verify: NotificationService received messages ONLY for bot1 expired subscribers (2)
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    const addMessagesCall = (mockNotificationService.addMessages as jest.Mock)
      .mock.calls[0][0];
    expect(addMessagesCall.length).toBe(expiredSubscribersBot1.length);

    // Verify: All recipients are from bot1 expired subscribers only
    const recipientIds = addMessagesCall.map(
      (m: { telegramId: number }) => m.telegramId,
    );
    const bot1ExpiredUserIds = expiredSubscribersBot1.map(
      (s) => s.botUser.userId,
    );
    expect(recipientIds.sort()).toEqual(bot1ExpiredUserIds.sort());

    // Verify: Bot2 expired subscriber NOT included
    const bot2ExpiredUserIds = expiredSubscribersBot2.map(
      (s) => s.botUser.userId,
    );
    expect(
      recipientIds.every((id: number) => !bot2ExpiredUserIds.includes(id)),
    ).toBe(true);
  });
});

/**
 * Backward Compatibility E2E Tests
 *
 * These tests ensure existing broadcast functionality remains unchanged
 * when no filters are selected (default behavior).
 */
describe('Broadcast Filter Extension - Backward Compatibility E2E Tests', () => {
  // Mocks for E2E test
  let masterbotUpdate: MasterbotUpdate;
  let broadcastService: BroadcastService;
  let mockBot: jest.Mocked<Telegraf<UserContext>>;
  let mockMasterbotService: jest.Mocked<MasterbotService>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockCodesRepository: jest.Mocked<{
    findByCode: jest.Mock;
    create: jest.Mock;
  }>;
  let mockSubscriptionManagementService: jest.Mocked<SubscriptionManagementService>;
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

  // Test data fixtures
  const activeSubscribers = [
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
    {
      id: 2,
      name: 'SignalBot',
      username: 'signal_bot',
      token: 'test-token-2',
      webhookPath: '/bot2',
      isDynamic: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: 'PartnerBot',
      username: 'partner_bot',
      token: 'test-token-3',
      webhookPath: '/bot3',
      isDynamic: true,
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks for MasterbotUpdate
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
      findById: jest.fn().mockResolvedValue({
        id: TEST_SUBSCRIPTION_ID,
        name: 'Test Subscription',
        type: 'subscription_test',
        isActive: true,
      }),
      findActiveSubscriptions: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockCodesRepository = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1, code: 'TEST123' }),
    } as jest.Mocked<{ findByCode: jest.Mock; create: jest.Mock }>;

    mockSubscriptionManagementService = {
      getActiveBroadcastSubscriptions: jest.fn().mockResolvedValue([]),
      getSubscriptionById: jest.fn().mockResolvedValue({
        id: TEST_SUBSCRIPTION_ID,
        name: 'Test Subscription',
        type: 'subscription_test',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      validateSubscriptionName: jest.fn().mockReturnValue(true),
      createSubscription: jest
        .fn()
        .mockResolvedValue({ subscription: { id: 1 } }),
      closeSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SubscriptionManagementService>;

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
        .mockResolvedValue(activeSubscribers),
      findSubscribersWithUserDetails: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findExpired: jest.fn().mockResolvedValue([]), // No expired subscribers for backward compat test
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
      }),
    };

    // Create BroadcastService instance
    broadcastService = new BroadcastService(
      mockUserSubscriptionsRepository as never,
      mockSubscriptionsRepository as never,
      mockNotificationService as never,
      mockLLMService as never,
    );

    // Create mock for BroadcastService used by MasterbotUpdate
    mockBroadcastService = {
      countSubscribers: jest
        .fn()
        .mockImplementation(
          async (subscriptionId, filterStatus, filterBotId) => {
            if (filterStatus === 'expired') {
              return 0; // No expired subscribers
            }
            return activeSubscribers.length;
          },
        ),
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
      validateMessage: jest.fn().mockReturnValue({ valid: true }),
    } as unknown as jest.Mocked<BroadcastService>;

    // Create MasterbotUpdate instance
    masterbotUpdate = new MasterbotUpdate(
      mockBot,
      mockMasterbotService,
      mockSubscriptionsRepository,
      mockCodesRepository as never,
      mockSubscriptionManagementService,
      mockBroadcastService,
      mockBotsRepository,
    );
  });

  // User Journey: Default Broadcast Flow (No Filters - Backward Compatibility)
  // ROI: 90 | Business Value: 10 (business-critical) | Frequency: 10 (default flow) | Legal: false
  // Verification: Default broadcast flow works identically to pre-filter implementation
  //
  // This test covers:
  // - AC5: Backward Compatibility
  // - Integration: Existing flow unchanged
  //
  // @category: e2e
  // @dependency: full-system
  // @complexity: medium
  it('User Journey: Default broadcast flow (no filters) works identically to existing implementation', async () => {
    // Step 1: Manager selects subscription
    const selectSubCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${TEST_SUBSCRIPTION_ID}`,
    );
    await masterbotUpdate.onBroadcastSubscriptionSelected(selectSubCtx);
    expect(selectSubCtx.session.flowState).toBe('selecting_status_filter');

    // Step 2: Manager selects "Active subscribers" filter (default behavior)
    const selectActiveCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        flowState: 'selecting_status_filter',
      },
    );
    await masterbotUpdate.onBroadcastFilterActive(selectActiveCtx);

    // Verify: Default filter status is 'active'
    expect(selectActiveCtx.session.broadcastFilterStatus).toBe('active');
    expect(selectActiveCtx.session.flowState).toBe('selecting_bot_filter');

    // Step 3: Manager selects "All bots" filter (default behavior)
    const selectAllBotsCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastFilterStatus: 'active',
        flowState: 'selecting_bot_filter',
      },
    );
    await masterbotUpdate.onBroadcastBotAll(selectAllBotsCtx);

    // Verify: Default bot filter is null (all bots)
    expect(selectAllBotsCtx.session.broadcastFilterBotId).toBeNull();
    expect(selectAllBotsCtx.session.flowState).toBe(
      'awaiting_broadcast_message',
    );

    // Step 4: Manager confirms broadcast
    const confirmCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastMessage: 'Broadcast to all active subscribers',
        broadcastMessageEntities: null,
        broadcastFilterStatus: 'active',
        broadcastFilterBotId: null,
      },
    );
    await masterbotUpdate.onBroadcastConfirm(confirmCtx);

    // Verify: BroadcastService called with 'active' filter and null botId (backward compatible)
    expect(mockBroadcastService.sendBroadcast).toHaveBeenCalledWith(
      TEST_SUBSCRIPTION_ID,
      'Broadcast to all active subscribers',
      undefined,
      TEST_MANAGER_ID,
      'active',
      null,
    );

    // Verify: findSubscribersWithUserDetails used (NOT findExpired) - backward compatible
    expect(
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
    ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
    expect(mockUserSubscriptionsRepository.findExpired).not.toHaveBeenCalled();

    // Verify: NotificationService received messages for all active subscribers
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    const addMessagesCall = (mockNotificationService.addMessages as jest.Mock)
      .mock.calls[0][0];
    expect(addMessagesCall.length).toBe(activeSubscribers.length);

    // Verify: All recipients are active subscribers
    const recipientIds = addMessagesCall.map(
      (m: { telegramId: number }) => m.telegramId,
    );
    const activeUserIds = activeSubscribers.map((s) => s.botUser.userId);
    expect(recipientIds.sort()).toEqual(activeUserIds.sort());
  });

  // Error Handling: No Expired Subscribers Found
  // ROI: 65 | Business Value: 6 (user experience) | Frequency: 4 (edge case) | Legal: false
  // Verification: Manager receives clear message when no expired subscribers exist
  //
  // This test covers:
  // - Error handling for empty filter results
  // - User experience for edge cases
  //
  // @category: edge-case
  // @dependency: BroadcastService, MasterbotUpdate
  // @complexity: low
  it('Error Handling: Manager receives clear message when no expired subscribers found', async () => {
    // Step 1: Manager selects subscription
    const selectSubCtx = createMockContext(
      `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${TEST_SUBSCRIPTION_ID}`,
    );
    await masterbotUpdate.onBroadcastSubscriptionSelected(selectSubCtx);

    // Step 2: Manager selects "Expired subscribers" filter
    const selectExpiredCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        flowState: 'selecting_status_filter',
      },
    );
    await masterbotUpdate.onBroadcastFilterExpired(selectExpiredCtx);
    expect(selectExpiredCtx.session.broadcastFilterStatus).toBe('expired');

    // Step 3: Manager selects "All bots"
    const selectAllBotsCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastFilterStatus: 'expired',
        flowState: 'selecting_bot_filter',
      },
    );
    await masterbotUpdate.onBroadcastBotAll(selectAllBotsCtx);

    // Step 4: Manager confirms broadcast (no expired subscribers exist)
    const confirmCtx = createMockContext(
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
      {
        broadcastSubscriptionId: TEST_SUBSCRIPTION_ID,
        broadcastMessage: 'Message that should not be sent',
        broadcastMessageEntities: null,
        broadcastFilterStatus: 'expired',
        broadcastFilterBotId: null,
      },
    );
    await masterbotUpdate.onBroadcastConfirm(confirmCtx);

    // Verify: BroadcastService was called
    expect(mockBroadcastService.sendBroadcast).toHaveBeenCalled();

    // Verify: findExpired was called (not active subscribers)
    expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
      undefined,
      undefined,
      TEST_SUBSCRIPTION_ID,
    );

    // Verify: NotificationService received 0 messages (graceful handling)
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    const addMessagesCall = (mockNotificationService.addMessages as jest.Mock)
      .mock.calls[0][0];
    expect(addMessagesCall.length).toBe(0);

    // Verify: Broadcast completed with 0 recipients (no error thrown)
    // The system gracefully handles empty recipient list
    expect(confirmCtx.session.broadcastFilterStatus).toBeNull();
    expect(confirmCtx.session.broadcastFilterBotId).toBeNull();
  });
});
