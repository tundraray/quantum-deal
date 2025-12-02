// Partner Bot Trial UI Action Tests
// Tests for button handlers: "Extend Free Period" and "Buy Subscription"

import type {
  BotMessagesRepository,
  BotUsersRepository,
  BotSettingsRepository,
} from '@quantumdeal/db';
import type { PartnerBotContext } from '../../interfaces';
import { TrialUIAction } from '../trial-ui.action';

// Test constants
const TEST_BOT_ID = 2;

describe('TrialUIAction', () => {
  let trialUIAction: TrialUIAction;
  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockBotUsersRepository: Pick<BotUsersRepository, 'resolveLanguage'>;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;

  beforeEach(() => {
    // Setup mocks
    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    mockBotUsersRepository = {
      resolveLanguage: jest.fn(),
    };

    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    // Create instance with mocks
    trialUIAction = new TrialUIAction(
      mockBotMessagesRepository as BotMessagesRepository,
      mockBotUsersRepository as BotUsersRepository,
      mockBotSettingsRepository as BotSettingsRepository,
    );
  });

  describe('handleExtend', () => {
    it('should retrieve bot settings when user clicks "Extend Free Period" button', async () => {
      // Arrange - context with botId from middleware
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
        settings: {
          referralUrl: 'https://partner.example.com/ref?id=12345',
        },
      });

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert - uses botId from context
      expect(mockBotSettingsRepository.findByBotId).toHaveBeenCalledWith(
        TEST_BOT_ID,
      );
    });

    it('should retrieve referral URL from bot_settings.referralUrl', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      const referralUrl = 'https://partner.example.com/ref?id=12345';
      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: {
          referralUrl,
        },
      });

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  url: referralUrl,
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    it('should validate referral URL is HTTPS format', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
        settings: {
          referralUrl: 'http://insecure.example.com', // HTTP, not HTTPS
        },
      });

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert - Should log error and send error message
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('error'),
      );
    });

    it('should send URL button to user when valid HTTPS URL', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
        settings: {
          referralUrl: 'https://partner.example.com/ref?id=12345',
        },
      });

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        }),
      );
    });

    it('should log error and send error message if referral URL missing', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
        settings: {}, // Missing referralUrl
      });

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('error'),
      );
    });

    it('should handle missing user context gracefully', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: undefined,
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      // Act & Assert - should not throw
      await expect(
        trialUIAction.handleExtend(mockContext as PartnerBotContext),
      ).resolves.not.toThrow();

      // Should not call settings repository
      expect(mockBotSettingsRepository.findByBotId).not.toHaveBeenCalled();
    });

    it('should handle missing botId in context gracefully', async () => {
      // Arrange - context without botId (should not happen in dynamic bots)
      const mockContext: Partial<PartnerBotContext> = {
        botId: undefined,
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
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert - should reply with error and not process further
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Configuration error. Please try again later.',
      );
      expect(mockBotSettingsRepository.findByBotId).not.toHaveBeenCalled();
    });

    it('should handle missing settings gracefully', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
      (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue(
        null,
      );

      // Act
      await trialUIAction.handleExtend(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('error'),
      );
    });
  });

  describe('handleBuy', () => {
    it('should retrieve partner_coming_soon message when user clicks "Buy Subscription" button', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'This feature is coming soon!',
      );

      // Act
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert - uses botId from context
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_coming_soon',
        'en',
      );
    });

    it('should send coming soon message to user', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Payment integration coming soon!',
      );

      // Act
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.answerCbQuery).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Payment integration coming soon!',
      );
    });

    it('should fall back to hardcoded message if not found in database', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
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
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockRejectedValue(
        new Error('Message not found'),
      );

      // Act
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        'This feature is coming soon!',
      );
    });

    it('should handle missing user context gracefully', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: undefined,
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      // Act & Assert - should not throw
      await expect(
        trialUIAction.handleBuy(mockContext as PartnerBotContext),
      ).resolves.not.toThrow();

      // Should not call message repository
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalled();
    });

    it('should handle missing botId in context gracefully', async () => {
      // Arrange - context without botId (should not happen in dynamic bots)
      const mockContext: Partial<PartnerBotContext> = {
        botId: undefined,
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
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert - should reply with error and not process further
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Configuration error. Please try again later.',
      );
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalled();
    });

    it('should never crash or error on any input', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        answerCbQuery: jest.fn().mockRejectedValue(new Error('Network error')),
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      // Act & Assert - should not throw
      await expect(
        trialUIAction.handleBuy(mockContext as PartnerBotContext),
      ).resolves.not.toThrow();

      // Should still send fallback message
      expect(mockContext.reply).toHaveBeenCalled();
    });
  });
});
