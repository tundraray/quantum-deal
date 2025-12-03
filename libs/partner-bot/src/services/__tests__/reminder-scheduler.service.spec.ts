import { Test, TestingModule } from '@nestjs/testing';
import { ReminderSchedulerService } from '../reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;
  let mockUserSubscriptionsRepository: {
    findExpiredTrials: jest.Mock;
  };
  let mockBotMessagesRepository: {
    resolveMessage: jest.Mock;
  };
  let mockBotSettingsRepository: {
    findByBotId: jest.Mock;
  };
  let mockBotsRepository: {
    findActiveDynamic: jest.Mock;
  };
  let mockDynamicTelegrafService: {
    getBotInstance: jest.Mock;
  };
  let mockBot: {
    telegram: {
      sendMessage: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockUserSubscriptionsRepository = {
      findExpiredTrials: jest.fn(),
    };

    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    mockBotsRepository = {
      findActiveDynamic: jest.fn(),
    };

    mockBot = {
      telegram: {
        sendMessage: jest.fn(),
      },
    };

    mockDynamicTelegrafService = {
      getBotInstance: jest.fn().mockReturnValue({
        botId: 1,
        name: 'testbot',
        bot: mockBot,
        webhookPath: '/dynamic/testbot',
        settings: null,
        username: 'testbot',
        limiter: {} as unknown,
        stage: {} as unknown,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ReminderSchedulerService,
          useFactory: () =>
            new ReminderSchedulerService(
              mockUserSubscriptionsRepository as never,
              mockBotMessagesRepository as never,
              mockBotSettingsRepository as never,
              mockBotsRepository as never,
              mockDynamicTelegrafService as never,
            ),
        },
      ],
    }).compile();

    service = module.get<ReminderSchedulerService>(ReminderSchedulerService);
  });

  describe('processExpiredTrials', () => {
    it('should send reminders to all expired trial users', async () => {
      const botId = 1;
      const mockExpiredTrials = [
        {
          user: {
            telegramId: 123,
            username: 'user1',
            languageCode: 'en',
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
            languageCode: 'ru',
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

      mockUserSubscriptionsRepository.findExpiredTrials.mockResolvedValue(
        mockExpiredTrials,
      );
      mockBotMessagesRepository.resolveMessage.mockResolvedValue(
        'Your trial has expired. Click "Extend" to get more free days via referral link: {referralUrl}',
      );
      mockBotSettingsRepository.findByBotId.mockResolvedValue({
        id: 1,
        botId: 1,
        settings: {
          partner: '@testchannel',
          referralUrl: 'https://t.me/partner_referral',
        },
      } as any);
      mockBot.telegram.sendMessage.mockResolvedValue({} as any);

      const stats = await service.processExpiredTrials(botId);

      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(0);
      expect(
        mockUserSubscriptionsRepository.findExpiredTrials,
      ).toHaveBeenCalledWith(botId);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle bot blocked errors gracefully', async () => {
      const botId = 1;
      const mockExpiredTrials = [
        {
          user: {
            telegramId: 123,
            username: 'user1',
            languageCode: 'en',
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

      mockUserSubscriptionsRepository.findExpiredTrials.mockResolvedValue(
        mockExpiredTrials,
      );
      mockBotMessagesRepository.resolveMessage.mockResolvedValue(
        'Your trial has expired',
      );
      mockBotSettingsRepository.findByBotId.mockResolvedValue({
        id: 1,
        botId: 1,
        settings: {
          partner: '@testchannel',
          referralUrl: 'https://t.me/partner_referral',
        },
      } as any);
      mockBot.telegram.sendMessage.mockRejectedValue(
        new Error('Forbidden: bot was blocked by the user'),
      );

      const stats = await service.processExpiredTrials(botId);

      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('should return accurate statistics', async () => {
      const botId = 1;
      const mockExpiredTrials = [
        {
          user: { telegramId: 123, languageCode: 'en', isActive: true },
          userSubscription: {
            id: 1,
            userId: 123,
            botId: 1,
            expiresAt: new Date('2025-11-01'),
            isActive: false,
          },
        },
        {
          user: { telegramId: 456, languageCode: 'ru', isActive: true },
          userSubscription: {
            id: 2,
            userId: 456,
            botId: 1,
            expiresAt: new Date('2025-11-15'),
            isActive: false,
          },
        },
      ];

      mockUserSubscriptionsRepository.findExpiredTrials.mockResolvedValue(
        mockExpiredTrials,
      );
      mockBotMessagesRepository.resolveMessage.mockResolvedValue(
        'Your trial expired',
      );
      mockBotSettingsRepository.findByBotId.mockResolvedValue({
        id: 1,
        botId: 1,
        settings: {
          partner: '@testchannel',
          referralUrl: 'https://t.me/partner_referral',
        },
      } as any);
      mockBot.telegram.sendMessage.mockResolvedValueOnce({} as any);
      mockBot.telegram.sendMessage.mockRejectedValueOnce(
        new Error('Network error'),
      );

      const stats = await service.processExpiredTrials(botId);

      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});
