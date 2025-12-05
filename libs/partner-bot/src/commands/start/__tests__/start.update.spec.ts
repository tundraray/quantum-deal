// Partner Bot Start Command Tests
// Tests for /start command handler that sends welcome message and channel subscription prompt
// Updated: 2025-12-04 - Added state check tests (AC-1, AC-2, AC-3)

import type {
  BotMessagesRepository,
  BotUsersRepository,
  UserSubscriptionsRepository,
  BotSettingsRepository,
  BotUser,
} from '@quantumdeal/db';
import type { PartnerFlowService } from '../../../services/partner-flow.service';
import type { PartnerBotContext } from '../../../interfaces';
import { StartCommandUpdate } from '../start.update';

// Test constants
const TEST_BOT_ID = 2;
const TEST_USER_ID = 123456;
const TEST_BOT_USER_ID = 42; // bot_users.id (auto-generated, small integer)

describe('StartCommandUpdate', () => {
  let startCommandUpdate: StartCommandUpdate;
  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockPartnerFlowService: Pick<PartnerFlowService, 'sendChannelPrompt'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'updateState' | 'resolveLanguage' | 'findByUserAndBot'
  >;
  let mockUserSubscriptionsRepository: Pick<
    UserSubscriptionsRepository,
    'findActiveByBotUserId'
  >;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;

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
      findByUserAndBot: jest.fn(),
    };

    mockUserSubscriptionsRepository = {
      findActiveByBotUserId: jest.fn(),
    };

    mockBotSettingsRepository = {
      findByBotId: jest.fn(),
    };

    // Create instance with mocks
    startCommandUpdate = new StartCommandUpdate(
      mockBotMessagesRepository as BotMessagesRepository,
      mockPartnerFlowService as PartnerFlowService,
      mockBotUsersRepository as BotUsersRepository,
      mockUserSubscriptionsRepository as UserSubscriptionsRepository,
      mockBotSettingsRepository as BotSettingsRepository,
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
        reply: jest.fn().mockResolvedValue(undefined),
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
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        }),
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
        reply: jest.fn().mockResolvedValue(undefined),
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
        reply: jest.fn().mockResolvedValue(undefined),
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
        reply: jest.fn().mockResolvedValue(undefined),
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
        reply: jest.fn().mockResolvedValue(undefined),
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
        reply: jest.fn().mockResolvedValue(undefined),
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

    // ==========================================================================
    // AC-1: State Check on /start Command Tests
    // Design Doc: partner-bot-flow-improvements-design.md
    // ==========================================================================

    // AC-1: "When user sends /start and has verificationState: 'trial_activated' with active trial, bot sends trial status message"
    it('AC-1: should show trial status message when user has trial_activated state with active subscription', async () => {
      // Arrange - user with trial_activated state and active subscription
      // Note: verificationState is stored in state.sceneData.verificationState
      // per the state reading pattern in start.update.ts lines 82-84
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'trial_activated',
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      // Mock active subscription exists
      (
        mockUserSubscriptionsRepository.findActiveByBotUserId as jest.Mock
      ).mockResolvedValue([
        { id: 1, expiresAt: new Date(Date.now() + 86400000), isActive: true },
      ]);

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );

      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should check active subscription
      expect(
        mockUserSubscriptionsRepository.findActiveByBotUserId,
      ).toHaveBeenCalledWith(TEST_BOT_USER_ID);

      // Assert - should NOT send welcome message
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );

      // Assert - should NOT call sendChannelPrompt
      expect(mockPartnerFlowService.sendChannelPrompt).not.toHaveBeenCalled();

      // Assert - should NOT reset state
      expect(mockBotUsersRepository.updateState).not.toHaveBeenCalled();

      // Assert - should reply with trial status (placeholder for TASK-003)
      expect(mockContext.reply).toHaveBeenCalled();
    });

    // AC-1/AC-3: "When user sends /start and has verificationState: 'awaiting_channel_subscription', bot re-sends channel prompt"
    it('AC-1/AC-3: should re-send channel prompt without welcome when user has awaiting_channel_subscription state', async () => {
      // Arrange - user with awaiting_channel_subscription state
      // Note: verificationState is stored in state.sceneData.verificationState
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 2, // Existing attempts should be preserved
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );
      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should send channel prompt
      expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_BOT_ID,
        'en',
      );

      // Assert - should NOT send welcome message
      expect(mockBotMessagesRepository.resolveMessage).not.toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );

      // Assert - should NOT reset state (preserves verificationAttempts)
      expect(mockBotUsersRepository.updateState).not.toHaveBeenCalled();
    });

    // AC-1: "When user sends /start with no state or trial_expired, bot sends welcome message and channel prompt"
    it('AC-1: should show welcome message and channel prompt when user has no state', async () => {
      // Arrange - user with no state (new user)
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: undefined, // No state
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
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
      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should send welcome message
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        'Welcome message',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        }),
      );

      // Assert - should initialize state
      expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_BOT_ID,
        expect.objectContaining({
          verificationState: 'awaiting_channel_subscription',
        }),
      );

      // Assert - should send channel prompt
      expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_BOT_ID,
        'en',
      );
    });

    it('AC-1: should show welcome message and channel prompt when user has trial_expired state', async () => {
      // Arrange - user with trial_expired state
      // Note: verificationState is stored in state.sceneData.verificationState
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'trial_expired',
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
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
      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should send welcome message
      expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
        TEST_BOT_ID,
        'partner_welcome',
        'en',
      );

      // Assert - should initialize state
      expect(mockBotUsersRepository.updateState).toHaveBeenCalled();

      // Assert - should send channel prompt
      expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalled();
    });

    // AC-1: "State check uses ctx.botUser.state from middleware context (no extra DB query)"
    it('AC-1: should use ctx.botUser.state from context without extra DB query', async () => {
      // Arrange - user with awaiting_channel_subscription state from middleware
      // Note: verificationState is stored in state.sceneData.verificationState
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser, // Already populated by middleware
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );
      (mockPartnerFlowService.sendChannelPrompt as jest.Mock).mockResolvedValue(
        undefined,
      );
      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should use the botUser state (read via findByUserAndBot)
      // and not call updateState since awaiting_channel_subscription just re-sends prompt
      expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_BOT_ID,
        'en',
      );

      // Assert - state was used correctly
      expect(mockBotUsersRepository.updateState).not.toHaveBeenCalled();
    });

    // ==========================================================================
    // AC-2: Trial Status Button Display Tests
    // Design Doc: partner-bot-flow-improvements-design.md
    // ==========================================================================

    // AC-2: "Trial status button shows 'Trial: X days remaining' for >= 1 day"
    // ROI: 70 | Business Value: 6 (UX clarity) | Frequency: 8 (returning users with active trial)
    // Behavior: When trial has >= 1 day remaining, button text shows days
    // Verification:
    //   - Calculate days remaining: Math.floor((expiresAt - now) / (24 * 60 * 60 * 1000))
    //   - If daysRemaining >= 1: button text = "Trial: X days remaining"
    //   - Button callback_data = 'partner_trial_status'
    // Expected Result: User sees clear remaining days
    // Pass Criteria:
    //   - Button text matches pattern /Trial: \d+ days? remaining/
    //   - Callback data === 'partner_trial_status'
    // @category: ux
    // @dependency: StartCommandUpdate (sendTrialStatus method)
    // @complexity: low
    it('AC-2: should show trial button with days remaining when >= 1 day left', async () => {
      // Arrange - user with trial_activated state
      // Note: verificationState is stored in state.sceneData.verificationState
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'trial_activated',
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      // Subscription expires in 5 days + 1 hour (to avoid edge case timing issues)
      const expiresAt = new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
      );
      (
        mockUserSubscriptionsRepository.findActiveByBotUserId as jest.Mock
      ).mockResolvedValue([{ id: 1, expiresAt, isActive: true }]);

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Your trial is active',
      );

      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should show button with days remaining (pattern matches any number of days)
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringMatching(/Trial: \d+ days? remaining/i),
                  callback_data: 'partner_trial_status',
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    // AC-2: "Trial status button shows 'Trial: Y hours remaining' for < 1 day remaining"
    // ROI: 55 | Business Value: 5 (UX clarity) | Frequency: 4 (edge case - last day users)
    // Behavior: When trial has < 1 day remaining, button text shows hours
    // Verification:
    //   - Calculate hours remaining: Math.floor((expiresAt - now) / (60 * 60 * 1000))
    //   - If daysRemaining < 1 AND hoursRemaining > 0: button text = "Trial: Y hours remaining"
    //   - Button callback_data = 'partner_trial_status'
    // Expected Result: User sees urgent remaining hours
    // Pass Criteria:
    //   - Button text matches pattern /Trial: \d+ hours? remaining/
    //   - Callback data === 'partner_trial_status'
    // @category: ux
    // @dependency: StartCommandUpdate (sendTrialStatus method)
    // @complexity: low
    it('AC-2: should show trial button with hours remaining when < 1 day left', async () => {
      // Arrange - user with trial_activated state
      // Note: verificationState is stored in state.sceneData.verificationState
      const mockBotUser = {
        id: TEST_BOT_USER_ID,
        userId: BigInt(TEST_USER_ID),
        botId: TEST_BOT_ID,
        state: {
          sceneData: {
            verificationState: 'trial_activated',
          },
        },
      } as unknown as BotUser;

      const mockContext: Partial<PartnerBotContext> = {
        botId: TEST_BOT_ID,
        botUser: mockBotUser,
        from: {
          id: TEST_USER_ID,
          is_bot: false,
          first_name: 'Test',
          language_code: 'en',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      // Subscription expires in 12 hours (using Math.floor means we expect 11-12 hours display)
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      (
        mockUserSubscriptionsRepository.findActiveByBotUserId as jest.Mock
      ).mockResolvedValue([{ id: 1, expiresAt, isActive: true }]);

      (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
        'en',
      );

      (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
        'Your trial is active',
      );

      // Mock findByUserAndBot to return the botUser
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        mockBotUser,
      );

      // Act
      await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

      // Assert - should show button with hours remaining (pattern matches any number of hours)
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringMatching(/Trial: \d+ hours? remaining/i),
                  callback_data: 'partner_trial_status',
                }),
              ]),
            ]),
          }),
        }),
      );
    });

    // ==========================================================================
    // AC-6: Context Integration Tests
    // Design Doc: partner-bot-flow-improvements-design.md
    // ==========================================================================

    // AC-6: "ctx.botUser is properly typed and available in handlers"
    // ROI: 62 | Business Value: 5 (developer experience) | Frequency: 8 (all handlers)
    // Behavior: ctx.botUser available with correct id (botUserId) for subscription operations
    // Verification:
    //   - ctx.botUser populated by middleware before handler
    //   - ctx.botUser.id === bot_users.id (small integer, e.g., 42)
    //   - ctx.botUser.userId === telegramId (large number, e.g., 123456789)
    //   - ctx.botUser.state accessible for state checks
    // Expected Result: Handlers can use ctx.botUser.id for subscription queries
    // Pass Criteria:
    //   - ctx.botUser defined in handler
    //   - ctx.botUser.id !== ctx.from.id (different values)
    //   - State accessible via ctx.botUser.state
    // @category: integration
    // @dependency: UserManagementMiddleware
    // @complexity: medium
    it.todo(
      'AC-6: should have ctx.botUser available with botUserId (bot_users.id) and state',
    );
  });
});
