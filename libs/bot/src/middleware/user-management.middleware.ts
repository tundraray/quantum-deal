import { Injectable, Logger } from '@nestjs/common';
import { Context } from '@quantumdeal/framework';
import { User as TelegramUser } from 'telegraf/types';
import {
  UsersRepository,
  NewUser,
  UserSubscriptionsRepository,
  BotUsersRepository,
  BotsRepository,
  BotUser,
} from '@quantumdeal/db';
import { UserContext, UserWithSubscriptions } from '../interfaces';
import { FeatureFlagService } from '../services/feature-flag.service';

/**
 * Middleware that handles user authentication and creation for Telegram bot
 *
 * This middleware:
 * - Checks if a Telegram user exists in the database
 * - Creates the user if they don't exist
 * - Loads active subscriptions
 * - Loads feature flags via FeatureFlagService
 * - Attaches the enriched user to the context for further use
 */
/**
 * Default bot name for static bot middleware.
 * This is the main QuantumDealBot that is configured via environment variables
 * and uses nest-telegraf (not dynamic loading).
 */
const DEFAULT_BOT_NAME = 'QuantumDealBot';

@Injectable()
export class UserManagementMiddleware {
  private readonly logger = new Logger(UserManagementMiddleware.name);

  /**
   * Cached default bot ID to avoid repeated database lookups.
   * Loaded once on first request via lazy initialization.
   */
  private defaultBotId: number | null = null;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly featureFlagService: FeatureFlagService,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botsRepository: BotsRepository,
  ) {
    this.logger.debug('User management middleware constructor');
  }

  /**
   * Middleware function that processes user authentication
   * @param ctx - Telegraf context
   * @param next - Next function in the middleware chain
   */
  async use(ctx: Context, next: () => Promise<void>): Promise<void> {
    this.logger.debug('User management middleware started');
    try {
      if (!ctx.from) {
        this.logger.warn('Context does not contain user information');
        await next();
        return;
      }

      // Resolve default bot ID if not cached
      const botId = (await this.resolveDefaultBotId()) ?? 1;

      if (!botId) {
        this.logger.warn(
          `Default bot "${DEFAULT_BOT_NAME}" not found in database. Using legacy userId flow.`,
        );
        // Fall back to legacy flow if bot not found
        const user = await this.upsertUser(ctx.from);
        const botUser = await this.botUsersRepository.findOrCreate(
          user.telegramId,
          botId,
          {
            lang: ctx.from.language_code || 'en',
            isActive: true,
          },
        );
        const userWithSubscriptions = await this.loadUserWithSubscriptions(
          {
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            lang: ctx.from.language_code || 'en',
            isPremium: user.isPremium ?? false,
            createdAt: user.createdAt,
          },
          botUser,
        );
        (ctx as UserContext).user = userWithSubscriptions;
        await next();
        return;
      }

      // Upsert user - creates new or updates existing (race-condition safe)
      const user = await this.upsertUser(ctx.from);

      // Resolve or create botUser record for this user+bot combination
      const botUser = await this.botUsersRepository.findOrCreate(
        user.telegramId,
        botId,
        {
          lang: ctx.from.language_code || 'en',
          isActive: true,
        },
      );

      // Attach botUser to context for downstream services (e.g., TrialService)
      (ctx as UserContext & { botUser?: BotUser }).botUser = botUser;

      // Attach user to context with subscriptions (using botUserId)
      const userWithSubscriptions = await this.loadUserWithSubscriptions(
        {
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          lang: botUser.lang,
          isPremium: user.isPremium ?? false,
          createdAt: user.createdAt,
        },
        botUser,
      );
      (ctx as UserContext).user = userWithSubscriptions;

      // Continue to next middleware
      await next();
    } catch (error) {
      this.logger.error(
        `Error in user management middleware for Telegram ID: ${ctx.from?.id}`,
        error,
      );

      // Continue execution even if user management fails
      // This ensures the bot remains functional
      await next();
    }
  }

  /**
   * Creates or updates user in database (upsert)
   * Uses ON CONFLICT to handle race conditions safely
   * @param telegramUser - Telegram user object from context
   * @returns Created or updated user
   */
  private async upsertUser(telegramUser: TelegramUser) {
    const userData: NewUser = {
      telegramId: telegramUser.id,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      isPremium: telegramUser.is_premium || false,
    };

    return this.usersRepository.upsert(userData);
  }

  /**
   * Resolves the default bot ID from database, with caching.
   *
   * This is used for the static QuantumDealBot which doesn't have a botId
   * injected via middleware (unlike dynamic bots).
   *
   * @returns The bot ID or null if not found
   */
  private async resolveDefaultBotId(): Promise<number | null> {
    // Return cached value if already loaded
    if (this.defaultBotId !== null) {
      return this.defaultBotId;
    }

    // Look up the default bot by name
    const bot = await this.botsRepository.findByName(DEFAULT_BOT_NAME);

    if (bot) {
      this.defaultBotId = bot.id;
      this.logger.debug(
        `Resolved default bot "${DEFAULT_BOT_NAME}" with ID: ${bot.id}`,
      );
    }

    return this.defaultBotId;
  }

  /**
   * Loads user with active subscriptions and feature flags using botUserId
   *
   * This method:
   * 1. Loads active subscriptions with subscription details using botUserId
   * 2. Loads feature flags via FeatureFlagService
   * 3. Returns enriched UserWithSubscriptions DTO
   *
   * @param user - Raw user entity from database
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @returns UserWithSubscriptions DTO with active subscriptions and feature flags
   */
  private async loadUserWithSubscriptions(
    user: {
      telegramId: number;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      lang: string | null;
      isPremium: boolean | null;
      createdAt: Date;
    },
    botUser: BotUser,
  ): Promise<UserWithSubscriptions> {
    // Load active subscriptions with subscription details using botUserId
    const subscriptions =
      await this.userSubscriptionsRepository.findActiveByBotUserIdWithSubscription(
        botUser.id,
      );

    // Load feature flags for this user
    const { enabledFeatures, featureConfigs } =
      await this.featureFlagService.getUserFeatures(user.telegramId);

    this.logger.debug(
      `Loaded ${subscriptions.length} subscriptions and ${enabledFeatures.size} features for user ${user.telegramId} (botUserId: ${botUser.id})`,
    );

    // Map to UserWithSubscriptions DTO
    return {
      telegramId: user.telegramId,
      botUserId: botUser.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      lang: user.lang,
      isPremium: user.isPremium ?? false,
      isActive: botUser.isActive,
      createdAt: user.createdAt,
      activeSubscriptions: subscriptions.map((s) => ({
        subscriptionId: s.subscription.id,
        name: s.subscription.name,
        type: s.subscription.type,
        activatedAt: s.userSubscription.activatedAt,
        expiresAt: s.userSubscription.expiresAt,
        isActive: s.userSubscription.isActive,
      })),
      enabledFeatures,
      featureConfigs,
    };
  }
}
