import { Injectable, Logger } from '@nestjs/common';
import { BotUsersRepository } from '@quantumdeal/db';
import { DynamicTelegrafService } from '@quantumdeal/telegraf';

/**
 * Rate limit status for channel verification attempts
 */
interface RateLimitStatus {
  attempts: number;
  resetAt: Date | null;
}

/**
 * Telegram API error with response code
 */
interface TelegramError extends Error {
  response?: {
    error_code?: number;
  };
}

/**
 * ChannelVerifierService
 *
 * Verifies user membership in partner Telegram channels using Bot API.
 * Includes rate limiting (10 attempts per hour per user) and exponential
 * backoff retry for API errors.
 *
 * Valid membership statuses: 'member', 'administrator', 'creator'
 * Invalid statuses: 'left', 'kicked', 'restricted'
 *
 * Retry logic:
 * - Retryable errors: 500 (Internal Server Error), 503 (Service Unavailable), 429 (Too Many Requests)
 * - Non-retryable: 400 (Bad Request), 403 (Forbidden)
 * - Backoff intervals: 1s, 2s, 4s (3 attempts total)
 */
@Injectable()
export class ChannelVerifierService {
  private readonly logger = new Logger(ChannelVerifierService.name);
  private readonly RATE_LIMIT_MAX_ATTEMPTS = 10;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

  constructor(
    private readonly dynamicTelegrafService: DynamicTelegrafService,
    private readonly botUsersRepository: BotUsersRepository,
  ) {}

