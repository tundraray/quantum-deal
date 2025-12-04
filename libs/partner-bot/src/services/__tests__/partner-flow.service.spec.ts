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
      expect(mockTrialService.activate).toHaveBeenCalledWith(botUserId);
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
      expect(mockTrialService.activate).toHaveBeenCalledWith(botUserId); // 42, not 123456789
      expect(mockTrialService.activate).not.toHaveBeenCalledWith(userId); // Explicitly verify NOT called with telegramId
      expect(result.verified).toBe(true);
    });

    // AC-4-error: "When botUser cannot be resolved, verification fails gracefully"
    // ROI: 85 | Business Value: 9 (error handling) | Frequency: 3 (rare edge case)
    // Behavior: When BotUsersRepository.findByUserAndBot() returns null, return error without calling TrialService
    // Verification:
    //   - BotUsersRepository.findByUserAndBot() called
    //   - Returns null (user not found in bot_users table)
    //   - TrialService.activate() NOT called
    //   - Return { verified: false, error: 'User context not found' }
    // Expected Result: Graceful error handling, no subscription created
    // Pass Criteria:
    //   - result.verified === false
    //   - result.error contains meaningful message
    //   - mockTrialService.activate not called
    // @category: core-functionality
    // @dependency: BotUsersRepository
    // @complexity: medium
    it('AC-4: should return error when botUser cannot be resolved for trial activation', async () => {
      // Arrange
      const userId = 123456789; // telegramId
      const botId = 1;

      // Setup mocks - botUser resolution returns null after channel verification succeeds
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId,
        settings: { channelId: '@testchannel' },
      } as never);
      // First call returns user for rate limit check (with no state), second call (for botUserId resolution) returns null
      (mockBotUsersRepository.findByUserAndBot as jest.Mock)
        .mockResolvedValueOnce({
          state: { sceneData: { verificationAttempts: 0 } },
        } as never) // First call for verification attempts
        .mockResolvedValueOnce(null as never); // Second call for botUserId resolution returns null
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.handleVerificationRequest(userId, botId);

      // Assert - Should fail gracefully without calling TrialService
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockTrialService.activate).not.toHaveBeenCalled();
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
