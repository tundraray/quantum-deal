// Partner Bot Trial UI Action Tests
// Tests for button handlers: "Extend Free Period" and "Buy Subscription"

import type {
  BotUsersRepository,
  BotSettingsRepository,
} from '@quantumdeal/db';
import type { PartnerBotContext } from '../../interfaces';
import { TrialUIAction } from '../trial-ui.action';

// Test constants
const TEST_BOT_ID = 2;

describe('TrialUIAction', () => {
  let trialUIAction: TrialUIAction;
  let mockLocalizationService: {
    forBot: jest.Mock;
  };
  let mockLocalizationContext: {
    lang: jest.Mock;
    use: jest.Mock;
    t: jest.Mock;
  };
  let mockBotUsersRepository: Pick<BotUsersRepository, 'resolveLanguage'>;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;

  beforeEach(() => {
    // Setup LocalizationService mock with fluent API
    mockLocalizationContext = {
      lang: jest.fn().mockReturnThis(),
      use: jest.fn().mockReturnThis(),
      t: jest.fn().mockResolvedValue('Mocked message'),
    };
    mockLocalizationService = {
      forBot: jest.fn().mockReturnValue(mockLocalizationContext),
    };

    mockBotUsersRepository = {
      resolveLanguage: jest.fn(),
    };

    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    // Create instance with mocks
    trialUIAction = new TrialUIAction(
      mockLocalizationService as never,
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

  describe('handleTrialStatus', () => {
    it('should acknowledge callback query when user clicks trial status button', async () => {
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

      // Act
      await trialUIAction.handleTrialStatus(mockContext as PartnerBotContext);

      // Assert - should acknowledge callback query
      expect(mockContext.answerCbQuery).toHaveBeenCalled();

      // Assert - should NOT send any reply (informational button only)
      expect(mockContext.reply).not.toHaveBeenCalled();
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
      // Mock LocalizationService to return coming soon message
      mockLocalizationContext.t.mockResolvedValue(
        'This feature is coming soon!',
      );

      // Act
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert - uses LocalizationService instead of BotMessagesRepository
      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(TEST_BOT_ID);
      expect(mockLocalizationContext.lang).toHaveBeenCalledWith('en');
      expect(mockLocalizationContext.t).toHaveBeenCalledWith(
        'partner_coming_soon',
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
      // Mock LocalizationService to return custom message
      mockLocalizationContext.t.mockResolvedValue(
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

    it('should fall back to hardcoded message if localization fails', async () => {
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
      // Mock LocalizationService to throw an error
      mockLocalizationContext.t.mockRejectedValue(
        new Error('Localization not found'),
      );

      // Act
      await trialUIAction.handleBuy(mockContext as PartnerBotContext);

      // Assert - should fall back to hardcoded message
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

      // Should not call LocalizationService
      expect(mockLocalizationService.forBot).not.toHaveBeenCalled();
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
      expect(mockLocalizationService.forBot).not.toHaveBeenCalled();
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