  /**
   * Verify user membership in channel
   *
   * @param channelId - Channel identifier (e.g., '@channelname' or channel ID)
   * @param userId - Telegram user ID
   * @param botId - Bot ID to use for verification
   * @returns true if user is member/administrator/creator, false otherwise
   * @throws Error after 3 failed retry attempts or if bot not found
   */
  async verifyMembership(
    channelId: string,
    userId: number,
    botId: number,
  ): Promise<boolean> {
    const bot = this.dynamicTelegrafService.getBot(botId);
    if (!bot) {
      this.logger.error({
        message: 'Bot not found for channel verification',
        botId,
        userId: this.maskUserId(userId),
        channelId: this.maskChannelId(channelId),
      });
      throw new Error(`Bot with ID ${botId} not found`);
    }

    return this.retryWithBackoff(async () => {
      try {
        const chatMember = await bot.telegram.getChatMember(channelId, userId);

        const validStatuses = ['member', 'administrator', 'creator'];
        const isValid = validStatuses.includes(chatMember.status);

        this.logger.debug({
          message: 'Channel membership verification completed',
          userId: this.maskUserId(userId),
          channelId: this.maskChannelId(channelId),
          status: chatMember.status,
          isValid,
        });

        return isValid;
      } catch (error) {
        const telegramError = error as TelegramError;
        const errorCode = telegramError.response?.error_code;

        // Non-retryable errors (400, 403) return false
        if (errorCode === 400 || errorCode === 403) {
          this.logger.debug({
            message: 'User verification failed with non-retryable error',
            userId: this.maskUserId(userId),
            channelId: this.maskChannelId(channelId),
            errorCode,
          });
          return false;
        }

        // Retryable errors (500, 503, 429) throw to trigger retry
        if (errorCode === 500 || errorCode === 503 || errorCode === 429) {
          this.logger.warn({
            message: 'Telegram API error, will retry',
            userId: this.maskUserId(userId),
            channelId: this.maskChannelId(channelId),
            errorCode,
          });
          throw error;
        }

        // Unknown errors throw to trigger retry
        this.logger.error({
          message: 'Unknown error during verification',
          userId: this.maskUserId(userId),
          channelId: this.maskChannelId(channelId),
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Check if user is rate limited for verification attempts
   *
   * @param userId - Telegram user ID
   * @param botId - Bot ID
   * @returns true if user has reached rate limit (10 attempts within 1 hour)
   */
  async isRateLimited(userId: number, botId: number): Promise<boolean> {
    const botUser = await this.botUsersRepository.findByUserAndBot(
      userId,
      botId,
    );

    if (!botUser || !botUser.state) {
      return false;
    }

    // Support both old flat state and new sceneData structure
    const sceneData = botUser.state.sceneData as
      | {
          verificationAttempts?: number;
          lastVerificationAttempt?: Date | string;
        }
      | undefined;

    const attempts = sceneData?.verificationAttempts ?? 0;
    const lastAttempt = sceneData?.lastVerificationAttempt
      ? new Date(sceneData.lastVerificationAttempt)
      : null;

    if (attempts < this.RATE_LIMIT_MAX_ATTEMPTS) {
      return false;
    }

    if (!lastAttempt) {
      return false;
    }

    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();

    // Rate limit expired after 1 hour
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      this.logger.debug({
        message: 'Rate limit expired, resetting counter',
        userId: this.maskUserId(userId),
        botId,
        attempts,
      });
      return false;
    }

    this.logger.warn({
      message: 'User is rate limited',
      userId: this.maskUserId(userId),
      botId,
      attempts,
      resetIn: Math.ceil(
        (this.RATE_LIMIT_WINDOW_MS - timeSinceLastAttempt) / 1000 / 60,
      ), // minutes
    });

    return true;
  }

  /**
   * Get rate limit status for user
   *
   * @param userId - Telegram user ID
   * @param botId - Bot ID
   * @returns Object with attempts count and reset timestamp
   */
  async getRateLimitStatus(
    userId: number,
    botId: number,
  ): Promise<RateLimitStatus> {
    const botUser = await this.botUsersRepository.findByUserAndBot(
      userId,
      botId,
    );

    if (!botUser || !botUser.state) {
      return { attempts: 0, resetAt: null };
    }

    // Support both old flat state and new sceneData structure
    const sceneData = botUser.state.sceneData as
      | {
          verificationAttempts?: number;
          lastVerificationAttempt?: Date | string;
        }
      | undefined;

    const attempts = sceneData?.verificationAttempts ?? 0;
    const lastAttempt = sceneData?.lastVerificationAttempt
      ? new Date(sceneData.lastVerificationAttempt)
      : null;

    if (attempts === 0 || !lastAttempt) {
      return { attempts: 0, resetAt: null };
    }

    const resetAt = new Date(lastAttempt.getTime() + this.RATE_LIMIT_WINDOW_MS);

    return { attempts, resetAt };
  }

  /**
   * Execute function with exponential backoff retry
   *
   * @param fn - Function to execute
   * @returns Result of function execution
   * @throws Error after MAX_RETRIES attempts
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    // Initial attempt + retries
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if we've exhausted all attempts
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Wait before retrying
        const delay = this.RETRY_DELAYS[attempt];
        await this.sleep(delay);
      }
    }

    // All retries exhausted - lastError will always be set if we reach here
    throw lastError ?? new Error('All retry attempts exhausted');
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mask user ID for logging (show only last 4 digits)
   *
   * @param userId - Telegram user ID
   * @returns Masked user ID string
   */
  private maskUserId(userId: number): string {
    const userIdStr = userId.toString();
    if (userIdStr.length <= 4) {
      return `***${userIdStr}`;
    }
    return `***${userIdStr.slice(-4)}`;
  }

  /**
   * Mask channel ID for logging (show only prefix and last 4 characters)
   *
   * @param channelId - Channel identifier
   * @returns Masked channel ID string
   */
  private maskChannelId(channelId: string): string {
    if (channelId.startsWith('@')) {
      // For @username format, show @ and last 4 chars
      if (channelId.length <= 5) {
        return channelId;
      }
      return `@***${channelId.slice(-4)}`;
    }
    // For numeric IDs, show last 4 digits
    if (channelId.length <= 4) {
      return `***${channelId}`;
    }
    return `***${channelId.slice(-4)}`;
  }
}
