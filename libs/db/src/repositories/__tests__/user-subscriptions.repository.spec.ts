import { Test, TestingModule } from '@nestjs/testing';
import { UserSubscriptionsRepository } from '../user-subscriptions.repository';
import { DRIZZLE_CLIENT } from '../../database.provider';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { users } from '../../schema/users';
import { subscriptions } from '../../schema/subscriptions';

describe('UserSubscriptionsRepository', () => {
  let repository: UserSubscriptionsRepository;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      returning: jest.fn(),
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
});
