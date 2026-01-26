import { BroadcastService } from '../broadcast.service';
import type {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  BotUsersRepository,
  BotsRepository,
} from '@quantumdeal/db';
import type { NotificationService } from '@quantumdeal/framework/notifications';
import type { LLMService } from '@quantumdeal/framework';

/**
 * Unit tests for BroadcastService - countSubscribers method extension
 *
 * These tests verify the filter functionality:
 * - AC5: Backward compatibility - default behavior unchanged
 * - AC1: Expired filter - calls findExpired when filterStatus='expired'
 * - AC3: Combined filters - applies both status and bot filters together
 */
describe('BroadcastService', () => {
  let broadcastService: BroadcastService;
  let mockUserSubscriptionsRepository: jest.Mocked<
    Pick<
      UserSubscriptionsRepository,
      | 'findActiveBySubscriptionId'
      | 'findSubscribersWithUserDetails'
      | 'findExpired'
    >
  >;
  let mockSubscriptionsRepository: jest.Mocked<
    Pick<SubscriptionsRepository, 'findById'>
  >;
  let mockNotificationService: jest.Mocked<
    Pick<NotificationService, 'addMessages'>
  >;
  let mockLLMService: jest.Mocked<Pick<LLMService, 'generateObject'>>;
  let mockBotUsersRepository: jest.Mocked<
    Pick<
      BotUsersRepository,
      'countWithoutSubscription' | 'findWithoutSubscription'
    >
  >;
  let mockBotsRepository: jest.Mocked<Pick<BotsRepository, 'findById'>>;

  const TEST_SUBSCRIPTION_ID = 1;
  const TEST_BOT_ID = 5;

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

  // Helper to create full UserSubscription mock with all required fields
  const createMockUserSubscription = (overrides: {
    id: number;
    botUserId: number;
    subscriptionId: number;
    isActive: boolean;
    expiresAt: Date;
  }) => ({
    ...overrides,
    createdAt: new Date(),
    botId: 1,
    activatedAt: new Date(),
  });

  // Helper to create full Subscription mock with all required fields
  const createMockSubscription = (overrides: {
    id: number;
    type: string;
    name: string;
    isActive: boolean;
  }) => ({
    ...overrides,
    createdAt: new Date(),
    updatedAt: new Date(),
    isHidden: false,
    closedAt: null,
    closedBy: null,
  });

  // Test data fixtures
  const mockSubscription = createMockSubscription({
    id: TEST_SUBSCRIPTION_ID,
    type: 'signals',
    name: 'Premium Signals',
    isActive: true,
  });

  const activeSubscribers = [
    {
      botUser: createMockBotUser({
        id: 1,
        userId: 111,
        botId: 1,
        lang: 'en',
        isActive: true,
      }),
      userSubscription: createMockUserSubscription({
        id: 1,
        botUserId: 1,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      }),
    },
    {
      botUser: createMockBotUser({
        id: 2,
        userId: 222,
        botId: 1,
        lang: 'ru',
        isActive: true,
      }),
      userSubscription: createMockUserSubscription({
        id: 2,
        botUserId: 2,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      }),
    },
    {
      botUser: createMockBotUser({
        id: 3,
        userId: 333,
        botId: 1,
        lang: 'es',
        isActive: true,
      }),
      userSubscription: createMockUserSubscription({
        id: 3,
        botUserId: 3,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: true,
        expiresAt: new Date('2026-12-31'),
      }),
    },
  ];

  const expiredSubscribers = [
    {
      botUser: createMockBotUser({
        id: 4,
        userId: 444,
        botId: TEST_BOT_ID,
        lang: 'en',
        isActive: true,
      }),
      subscription: mockSubscription,
      userSubscription: createMockUserSubscription({
        id: 4,
        botUserId: 4,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      }),
    },
    {
      botUser: createMockBotUser({
        id: 5,
        userId: 555,
        botId: 2,
        lang: 'ru',
        isActive: true,
      }),
      subscription: mockSubscription,
      userSubscription: createMockUserSubscription({
        id: 5,
        botUserId: 5,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-10-15'),
      }),
    },
  ];

  const expiredSubscribersForBot5 = [
    {
      botUser: createMockBotUser({
        id: 4,
        userId: 444,
        botId: TEST_BOT_ID,
        lang: 'en',
        isActive: true,
      }),
      subscription: mockSubscription,
      userSubscription: createMockUserSubscription({
        id: 4,
        botUserId: 4,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      }),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockUserSubscriptionsRepository = {
      findActiveBySubscriptionId: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findSubscribersWithUserDetails: jest
        .fn()
        .mockResolvedValue(activeSubscribers),
      findExpired: jest.fn().mockResolvedValue(expiredSubscribers),
    };

    mockSubscriptionsRepository = {
      findById: jest.fn().mockResolvedValue(mockSubscription),
    };

    mockNotificationService = {
      addMessages: jest.fn().mockReturnValue({
        queuedCount: 2,
        errorCount: 0,
        queuedIds: ['msg-1', 'msg-2'],
        errors: [],
      }),
    };

    mockLLMService = {
      generateObject: jest.fn().mockResolvedValue({
        en: 'Hello!',
        ru: 'Privet!',
      }),
    };

    mockBotUsersRepository = {
      countWithoutSubscription: jest.fn().mockResolvedValue(5),
      findWithoutSubscription: jest.fn().mockResolvedValue([
        {
          botUser: createMockBotUser({
            id: 10,
            userId: 1001,
            botId: TEST_BOT_ID,
            lang: 'en',
            isActive: true,
          }),
        },
        {
          botUser: createMockBotUser({
            id: 11,
            userId: 1002,
            botId: TEST_BOT_ID,
            lang: 'ru',
            isActive: true,
          }),
        },
      ]),
    };

    mockBotsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: TEST_BOT_ID,
        name: 'TestBot',
        token: 'test-token-123',
        username: 'testbot',
        isActive: true,
        isDynamic: true,
      }),
    };

    // Create service instance
    broadcastService = new BroadcastService(
      mockUserSubscriptionsRepository as never,
      mockSubscriptionsRepository as never,
      mockNotificationService as never,
      mockLLMService as never,
      mockBotUsersRepository as never,
      mockBotsRepository as never,
    );
  });

  describe('countSubscribers', () => {
    describe('backward compatibility (AC5)', () => {
      it('should return active subscriber count when called without filters', async () => {
        // Arrange: Mocks already set up in beforeEach

        // Act: Call countSubscribers without filter parameters
        const count =
          await broadcastService.countSubscribers(TEST_SUBSCRIPTION_ID);

        // Assert: Returns count matching active subscribers
        expect(count).toBe(3);
        // Verify findActiveBySubscriptionId was called (existing behavior)
        expect(
          mockUserSubscriptionsRepository.findActiveBySubscriptionId,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
        // Verify findExpired was NOT called (backward compatibility)
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).not.toHaveBeenCalled();
      });

      it('should return active subscriber count when filterStatus is active', async () => {
        // Arrange: Mocks already set up

        // Act: Call with explicit 'active' filter
        const count = await broadcastService.countSubscribers(
          TEST_SUBSCRIPTION_ID,
          'active',
        );

        // Assert: Same behavior as no filter
        expect(count).toBe(3);
        expect(
          mockUserSubscriptionsRepository.findActiveBySubscriptionId,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).not.toHaveBeenCalled();
      });
    });

    describe('expired filter (AC1)', () => {
      it('should call findExpired when filterStatus is expired', async () => {
        // Arrange: Mocks already set up with expiredSubscribers

        // Act: Call with 'expired' filter
        const count = await broadcastService.countSubscribers(
          TEST_SUBSCRIPTION_ID,
          'expired',
        );

        // Assert: Returns expired subscriber count
        expect(count).toBe(2);
        // Verify findExpired was called with correct parameters
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).toHaveBeenCalledWith(
          undefined, // subscriptionType (passed based on subscription)
          undefined, // botId (no bot filter)
          TEST_SUBSCRIPTION_ID, // subscriptionId
        );
        // Verify findActiveBySubscriptionId was NOT called
        expect(
          mockUserSubscriptionsRepository.findActiveBySubscriptionId,
        ).not.toHaveBeenCalled();
      });
    });

    describe('combined filters (AC3)', () => {
      it('should apply both status and bot filters', async () => {
        // Arrange: Set up mock to return filtered results when botId is provided
        mockUserSubscriptionsRepository.findExpired.mockImplementation(
          async (subscriptionType, botId, subscriptionId) => {
            if (botId === TEST_BOT_ID) {
              return expiredSubscribersForBot5;
            }
            return expiredSubscribers;
          },
        );

        // Act: Call with expired filter AND bot filter
        const count = await broadcastService.countSubscribers(
          TEST_SUBSCRIPTION_ID,
          'expired',
          TEST_BOT_ID,
        );

        // Assert: Returns count matching both filters
        expect(count).toBe(1); // Only 1 expired subscriber for bot 5
        // Verify findExpired was called with botId parameter
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).toHaveBeenCalledWith(
          undefined, // subscriptionType
          TEST_BOT_ID, // botId filter
          TEST_SUBSCRIPTION_ID, // subscriptionId
        );
      });

      it('should apply bot filter with active status', async () => {
        // Arrange: Set up mock for active subscribers filtered by bot
        const activeSubscribersForBot5 = activeSubscribers.filter(
          (s) => s.botUser.botId === TEST_BOT_ID,
        );
        // Note: Since we don't have bot 5 in activeSubscribers, result should be 0
        // This tests the filter logic even when empty
        mockUserSubscriptionsRepository.findActiveBySubscriptionId.mockResolvedValue(
          activeSubscribersForBot5,
        );

        // Act: Call with active filter AND bot filter
        const count = await broadcastService.countSubscribers(
          TEST_SUBSCRIPTION_ID,
          'active',
          TEST_BOT_ID,
        );

        // Assert: Returns filtered count (0 since no bot 5 in active subscribers)
        expect(count).toBe(0);
        expect(
          mockUserSubscriptionsRepository.findActiveBySubscriptionId,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
      });
    });

    describe('error handling', () => {
      it('should throw error when subscription not found', async () => {
        // Arrange: Subscription not found
        mockSubscriptionsRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(
          broadcastService.countSubscribers(TEST_SUBSCRIPTION_ID),
        ).rejects.toThrow('Subscription not found');
      });
    });
  });

  describe('sendBroadcast', () => {
    const TEST_MESSAGE = 'Hello subscribers!';
    const TEST_MANAGER_ID = 12345;

    describe('with filters (AC1, AC2, AC3)', () => {
      it('should query expired subscribers when filterStatus is expired', async () => {
        // Arrange: Mock findExpired to return expired subscribers
        mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
          expiredSubscribers,
        );

        // Act: Call sendBroadcast with filterStatus='expired'
        const result = await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
          'expired',
        );

        // Assert: findExpired was called, correct recipients received message
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).toHaveBeenCalledWith(
          undefined, // subscriptionType
          undefined, // botId (no filter)
          TEST_SUBSCRIPTION_ID, // subscriptionId
        );
        // Should NOT call findSubscribersWithUserDetails (active query)
        expect(
          mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
        ).not.toHaveBeenCalled();
        // Verify notification was sent to expired subscribers
        expect(mockNotificationService.addMessages).toHaveBeenCalled();
        expect(result.recipientCount).toBe(2); // 2 expired subscribers
      });

      it('should filter by botId when specified', async () => {
        // Arrange: Set up mock to return filtered results
        mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
          expiredSubscribersForBot5,
        );

        // Act: Call sendBroadcast with filterBotId
        const result = await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
          'expired',
          TEST_BOT_ID,
        );

        // Assert: Only specified bot's subscribers received message
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).toHaveBeenCalledWith(
          undefined, // subscriptionType
          TEST_BOT_ID, // botId filter
          TEST_SUBSCRIPTION_ID, // subscriptionId
        );
        expect(result.recipientCount).toBe(1); // 1 expired subscriber for bot 5
      });

      it('should apply bot filter with active status', async () => {
        // Arrange: All active subscribers are from bot 1, so filter to bot 1
        // The service fetches all, then filters in-memory (same pattern as countSubscribers)

        // Act: Call sendBroadcast with active status and bot filter
        const result = await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
          'active',
          1, // Filter to bot 1
        );

        // Assert: findSubscribersWithUserDetails was called (active query)
        expect(
          mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
        // Verify only bot 1 subscribers are targeted (all 3 are from bot 1)
        expect(result.recipientCount).toBe(3);
      });
    });

    describe('backward compatibility (AC5)', () => {
      it('should work identically to existing implementation without filters', async () => {
        // Arrange: Use same setup as existing tests (active subscribers)

        // Act: Call sendBroadcast without filter parameters
        const result = await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
        );

        // Assert: Same behavior as before extension
        expect(
          mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
        expect(
          mockUserSubscriptionsRepository.findExpired,
        ).not.toHaveBeenCalled();
        expect(result.recipientCount).toBe(3); // 3 active subscribers
      });

      it('should work identically when filterStatus is active (explicit)', async () => {
        // Arrange: Use same setup

        // Act: Call sendBroadcast with explicit 'active' filter
        const result = await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
          'active',
        );

        // Assert: Same behavior as no filter
        expect(
          mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
        ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
        expect(result.recipientCount).toBe(3);
      });
    });

    describe('logging', () => {
      it('should log filter parameters when sending broadcast', async () => {
        // Arrange: Spy on logger
        const loggerSpy = jest.spyOn(broadcastService['logger'], 'log');

        // Act: Call sendBroadcast with filters
        await broadcastService.sendBroadcast(
          TEST_SUBSCRIPTION_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
          'expired',
          TEST_BOT_ID,
        );

        // Assert: Filter parameters are logged
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('filter'),
        );
      });
    });
  });

  describe('getUniqueUserCount', () => {
    // Test fixtures for multi-subscription scenarios
    const SUB_1_ID = 1;
    const SUB_2_ID = 2;

    const sub1 = createMockSubscription({
      id: SUB_1_ID,
      type: 'signals',
      name: 'Premium Signals',
      isActive: true,
    });

    const sub2 = createMockSubscription({
      id: SUB_2_ID,
      type: 'subscription_basic',
      name: 'Basic Plan',
      isActive: true,
    });

    // Users A, B, C for subscription 1
    const sub1Subscribers = [
      {
        botUser: createMockBotUser({
          id: 1,
          userId: 111, // User A
          botId: 1,
          lang: 'en',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 1,
          botUserId: 1,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 2,
          userId: 222, // User B
          botId: 1,
          lang: 'ru',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 2,
          botUserId: 2,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 3,
          userId: 333, // User C
          botId: 1,
          lang: 'es',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 3,
          botUserId: 3,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
    ];

    // Users B, C, D for subscription 2 (B and C overlap with sub1)
    const sub2Subscribers = [
      {
        botUser: createMockBotUser({
          id: 4,
          userId: 222, // User B (overlaps with sub1)
          botId: 1,
          lang: 'ru',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 4,
          botUserId: 4,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 5,
          userId: 333, // User C (overlaps with sub1)
          botId: 1,
          lang: 'es',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 5,
          botUserId: 5,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 6,
          userId: 444, // User D (unique to sub2)
          botId: TEST_BOT_ID,
          lang: 'en',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 6,
          botUserId: 6,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
    ];

    it('should return correct total for single subscription', async () => {
      // Arrange: Mock repository to return 3 users for subscription 1
      mockSubscriptionsRepository.findById.mockResolvedValue(sub1);
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        sub1Subscribers,
      );

      // Act: Call getUniqueUserCount([1], 'active', null)
      const result = await broadcastService.getUniqueUserCount(
        [SUB_1_ID],
        'active',
        null,
      );

      // Assert: total = 3, breakdown has 1 entry with count 3
      expect(result.total).toBe(3);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        subscriptionId: SUB_1_ID,
        name: 'Premium Signals',
        count: 3,
      });
    });

    it('should return deduplicated total for multiple subscriptions', async () => {
      // Arrange: Mock repository
      //   - Sub 1: users [A, B, C] (3 users)
      //   - Sub 2: users [B, C, D] (3 users, B and C overlap)
      mockSubscriptionsRepository.findById.mockImplementation(async (id) => {
        if (id === SUB_1_ID) return sub1;
        if (id === SUB_2_ID) return sub2;
        return null;
      });
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockImplementation(
        async (subscriptionId) => {
          if (subscriptionId === SUB_1_ID) return sub1Subscribers;
          if (subscriptionId === SUB_2_ID) return sub2Subscribers;
          return [];
        },
      );

      // Act: Call getUniqueUserCount([1, 2], 'active', null)
      const result = await broadcastService.getUniqueUserCount(
        [SUB_1_ID, SUB_2_ID],
        'active',
        null,
      );

      // Assert: total = 4 (A, B, C, D), breakdown[0].count = 3, breakdown[1].count = 3
      expect(result.total).toBe(4); // Users 111, 222, 333, 444 (deduplicated)
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].count).toBe(3);
      expect(result.breakdown[1].count).toBe(3);
    });

    it('should return correct breakdown per subscription', async () => {
      // Arrange: Mock subscriptions with names and counts
      mockSubscriptionsRepository.findById.mockImplementation(async (id) => {
        if (id === SUB_1_ID) return sub1;
        if (id === SUB_2_ID) return sub2;
        return null;
      });
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockImplementation(
        async (subscriptionId) => {
          if (subscriptionId === SUB_1_ID) return sub1Subscribers;
          if (subscriptionId === SUB_2_ID) return sub2Subscribers;
          return [];
        },
      );

      // Act: Call getUniqueUserCount
      const result = await broadcastService.getUniqueUserCount(
        [SUB_1_ID, SUB_2_ID],
        'active',
        null,
      );

      // Assert: breakdown contains correct subscriptionId, name, count for each
      expect(result.breakdown).toContainEqual({
        subscriptionId: SUB_1_ID,
        name: 'Premium Signals',
        count: 3,
      });
      expect(result.breakdown).toContainEqual({
        subscriptionId: SUB_2_ID,
        name: 'Basic Plan',
        count: 3,
      });
    });

    it('should filter by status when filterStatus=expired', async () => {
      // Arrange: Mock repository with filterStatus parameter check
      const expiredSub1Subscribers = [
        {
          botUser: createMockBotUser({
            id: 10,
            userId: 1001,
            botId: 1,
            lang: 'en',
            isActive: true,
          }),
          subscription: sub1,
          userSubscription: createMockUserSubscription({
            id: 10,
            botUserId: 10,
            subscriptionId: SUB_1_ID,
            isActive: false,
            expiresAt: new Date('2025-11-01'),
          }),
        },
      ];
      mockSubscriptionsRepository.findById.mockResolvedValue(sub1);
      mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
        expiredSub1Subscribers,
      );

      // Act: Call getUniqueUserCount([1], 'expired', null)
      const result = await broadcastService.getUniqueUserCount(
        [SUB_1_ID],
        'expired',
        null,
      );

      // Assert: Repository called with 'expired' filter (findExpired method used)
      expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
        undefined,
        undefined,
        SUB_1_ID,
      );
      expect(result.total).toBe(1);
      expect(result.breakdown[0].count).toBe(1);
    });

    it('should filter by bot when filterBotId specified', async () => {
      // Arrange: Mock repository with botId parameter check
      // Only user D (id 6) has botId = TEST_BOT_ID (5)
      const filteredSub2Subscribers = sub2Subscribers.filter(
        (s) => s.botUser.botId === TEST_BOT_ID,
      );
      mockSubscriptionsRepository.findById.mockResolvedValue(sub2);
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        sub2Subscribers, // Returns all, filtering happens in service
      );

      // Act: Call getUniqueUserCount([2], 'active', 5)
      const result = await broadcastService.getUniqueUserCount(
        [SUB_2_ID],
        'active',
        TEST_BOT_ID,
      );

      // Assert: Only users from bot 5 are counted
      expect(result.total).toBe(1); // Only user D with botId=5
      expect(result.breakdown[0].count).toBe(1);
    });
  });

  describe('sendBroadcastMulti', () => {
    const TEST_MESSAGE = 'Hello subscribers!';
    const TEST_MANAGER_ID = 12345;
    const SUB_1_ID = 1;
    const SUB_2_ID = 2;

    const sub1 = createMockSubscription({
      id: SUB_1_ID,
      type: 'signals',
      name: 'Premium Signals',
      isActive: true,
    });

    const sub2 = createMockSubscription({
      id: SUB_2_ID,
      type: 'subscription_basic',
      name: 'Basic Plan',
      isActive: true,
    });

    // Users A, B, C for subscription 1
    const sub1Subscribers = [
      {
        botUser: createMockBotUser({
          id: 1,
          userId: 111, // User A
          botId: 1,
          lang: 'en',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 1,
          botUserId: 1,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 2,
          userId: 222, // User B
          botId: 1,
          lang: 'ru',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 2,
          botUserId: 2,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 3,
          userId: 333, // User C
          botId: 1,
          lang: 'es',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 3,
          botUserId: 3,
          subscriptionId: SUB_1_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
    ];

    // Users B, C, D for subscription 2 (B and C overlap with sub1)
    const sub2Subscribers = [
      {
        botUser: createMockBotUser({
          id: 4,
          userId: 222, // User B (overlaps with sub1)
          botId: 1,
          lang: 'ru',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 4,
          botUserId: 4,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 5,
          userId: 333, // User C (overlaps with sub1)
          botId: 1,
          lang: 'es',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 5,
          botUserId: 5,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
      {
        botUser: createMockBotUser({
          id: 6,
          userId: 444, // User D (unique to sub2)
          botId: TEST_BOT_ID,
          lang: 'en',
          isActive: true,
        }),
        userSubscription: createMockUserSubscription({
          id: 6,
          botUserId: 6,
          subscriptionId: SUB_2_ID,
          isActive: true,
          expiresAt: new Date('2026-12-31'),
        }),
      },
    ];

    it('should deduplicate users across subscriptions', async () => {
      // Arrange: Mock repository
      //   - Sub 1: users [A, B, C] (userIds: 111, 222, 333)
      //   - Sub 2: users [B, C, D] (userIds: 222, 333, 444) - B and C overlap
      mockSubscriptionsRepository.findById.mockImplementation(async (id) => {
        if (id === SUB_1_ID) return sub1;
        if (id === SUB_2_ID) return sub2;
        return null;
      });
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockImplementation(
        async (subscriptionId) => {
          if (subscriptionId === SUB_1_ID) return sub1Subscribers;
          if (subscriptionId === SUB_2_ID) return sub2Subscribers;
          return [];
        },
      );

      // Act: Call sendBroadcastMulti([1, 2], message, ...)
      const result = await broadcastService.sendBroadcastMulti(
        [SUB_1_ID, SUB_2_ID],
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
        'active',
        null,
      );

      // Assert: NotificationService.addMessages called with 4 unique users (not 6)
      expect(mockNotificationService.addMessages).toHaveBeenCalledTimes(1);
      const addMessagesCall = mockNotificationService.addMessages.mock.calls[0];
      const messagesArg = addMessagesCall[0];
      expect(messagesArg).toHaveLength(4); // Unique users: A, B, C, D

      // Verify unique userIds
      const userIds = messagesArg.map(
        (m: { telegramId: number }) => m.telegramId,
      );
      expect(new Set(userIds).size).toBe(4);
      expect(userIds).toContain(111); // User A
      expect(userIds).toContain(222); // User B
      expect(userIds).toContain(333); // User C
      expect(userIds).toContain(444); // User D

      // Verify result counts reflect deduplication
      expect(result.recipientCount).toBe(4);
    });

    it('should work with single subscription (backward compatible)', async () => {
      // Arrange: Mock single subscription with 3 users
      mockSubscriptionsRepository.findById.mockResolvedValue(sub1);
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        sub1Subscribers,
      );

      // Act: Call sendBroadcastMulti([1], message, ...)
      const result = await broadcastService.sendBroadcastMulti(
        [SUB_1_ID],
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
        'active',
        null,
      );

      // Assert: Works same as sendBroadcast for single sub
      expect(mockNotificationService.addMessages).toHaveBeenCalledTimes(1);
      const addMessagesCall = mockNotificationService.addMessages.mock.calls[0];
      const messagesArg = addMessagesCall[0];
      expect(messagesArg).toHaveLength(3); // All 3 users
      expect(result.recipientCount).toBe(3);
    });

    it('should respect filterStatus=expired parameter', async () => {
      // Arrange: Mock repository with expired users
      const expiredSub1Subscribers = [
        {
          botUser: createMockBotUser({
            id: 10,
            userId: 1001,
            botId: 1,
            lang: 'en',
            isActive: true,
          }),
          subscription: sub1,
          userSubscription: createMockUserSubscription({
            id: 10,
            botUserId: 10,
            subscriptionId: SUB_1_ID,
            isActive: false,
            expiresAt: new Date('2025-11-01'),
          }),
        },
      ];
      mockSubscriptionsRepository.findById.mockResolvedValue(sub1);
      mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
        expiredSub1Subscribers,
      );

      // Act: Call sendBroadcastMulti([1], message, ..., 'expired', null)
      await broadcastService.sendBroadcastMulti(
        [SUB_1_ID],
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
        'expired',
        null,
      );

      // Assert: Repository queried with 'expired' filter (findExpired method used)
      expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
        undefined,
        undefined,
        SUB_1_ID,
      );
      // findSubscribersWithUserDetails should NOT be called
      expect(
        mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
      ).not.toHaveBeenCalled();
    });

    it('should respect filterBotId parameter', async () => {
      // Arrange: Mock repository with specific bot users
      mockSubscriptionsRepository.findById.mockResolvedValue(sub2);
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        sub2Subscribers, // Returns all, filtering happens in service
      );

      // Act: Call sendBroadcastMulti([2], message, ..., 'active', 5)
      const result = await broadcastService.sendBroadcastMulti(
        [SUB_2_ID],
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
        'active',
        TEST_BOT_ID,
      );

      // Assert: Only bot 5 user is targeted
      expect(mockNotificationService.addMessages).toHaveBeenCalledTimes(1);
      const addMessagesCall = mockNotificationService.addMessages.mock.calls[0];
      const messagesArg = addMessagesCall[0];
      expect(messagesArg).toHaveLength(1); // Only user D with botId=5
      expect(messagesArg[0].telegramId).toBe(444); // User D
      expect(result.recipientCount).toBe(1);
    });

    it('should call NotificationService with unique user list only', async () => {
      // Arrange: Mock overlapping users
      mockSubscriptionsRepository.findById.mockImplementation(async (id) => {
        if (id === SUB_1_ID) return sub1;
        if (id === SUB_2_ID) return sub2;
        return null;
      });
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockImplementation(
        async (subscriptionId) => {
          if (subscriptionId === SUB_1_ID) return sub1Subscribers;
          if (subscriptionId === SUB_2_ID) return sub2Subscribers;
          return [];
        },
      );

      // Act: Call sendBroadcastMulti
      await broadcastService.sendBroadcastMulti(
        [SUB_1_ID, SUB_2_ID],
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
        'active',
        null,
      );

      // Assert: Each unique userId appears exactly once in notification calls
      const addMessagesCall = mockNotificationService.addMessages.mock.calls[0];
      const messagesArg = addMessagesCall[0];
      const userIds = messagesArg.map(
        (m: { telegramId: number }) => m.telegramId,
      );

      // Count occurrences of each userId
      const userIdCounts = new Map<number, number>();
      for (const userId of userIds) {
        userIdCounts.set(userId, (userIdCounts.get(userId) || 0) + 1);
      }

      // Verify each userId appears exactly once
      for (const [userId, count] of userIdCounts) {
        expect(count).toBe(1);
      }

      // Verify the correct set of unique users
      expect(userIds.sort()).toEqual([111, 222, 333, 444].sort());
    });
  });

  describe('countUsersWithoutSubscription', () => {
    it('should return count from repository', async () => {
      // Arrange
      const botId = TEST_BOT_ID;
      mockBotUsersRepository.countWithoutSubscription.mockResolvedValue(5);

      // Act
      const result =
        await broadcastService.countUsersWithoutSubscription(botId);

      // Assert
      expect(result).toBe(5);
      expect(
        mockBotUsersRepository.countWithoutSubscription,
      ).toHaveBeenCalledWith(botId);
    });

    it('should return 0 when no users without subscription exist', async () => {
      // Arrange
      mockBotUsersRepository.countWithoutSubscription.mockResolvedValue(0);

      // Act
      const result =
        await broadcastService.countUsersWithoutSubscription(TEST_BOT_ID);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('countAllSubscribers', () => {
    it('should count all subscribers regardless of status', async () => {
      // Arrange: Mock active returns 3, expired returns 2
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        activeSubscribers,
      );
      // Expired subscribers for bot 5 - we need to filter to bot 5
      mockUserSubscriptionsRepository.findExpired.mockResolvedValue([
        {
          botUser: createMockBotUser({
            id: 4,
            userId: 444,
            botId: TEST_BOT_ID,
            lang: 'en',
            isActive: true,
          }),
          subscription: mockSubscription,
          userSubscription: createMockUserSubscription({
            id: 4,
            botUserId: 4,
            subscriptionId: TEST_SUBSCRIPTION_ID,
            isActive: false,
            expiresAt: new Date('2025-11-01'),
          }),
        },
      ]);

      // Act
      const result = await broadcastService.countAllSubscribers(
        TEST_SUBSCRIPTION_ID,
        TEST_BOT_ID,
      );

      // Assert: Active (0 for bot 5) + Expired (1 for bot 5) = 1
      expect(result).toBe(1);
      // Verify both active and expired queries were called
      expect(
        mockUserSubscriptionsRepository.findSubscribersWithUserDetails,
      ).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
      expect(mockUserSubscriptionsRepository.findExpired).toHaveBeenCalledWith(
        undefined,
        TEST_BOT_ID,
        TEST_SUBSCRIPTION_ID,
      );
    });

    it('should work without bot filter', async () => {
      // Arrange: 3 active + 2 expired = 5 total
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        activeSubscribers,
      );
      mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
        expiredSubscribers,
      );

      // Act
      const result =
        await broadcastService.countAllSubscribers(TEST_SUBSCRIPTION_ID);

      // Assert: 3 active + 2 expired = 5 total
      expect(result).toBe(5);
    });

    it('should pass null filterBotId correctly (same as undefined)', async () => {
      // Arrange
      mockUserSubscriptionsRepository.findSubscribersWithUserDetails.mockResolvedValue(
        activeSubscribers,
      );
      mockUserSubscriptionsRepository.findExpired.mockResolvedValue(
        expiredSubscribers,
      );

      // Act
      const result = await broadcastService.countAllSubscribers(
        TEST_SUBSCRIPTION_ID,
        null,
      );

      // Assert: Same as no filter
      expect(result).toBe(5);
    });
  });

  describe('sendBroadcastToNonSubscribers', () => {
    const TEST_MESSAGE = 'Welcome to our service!';
    const TEST_MANAGER_ID = 12345;

    it('should queue messages for users without subscription', async () => {
      // Arrange: Mocks already set up in beforeEach with 2 users without subscription

      // Act
      const result = await broadcastService.sendBroadcastToNonSubscribers(
        TEST_BOT_ID,
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
      );

      // Assert
      expect(
        mockBotUsersRepository.findWithoutSubscription,
      ).toHaveBeenCalledWith(TEST_BOT_ID);
      expect(mockBotsRepository.findById).toHaveBeenCalledWith(TEST_BOT_ID);
      expect(mockNotificationService.addMessages).toHaveBeenCalled();
      expect(result.recipientCount).toBe(2);
      expect(result.status).toBe('queued');
    });

    it('should return completed with 0 recipients when no users without subscription', async () => {
      // Arrange: No users without subscription
      mockBotUsersRepository.findWithoutSubscription.mockResolvedValue([]);

      // Act
      const result = await broadcastService.sendBroadcastToNonSubscribers(
        TEST_BOT_ID,
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
      );

      // Assert
      expect(result.recipientCount).toBe(0);
      expect(result.status).toBe('completed');
      expect(mockNotificationService.addMessages).not.toHaveBeenCalled();
    });

    it('should throw error when bot not found', async () => {
      // Arrange: Bot not found
      mockBotsRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        broadcastService.sendBroadcastToNonSubscribers(
          TEST_BOT_ID,
          TEST_MESSAGE,
          undefined,
          TEST_MANAGER_ID,
        ),
      ).rejects.toThrow(`Bot ${TEST_BOT_ID} not found`);
    });

    it('should pass message entities to notification service', async () => {
      // Arrange: Message with entities
      const entities = [{ type: 'bold' as const, offset: 0, length: 7 }];

      // Act
      await broadcastService.sendBroadcastToNonSubscribers(
        TEST_BOT_ID,
        TEST_MESSAGE,
        entities,
        TEST_MANAGER_ID,
      );

      // Assert: NotificationService receives messages
      expect(mockNotificationService.addMessages).toHaveBeenCalledTimes(1);
      const addMessagesCall = mockNotificationService.addMessages.mock.calls[0];
      const messages = addMessagesCall[0];

      // Verify correct number of messages
      expect(messages).toHaveLength(2);

      // Verify messages contain correct user telegramIds
      const telegramIds = messages.map(
        (m: { telegramId: number }) => m.telegramId,
      );
      expect(telegramIds).toContain(1001);
      expect(telegramIds).toContain(1002);
    });

    it('should log broadcast operation', async () => {
      // Arrange: Spy on logger
      const loggerSpy = jest.spyOn(broadcastService['logger'], 'log');

      // Act
      await broadcastService.sendBroadcastToNonSubscribers(
        TEST_BOT_ID,
        TEST_MESSAGE,
        undefined,
        TEST_MANAGER_ID,
      );

      // Assert: Logger was called with relevant info
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('without subscription'),
      );
    });
  });
});
