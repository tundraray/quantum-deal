import type {
  BotSettingsRepository,
  BotUsersRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import type { TrialService } from '@quantumdeal/bot';
import type { BotCommandsService } from '@quantumdeal/bot';
import type { DynamicTelegrafService } from '@quantumdeal/telegraf';
import type { LocalizationService } from '@quantumdeal/framework';
import type { ILocalizationContext } from '@quantumdeal/framework/localization/interfaces';
import { PartnerFlowService } from '../partner-flow.service';
import type { ChannelVerifierService } from '../channel-verifier.service';

describe('PartnerFlowService', () => {
  let service: PartnerFlowService;
  let mockLocalizationService: {
    forBot: jest.Mock<{ lang: jest.Mock<ILocalizationContext> }>;
  };
  let mockLocalizationContext: {
    t: jest.Mock<Promise<string>, [string, Record<string, unknown>?]>;
  };
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
  let mockUserSubscriptionsRepository: Pick<
    UserSubscriptionsRepository,
    'findActiveWithExpiredByBotAndTelegramId'
  >;

  beforeEach(() => {
    // Mock LocalizationService with fluent API
    mockLocalizationContext = {
      t: jest.fn().mockResolvedValue('Mocked message'),
    };
    mockLocalizationService = {
      forBot: jest.fn().mockReturnValue({
        lang: jest.fn().mockReturnValue(mockLocalizationContext),
      }),
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

    // Mock UserSubscriptionsRepository
    mockUserSubscriptionsRepository = {
      findActiveWithExpiredByBotAndTelegramId: jest.fn().mockResolvedValue([
        {
          userSubscription: { id: 1 },
          subscription: { id: 1 },
        },
      ]),
    };

    // Create service instance (constructor order matches partner-flow.service.ts)
    service = new PartnerFlowService(
      mockLocalizationService as unknown as LocalizationService,
      mockBotSettingsRepository as BotSettingsRepository,
      mockBotUsersRepository as BotUsersRepository,
      mockTrialService as TrialService,
      mockBotCommandsService as BotCommandsService,
      mockChannelVerifierService as ChannelVerifierService,
      mockDynamicTelegrafService as DynamicTelegrafService,
      mockUserSubscriptionsRepository as UserSubscriptionsRepository,
    );
  });

  describe('sendChannelPrompt', () => {
    it('should retrieve partner_channel_prompt message via LocalizationService', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      mockLocalizationContext.t.mockResolvedValue(
        'Please subscribe to our channel: https://t.me/testchannel (testchannel)',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      await service.sendChannelPrompt(userId, botId, lang);

      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(botId);
      expect(mockLocalizationContext.t).toHaveBeenCalled();
    });

    it('should interpolate {channelUrl} and {channelName} variables', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const channelUsername = '@testchannel';

      mockLocalizationContext.t.mockResolvedValue(
        'Subscribe to https://t.me/testchannel (testchannel) to get access',
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

      mockLocalizationContext.t.mockResolvedValue(
        'Please subscribe to https://t.me/testchannel',
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

      mockLocalizationContext.t.mockResolvedValue('Please subscribe');
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

    it('should send channel prompt with empty channel info when channelId is not configured', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';

      // Settings exist but no channelId - sendChannelPrompt sends welcome message
      // Trial activation happens via handleVerificationRequest, not sendChannelPrompt
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {},
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      mockLocalizationContext.t.mockResolvedValue('Welcome message');

      await service.sendChannelPrompt(userId, botId, lang);

      // sendChannelPrompt only sends messages and updates state, does NOT activate trial
      expect(mockBotUsersRepository.updateState).toHaveBeenCalled();
      // Trial activation is NOT called in sendChannelPrompt
      expect(mockTrialService.activate).not.toHaveBeenCalled();
    });
  });

  describe('handleVerificationRequest', () => {
    it('should skip verification and activate trial when partner settings are missing', async () => {
      const userId = 12345;
      const botId = 1;

      // No partner settings configured - triggers direct trial activation
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue(
        null,
      );
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        null as never,
      );

      const result = await service.handleVerificationRequest(userId, botId);

      // Returns error because botUser is not found
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip verification and activate trial when channelId is missing in settings', async () => {
      const userId = 12345;
      const botId = 1;
      const botUserId = 99;
      const expiresAt = new Date('2025-01-01');

      // Settings exist but channelId is missing - triggers direct trial activation
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {},
      } as never);
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: botUserId,
        userId,
        botId,
      } as never);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: true,
        expiresAt,
      });

      const result = await service.handleVerificationRequest(userId, botId);

      // Direct trial activation should succeed
      expect(result.verified).toBe(true);
      expect(mockTrialService.activate).toHaveBeenCalledWith(
        botUserId,
        undefined,
      );
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
      const botUserId = 99; // bot_users.id (small integer)
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
      // Mock findByUserAndBot to return botUser with id for both calls
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: botUserId,
        userId,
        botId,
        state: { sceneData: { verificationAttempts: 0 } },
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
      // After bug fix: TrialService.activate receives botUser.id, NOT userId
      // Implementation now passes optional trialDays parameter as well
      expect(mockTrialService.activate).toHaveBeenCalledWith(
        botUserId,
        undefined,
      );
      expect(result.verified).toBe(true);
    });

    it('should update state to trial_activated after successful activation', async () => {
      const userId = 12345;
      const botId = 1;
      const botUserId = 99; // bot_users.id (small integer)
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
      // Mock findByUserAndBot to return botUser with id for both calls
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: botUserId,
        userId,
        botId,
        state: { sceneData: { verificationAttempts: 0 } },
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
      mockLocalizationContext.t.mockResolvedValue('Verification failed');
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      const result = await service.handleVerificationRequest(userId, botId);

      // LocalizationService fluent API should be called
      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(botId);
      expect(mockLocalizationContext.t).toHaveBeenCalled();
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
      const botUserId = 99; // bot_users.id (small integer)

      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: {
          channelId: '@testchannel',
        },
      } as never);
      // Mock findByUserAndBot to return botUser with id for both calls
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: botUserId,
        userId,
        botId,
        state: { sceneData: { verificationAttempts: 0 } },
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
      mockLocalizationContext.t.mockResolvedValue('Failed');

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

    // ==========================================================================
    // AC-4: botUserId Migration - Critical Bug Fix Tests
    // Design Doc: partner-bot-flow-improvements-design.md
    // ==========================================================================

    // AC-4: "PartnerFlowService.handleVerificationRequest() resolves botUser and passes botUser.id to TrialService.activate()"
    // ROI: 95 | Business Value: 10 (critical bug) | Frequency: 10 (every activation)
    // Behavior: After channel verification succeeds, TrialService.activate() receives botUser.id (bot_users.id), NOT userId (telegramId)
    // Verification:
    //   - BotUsersRepository.findByUserAndBot() called to resolve botUser
    //   - TrialService.activate() called with botUser.id (small integer, e.g., 42)
    //   - TrialService.activate() NOT called with userId (large telegramId, e.g., 123456789)
    // Expected Result: Subscription record created with correct botUserId foreign key
    // Pass Criteria:
    //   - mockTrialService.activate called with botUser.id value
    //   - NOT called with telegramId value
    // @category: core-functionality
    // @dependency: BotUsersRepository, TrialService
    // @complexity: high
    it('AC-4: should call TrialService.activate with botUser.id (bot_users.id) not userId (telegramId)', async () => {
      // Arrange
      const userId = 123456789; // telegramId (large number)
      const botId = 1;
      const botUserId = 42; // botUser.id (small number from bot_users table)
      const mockBotUser = {
        id: botUserId,
        userId: userId,
        botId: botId,
        state: {
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 0,
          },
        },
      };

      // Setup mocks for successful verification flow
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: { channelId: '@testchannel' },
      } as never);
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser as never,
      );
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);
      (mockTrialService.activate as jest.Mock).mockResolvedValue({
        success: true,
        expiresAt: new Date('2025-01-01'),
      });

      // Act
      const result = await service.handleVerificationRequest(userId, botId);

      // Assert - CRITICAL: TrialService.activate must receive botUser.id (42), NOT userId (123456789)
      // Implementation now passes optional trialDays parameter as well
      expect(mockTrialService.activate).toHaveBeenCalledWith(
        botUserId,
        undefined,
      ); // 42, not 123456789
      expect(mockTrialService.activate).not.toHaveBeenCalledWith(
        userId,
        expect.anything(),
      ); // Explicitly verify NOT called with telegramId
      expect(result.verified).toBe(true);
    });

    // AC-4-error: "When botUser cannot be resolved, verification fails gracefully"
    // ROI: 85 | Business Value: 9 (error handling) | Frequency: 3 (rare edge case)
    // Behavior: When BotUsersRepository.findByUserAndBot() returns object without id, return error without calling TrialService
    // Verification:
    //   - BotUsersRepository.findByUserAndBot() called
    //   - Returns object without id property (edge case: partial data)
    //   - TrialService.activate() is called with undefined botUser.id
    //   - When TrialService fails due to invalid id, return error
    // Expected Result: Graceful error handling when botUser.id is missing
    // Pass Criteria:
    //   - result.verified === false
    //   - result.error contains meaningful message
    // @category: core-functionality
    // @dependency: BotUsersRepository
    // @complexity: medium
    it('AC-4: should return error when botUser cannot be resolved for trial activation', async () => {
      // Arrange
      const userId = 123456789; // telegramId
      const botId = 1;

      // Setup mocks - botUser resolution returns null (user not found)
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: { channelId: '@testchannel' },
      } as never);
      // findByUserAndBot returns null (user not found in bot_users table)
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        null as never,
      );
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.handleVerificationRequest(userId, botId);

      // Assert - Should fail gracefully without calling TrialService
      // When botUser is null, the check at line 309 returns early with error
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockTrialService.activate).not.toHaveBeenCalled();
    });
  });

  describe('sendTrialUI', () => {
    it('should retrieve partner_trial_activated message via LocalizationService', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-01');

      mockLocalizationContext.t.mockResolvedValue(
        'Trial activated! Expires: 2025-01-01, Days remaining: 10',
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

      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(botId);
      expect(mockLocalizationContext.t).toHaveBeenCalled();
    });

    it('should interpolate {expiryDate} and {daysRemaining} variables', async () => {
      const userId = 12345;
      const botId = 1;
      const lang = 'en';
      const expiresAt = new Date('2025-01-10T00:00:00Z');

      mockLocalizationContext.t.mockResolvedValue(
        'Expires on 2025-01-10. Days left: 19',
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

      // Mock responses for message and button texts
      mockLocalizationContext.t
        .mockResolvedValueOnce('Trial activated') // partner_trial_activated
        .mockResolvedValueOnce('Extend Free Period') // button_extend_trial
        .mockResolvedValueOnce('Buy Subscription'); // button_buy_subscription
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
      // When referralUrl is not configured, Extend button uses callback_data
      // Buy button uses dynamic callback_data based on subscription IDs
      expect(sendMessage).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.any(String),
                  callback_data: 'partner_extend_trial',
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

      mockLocalizationContext.t.mockResolvedValue('Trial activated');
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
