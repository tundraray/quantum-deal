import { Injectable, Logger } from '@nestjs/common';
import { Context } from '@quantumdeal/framework';
import { User as TelegramUser } from 'telegraf/types';
import { UsersRepository, NewUser } from '@quantumdeal/db';
import { UserContext } from '../interfaces';

/**
 * Middleware that handles user authentication and creation for Telegram bot
 *
 * This middleware:
 * - Checks if a Telegram user exists in the database
 * - Creates the user if they don't exist
 * - Attaches the user to the context for further use
 */
@Injectable()
export class UserManagementMiddleware {
  private readonly logger = new Logger(UserManagementMiddleware.name);

  constructor(private readonly usersRepository: UsersRepository) {
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
      }

      // Attach user to context (user is guaranteed to exist at this point)
      if (user) {
        (ctx as UserContext).user = user;
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
      lang: telegramUser.language_code || 'en',
      isPremium: telegramUser.is_premium || false,
    };

    return this.usersRepository.create(newUser);
  }
}
