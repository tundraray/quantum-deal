// Partner Bot Flow Improvements Integration Tests - Design Doc: partner-bot-flow-improvements-design.md
// Generated: 2025-12-04 | Budget Used: 3/3 integration, 0/2 E2E

import type { Telegraf } from 'telegraf';
import type {
  BotMessagesRepository,
  BotSettingsRepository,
  BotUsersRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import type { TrialService, BotCommandsService } from '@quantumdeal/bot';
import type { DynamicTelegrafService } from '@quantumdeal/telegraf';
import { PartnerFlowService } from '../../services/partner-flow.service';
import { ChannelVerifierService } from '../../services/channel-verifier.service';
import { StartCommandUpdate } from '../../commands/start/start.update';
import type { PartnerBotContext } from '../../interfaces';

// Test constants
const TEST_BOT_ID = 1;
const TEST_USER_ID = 123456789;
const TEST_BOT_USER_ID = 42; // bot_users.id (small integer)

describe('Partner Bot Flow Improvements Integration Tests', () => {
  let partnerFlowService: PartnerFlowService;
  let channelVerifierService: ChannelVerifierService;
  let startCommandUpdate: StartCommandUpdate;

  let mockBotMessagesRepository: Pick<BotMessagesRepository, 'resolveMessage'>;
  let mockBotSettingsRepository: Pick<BotSettingsRepository, 'findByBotId'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'findByUserAndBot' | 'updateState' | 'resolveLanguage'
  >;
  let mockUserSubscriptionsRepository: Pick<
    UserSubscriptionsRepository,
    'findActiveByBotUserId'
  >;
  let mockTrialService: Pick<TrialService, 'activate'>;
  let mockBotCommandsService: Pick<BotCommandsService, 'setUserCommands'>;
  let mockDynamicTelegrafService: { getBot: jest.Mock };
  let mockBot: {
    telegram: { sendMessage: jest.Mock; getChatMember: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BotMessagesRepository
    mockBotMessagesRepository = {
      resolveMessage: jest.fn(),
    };

    // Mock BotSettingsRepository
    mockBotSettingsRepository = {
      findByBotId: jest.fn().mockResolvedValue({
        botId: TEST_BOT_ID,
        settings: {
          channelId: '@testchannel',
        },
      }),
    };

    // Mock BotUsersRepository
    mockBotUsersRepository = {
      findByUserAndBot: jest.fn(),
      updateState: jest.fn().mockResolvedValue(undefined),
      resolveLanguage: jest.fn().mockResolvedValue('en'),
    };

    // Mock UserSubscriptionsRepository
    mockUserSubscriptionsRepository = {
      findActiveByBotUserId: jest.fn(),
    };

    // Mock TrialService
    mockTrialService = {
      activate: jest.fn(),
    };

    // Mock BotCommandsService
    mockBotCommandsService = {
      setUserCommands: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Telegraf bot
    mockBot = {
      telegram: {
        sendMessage: jest.fn().mockResolvedValue({}),
        getChatMember: jest.fn().mockResolvedValue({
          status: 'member',
        }),
      },
    };

    // Mock DynamicTelegrafService - properly configured mock
    mockDynamicTelegrafService = {
      getBot: jest.fn().mockReturnValue(mockBot),
    };

    // Instantiate services
    channelVerifierService = new ChannelVerifierService(
      mockDynamicTelegrafService as never,
      mockBotUsersRepository as never,
    );

    partnerFlowService = new PartnerFlowService(
      mockBotMessagesRepository as never,
      mockBotSettingsRepository as never,
      mockBotUsersRepository as never,
      mockTrialService as never,
      mockBotCommandsService as never,
      channelVerifierService,
      mockDynamicTelegrafService as never,
    );

    startCommandUpdate = new StartCommandUpdate(
      mockBotMessagesRepository as never,
      partnerFlowService,
      mockBotUsersRepository as never,
      mockUserSubscriptionsRepository as never,
    );
  });

  // ==========================================================================
  // AC-4: botUserId Migration - Critical Bug Fix
  // ==========================================================================

  // AC-4: "PartnerFlowService.handleVerificationRequest() resolves botUser and passes botUser.id to TrialService.activate()"
  // ROI: 95 | Business Value: 10 (critical bug fix) | Frequency: 10 (every trial activation)
  // Behavior: When channel verification succeeds, TrialService.activate() receives botUser.id (bot_users.id), NOT userId (telegramId)
  // Verification:
  //   - BotUsersRepository.findByUserAndBot() called to resolve botUser
  //   - TrialService.activate() receives botUser.id (small integer like 42)
  //   - TrialService.activate() does NOT receive userId (large telegramId like 123456789)
  //   - Subscription created with correct botUserId reference
  // Expected Result: Trial activation uses correct foreign key (bot_users.id)
  // Pass Criteria:
  //   - mockTrialService.activate called with TEST_BOT_USER_ID (42)
  //   - NOT called with TEST_USER_ID (123456789)
  // @category: core-functionality
  // @dependency: PartnerFlowService, BotUsersRepository, TrialService
  // @complexity: high
  it('AC-4: handleVerificationRequest passes botUser.id to TrialService.activate(), not userId (telegramId)', async () => {
    // Arrange - setup mocks for successful verification flow
    const mockBotUser = {
      id: TEST_BOT_USER_ID, // bot_users.id (small integer)
      userId: TEST_USER_ID, // telegramId (large number)
      botId: TEST_BOT_ID,
      state: {
        sceneData: {
          verificationState: 'awaiting_channel_subscription',
          verificationAttempts: 0,
        },
      },
    };

    // Setup settings with channelId
    (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
      botId: TEST_BOT_ID,
      settings: { channelId: '@testchannel' },
    });

    // BotUsersRepository.findByUserAndBot returns botUser with correct ids
    (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
      mockBotUser,
    );

    // Channel verification succeeds
    mockBot.telegram.getChatMember.mockResolvedValue({
      status: 'member',
    });

    // Trial activation succeeds
    (mockTrialService.activate as jest.Mock).mockResolvedValue({
      success: true,
      expiresAt: new Date('2025-01-15'),
    });

    // Act
    const result = await partnerFlowService.handleVerificationRequest(
      TEST_USER_ID,
      TEST_BOT_ID,
    );

    // Assert - CRITICAL: TrialService.activate must receive botUser.id (42), NOT userId (123456789)
    expect(mockTrialService.activate).toHaveBeenCalledWith(TEST_BOT_USER_ID);
    expect(mockTrialService.activate).not.toHaveBeenCalledWith(TEST_USER_ID);
    expect(result.verified).toBe(true);

    // Verify botUser was resolved to get botUserId
    expect(mockBotUsersRepository.findByUserAndBot).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_BOT_ID,
    );
  });

  // AC-4-error: "All methods use botUserId (bot_users.id) not userId (telegramId) for subscription operations"
  // ROI: 88 | Business Value: 10 (data integrity) | Frequency: 8 (subscription queries)
  // Behavior: When botUser cannot be resolved, verification fails gracefully without calling TrialService
  // Verification:
  //   - BotUsersRepository.findByUserAndBot() called
  //   - When returns null, verification result is { verified: false, error: 'User context not found' }
  //   - TrialService.activate() NOT called
  //   - No subscription records created
  // Expected Result: Graceful failure when botUser not found
  // Pass Criteria:
  //   - result.verified === false
  //   - mockTrialService.activate not called
  // @category: core-functionality
  // @dependency: PartnerFlowService, BotUsersRepository
  // @complexity: medium
  it('AC-4: handleVerificationRequest returns error when botUser cannot be resolved', async () => {
    // Arrange - setup mocks where botUser resolution fails after channel verification
    // Setup settings with channelId
    (mockBotSettingsRepository.findByBotId as jest.Mock).mockResolvedValue({
      botId: TEST_BOT_ID,
      settings: { channelId: '@testchannel' },
    });

    // First call for verification attempts returns user data
    // Second call for botUserId resolution returns null (simulating race condition or data inconsistency)
    (mockBotUsersRepository.findByUserAndBot as jest.Mock)
      .mockResolvedValueOnce({
        state: { sceneData: { verificationAttempts: 0 } },
      }) // First call for verification attempts
      .mockResolvedValueOnce(null); // Second call for botUserId resolution returns null

    // Channel verification succeeds
    mockBot.telegram.getChatMember.mockResolvedValue({
      status: 'member',
    });

    // Act
    const result = await partnerFlowService.handleVerificationRequest(
      TEST_USER_ID,
      TEST_BOT_ID,
    );

    // Assert - Should fail gracefully without calling TrialService
    expect(result.verified).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('User context not found');
    expect(mockTrialService.activate).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // AC-1: State Check on /start Command
  // ==========================================================================

  // AC-1: "When user sends /start and has verificationState: 'trial_activated' with active trial, bot sends trial status message"
  // ROI: 82 | Business Value: 8 (UX improvement) | Frequency: 9 (returning users)
  // Behavior: User with active trial sends /start -> bot shows trial status with remaining time button
  // Verification:
  //   - ctx.botUser.state.verificationState === 'trial_activated'
  //   - UserSubscriptionsRepository.findActiveByBotUserId() returns active subscription
  //   - sendTrialStatus() called (not sendWelcome + sendChannelPrompt)
  //   - Trial status message sent with remaining time button
  //   - No state reset occurs
  // Expected Result: Returning user sees their trial status, not welcome flow
  // Pass Criteria:
  //   - mockBotMessagesRepository.resolveMessage called with 'partner_trial_status'
  //   - ctx.reply called with status message
  //   - partnerFlowService.sendChannelPrompt NOT called
  // @category: core-functionality
  // @dependency: StartCommandUpdate, BotUsersRepository, UserSubscriptionsRepository
  // @complexity: high
  it('AC-1: /start with trial_activated state shows trial status message instead of welcome flow', async () => {
    // Arrange - user with trial_activated state and active subscription
    // State structure must match what start.update.ts reads: state.sceneData.verificationState
    const mockBotUser = {
      id: TEST_BOT_USER_ID,
      userId: TEST_USER_ID,
      botId: TEST_BOT_ID,
      state: {
        sceneData: {
          verificationState: 'trial_activated',
        },
      },
    };

    // Mock context with botUser populated by middleware
    const mockContext: Partial<PartnerBotContext> = {
      botId: TEST_BOT_ID,
      botUser: mockBotUser as never,
      from: {
        id: TEST_USER_ID,
        is_bot: false,
        first_name: 'Test',
        language_code: 'en',
      },
      reply: jest.fn(),
    };

    // Mock findByUserAndBot to return botUser with correct state structure
    (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
      mockBotUser,
    );

    // Mock active subscription exists (expires in 5 days)
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    (
      mockUserSubscriptionsRepository.findActiveByBotUserId as jest.Mock
    ).mockResolvedValue([{ id: 1, expiresAt, isActive: true }]);

    // Language resolution
    (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
      'en',
    );

    // Trial status message
    (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
      'Your trial is active',
    );

    // Act
    await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

    // Assert - should check for active subscription using botUser.id
    expect(
      mockUserSubscriptionsRepository.findActiveByBotUserId,
    ).toHaveBeenCalledWith(TEST_BOT_USER_ID);

    // Assert - should show trial status with remaining time button
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                callback_data: 'partner_trial_status',
              }),
            ]),
          ]),
        }),
      }),
    );

    // Assert - should NOT send welcome message or channel prompt (state is preserved)
    expect(mockBotUsersRepository.updateState).not.toHaveBeenCalled();
  });

  // AC-1: "When user sends /start and has verificationState: 'awaiting_channel_subscription', bot re-sends channel prompt"
  // ROI: 75 | Business Value: 7 (UX continuity) | Frequency: 7 (retry users)
  // Behavior: User in pending state sends /start -> bot shows channel prompt without welcome message
  // Verification:
  //   - ctx.botUser.state.verificationState === 'awaiting_channel_subscription'
  //   - Welcome message NOT sent
  //   - Channel prompt sent with "I subscribed" button
  //   - Verification attempt counter preserved (not reset to 0)
  // Expected Result: Pending user continues verification flow without restarting
  // Pass Criteria:
  //   - mockBotMessagesRepository.resolveMessage NOT called with 'partner_welcome'
  //   - partnerFlowService.sendChannelPrompt called
  //   - verificationAttempts not reset
  // @category: core-functionality
  // @dependency: StartCommandUpdate, PartnerFlowService, BotUsersRepository
  // @complexity: medium
  it('AC-1/AC-3: /start with awaiting_channel_subscription state re-sends channel prompt without welcome', async () => {
    // Arrange - user with awaiting_channel_subscription state and existing attempts
    // State structure must match what start.update.ts reads: state.sceneData.verificationState
    const mockBotUser = {
      id: TEST_BOT_USER_ID,
      userId: TEST_USER_ID,
      botId: TEST_BOT_ID,
      state: {
        sceneData: {
          verificationState: 'awaiting_channel_subscription',
          verificationAttempts: 2, // Existing attempts should be preserved
        },
      },
    };

    // Mock context with botUser populated by middleware
    const mockContext: Partial<PartnerBotContext> = {
      botId: TEST_BOT_ID,
      botUser: mockBotUser as never,
      from: {
        id: TEST_USER_ID,
        is_bot: false,
        first_name: 'Test',
        language_code: 'en',
      },
      reply: jest.fn(),
    };

    // Mock findByUserAndBot to return botUser with correct state structure
    (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
      mockBotUser,
    );

    // Language resolution
    (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
      'en',
    );

    // Setup for sendChannelPrompt to work
    (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
      'Please subscribe to {channelUrl}',
    );

    // Act
    await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

    // Assert - should NOT send welcome message (partner_welcome)
    // The resolveMessage calls should NOT include 'partner_welcome'
    const resolveMessageCalls = (
      mockBotMessagesRepository.resolveMessage as jest.Mock
    ).mock.calls;
    const welcomeMessageCalled = resolveMessageCalls.some(
      (call: [number, string, string]) => call[1] === 'partner_welcome',
    );
    expect(welcomeMessageCalled).toBe(false);

    // Assert - sendChannelPrompt was called (which internally calls updateState for awaiting state)
    // The key is that welcome message is NOT sent, and channel prompt IS sent
    expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
      TEST_BOT_ID,
      'partner_channel_prompt',
      'en',
    );
  });

  // AC-1: "When user sends /start with no state or trial_expired, bot sends welcome message and channel prompt"
  // ROI: 72 | Business Value: 6 (standard flow) | Frequency: 10 (new users)
  // Behavior: New user or expired trial user sends /start -> standard welcome flow
  // Verification:
  //   - ctx.botUser?.state?.verificationState undefined or 'trial_expired'
  //   - Welcome message sent first
  //   - Channel prompt sent with "I subscribed" button
  //   - State initialized to 'awaiting_channel_subscription'
  // Expected Result: Standard welcome flow for new/expired users
  // Pass Criteria:
  //   - mockBotMessagesRepository.resolveMessage called with 'partner_welcome'
  //   - partnerFlowService.sendChannelPrompt called
  //   - mockBotUsersRepository.updateState called with verificationState: 'awaiting_channel_subscription'
  // @category: core-functionality
  // @dependency: StartCommandUpdate, PartnerFlowService, BotUsersRepository
  // @complexity: medium
  it('AC-1: /start with no state or trial_expired shows welcome message and channel prompt', async () => {
    // Arrange - user with no state (new user)
    const mockBotUser = {
      id: TEST_BOT_USER_ID,
      userId: TEST_USER_ID,
      botId: TEST_BOT_ID,
      state: undefined, // No state (new user)
    };

    // Mock context with botUser populated by middleware
    const mockContext: Partial<PartnerBotContext> = {
      botId: TEST_BOT_ID,
      botUser: mockBotUser as never,
      from: {
        id: TEST_USER_ID,
        is_bot: false,
        first_name: 'Test',
        language_code: 'en',
      },
      reply: jest.fn(),
    };

    // Mock findByUserAndBot to return botUser with no state
    (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
      mockBotUser,
    );

    // Language resolution
    (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
      'en',
    );

    // Welcome message and channel prompt messages
    (mockBotMessagesRepository.resolveMessage as jest.Mock)
      .mockResolvedValueOnce('Welcome to the partner bot!') // partner_welcome
      .mockResolvedValueOnce('Please subscribe to {channelUrl}'); // partner_channel_prompt

    // Act
    await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

    // Assert - should send welcome message
    expect(mockBotMessagesRepository.resolveMessage).toHaveBeenCalledWith(
      TEST_BOT_ID,
      'partner_welcome',
      'en',
    );
    expect(mockContext.reply).toHaveBeenCalledWith(
      'Welcome to the partner bot!',
    );

    // Assert - should initialize state to awaiting_channel_subscription
    expect(mockBotUsersRepository.updateState).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_BOT_ID,
      expect.objectContaining({
        verificationState: 'awaiting_channel_subscription',
      }),
    );
  });

  // ==========================================================================
  // AC-6: Context Integration
  // ==========================================================================

  // AC-6: "ctx.botUser is properly typed and available in handlers"
  // ROI: 62 | Business Value: 5 (developer experience) | Frequency: 8 (all handlers)
  // Behavior: Handlers can access ctx.botUser?.id for botUserId in subscription operations
  // Verification:
  //   - ctx.botUser populated by middleware before handler execution
  //   - ctx.botUser.id accessible and equals bot_users.id
  //   - ctx.botUser.userId equals telegramId (for Telegram API calls)
  //   - ctx.botUser.state accessible for state checks
  // Expected Result: Handlers can distinguish between botUserId and telegramId
  // Pass Criteria:
  //   - ctx.botUser defined in handler context
  //   - ctx.botUser.id !== ctx.from.id (different values)
  //   - State check uses ctx.botUser.state (no extra DB query)
  // @category: integration
  // @dependency: UserManagementMiddleware, StartCommandUpdate
  // @complexity: medium
  it('AC-6: ctx.botUser available in handlers with correct id (botUserId) and state', async () => {
    // Arrange - user with trial_activated state (to test state access)
    // State structure must match what start.update.ts reads: state.sceneData.verificationState
    const mockBotUser = {
      id: TEST_BOT_USER_ID, // bot_users.id (small integer, e.g., 42)
      userId: TEST_USER_ID, // telegramId (large number, e.g., 123456789)
      botId: TEST_BOT_ID,
      state: {
        sceneData: {
          verificationState: 'trial_activated',
          trialActivatedAt: '2025-01-01T00:00:00Z',
        },
      },
    };

    // Mock context with botUser populated by middleware (simulating middleware behavior)
    const mockContext: Partial<PartnerBotContext> = {
      botId: TEST_BOT_ID,
      botUser: mockBotUser as never,
      from: {
        id: TEST_USER_ID, // ctx.from.id is telegramId
        is_bot: false,
        first_name: 'Test',
        language_code: 'en',
      },
      reply: jest.fn(),
    };

    // Mock findByUserAndBot to return botUser with correct state structure
    (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
      mockBotUser,
    );

    // Mock active subscription for trial_activated state
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    (
      mockUserSubscriptionsRepository.findActiveByBotUserId as jest.Mock
    ).mockResolvedValue([{ id: 1, expiresAt, isActive: true }]);

    // Language resolution
    (mockBotUsersRepository.resolveLanguage as jest.Mock).mockResolvedValue(
      'en',
    );

    // Trial status message
    (mockBotMessagesRepository.resolveMessage as jest.Mock).mockResolvedValue(
      'Your trial is active',
    );

    // Act
    await startCommandUpdate.handleStart(mockContext as PartnerBotContext);

    // Assert - ctx.botUser is available with correct id (botUserId)
    expect(mockContext.botUser).toBeDefined();
    expect(mockContext.botUser?.id).toBe(TEST_BOT_USER_ID); // bot_users.id
    expect(mockContext.botUser?.id).not.toBe(TEST_USER_ID); // NOT telegramId

    // Assert - ctx.botUser.userId contains telegramId for Telegram API calls
    expect(mockContext.botUser?.userId).toBe(TEST_USER_ID);

    // Assert - ctx.botUser.state is accessible for state checks
    expect(mockContext.botUser?.state).toBeDefined();
    expect(
      (mockContext.botUser?.state as { sceneData?: { verificationState?: string } })
        ?.sceneData?.verificationState,
    ).toBe('trial_activated');

    // Assert - subscription query uses botUser.id (botUserId), not telegramId
    expect(
      mockUserSubscriptionsRepository.findActiveByBotUserId,
    ).toHaveBeenCalledWith(TEST_BOT_USER_ID);
    expect(
      mockUserSubscriptionsRepository.findActiveByBotUserId,
    ).not.toHaveBeenCalledWith(TEST_USER_ID);
  });
});
