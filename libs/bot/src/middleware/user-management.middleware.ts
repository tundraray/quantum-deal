import { Injectable, Logger } from '@nestjs/common';
import { Context } from '@quantumdeal/framework';
import { User as TelegramUser } from 'telegraf/types';
import {
  UsersRepository,
  NewUser,
  UserSubscriptionsRepository,
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
@Injectable()
export class UserManagementMiddleware {
  private readonly logger = new Logger(UserManagementMiddleware.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly featureFlagService: FeatureFlagService,
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
      }

      const telegramId = ctx.from?.id;

      // Try to find existing user
      let user = await this.usersRepository.findByTelegramId(telegramId!);

      // Create user if not found
      if (!user) {
        user = await this.createNewUser(ctx.from!);
        this.logger.log(`Created new user with Telegram ID: ${telegramId}`);
      } else if (!user.isActive) {
        await this.usersRepository.activateUser(telegramId!);
        return;
      }

      // Attach user to context with subscriptions (user is guaranteed to exist at this point)
      if (user) {
        const userWithSubscriptions =
          await this.loadUserWithSubscriptions(user);
        (ctx as UserContext).user = userWithSubscriptions;
      }

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
   * Creates a new user in the database
   * @param telegramUser - Telegram user object from context
   * @returns Created user
   */
  private async createNewUser(telegramUser: TelegramUser) {
    const newUser: NewUser = {
      telegramId: telegramUser.id,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      isActive: true,
      lang: telegramUser.language_code || 'en',
      isPremium: telegramUser.is_premium || false,
    };

    return this.usersRepository.create(newUser);
  }

  /**
   * Loads user with active subscriptions and feature flags
   *
   * This method:
   * 1. Loads active subscriptions with subscription details
   * 2. Loads feature flags via FeatureFlagService
   * 3. Returns enriched UserWithSubscriptions DTO
   *
   * @param user - Raw user entity from database
   * @returns UserWithSubscriptions DTO with active subscriptions and feature flags
   */
  private async loadUserWithSubscriptions(user: {
    telegramId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    lang: string | null;
    isPremium: boolean | null;
    isActive: boolean;
    createdAt: Date;
  }): Promise<UserWithSubscriptions> {
    // Load active subscriptions with subscription details
    const subscriptions =
      await this.userSubscriptionsRepository.findActiveByUserIdWithSubscription(
        user.telegramId,
      );

    // Load feature flags for this user
    const { enabledFeatures, featureConfigs } =
      await this.featureFlagService.getUserFeatures(user.telegramId);

    this.logger.debug(
      `Loaded ${enabledFeatures.size} features for user ${user.telegramId}`,
    );

    // Map to UserWithSubscriptions DTO
    return {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      lang: user.lang,
      isPremium: user.isPremium ?? false,
      isActive: user.isActive,
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
