// Partner Bot Start Command Tests
// Tests for /start command handler that sends welcome message and channel subscription prompt

import type {
  BotMessagesRepository,
  BotUsersRepository,
} from '@quantumdeal/db';
import type { PartnerFlowService } from '../../../services/partner-flow.service';
import type { PartnerBotContext } from '../../../interfaces';
import { StartCommandUpdate } from '../start.update';

// Test constants
const TEST_BOT_ID = 2;

describe('StartCommandUpdate', () => {
  let startCommandUpdate: StartCommandUpdate;
  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockPartnerFlowService: Pick<PartnerFlowService, 'sendChannelPrompt'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'updateState' | 'resolveLanguage'
  >;

  beforeEach(() => {
    // Setup mocks
    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    mockPartnerFlowService = {
      sendChannelPrompt: jest.fn(),
    };

    mockBotUsersRepository = {
      updateState: jest.fn(),
      resolveLanguage: jest.fn(),
    };

    // Create instance with mocks
    startCommandUpdate = new StartCommandUpdate(
      mockBotMessagesRepository as BotMessagesRepository,
      mockPartnerFlowService as PartnerFlowService,
      mockBotUsersRepository as BotUsersRepository,
    );
  });

  describe('handleStart', () => {
    it('should send welcome message when user sends /start command', async () => {
      // Arrange - context with botId from middleware
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Welcome to the partner bot! Here you can activate trial access to our channels.',
      );
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue({});
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - uses botId from context
      expect(mockBotUsersRepository.resolveLanguage).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        'en',
      );
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Welcome to the partner bot! Here you can activate trial access to our channels.',
      );
    });

    it('should initialize bot_users.state.verification to awaiting_channel_subscription', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Welcome message',
      );
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue({});
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - uses botId from context
      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        expect.objectContaining({
          verificationState: 'awaiting_channel_subscription',
        }),
      );
    });

    it('should call PartnerFlowService.sendChannelPrompt after welcome message', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Welcome message',
      );
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue({});
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - uses botId from context
      expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        'en',
      );
    });

    it('should handle missing user context gracefully', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: undefined,
        reply: jest.fn(),
      };

      // Act & Assert - should not throw
      await expect(
        startCommandUpdate.handleStart(mockContext as PartnerBotContext),
      ).resolves.not.toThrow();

      // Should not call any repository methods
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalled();
      expect(mockPartnerFlowService.sendChannelPrompt).not.toHaveBeenCalled();
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
        reply: jest.fn(),
      };

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should reply with error and not process further
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Configuration error. Please try again later.',
      );
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalled();
      expect(mockPartnerFlowService.sendChannelPrompt).not.toHaveBeenCalled();
    });

    it('should use fallback language when user language is not available', async () => {
      // Arrange
      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        from: {
          id: 123456,
          is_bot: false,
          first_name: 'Test',
          // No language_code provided
        },
        reply: jest.fn(),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Welcome message',
      );
      (mockBotUsersRepository.updateState as jest.Mock).mockResolvedValue({});
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should use 'en' as fallback with botId from context
      expect(mockBotUsersRepository.resolveLanguage).toHaveBeenCalledWith(
        123456,
        TEST_BOT_ID,
        'en',
      );
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );
    });
  });
});
