import { Test, TestingModule } from '@nestjs/testing';
import { UserSubscriptionsRepository } from '../user-subscriptions.repository';
import { DRIZZLE_CLIENT } from '../../database.provider';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { subscriptions } from '../../schema/subscriptions';
import { botUsers } from '../../schema/bot-users';

interface MockDb {
  select: jest.Mock;
  from: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  execute: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  insert: jest.Mock;
  values: jest.Mock;
  limit: jest.Mock;
  leftJoin: jest.Mock;
}

describe('UserSubscriptionsRepository', () => {
  let repository: UserSubscriptionsRepository;
  let mockDb: MockDb;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSubscriptionsRepository,
        {
          provide: DRIZZLE_CLIENT,
          useValue: mockDb,
        },
      ],
    }).compile();

    repository = module.get<UserSubscriptionsRepository>(
      UserSubscriptionsRepository,
    );
  });

  describe('findExpiredTrials', () => {
    it('should query expired trial subscriptions for a specific bot', async () => {
      const botId = 1;
      const mockExpiredTrials = [
        {
          botUser: {
            id: 1,
            userId: 123,
            botId: 1,
            lang: 'en',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: null,
            state: null,
          },
          userSubscription: {
            id: 1,
            botUserId: 1,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
        {
          botUser: {
            id: 2,
            userId: 456,
            botId: 1,
            lang: 'ru',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: null,
            state: null,
          },
          userSubscription: {
            id: 2,
            botUserId: 2,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-15'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockExpiredTrials);

      const result = await repository.findExpiredTrials(botId);

      expect(mockDb.select).toHaveBeenCalledWith({
        botUser: botUsers,
        userSubscription: userSubscriptions,
      });
      expect(mockDb.from).toHaveBeenCalledWith(userSubscriptions);
      expect(mockDb.innerJoin).toHaveBeenCalledWith(
        botUsers,
        expect.anything(),
      );
      expect(result).toEqual(mockExpiredTrials);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no expired trials exist', async () => {
      const botId = 1;

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue([]);

      const result = await repository.findExpiredTrials(botId);

      expect(result).toEqual([]);
    });

    it('should include user language for message resolution', async () => {
      const botId = 1;
      const mockExpiredTrials = [
        {
          botUser: {
            id: 1,
            userId: 123,
            botId: 1,
            lang: 'es',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: null,
            state: null,
          },
          userSubscription: {
            id: 1,
            botUserId: 1,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.where.mockResolvedValue(mockExpiredTrials);

      const result = await repository.findExpiredTrials(botId);

      expect(result[0].botUser.lang).toBe('es');
    });
  });

  describe('botUserId methods', () => {
    describe('findByBotUserId', () => {
      it('should return all subscriptions for a specific bot user', async () => {
        const botUserId = 1;
        const mockSubscriptions = [
          { id: 1, botUserId: 1, subscriptionId: 1, isActive: true },
          { id: 2, botUserId: 1, subscriptionId: 2, isActive: false },
        ];
        mockDb.where.mockResolvedValue(mockSubscriptions);

        const result = await repository.findByBotUserId(botUserId);

        expect(result).toEqual(mockSubscriptions);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when no subscriptions exist', async () => {
        const botUserId = 999;
        mockDb.where.mockResolvedValue([]);

        const result = await repository.findByBotUserId(botUserId);

        expect(result).toEqual([]);
      });

      it('should only return subscriptions for the specified botUserId', async () => {
        const botUserId = 1;
        // Mock returns only subscriptions for botUserId=1, not for botUserId=2
        const mockSubscriptions = [
          { id: 1, botUserId: 1, subscriptionId: 1, isActive: true },
        ];
        mockDb.where.mockResolvedValue(mockSubscriptions);

        const result = await repository.findByBotUserId(botUserId);

        // Verify results don't include other users' subscriptions
        expect(result.every((sub) => sub.botUserId === botUserId)).toBe(true);
        expect(result).toHaveLength(1);
      });
    });

    describe('findActiveByBotUserId', () => {
      it('should return only active non-expired subscriptions for a bot user', async () => {
        const botUserId = 1;
        const mockActiveSubscriptions = [
          {
            id: 1,
            botUserId: 1,
            subscriptionId: 1,
            isActive: true,
            expiresAt: new Date('2026-01-01'),
          },
        ];
        mockDb.where.mockResolvedValue(mockActiveSubscriptions);

        const result = await repository.findActiveByBotUserId(botUserId);

        expect(result).toEqual(mockActiveSubscriptions);
        expect(result[0].isActive).toBe(true);
      });

      it('should return empty array when no active subscriptions exist', async () => {
        const botUserId = 1;
        mockDb.where.mockResolvedValue([]);

        const result = await repository.findActiveByBotUserId(botUserId);

        expect(result).toEqual([]);
      });
    });

    describe('findByBotUserAndSubscription', () => {
      it('should return subscription for specific bot user and subscription ID', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const mockSubscription = {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          isActive: true,
        };
        mockDb.where.mockResolvedValue([mockSubscription]);

        const result = await repository.findByBotUserAndSubscription(
          botUserId,
          subscriptionId,
        );

        expect(result).toEqual(mockSubscription);
      });

      it('should return null when subscription not found', async () => {
        const botUserId = 1;
        const subscriptionId = 999;
        mockDb.where.mockResolvedValue([]);

        const result = await repository.findByBotUserAndSubscription(
          botUserId,
          subscriptionId,
        );

        expect(result).toBeNull();
      });
    });

    describe('findActiveByBotUserIdWithSubscription', () => {
      it('should return active subscriptions with full subscription details', async () => {
        const botUserId = 1;
        const mockResult = [
          {
            userSubscription: {
              id: 1,
              botUserId: 1,
              subscriptionId: 1,
              isActive: true,
            },
            subscription: {
              id: 1,
              name: 'Test Subscription',
              type: 'signals',
            },
          },
        ];
        mockDb.where.mockResolvedValue(mockResult);

        const result =
          await repository.findActiveByBotUserIdWithSubscription(botUserId);

        expect(result).toEqual(mockResult);
        expect(mockDb.select).toHaveBeenCalledWith({
          userSubscription: userSubscriptions,
          subscription: subscriptions,
        });
        expect(mockDb.innerJoin).toHaveBeenCalled();
      });

      it('should return empty array when no active subscriptions', async () => {
        const botUserId = 1;
        mockDb.where.mockResolvedValue([]);

        const result =
          await repository.findActiveByBotUserIdWithSubscription(botUserId);

        expect(result).toEqual([]);
      });
    });

    describe('isBotUserSubscribed', () => {
      it('should return true when bot user has subscription (active or inactive)', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const mockSubscription = { id: 1, botUserId: 1, subscriptionId: 1 };
        // findOneBy uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValue([mockSubscription]);

        const result = await repository.isBotUserSubscribed(
          botUserId,
          subscriptionId,
        );

        expect(result).toBe(true);
      });

      it('should return false when bot user has no subscription', async () => {
        const botUserId = 1;
        const subscriptionId = 999;
        // findOneBy uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValue([]);

        const result = await repository.isBotUserSubscribed(
          botUserId,
          subscriptionId,
        );

        expect(result).toBe(false);
      });
    });

    describe('hasActiveSubscriptionByBotUser', () => {
      it('should return true when bot user has active subscription', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const mockActiveSubscription = {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          isActive: true,
        };
        // findOneBy uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValue([mockActiveSubscription]);

        const result = await repository.hasActiveSubscriptionByBotUser(
          botUserId,
          subscriptionId,
        );

        expect(result).toBe(true);
      });

      it('should return false when bot user has no active subscription', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        // findOneBy uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValue([]);

        const result = await repository.hasActiveSubscriptionByBotUser(
          botUserId,
          subscriptionId,
        );

        expect(result).toBe(false);
      });
    });

    describe('activateForBotUser', () => {
      it('should create new subscription with botUserId when none exists', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const userId = 123456789; // telegramId from bot_users
        const botId = 1;
        const expiresAt = new Date('2025-12-31');
        const mockNewSubscription = {
          id: 1,
          botUserId: 1,
          userId,
          botId,
          subscriptionId: 1,
          expiresAt,
          isActive: true,
        };
        const mockBotUser = { userId, botId };

        // findOneBy returns null (no existing subscription)
        // uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit
          .mockResolvedValueOnce([]) // findOneBy returns no existing subscription
          .mockResolvedValueOnce([mockBotUser]); // bot_users lookup returns the bot user
        // create returns new subscription via insert().values().returning()
        mockDb.values.mockReturnThis();
        mockDb.returning.mockResolvedValue([mockNewSubscription]);

        const result = await repository.activateForBotUser(
          botUserId,
          subscriptionId,
          expiresAt,
        );

        expect(result.botUserId).toBe(botUserId);
        expect(result.isActive).toBe(true);
      });

      it('should extend existing active subscription for bot user', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const existingExpiry = new Date();
        existingExpiry.setDate(existingExpiry.getDate() + 10); // expires in 10 days
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30); // add 30 days

        const existingSubscription = {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          expiresAt: existingExpiry,
          isActive: true,
        };
        const extendedSubscription = {
          ...existingSubscription,
          expiresAt: new Date(
            existingExpiry.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
        };

        // findOneBy returns existing subscription
        // uses select().from().where().limit() chain
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValueOnce([existingSubscription]);
        // update returns extended subscription via update().set().where().returning()
        mockDb.returning.mockResolvedValue([extendedSubscription]);

        const result = await repository.activateForBotUser(
          botUserId,
          subscriptionId,
          newExpiry,
        );

        expect(result.botUserId).toBe(botUserId);
        expect(result.isActive).toBe(true);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should reactivate expired subscription for bot user', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 10); // expired 10 days ago
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30); // new expiration 30 days from now

        const expiredSubscription = {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          expiresAt: expiredDate,
          isActive: false, // marked as inactive due to expiration
        };
        const reactivatedSubscription = {
          ...expiredSubscription,
          expiresAt: newExpiry,
          isActive: true,
        };

        // findOneBy returns expired subscription
        mockDb.where.mockReturnThis();
        mockDb.limit.mockResolvedValueOnce([expiredSubscription]);
        // update returns reactivated subscription
        mockDb.returning.mockResolvedValue([reactivatedSubscription]);

        const result = await repository.activateForBotUser(
          botUserId,
          subscriptionId,
          newExpiry,
        );

        expect(result.botUserId).toBe(botUserId);
        expect(result.isActive).toBe(true);
        expect(result.expiresAt).toEqual(newExpiry);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe('deactivateForBotUser', () => {
      it('should deactivate subscription for bot user', async () => {
        const botUserId = 1;
        const subscriptionId = 1;
        mockDb.returning.mockResolvedValue([]);

        await repository.deactivateForBotUser(botUserId, subscriptionId);

        expect(mockDb.update).toHaveBeenCalledWith(userSubscriptions);
        expect(mockDb.set).toHaveBeenCalledWith({ isActive: false });
      });

      it('should not throw error when no subscription exists', async () => {
        const botUserId = 999;
        const subscriptionId = 999;
        // Mock returns empty array (no rows affected)
        mockDb.returning.mockResolvedValue([]);

        // Should complete without throwing
        await expect(
          repository.deactivateForBotUser(botUserId, subscriptionId),
        ).resolves.not.toThrow();

        expect(mockDb.update).toHaveBeenCalledWith(userSubscriptions);
        expect(mockDb.set).toHaveBeenCalledWith({ isActive: false });
      });
    });
  });

  describe('findExpired', () => {
    it('should return only expired subscriptions with correct return shape', async () => {
      // Arrange: Create expired subscriptions (isActive=false, expiresAt < NOW())
      const mockExpiredSubscriptions = [
        {
          botUser: {
            id: 1,
            userId: 123,
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
            name: 'Signals Subscription',
            type: 'signals',
            isActive: true,
            botId: 1,
            uid: 'test-uid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          userSubscription: {
            id: 1,
            botUserId: 1,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false, // Expired subscriptions are inactive
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockExpiredSubscriptions);

      // Act: Call findExpired()
      const result = await repository.findExpired();

      // Assert: Only expired subscriptions returned with { botUser, subscription, userSubscription }
      expect(mockDb.select).toHaveBeenCalledWith({
        botUser: botUsers,
        subscription: subscriptions,
        userSubscription: userSubscriptions,
      });
      expect(mockDb.from).toHaveBeenCalledWith(userSubscriptions);
      expect(mockDb.innerJoin).toHaveBeenCalledTimes(2); // botUsers and subscriptions
      expect(result).toEqual(mockExpiredSubscriptions);
      expect(result[0].botUser).toBeDefined();
      expect(result[0].subscription).toBeDefined();
      expect(result[0].userSubscription).toBeDefined();
      expect(result[0].userSubscription.isActive).toBe(false);
    });

    it('should filter by subscriptionType=signals when specified', async () => {
      // Arrange: Create expired signals subscriptions
      const mockSignalsSubscriptions = [
        {
          botUser: {
            id: 1,
            userId: 123,
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
            name: 'Signals Subscription',
            type: 'signals',
            isActive: true,
            botId: 1,
            uid: 'test-uid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          userSubscription: {
            id: 1,
            botUserId: 1,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockSignalsSubscriptions);

      // Act: Call findExpired('signals')
      const result = await repository.findExpired('signals');

      // Assert: Only signals subscriptions returned
      expect(result).toEqual(mockSignalsSubscriptions);
      expect(result[0].subscription.type).toBe('signals');
    });

    it('should filter by botId when specified', async () => {
      // Arrange: Create expired subscriptions for a specific bot
      const specificBotId = 5;
      const mockBotSubscriptions = [
        {
          botUser: {
            id: 10,
            userId: 789,
            botId: specificBotId,
            lang: 'ru',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: null,
            state: null,
          },
          subscription: {
            id: 3,
            name: 'Bot 5 Signals',
            type: 'signals',
            isActive: true,
            botId: specificBotId,
            uid: 'bot5-uid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          userSubscription: {
            id: 3,
            botUserId: 10,
            subscriptionId: 3,
            botId: specificBotId,
            expiresAt: new Date('2025-10-15'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockBotSubscriptions);

      // Act: Call findExpired(undefined, specificBotId)
      const result = await repository.findExpired(undefined, specificBotId);

      // Assert: Only specified bot's subscriptions returned
      expect(result).toEqual(mockBotSubscriptions);
      expect(result[0].userSubscription.botId).toBe(specificBotId);
    });

    it('should filter by subscriptionId when specified', async () => {
      // Arrange: Create expired subscriptions for a specific subscription
      const specificSubscriptionId = 10;
      const mockSubscriptionFiltered = [
        {
          botUser: {
            id: 5,
            userId: 555,
            botId: 1,
            lang: 'en',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: null,
            state: null,
          },
          subscription: {
            id: specificSubscriptionId,
            name: 'Premium Signals',
            type: 'signals',
            isActive: true,
            botId: 1,
            uid: 'premium-uid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          userSubscription: {
            id: 15,
            botUserId: 5,
            subscriptionId: specificSubscriptionId,
            botId: 1,
            expiresAt: new Date('2025-09-20'),
            isActive: false,
            activatedAt: new Date(),
            createdAt: new Date(),
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockSubscriptionFiltered);

      // Act: Call findExpired(undefined, undefined, specificSubscriptionId)
      const result = await repository.findExpired(
        undefined,
        undefined,
        specificSubscriptionId,
      );

      // Assert: Only specified subscription's expired users returned
      expect(result).toEqual(mockSubscriptionFiltered);
      expect(result[0].userSubscription.subscriptionId).toBe(
        specificSubscriptionId,
      );
    });

    it('should return empty array when no expired subscriptions exist', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue([]);

      const result = await repository.findExpired();

      expect(result).toEqual([]);
    });
  });
});
