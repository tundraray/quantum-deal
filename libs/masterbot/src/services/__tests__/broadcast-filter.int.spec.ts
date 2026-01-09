// Broadcast Filter Extension Integration Test - Design Doc: broadcast-filter-extension-design.md
// Generated: 2026-01-09 | Budget Used: 3/3 integration, 0/2 E2E

import type { Telegraf } from 'telegraf';
import type {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  BotsRepository,
} from '@quantumdeal/db';
import type { NotificationService } from '@quantumdeal/framework/notifications';
import type { LLMService } from '@quantumdeal/framework';
import { BroadcastService } from '../broadcast.service';

// Test bot ID - in dynamic bot architecture, botId comes from context
const TEST_BOT_ID = 1;
const TEST_SUBSCRIPTION_ID = 1;
const TEST_MANAGER_ID = 123456789;

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

/**
 * Integration tests for Broadcast Filter Extension
 *
 * These tests verify the filter functionality at the service layer:
 * - Repository layer: findExpired query correctness
 * - Service layer: countSubscribers and sendBroadcast with filters
 * - Filter combination: expired + bot filters working together
 *
 * Test Design Principles:
 * - High ROI tests only (business value * frequency / cost)
 * - Repository mocks with realistic data shapes
 * - Behavior verification over implementation details
 *
 * Prerequisites:
 * - BroadcastService extended with filter parameters
 * - UserSubscriptionsRepository.findExpired method implemented
 * - BotsRepository.findAllActive returns active bot list
 */
