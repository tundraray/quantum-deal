import { ChannelVerifierService } from '../channel-verifier.service';
import type { BotUsersRepository } from '@quantumdeal/db';
import type { DynamicTelegrafService } from '@quantumdeal/telegraf';
import type { Telegraf, Context } from 'telegraf';

describe('ChannelVerifierService', () => {
  let service: ChannelVerifierService;
  let mockBot: Pick<Telegraf<Context>, 'telegram'>;
  let mockDynamicTelegrafService: Pick<DynamicTelegrafService, 'getBot'>;
  let mockBotUsersRepository: Pick<
    BotUsersRepository,
    'findByUserAndBot' | 'updateState'
  >;

  const TEST_BOT_ID = 1;

  beforeEach(() => {
    // Mock Telegraf bot instance
    mockBot = {
      telegram: {
        getChatMember: jest.fn(),
      },
    } as unknown as Pick<Telegraf<Context>, 'telegram'>;

    // Mock DynamicTelegrafService
    mockDynamicTelegrafService = {
      getBot: jest.fn().mockReturnValue(mockBot),
    };

    // Mock BotUsersRepository
    mockBotUsersRepository = {
      findByUserAndBot: jest.fn(),
      updateState: jest.fn(),
    };

    service = new ChannelVerifierService(
      mockDynamicTelegrafService as DynamicTelegrafService,
      mockBotUsersRepository as BotUsersRepository,
    );
  });

  describe('verifyMembership', () => {
    it('should return true for member status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'member',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
      expect(mockDynamicTelegrafService.getBot).toHaveBeenCalledWith(
        TEST_BOT_ID,
      );
      expect(mockBot.telegram.getChatMember).toHaveBeenCalledWith(
        '@testchannel',
        123,
      );
    });

    it('should return true for administrator status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'administrator',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
    });

    it('should return true for creator status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'creator',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
    });

    it('should return false for left status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'left',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(false);
    });

    it('should return false for kicked status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'kicked',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(false);
    });

    it('should return false for restricted status', async () => {
      (mockBot.telegram.getChatMember as jest.Mock).mockResolvedValue({
        status: 'restricted',
        user: { id: 123, is_bot: false, first_name: 'Test' },
      });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(false);
    });

    it('should return false for USER_ID_INVALID error (400)', async () => {
      const error = new Error('Bad Request: user not found');
      Object.assign(error, { response: { error_code: 400 } });
      (mockBot.telegram.getChatMember as jest.Mock).mockRejectedValue(error);

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(false);
    });

    it('should retry on 500 Internal Server Error', async () => {
      const error = new Error('Internal Server Error');
      Object.assign(error, { response: { error_code: 500 } });

      (mockBot.telegram.getChatMember as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          status: 'member',
          user: { id: 123, is_bot: false, first_name: 'Test' },
        });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.getChatMember).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      const error = new Error('Service Unavailable');
      Object.assign(error, { response: { error_code: 503 } });

      (mockBot.telegram.getChatMember as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          status: 'member',
          user: { id: 123, is_bot: false, first_name: 'Test' },
        });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.getChatMember).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 Too Many Requests', async () => {
      const error = new Error('Too Many Requests');
      Object.assign(error, { response: { error_code: 429 } });

      (mockBot.telegram.getChatMember as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          status: 'member',
          user: { id: 123, is_bot: false, first_name: 'Test' },
        });

      const result = await service.verifyMembership(
        '@testchannel',
        123,
        TEST_BOT_ID,
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.getChatMember).toHaveBeenCalledTimes(2);
    });

    it('should throw after 3 failed retry attempts', async () => {
      const error = new Error('Internal Server Error');
      Object.assign(error, { response: { error_code: 500 } });

      (mockBot.telegram.getChatMember as jest.Mock).mockRejectedValue(error);

      await expect(
        service.verifyMembership('@testchannel', 123, TEST_BOT_ID),
      ).rejects.toThrow();

      // Initial attempt + 3 retries = 4 total
      expect(mockBot.telegram.getChatMember).toHaveBeenCalledTimes(4);
    }, 10000); // 10 second timeout for retry test

    it('should throw error if bot not found', async () => {
      (mockDynamicTelegrafService.getBot as jest.Mock).mockReturnValue(
        undefined,
      );

      await expect(
        service.verifyMembership('@testchannel', 123, TEST_BOT_ID),
      ).rejects.toThrow(`Bot with ID ${TEST_BOT_ID} not found`);
    });
  });

  describe('isRateLimited', () => {
    it('should return false if attempts < 10', async () => {
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 5,
            lastVerificationAttempt: new Date().toISOString(),
          },
        },
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isRateLimited(123, 1);

      expect(result).toBe(false);
    });

    it('should return true if attempts >= 10 within 1 hour', async () => {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30); // 30 minutes ago

      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 10,
            lastVerificationAttempt: recentTime.toISOString(),
          },
        },
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isRateLimited(123, 1);

      expect(result).toBe(true);
    });

    it('should return false after 1 hour (rate limit reset)', async () => {
      const oldTime = new Date();
      oldTime.setHours(oldTime.getHours() - 2); // 2 hours ago

      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 10,
            lastVerificationAttempt: oldTime.toISOString(),
          },
        },
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isRateLimited(123, 1);

      expect(result).toBe(false);
    });

    it('should return false if no user record exists', async () => {
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.isRateLimited(123, 1);

      expect(result).toBe(false);
    });

    it('should return false if no state exists', async () => {
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: null,
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isRateLimited(123, 1);

      expect(result).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct attempts count and reset timestamp', async () => {
      const lastAttempt = new Date();
      lastAttempt.setMinutes(lastAttempt.getMinutes() - 30); // 30 minutes ago

      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: 7,
            lastVerificationAttempt: lastAttempt.toISOString(),
          },
        },
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getRateLimitStatus(123, 1);

      expect(result.attempts).toBe(7);
      expect(result.resetAt).toBeInstanceOf(Date);

      // Reset time should be 1 hour after last attempt
      const expectedResetTime = new Date(lastAttempt);
      expectedResetTime.setHours(expectedResetTime.getHours() + 1);
      expect(result.resetAt!.getTime()).toBe(expectedResetTime.getTime());
    });

    it('should return 0 attempts if no user record exists', async () => {
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getRateLimitStatus(123, 1);

      expect(result.attempts).toBe(0);
      expect(result.resetAt).toBeNull();
    });

    it('should return 0 attempts if no state exists', async () => {
      (mockBotUsersRepository.findByUserAndBot as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 123,
        botId: 1,
        state: null,
        lang: null,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getRateLimitStatus(123, 1);

      expect(result.attempts).toBe(0);
      expect(result.resetAt).toBeNull();
    });
  });
});
