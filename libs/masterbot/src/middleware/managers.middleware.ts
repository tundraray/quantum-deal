import { Injectable, Logger } from '@nestjs/common';
import { ManagersRepository, Manager } from '@quantumdeal/db';
import type { UserContext } from '../interfaces';
import { MASTERBOT_CONSTANTS } from '../constants';

/**
 * Middleware for authenticating and authorizing managers for the master bot.
 * This middleware checks if the incoming user exists in the managers table
 * and adds manager data to the context for use in command handlers.
 */
@Injectable()
export class ManagersMiddleware {
  private readonly logger = new Logger(ManagersMiddleware.name);

  constructor(private readonly managersRepository: ManagersRepository) {}

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
    ctx: UserContext,
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
   * Log security events (can be extended to send to external monitoring)
   */
  private logSecurityEvent(eventType: string, data: Record<string, any>): void {
    this.logger.warn(`Security Event: ${eventType}`, data);

    // Here you could extend to send to external monitoring systems
    // Example: await this.securityMonitoringService.logEvent(eventType, data);
  }
}
