import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrialService } from '../trial.service';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';

describe('TrialService', () => {
  let trialService: TrialService;
  let mockUserSubscriptionsRepository: jest.Mocked<UserSubscriptionsRepository>;
  let mockSubscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockUserSubscriptionsRepository = {
      findByBotUserId: jest.fn(),
      activateForBotUser: jest.fn(),
    } as unknown as jest.Mocked<UserSubscriptionsRepository>;

    mockSubscriptionsRepository = {
      findTrialSubscription: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialService,
        {
          provide: UserSubscriptionsRepository,
          useValue: mockUserSubscriptionsRepository,
        },
        {
          provide: SubscriptionsRepository,
          useValue: mockSubscriptionsRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    trialService = module.get<TrialService>(TrialService);
  });

  describe('isEligible', () => {
    it('should check eligibility per bot user (not global)', async () => {
      // Arrange
      const botUserId = 1;
      mockConfigService.get.mockReturnValue(true); // TRIAL_ENABLED = true
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);

      // Act
      const result = await trialService.isEligible(botUserId);

      // Assert
      expect(result).toBe(true);
      expect(
        mockUserSubscriptionsRepository.findByBotUserId,
      ).toHaveBeenCalledWith(botUserId);
    });

    it('should return true for new bot even if user has subscription on other bot', async () => {
      // Arrange
      // This test verifies that per-bot trial eligibility works correctly
      // Bot user ID 2 (user on Bot B) has no subscriptions even though
      // the same user on Bot A (different botUserId) might have subscriptions
      const botUserIdOnBotB = 2;
      mockConfigService.get.mockReturnValue(true);
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);

      // Act
      const result = await trialService.isEligible(botUserIdOnBotB);

      // Assert
      expect(result).toBe(true);
      expect(
        mockUserSubscriptionsRepository.findByBotUserId,
      ).toHaveBeenCalledWith(botUserIdOnBotB);
    });

    it('should return false when bot user has subscription history', async () => {
      // Arrange
      const botUserId = 1;
      mockConfigService.get.mockReturnValue(true);
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([
        {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          botId: 1,
          isActive: true,
          activatedAt: new Date(),
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await trialService.isEligible(botUserId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when trial is disabled', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(false); // TRIAL_ENABLED = false

      // Act
      const result = await trialService.isEligible(1);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('activate', () => {
    it('should create subscription with botUserId', async () => {
      // Arrange
      const botUserId = 1;
      const trialSubscription = { id: 5, name: 'Trial', type: 'signals' };
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      mockConfigService.get
        .mockReturnValueOnce(true) // TRIAL_ENABLED for isEligible check
        .mockReturnValueOnce(7); // TRIAL_DURATION_DAYS

      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);
      mockSubscriptionsRepository.findTrialSubscription.mockResolvedValue(
        trialSubscription as never,
      );
      mockUserSubscriptionsRepository.activateForBotUser.mockResolvedValue({
        id: 1,
        botUserId: 1,
        subscriptionId: 5,
        botId: 1,
        isActive: true,
        activatedAt: new Date(),
        expiresAt,
        createdAt: new Date(),
      });

      // Act
      const result = await trialService.activate(botUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
      expect(
        mockUserSubscriptionsRepository.activateForBotUser,
      ).toHaveBeenCalledWith(botUserId, 5, expect.any(Date));
    });

    it('should return error when not eligible', async () => {
      // Arrange
      const botUserId = 1;
      mockConfigService.get.mockReturnValue(true);
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([
        {
          id: 1,
          botUserId: 1,
          subscriptionId: 1,
          botId: 1,
          isActive: true,
          activatedAt: new Date(),
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await trialService.activate(botUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Trial already used or not enabled');
    });

    it('should return error when trial subscription not found', async () => {
      // Arrange
      const botUserId = 1;
      mockConfigService.get.mockReturnValue(true);
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);
      mockSubscriptionsRepository.findTrialSubscription.mockResolvedValue(null);

      // Act
      const result = await trialService.activate(botUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Trial not available');
    });

    it('should handle activation errors gracefully', async () => {
      // Arrange
      const botUserId = 1;
      mockConfigService.get.mockReturnValue(true);
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);
      mockSubscriptionsRepository.findTrialSubscription.mockResolvedValue({
        id: 5,
      } as never);
      mockUserSubscriptionsRepository.activateForBotUser.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const result = await trialService.activate(botUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to activate trial');
    });
  });
});
