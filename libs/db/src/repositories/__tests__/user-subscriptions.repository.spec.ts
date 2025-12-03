import { Test, TestingModule } from '@nestjs/testing';
import { UserSubscriptionsRepository } from '../user-subscriptions.repository';
import { DRIZZLE_CLIENT } from '../../database.provider';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { users } from '../../schema/users';
import { subscriptions } from '../../schema/subscriptions';

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
          user: {
            telegramId: 123,
            username: 'user1',
            lang: 'en',
            isActive: true,
          },
          userSubscription: {
            id: 1,
            userId: 123,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
          },
        },
        {
          user: {
            telegramId: 456,
            username: 'user2',
            lang: 'ru',
            isActive: true,
          },
          userSubscription: {
            id: 2,
            userId: 456,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-15'),
            isActive: false,
          },
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.innerJoin.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue(mockExpiredTrials);

      const result = await repository.findExpiredTrials(botId);

      expect(mockDb.select).toHaveBeenCalledWith({
        user: users,
        userSubscription: userSubscriptions,
      });
      expect(mockDb.from).toHaveBeenCalledWith(userSubscriptions);
      expect(mockDb.innerJoin).toHaveBeenCalledWith(users, expect.anything());
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
          user: {
            telegramId: 123,
            username: 'user1',
            lang: 'es',
            isActive: true,
          },
          userSubscription: {
            id: 1,
            userId: 123,
            subscriptionId: 1,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
          },
        },
      ];

      mockDb.where.mockResolvedValue(mockExpiredTrials);

      const result = await repository.findExpiredTrials(botId);

      expect(result[0].user.lang).toBe('es');
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
});
