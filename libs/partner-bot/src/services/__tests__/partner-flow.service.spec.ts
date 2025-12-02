import type {
  BotMessagesRepository,
  BotSettingsRepository,
  BotUsersRepository,
} from '@quantumdeal/db';
import type { TrialService } from '@quantumdeal/bot';
import type { BotCommandsService } from '@quantumdeal/bot';
import type { DynamicTelegrafService } from '@quantumdeal/telegraf';
import { PartnerFlowService } from '../partner-flow.service';
import type { ChannelVerifierService } from '../channel-verifier.service';
import type { VerificationResult } from '../../types/partner-settings';

describe('PartnerFlowService', () => {
  let service: PartnerFlowService;
  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'findByUserAndBot' | 'updateState' | 'resolveLanguage'
  >;
  let mockTrialService: Pick<TrialService, 'activate'>;
  let mockBotCommandsService: Pick<BotCommandsService, 'setUserCommands'>;
  let mockChannelVerifierService: Pick<
    ChannelVerifierService,
    'isRateLimited' | 'verifyMembership'
  >;
  let mockDynamicTelegrafService: Partial<DynamicTelegrafService>;

  beforeEach(() => {
    // Mock BotMessagesRepository
    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    // Mock BotSettingsRepository
    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    // Mock BotUsersRepository
    mockBotUsersRepository = {
      findByUserAndBot: jest.fn(),
      updateState: jest.fn(),
      resolveLanguage: jest.fn().mockResolvedValue('en'),
    };

    // Mock TrialService
    mockTrialService = {
      activate: jest.fn(),
    };

    // Mock BotCommandsService
    mockBotCommandsService = {
      setUserCommands: jest.fn(),
    };

    // Mock ChannelVerifierService
    mockChannelVerifierService = {
      isRateLimited: jest.fn(),
      verifyMembership: jest.fn(),
    };

    // Mock DynamicTelegrafService
    mockDynamicTelegrafService = {
      getBot: jest.fn().mockReturnValue({
        telegram: {
          sendMessage: jest.fn(),
        },
      }),
    };

    // Create service instance
    service = new PartnerFlowService(
      mockBotMessagesRepository as BotMessagesRepository,
      mockBotSettingsRepository as BotSettingsRepository,
      mockBotUsersRepository as BotUsersRepository,
      mockTrialService as TrialService,
      mockBotCommandsService as BotCommandsService,
      mockChannelVerifierService as ChannelVerifierService,
      mockDynamicTelegrafService as DynamicTelegrafService,
    );
  });

  describe('sendChannelPrompt', () => {
    it('should retrieve partner_channel_prompt message', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Please subscribe to our channel: {channelUrl} ({channelName})',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      await service.sendChannelPrompt(userId, botId, lang);

      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        botId,
        'partner_channel_prompt',
        lang,
      );
    });

    it('should interpolate {channelUrl} and {channelName} variables', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const channelUsername = '@testchannel';

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Subscribe to {channelUrl} ({channelName}) to get access',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: channelUsername,
        },
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      await service.sendChannelPrompt(userId, botId, lang);

      const bot = mockDynamicTelegrafService.getBot!(botId);
      const sendMessage = bot!.telegram.sendMessage as jest.Mock;
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.stringContaining('https://t.me/testchannel'),
        expect.any(Object),
      );
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.stringContaining('testchannel'),
        expect.any(Object),
      );
    });

    it('should send message with inline keyboard "I subscribed" button', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Please subscribe to {channelUrl}',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      await service.sendChannelPrompt(userId, botId, lang);

      const bot = mockDynamicTelegrafService.getBot!(botId);
      const sendMessage = bot!.telegram.sendMessage as jest.Mock;
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.any(String),
                  callback_data: 'partner_verify_subscription',
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    it('should update bot_users.state to awaiting_channel_subscription', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Please subscribe',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      await service.sendChannelPrompt(userId, botId, lang);

      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        userId,
        botId,
        expect.objectContaining({
          currentScene: 'partner_flow',
          sceneData: expect.objectContaining({
            verificationState: 'awaiting_channel_subscription',
          }),
        }),
      );
    });

    it('should throw error if partner configuration is missing', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Message',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.sendChannelPrompt(userId, botId, lang),
      ).rejects.toThrow();
    });
  });

  describe('handleVerificationRequest', () => {
    it('should check rate limit via ChannelVerifierService', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await service.handleVerificationRequest(userId, botId);

      expect(mockChannelVerifierService.isRateLimited).toHaveBeenCalledWith(
        userId,
        botId,
      );
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error if user is rate limited', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await service.handleVerificationRequest(userId, botId);

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain('attempt');
    });

    it('should verify membership via ChannelVerifierService', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: true,
        expiresAt: new Date(),
      });

      await service.handleVerificationRequest(userId, botId);

      expect(mockChannelVerifierService.verifyMembership).toHaveBeenCalledWith(
        '@testchannel',
        userId,
        botId,
      );
    });

    it('should update state to channel_verified and call TrialService.activate if verified', async () => {
      const userId = 12345;
      const botId = 1;
      const expiresAt = new Date('2025-01-01');

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: true,
        expiresAt,
      });

      const result = await service.handleVerificationRequest(userId, botId);

      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        userId,
        botId,
        expect.objectContaining({
          currentScene: 'partner_flow',
          sceneData: expect.objectContaining({
            verificationState: 'channel_verified',
          }),
        }),
      );
      expect(mockTrialService.activate).toHaveBeenCalledWith(userId);
      expect(result.verified).toBe(true);
    });

    it('should update state to trial_activated after successful activation', async () => {
      const userId = 12345;
      const botId = 1;
      const expiresAt = new Date('2025-01-01');

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: true,
        expiresAt,
      });

      await service.handleVerificationRequest(userId, botId);

      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        userId,
        botId,
        expect.objectContaining({
          currentScene: 'partner_flow',
          sceneData: expect.objectContaining({
            verificationState: 'trial_activated',
            trialExpiresAt: expiresAt.toISOString(),
          }),
        }),
      );
    });

    it('should send partner_verification_failed message if not verified', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(false);
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Verification failed',
      );

      const result = await service.handleVerificationRequest(userId, botId);

      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        botId,
        'partner_verification_failed',
        expect.any(String),
      );
      const bot = mockDynamicTelegrafService.getBot!(botId);
      expect(bot!.telegram.sendMessage).toHaveBeenCalledWith(
        userId,
        'Verification failed',
        expect.any(Object),
      );
      expect(result.verified).toBe(false);
    });

    it('should revert state to channel_verified if trial activation fails', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Trial activation failed',
      });

      const result = await service.handleVerificationRequest(userId, botId);

      // Should be called twice: once for channel_verified, once for reverting
      expect(mockBotUsersRepository.updateState).toHaveBeenCalledTimes(2);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Trial activation failed');
    });

    it('should increment verification attempts counter', async () => {
      const userId = 12345;
      const botId = 1;

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        state: {
          sceneData: {
            verificationAttempts: 3,
          },
        },
      } as never);
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(false);
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Failed',
      );

      await service.handleVerificationRequest(userId, botId);

      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        userId,
        botId,
        expect.objectContaining({
          currentScene: 'partner_flow',
          sceneData: expect.objectContaining({
            verificationAttempts: 4,
          }),
        }),
      );
    });
  });

  describe('sendTrialUI', () => {
    it('should retrieve partner_trial_activated message', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-01');

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Trial activated! Expires: {expiryDate}, Days remaining: {daysRemaining}',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotCommandsService.setUserCommands as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.sendTrialUI(userId, botId, lang, expiresAt);

      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        botId,
        'partner_trial_activated',
        lang,
      );
    });

    it('should interpolate {expiryDate} and {daysRemaining} variables', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-10T00:00:00Z');

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Expires on {expiryDate}. Days left: {daysRemaining}',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotCommandsService.setUserCommands as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.sendTrialUI(userId, botId, lang, expiresAt);

      const bot = mockDynamicTelegrafService.getBot!(botId);
      const sendMessage = bot!.telegram.sendMessage as jest.Mock;
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.stringMatching(/2025-01-10/),
        expect.any(Object),
      );
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.stringMatching(/\d+/), // Should contain a number for days
        expect.any(Object),
      );
    });

    it('should build inline keyboard with Extend and Buy buttons', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-01');

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Trial activated',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotCommandsService.setUserCommands as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.sendTrialUI(userId, botId, lang, expiresAt);

      const bot = mockDynamicTelegrafService.getBot!(botId);
      const sendMessage = bot!.telegram.sendMessage as jest.Mock;
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Extend'),
                  callback_data: 'partner_extend_trial',
                }),
              ]),
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Buy'),
                  callback_data: 'partner_buy_subscription',
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    it('should call BotCommandsService.setUserCommands', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-01');

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Trial activated',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotCommandsService.setUserCommands as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.sendTrialUI(userId, botId, lang, expiresAt);

      expect(mockBotCommandsService.setUserCommands).toHaveBeenCalledWith(
        userId,
        expect.any(Set),
        lang,
      );
    });
  });
});
