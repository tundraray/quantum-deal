// Partner Bot Channel Verification Action Tests
// Tests for "I subscribed" button callback handler that verifies channel membership

import type {
  BotMessagesRepository,
  BotUsersRepository,
  BotSettingsRepository,
} from '@quantumdeal/db';
import type { ChannelVerifierService } from '../../services/channel-verifier.service';
import type { PartnerFlowService } from '../../services/partner-flow.service';
import type { PartnerBotContext } from '../../interfaces';
import { ChannelVerificationAction } from '../channel-verification.action';

// Test constants
const TEST_BOT_ID = 2;

describe('ChannelVerificationAction', () => {
  let channelVerificationAction: ChannelVerificationAction;
  let mockChannelVerifierService: Pick<
    ChannelVerifierService,
    'isRateLimited' | 'verifyMembership' | 'getRateLimitStatus'
  >;
  let mockPartnerFlowService: Pick<
    PartnerFlowService,
    'handleVerificationRequest' | 'sendTrialUI'
  >;
  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'findByUserAndBot' | 'updateState' | 'resolveLanguage'
  >;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;

  beforeEach(() => {
    // Setup mocks
    mockChannelVerifierService = {
      isRateLimited: jest.fn(),
      verifyMembership: jest.fn(),
      getRateLimitStatus: jest.fn(),
    };

    mockPartnerFlowService = {
      handleVerificationRequest: jest.fn(),
      sendTrialUI: jest.fn(),
    };

    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    mockBotUsersRepository = {
      findByUserAndBot: jest.fn(),
      updateState: jest.fn(),
      resolveLanguage: jest.fn(),
    };

    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    // Create instance with mocks
    channelVerificationAction = new ChannelVerificationAction(
      mockChannelVerifierService as ChannelVerifierService,
      mockPartnerFlowService as PartnerFlowService,
      mockBotMessagesRepository as BotMessagesRepository,
      mockBotUsersRepository as BotUsersRepository,
      mockBotSettingsRepository as BotSettingsRepository,
    );
  });

  describe('handleVerify', () => {
    it('should answer callback query and get user language', async () => {
      // Arrange - context with botId from middleware and user with botUserId
      // Note: Rate limiting and attempt tracking have been moved to service layer
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - callback query is answered and language is resolved
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockBotUsersRepository.resolveLanguage).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        'en',
      );
    });

    it('should get partner channel ID from settings', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - bot settings are retrieved to get channel ID
      expect(mockBotSettingsRepository.findByBotId).toHaveBeenCalledWith(
        TEST_BOT_ID,
      );
      expect(mockChannelVerifierService.verifyMembership).toHaveBeenCalledWith(
        '@testchannel',
        123456,
        TEST_BOT_ID,
      );
    });

    it('should verify channel membership before processing trial activation', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
        trialExpiresAt: new Date('2025-12-09'),
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - membership is verified then trial flow is triggered
      expect(mockChannelVerifierService.verifyMembership).toHaveBeenCalledWith(
        '@testchannel',
        123456,
        TEST_BOT_ID,
      );
      expect(
        mockPartnerFlowService.handleVerificationRequest,
      ).toHaveBeenCalledWith(123456, TEST_BOT_ID);
    });

    it('should send failure message with retry button when membership verification fails', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(false);
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Verification failed.',
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - failure message with retry button is sent
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_verification_failed',
        'en',
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Verification failed.',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  callback_data: 'partner_verify_subscription',
                }),
              ]),
            ]),
          }),
        }),
      );
      // Trial flow should not be triggered
      expect(
        mockPartnerFlowService.handleVerificationRequest,
      ).not.toHaveBeenCalled();
    });

    it('should call ChannelVerifierService.verifyMembership with channel ID and user ID', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        userId: 123456,
        botId: TEST_BOT_ID,
        state: { verificationAttempts: 0 },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert
      expect(mockChannelVerifierService.verifyMembership).toHaveBeenCalledWith(
        '@testchannel',
        123456,
        TEST_BOT_ID,
      );
    });

    it('should call PartnerFlowService.handleVerificationRequest when verified', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        userId: 123456,
        botId: TEST_BOT_ID,
        state: { verificationAttempts: 0 },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
        trialExpiresAt: new Date('2025-12-09'),
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - uses botId from context
      expect(
        mockPartnerFlowService.handleVerificationRequest,
      ).toHaveBeenCalledWith(123456, TEST_BOT_ID);
    });

    it('should send trial UI via PartnerFlowService.sendTrialUI when verification succeeds', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      const expiresAt = new Date('2025-12-09');
      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        userId: 123456,
        botId: TEST_BOT_ID,
        state: { verificationAttempts: 0 },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(true);
      (
        mockPartnerFlowService.handleVerificationRequest as jest.Mock
      ).mockResolvedValue({
        verified: true,
        trialExpiresAt: expiresAt,
      });
      (mockPartnerFlowService.sendTrialUI as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - uses botId from context
      expect(mockPartnerFlowService.sendTrialUI).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        'en',
        expiresAt,
      );
    });

    it('should send partner_verification_failed message when verification fails', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        userId: 123456,
        botId: TEST_BOT_ID,
        state: { verificationAttempts: 0 },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(false);
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Verification failed. Please subscribe to @testchannel first.',
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - uses botId from context
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_verification_failed',
        'en',
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Verification failed. Please subscribe to @testchannel first.',
        expect.objectContaining({
          reply_markup: expect.any(Object),
        }),
      );
    });

    it('should include retry button when verification fails', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: { channelId: '@testchannel' },
      });
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        userId: 123456,
        botId: TEST_BOT_ID,
        state: { verificationAttempts: 0 },
      });
      (
        mockChannelVerifierService.verifyMembership as jest.Mock
      ).mockResolvedValue(false);
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Verification failed.',
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Verification failed.',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: 'Try Again',
                  callback_data: 'partner_verify_subscription',
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    it('should handle missing user context gracefully', async () => {
      // Arrange - missing ctx.user.botUserId or ctx.from.id
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: undefined,
        from: undefined,
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      // Act & Assert - should not throw
      await expect(
        channelVerificationAction.handleVerify(
          mockContext as PartnerBotContext,
        ),
      ).resolves.not.toThrow();

      // Should not call verification services (early return due to missing user context)
      expect(mockChannelVerifierService.isRateLimited).not.toHaveBeenCalled();
      expect(
        mockChannelVerifierService.verifyMembership,
      ).not.toHaveBeenCalled();
    });

    it('should handle missing botId in context gracefully', async () => {
      // Arrange - context without botId (should not happen in dynamic bots)
      // Must provide user.botUserId and from.id to pass the first user context check
      const mockContext: Partial<PartnerBotContext> = {
        botId: undefined,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert - should reply with error and not process further
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Configuration error. Please try again later.',
      );
      expect(mockChannelVerifierService.isRateLimited).not.toHaveBeenCalled();
      expect(
        mockChannelVerifierService.verifyMembership,
      ).not.toHaveBeenCalled();
    });

    it('should handle missing partner configuration gracefully', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        user: { botUserId: 42 } as unknown as PartnerBotContext['user'],
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockChannelVerifierService.isRateLimited as jest.Mock).mockResolvedValue(
        false,
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue(
        null,
      );

      // Act
      await channelVerificationAction.handleVerify(
        mockContext as PartnerBotContext,
      );

      // Assert
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Configuration error. Please contact support.',
      );
      expect(
        mockChannelVerifierService.verifyMembership,
      ).not.toHaveBeenCalled();
    });
  });
});
