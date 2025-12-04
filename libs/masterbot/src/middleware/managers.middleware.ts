import { Injectable, Logger } from '@nestjs/common';
import { ManagersRepository, Manager, AdminLevel } from '@quantumdeal/db';
import type { UserContext } from '../interfaces';
import { MASTERBOT_CONSTANTS } from '../constants';
import { ConfigService } from '@nestjs/config';

/**
 * Middleware for authenticating and authorizing managers for the master bot.
 * This middleware checks if the incoming user exists in the managers table
 * and adds manager data to the context for use in command handlers.
 */
@Injectable()
export class ManagersMiddleware {
  private readonly logger = new Logger(ManagersMiddleware.name);

  constructor(
    private readonly managersRepository: ManagersRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main middleware function that processes incoming Telegram updates
   * and authenticates managers
   */
  async use(ctx: UserContext, next: () => Promise<void>): Promise<void> {
    const from = ctx.from;

    if (!from) {
      this.logger.warn('No user information found in context');
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    const telegramId = from.id;

    try {
      // Always fetch fresh data from database
      const manager = await this.fetchManagerFromDatabase(telegramId);

      if (!manager) {
        // Check if this is a /start command with invitation code
        const isStartCommand =
          ctx.updateType === 'message' &&
          ctx.message &&
          'text' in ctx.message &&
          ctx.message.text?.startsWith('/start ');

        if (isStartCommand) {
          const code = ctx.message.text?.split(' ')[1];
          if (code) {
            const newManager = await this.handleManagerInvitation(ctx, code);
            if (newManager) {
              // Add the newly created manager to context and continue
              ctx.manager = newManager;
              await next();
              return;
            }
          }
        }

        this.handleUnauthorizedAccess(ctx, telegramId, from.username);
        return;
      }

      if (!manager.isActive) {
        this.handleInactiveManager(ctx, manager);
        return;
      }

      // Add manager to context
      ctx.manager = manager;

      // Continue to next middleware/handler
      await next();
    } catch (error) {
      this.logger.error(
        `Database error during manager authentication for user ${telegramId}`,
        error,
      );
    }
  }

  /**
   * Fetch manager from database by telegram ID
   */
  private async fetchManagerFromDatabase(
    telegramId: number,
  ): Promise<Manager | null> {
    try {
      const manager = await this.managersRepository.findById(telegramId);

      if (manager) {
        this.logger.debug(`Manager found in database: ${telegramId}`);
      } else {
        this.logger.debug(`Manager not found in database: ${telegramId}`);
      }

      return manager;
    } catch (error) {
      this.logger.error(
        `Error fetching manager from database: ${telegramId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle unauthorized access attempts
   */
  private handleUnauthorizedAccess(
    _ctx: UserContext,
    telegramId: number,
    username?: string,
  ): void {
    const userInfo = username
      ? `${telegramId} (@${username})`
      : `${telegramId}`;

    this.logger.warn(`Unauthorized access attempt from user ${userInfo}`);
  }

  /**
   * Handle inactive manager access attempts
   */
  private async handleInactiveManager(
    ctx: UserContext,
    manager: Manager,
  ): Promise<void> {
    this.logger.warn(
      `Access attempt from inactive manager: ${manager.telegramId}`,
    );

    this.logSecurityEvent('INACTIVE_MANAGER_ACCESS', {
      telegramId: manager.telegramId,
      username: manager.username,
      timestamp: new Date().toISOString(),
      chatId: ctx.chat?.id,
    });

    await ctx.reply(
      '⚠️ Your manager account has been deactivated. Please contact the administrator for assistance.',
    );
  }

  /**
   * Handle manager invitation code
   */
  private async handleManagerInvitation(
    ctx: UserContext,
    code: string,
  ): Promise<Manager | null> {
    try {
      // Get the expected manager invitation code from environment
      const expectedCode = this.configService.get<string>(
        'MANAGER_INVITATION_CODE',
        'MZ7gGs3iL96M',
      );

      if (!expectedCode) {
        this.logger.error('MANAGER_INVITATION_CODE not set in environment');
        await ctx.reply('❌ Manager invitation system is not configured.');
        return null;
      }

      // Check if provided code matches the expected code
      if (code !== expectedCode) {
        this.logger.warn(
          `Invalid invitation code attempt: ${code} from user ${ctx.from?.id}`,
        );
        await ctx.reply('❌ Invalid invitation code. Access denied.');
        return null;
      }

      // Get user info from Telegram
      const telegramUser = ctx.from;
      if (!telegramUser) {
        await ctx.reply('❌ Unable to get your Telegram information.');
        return null;
      }

      // Check if manager already exists (double-check)
      const existingManager = await this.managersRepository.findById(
        telegramUser.id,
      );
      if (existingManager) {
        await ctx.reply('❌ You are already registered as a manager.');
        return existingManager; // Return existing manager
      }

      // Add manager to database
      const newManager = await this.managersRepository.create({
        telegramId: telegramUser.id,
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        lang: telegramUser.language_code || 'en',
        level: AdminLevel.BASIC, // Default level
        isPremium: telegramUser.is_premium || false,
        isActive: true,
      });

      this.logger.log(
        `New manager added via invitation code: ${newManager.telegramId} (${newManager.username || newManager.firstName})`,
      );

      return newManager;
    } catch (error) {
      this.logger.error('Error handling manager invitation code', error);
      await ctx.reply(
        '❌ An error occurred while processing the invitation code. Please try again later.',
      );
      return null;
    }
  }

  /**
   * Log security events (can be extended to send to external monitoring)
   */
  private logSecurityEvent(eventType: string, data: Record<string, any>): void {
    this.logger.warn(`Security Event: ${eventType}`, data);

    // Here you could extend to send to external monitoring systems
    // Example: await this.securityMonitoringService.logEvent(eventType, data);
  }
}