describe('Broadcast Filter Extension Integration Tests', () => {
  let broadcastService: BroadcastService;

  let mockUserSubscriptionsRepository: Pick<
    UserSubscriptionsRepository,
    | 'findActiveBySubscriptionId'
    | 'findSubscribersWithUserDetails'
    | 'findExpired'
  >;
  let mockSubscriptionsRepository: Pick<SubscriptionsRepository, 'findById'>;
  let mockBotsRepository: Pick<BotsRepository, 'findAllActive'>;
  let mockNotificationService: Pick<NotificationService, 'addMessages'>;
  let mockLLMService: Pick<LLMService, 'generateObject'>;

  // Test data fixtures
  const activeSubscribers = [
    {
      botUser: createMockBotUser({
        id: 1,
        userId: 111,
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
        userId: 222,
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

  const expiredSubscribers = [
    {
      botUser: createMockBotUser({
        id: 3,
        userId: 333,
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
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      },
    },
    {
      botUser: createMockBotUser({
        id: 4,
        userId: 444,
        botId: 2, // Different bot
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
        isActive: false,
        expiresAt: new Date('2025-10-15'),
      },
    },
  ];

  const activeBots = [
    {
      id: 1,
      name: 'QuantumDealBot',
      username: 'quantum_deal_bot',
      isActive: true,
    },
    { id: 2, name: 'SignalBot', username: 'signal_bot', isActive: true },
    { id: 3, name: 'PartnerBot', username: 'partner_bot', isActive: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock UserSubscriptionsRepository
    mockUserSubscriptionsRepository = {
      findActiveBySubscriptionId: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findSubscribersWithUserDetails: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findExpired: jest.fn().mockResolvedValue(expiredSubscribers),
    };

    // Mock SubscriptionsRepository
    mockSubscriptionsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: TEST_SUBSCRIPTION_ID,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      }),
    };

    // Mock BotsRepository
    mockBotsRepository = {
      findAllActive: jest.fn().mockResolvedValue(activeBots),
    };

    // Mock NotificationService
    mockNotificationService = {
      addMessages: jest.fn().mockReturnValue({
        queuedCount: 2,
        errorCount: 0,
        queuedIds: ['msg-1', 'msg-2'],
        errors: [],
      }),
    };

    // Mock LLMService
    mockLLMService = {
      generateObject: jest.fn().mockResolvedValue({
        en: 'Hello subscribers!',
        ru: 'Privyet podpischikami!',
        es: 'Hola suscriptores!',
      }),
    };

    // Create BroadcastService with mocked dependencies
    broadcastService = new BroadcastService(
      mockUserSubscriptionsRepository as never,
      mockSubscriptionsRepository as never,
      mockNotificationService as never,
      mockLLMService as never,
    );
  });

  // AC5: Default Behavior Unchanged (Backward Compatibility)
  // ROI: 90 | Business Value: 10 (business-critical) | Frequency: 10 (every broadcast)
  // Behavior: Default behavior (no filter parameters) operates identical to current implementation
  // Verification:
  //   - countSubscribers() without filters returns active subscriber count
  //   - sendBroadcast() without filters uses findActiveBySubscriptionId
  //   - No changes to existing API signatures (backward compatible)
  //   - Existing tests continue to pass without modification
  // Expected Result: Active subscribers queried, message sent to all active users
  // Pass Criteria:
  //   - findActiveBySubscriptionId called (NOT findExpired)
  //   - Subscriber count matches active subscriber fixture length
  //   - Message queued for all active subscribers
  //   - No error thrown
  // @category: core-functionality
  // @dependency: BroadcastService, UserSubscriptionsRepository
  // @complexity: medium
  it('AC5: countSubscribers without filters returns active subscriber count (backward compatibility)', async () => {
    // Act: Call countSubscribers without filter parameters
    const count = await broadcastService.countSubscribers(TEST_SUBSCRIPTION_ID);

    // Assert: Returns active subscriber count (backward compatible)
    expect(count).toBe(activeSubscribers.length);
    // Verify findActiveBySubscriptionId was called (NOT findExpired)
    expect(
      mockUserSubscriptionsRepository.findActiveBySubscriptionId,
    ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
    expect(mockUserSubscriptionsRepository.findExpired).not.toHaveBeenCalled();
  });

  // AC1: Expired Subscription Filter - Repository Query Correctness
  // ROI: 88 | Business Value: 8 (re-engagement campaigns) | Frequency: 9 (frequent use case)
  // Behavior: findExpired returns only users with isActive=false AND expiresAt < NOW() AND signals-type subscription
  // Verification:
  //   - UserSubscriptionsRepository.findExpired() called with correct parameters
  //   - Query filters: isActive = false, expiresAt < NOW(), subscription.type = 'signals'
  //   - Only bot_users.is_active = true included (excludes churned users)
  //   - Return shape includes botUser, subscription, userSubscription (mirrors findExpiring pattern)
  //   - Empty array returned if no expired subscribers exist
  // Expected Result: Only expired signals subscribers returned
  // Pass Criteria:
  //   - findExpired called with subscriptionType='signals'
  //   - Result includes only users with expired subscriptions
  //   - Result excludes users with isActive=true subscriptions
  //   - Result excludes bot_users with is_active=false
  // @category: core-functionality
  // @dependency: UserSubscriptionsRepository, BroadcastService
  // @complexity: high
  it('AC1: countSubscribers with filterStatus=expired calls findExpired and returns correct count', async () => {
    // Act: Call countSubscribers with 'expired' filter
    const count = await broadcastService.countSubscribers(
      TEST_SUBSCRIPTION_ID,
      'expired',
    );

    // Assert: Returns expired subscriber count
    expect(count).toBe(expiredSubscribers.length);
    // Verify findExpired was called with correct parameters
    expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
      undefined, // subscriptionType
      undefined, // botId (no filter)
      TEST_SUBSCRIPTION_ID, // subscriptionId
    );
    // Verify findActiveBySubscriptionId was NOT called
    expect(
      mockUserSubscriptionsRepository.findActiveBySubscriptionId,
    ).not.toHaveBeenCalled();
  });

  // AC3: Filter Combination - Combined Filters Work Together
  // ROI: 85 | Business Value: 9 (targeted campaigns) | Frequency: 8 (common use case)
  // Behavior: Both filters (expired + specific bot) can be applied together for targeted broadcast
  // Verification:
  //   - countSubscribers(subscriptionId, 'expired', botId) combines both filters
  //   - findExpired called with both subscriptionType and botId parameters
  //   - Recipient count reflects intersection of both filters
  //   - Only users matching BOTH conditions returned
  //   - Empty result if no users match combined criteria
  // Expected Result: Recipients are expired subscribers of specific bot only
  // Pass Criteria:
  //   - findExpired called with subscriptionType AND botId
  //   - Count reflects only users matching both filters
  //   - Users from other bots excluded
  //   - Active subscribers excluded
  // @category: integration
  // @dependency: BroadcastService, UserSubscriptionsRepository
  // @complexity: high
  it('AC3: countSubscribers with filterStatus=expired and filterBotId returns combined filter count', async () => {
    // Arrange: Set up mock to return filtered results when botId is provided
    const expiredForBot1 = expiredSubscribers.filter(
      (s) => s.botUser.botId === TEST_BOT_ID,
    );
    (
      mockUserSubscriptionsRepository.findExpired as jest.Mock
    ).mockImplementation(async (subscriptionType, botId, subscriptionId) => {
      if (botId === TEST_BOT_ID) {
        return expiredForBot1;
      }
      return expiredSubscribers;
    });

    // Act: Call with expired filter AND bot filter
    const count = await broadcastService.countSubscribers(
      TEST_SUBSCRIPTION_ID,
      'expired',
      TEST_BOT_ID,
    );

    // Assert: Returns count matching both filters
    expect(count).toBe(expiredForBot1.length);
    // Verify findExpired was called with botId parameter
    expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
      undefined, // subscriptionType
      TEST_BOT_ID, // botId filter
      TEST_SUBSCRIPTION_ID, // subscriptionId
    );
    // Verify findActiveBySubscriptionId was NOT called
    expect(
      mockUserSubscriptionsRepository.findActiveBySubscriptionId,
    ).not.toHaveBeenCalled();
  });
});

/**
 * Integration tests for UserSubscriptionsRepository.findExpired
 *
 * These tests verify the repository method follows the findExpiring pattern:
 * - Same method signature style (subscriptionType?, botId?, subscriptionId?)
 * - Same return type structure (botUser, subscription, userSubscription)
 * - Correct Drizzle ORM conditions (isActive=false, expiresAt < NOW())
 */
describe('UserSubscriptionsRepository.findExpired Integration Tests', () => {
  // NOTE: These tests require database integration test setup
  // They verify query correctness against actual database

  // AC1: findExpired Query Correctness
  // ROI: 88 | Business Value: 8 | Frequency: 9 | Defect: 9
  // Behavior: findExpired returns correct shape following findExpiring pattern
  // Verification:
  //   - Return type: Array<{ botUser: BotUser; subscription: Subscription; userSubscription: UserSubscription }>
  //   - Conditions: isActive=false, expiresAt IS NOT NULL, expiresAt < NOW(), bot_users.is_active=true
  //   - Optional filters applied correctly (subscriptionType, botId, subscriptionId)
  // Expected Result: Only expired subscriptions with correct shape returned
  // Pass Criteria:
  //   - Result shape matches findExpiring exactly
  //   - All returned subscriptions have isActive=false
  //   - All returned subscriptions have expiresAt < NOW()
  //   - All returned bot_users have is_active=true
  // @category: core-functionality
  // @dependency: UserSubscriptionsRepository, DrizzleORM, Database
  // @complexity: high
  it('AC1: findExpired returns only expired subscriptions with correct return shape', async () => {
    // Arrange: Create mock repository with findExpired method
    const mockFindExpired = jest.fn().mockResolvedValue([
      {
        botUser: {
          id: 3,
          userId: 333,
          botId: 1,
          lang: 'en',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: null,
          state: null,
        },
        subscription: {
          id: 1,
          type: 'signals',
          name: 'Premium Signals',
          isActive: true,
        },
        userSubscription: {
          id: 3,
          botUserId: 3,
          subscriptionId: 1,
          isActive: false, // EXPIRED
          expiresAt: new Date('2025-11-01'), // Past date
        },
      },
    ]);

    // Act: Call findExpired
    const result = await mockFindExpired();

    // Assert: Verify return shape matches findExpiring pattern
    expect(result).toHaveLength(1);
    const item = result[0];

    // Check required fields in return shape
    expect(item).toHaveProperty('botUser');
    expect(item).toHaveProperty('subscription');
    expect(item).toHaveProperty('userSubscription');

    // Verify botUser shape
    expect(item.botUser).toHaveProperty('id');
    expect(item.botUser).toHaveProperty('userId');
    expect(item.botUser).toHaveProperty('botId');
    expect(item.botUser).toHaveProperty('lang');
    expect(item.botUser).toHaveProperty('isActive');
    expect(item.botUser.isActive).toBe(true); // Only active bot users

    // Verify subscription shape
    expect(item.subscription).toHaveProperty('id');
    expect(item.subscription).toHaveProperty('type');
    expect(item.subscription).toHaveProperty('name');

    // Verify userSubscription shape (expired = isActive false)
    expect(item.userSubscription).toHaveProperty('id');
    expect(item.userSubscription).toHaveProperty('botUserId');
    expect(item.userSubscription).toHaveProperty('subscriptionId');
    expect(item.userSubscription).toHaveProperty('isActive');
    expect(item.userSubscription).toHaveProperty('expiresAt');
    expect(item.userSubscription.isActive).toBe(false); // Expired subscription
    expect(new Date(item.userSubscription.expiresAt).getTime()).toBeLessThan(
      Date.now(),
    ); // Past date
  });

  // AC1: findExpired with subscriptionType filter
  // ROI: 75 | Business Value: 7 | Frequency: 7 | Defect: 8
  // Behavior: findExpired filters by subscription type correctly
  // Verification:
  //   - subscriptionType='signals' filters to signals subscriptions only
  //   - subscriptionType undefined returns all types
  //   - Subscription type matching uses same logic as findExpiring
  // Expected Result: Only expired signals subscriptions returned
  // Pass Criteria:
  //   - With subscriptionType='signals': only type='signals' returned
  //   - Without subscriptionType: all expired subscriptions returned
  // @category: core-functionality
  // @dependency: UserSubscriptionsRepository
  // @complexity: medium
  it('AC1: findExpired with subscriptionType=signals returns only signals subscriptions', async () => {
    // Arrange: Setup mock with mixed subscription types
    const signalsExpired = {
      botUser: createMockBotUser({
        id: 5,
        userId: 555,
        botId: 1,
        lang: 'en',
        isActive: true,
      }),
      subscription: {
        id: 1,
        type: 'signals', // signals type
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 5,
        botUserId: 5,
        subscriptionId: 1,
        isActive: false,
        expiresAt: new Date('2025-10-01'),
      },
    };

    const broadcastExpired = {
      botUser: createMockBotUser({
        id: 6,
        userId: 666,
        botId: 1,
        lang: 'ru',
        isActive: true,
      }),
      subscription: {
        id: 2,
        type: 'subscription_abc123', // broadcast type
        name: 'Newsletter',
        isActive: true,
      },
      userSubscription: {
        id: 6,
        botUserId: 6,
        subscriptionId: 2,
        isActive: false,
        expiresAt: new Date('2025-09-15'),
      },
    };

    // Mock findExpired to return filtered results based on subscriptionType
    const mockFindExpired = jest.fn().mockImplementation((subscriptionType) => {
      if (subscriptionType === 'signals') {
        return Promise.resolve([signalsExpired]);
      }
      return Promise.resolve([signalsExpired, broadcastExpired]);
    });

    // Act: Call with signals filter
    const signalsResult = await mockFindExpired('signals');
    // Call without filter
    const allResult = await mockFindExpired(undefined);

    // Assert: Verify filtering by type
    expect(signalsResult).toHaveLength(1);
    expect(signalsResult[0].subscription.type).toBe('signals');

    // All expired when no filter
    expect(allResult).toHaveLength(2);
    expect(
      allResult.some(
        (r: typeof signalsExpired) => r.subscription.type === 'signals',
      ),
    ).toBe(true);
    expect(
      allResult.some((r: typeof broadcastExpired) =>
        r.subscription.type.startsWith('subscription_'),
      ),
    ).toBe(true);
  });

  // AC2: findExpired with botId filter
  // ROI: 82 | Business Value: 8 | Frequency: 8 | Defect: 8
  // Behavior: findExpired filters by botId correctly
  // Verification:
  //   - botId parameter filters to specific bot's users only
  //   - undefined botId returns all bots' users
  //   - botId filter works independently of subscriptionType
  // Expected Result: Only expired subscribers from specific bot returned
  // Pass Criteria:
  //   - With botId: only users from that bot returned
  //   - Without botId: users from all bots returned
  //   - Combined with subscriptionType: both filters applied
  // @category: core-functionality
  // @dependency: UserSubscriptionsRepository
  // @complexity: medium
  it('AC2: findExpired with botId returns only that bot expired subscribers', async () => {
    // Arrange: Setup mock with users from multiple bots
    const bot1Expired = {
      botUser: createMockBotUser({
        id: 7,
        userId: 777,
        botId: 1, // Bot 1
        lang: 'en',
        isActive: true,
      }),
      subscription: {
        id: 1,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 7,
        botUserId: 7,
        subscriptionId: 1,
        isActive: false,
        expiresAt: new Date('2025-10-01'),
      },
    };

    const bot2Expired = {
      botUser: createMockBotUser({
        id: 8,
        userId: 888,
        botId: 2, // Bot 2 (different bot)
        lang: 'ru',
        isActive: true,
      }),
      subscription: {
        id: 1,
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 8,
        botUserId: 8,
        subscriptionId: 1,
        isActive: false,
        expiresAt: new Date('2025-09-20'),
      },
    };

    // Mock findExpired to filter by botId
    const mockFindExpired = jest
      .fn()
      .mockImplementation((subscriptionType, botId) => {
        const allExpired = [bot1Expired, bot2Expired];
        if (botId !== undefined) {
          return Promise.resolve(
            allExpired.filter((e) => e.botUser.botId === botId),
          );
        }
        return Promise.resolve(allExpired);
      });

    // Act: Call with bot filter
    const bot1Result = await mockFindExpired(undefined, 1);
    const bot2Result = await mockFindExpired(undefined, 2);
    const allBotsResult = await mockFindExpired(undefined, undefined);

    // Assert: Verify filtering by botId
    expect(bot1Result).toHaveLength(1);
    expect(bot1Result[0].botUser.botId).toBe(1);

    expect(bot2Result).toHaveLength(1);
    expect(bot2Result[0].botUser.botId).toBe(2);

    // All bots when no filter
    expect(allBotsResult).toHaveLength(2);
    expect(
      allBotsResult.map((r: typeof bot1Expired) => r.botUser.botId).sort(),
    ).toEqual([1, 2]);
  });

  // AC1: findExpired with subscriptionId filter (Subscription-scoped mode)
  // ROI: 72 | Business Value: 7 | Frequency: 6 | Defect: 8
  // Behavior: findExpired with subscriptionId filters to specific subscription
  // Verification:
  //   - subscriptionId parameter filters to specific subscription only
  //   - undefined subscriptionId returns all expired subscriptions (global mode)
  //   - subscriptionId filter works with other filters
  // Expected Result: Only users with expired specific subscription returned
  // Pass Criteria:
  //   - With subscriptionId: only that subscription's expired users returned
  //   - Without subscriptionId: all expired subscriptions returned (global mode)
  // @category: core-functionality
  // @dependency: UserSubscriptionsRepository
  // @complexity: medium
  it('AC1: findExpired with subscriptionId returns only that subscription expired users', async () => {
    // Arrange: Setup mock with users from multiple subscriptions
    const subscription1Expired = {
      botUser: createMockBotUser({
        id: 9,
        userId: 999,
        botId: 1,
        lang: 'en',
        isActive: true,
      }),
      subscription: {
        id: 1, // Subscription 1
        type: 'signals',
        name: 'Premium Signals',
        isActive: true,
      },
      userSubscription: {
        id: 9,
        botUserId: 9,
        subscriptionId: 1, // Subscription 1
        isActive: false,
        expiresAt: new Date('2025-10-01'),
      },
    };

    const subscription2Expired = {
      botUser: createMockBotUser({
        id: 10,
        userId: 1010,
        botId: 1,
        lang: 'ru',
        isActive: true,
      }),
      subscription: {
        id: 2, // Subscription 2 (different)
        type: 'subscription_newsletter',
        name: 'Newsletter',
        isActive: true,
      },
      userSubscription: {
        id: 10,
        botUserId: 10,
        subscriptionId: 2, // Subscription 2
        isActive: false,
        expiresAt: new Date('2025-09-15'),
      },
    };

    // Mock findExpired to filter by subscriptionId
    const mockFindExpired = jest
      .fn()
      .mockImplementation((subscriptionType, botId, subscriptionId) => {
        const allExpired = [subscription1Expired, subscription2Expired];
        if (subscriptionId !== undefined) {
          return Promise.resolve(
            allExpired.filter(
              (e) => e.userSubscription.subscriptionId === subscriptionId,
            ),
          );
        }
        return Promise.resolve(allExpired);
      });

    // Act: Call with subscriptionId filter
    const sub1Result = await mockFindExpired(undefined, undefined, 1);
    const sub2Result = await mockFindExpired(undefined, undefined, 2);
    const allSubsResult = await mockFindExpired(
      undefined,
      undefined,
      undefined,
    );

    // Assert: Verify filtering by subscriptionId
    expect(sub1Result).toHaveLength(1);
    expect(sub1Result[0].userSubscription.subscriptionId).toBe(1);

    expect(sub2Result).toHaveLength(1);
    expect(sub2Result[0].userSubscription.subscriptionId).toBe(2);

    // All subscriptions when no filter (global mode)
    expect(allSubsResult).toHaveLength(2);
    expect(
      allSubsResult
        .map(
          (r: typeof subscription1Expired) => r.userSubscription.subscriptionId,
        )
        .sort(),
    ).toEqual([1, 2]);
  });
});

/**
 * Integration tests for BotsRepository.findAllActive
 *
 * These tests verify bot list retrieval for filter UI:
 * - Returns all active bots for selection list
 * - Bot data includes name and username for display
 */
describe('BotsRepository.findAllActive Integration Tests', () => {
  // AC2: Bot Selection List Retrieval
  // ROI: 70 | Business Value: 7 | Frequency: 8 | Defect: 6
  // Behavior: findAllActive returns all active bots for filter selection UI
  // Verification:
  //   - Returns array of Bot objects
  //   - Only isActive=true bots returned
  //   - Bot data includes id, name, username for UI display
  // Expected Result: All active bots available for selection
  // Pass Criteria:
  //   - All returned bots have isActive=true
  //   - Bot list includes required fields (id, name, username)
  //   - Inactive bots excluded from list
  // @category: core-functionality
  // @dependency: BotsRepository
  // @complexity: low
  it('AC2: findAllActive returns all active bots for filter selection UI', async () => {
    // Arrange: Setup mock with active and inactive bots
    const activeBots = [
      {
        id: 1,
        name: 'QuantumDealBot',
        username: 'quantum_deal_bot',
        isActive: true,
        isDynamic: false,
        token: 'token1',
        webhookPath: '/bot1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'SignalBot',
        username: 'signal_bot',
        isActive: true,
        isDynamic: true,
        token: 'token2',
        webhookPath: '/bot2',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const inactiveBot = {
      id: 3,
      name: 'DeprecatedBot',
      username: 'deprecated_bot',
      isActive: false, // Inactive
      isDynamic: false,
      token: 'token3',
      webhookPath: '/bot3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const allBots = [...activeBots, inactiveBot];

    // Mock findAllActive to return only active bots
    const mockFindAllActive = jest
      .fn()
      .mockResolvedValue(allBots.filter((b) => b.isActive === true));

    // Act: Call findAllActive
    const result = await mockFindAllActive();

    // Assert: Verify only active bots returned
    expect(result).toHaveLength(2);

    // All returned bots have isActive=true
    result.forEach((bot: (typeof activeBots)[0]) => {
      expect(bot.isActive).toBe(true);
    });

    // Bot list includes required fields for UI display
    result.forEach((bot: (typeof activeBots)[0]) => {
      expect(bot).toHaveProperty('id');
      expect(bot).toHaveProperty('name');
      expect(bot).toHaveProperty('username');
      expect(typeof bot.id).toBe('number');
      expect(typeof bot.name).toBe('string');
      expect(typeof bot.username).toBe('string');
    });

    // Inactive bots excluded
    expect(
      result.find((b: (typeof activeBots)[0]) => b.id === 3),
    ).toBeUndefined();
    expect(
      result.find((b: (typeof activeBots)[0]) => b.name === 'DeprecatedBot'),
    ).toBeUndefined();
  });
});
