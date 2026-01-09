import { BroadcastService } from '../broadcast.service';
import type {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
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

  // Test data fixtures
  const mockSubscription = {
    id: TEST_SUBSCRIPTION_ID,
    type: 'signals',
    name: 'Premium Signals',
    isActive: true,
  };

  const activeSubscribers = [
    {
      botUser: createMockBotUser({
        id: 1,
        userId: 111,
        botId: 1,
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
        botId: 1,
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
        userId: 333,
        botId: 1,
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
      userSubscription: {
        id: 4,
        botUserId: 4,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      },
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
      userSubscription: {
        id: 5,
        botUserId: 5,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-10-15'),
      },
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
      userSubscription: {
        id: 4,
        botUserId: 4,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        isActive: false,
        expiresAt: new Date('2025-11-01'),
      },
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

    // Create service instance
    broadcastService = new BroadcastService(
      mockUserSubscriptionsRepository as never,
      mockSubscriptionsRepository as never,
      mockNotificationService as never,
      mockLLMService as never,
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
});
