import { Injectable, Logger } from '@nestjs/common';
import {
  UsersRepository,
  SubscriptionsRepository,
  Manager,
} from '@quantumdeal/db';
import { AdminStats } from './interfaces';

@Injectable()
export class MasterbotService {
  private readonly logger = new Logger(MasterbotService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  onStart(manager: Manager): string {
    this.logger.log(
      `Master bot start command from manager ${manager.telegramId}`,
    );

    const managerName =
      manager.firstName || manager.username || `Manager ${manager.telegramId}`;
    const welcomeMessage =
      `🔧 *Master Bot Admin Panel*\n\n` +
      `Welcome, ${managerName}! You have access to the following commands:\n\n` +
      `📊 /stats - View user and subscription statistics\n` +
      `🎫 /code - Generate subscription codes\n` +
      `💡 /help - Show available commands\n\n` +
      `Use these commands to monitor and manage the bot ecosystem.\n\n` +
      `_Manager ID: ${manager.telegramId}_`;

    return welcomeMessage;
  }

  async getUserStatistics(): Promise<AdminStats> {
    try {
      const [allUsers, allSubscriptions] = await Promise.all([
        this.usersRepository.findAll(),
        this.subscriptionsRepository.findAll(),
      ]);

      const currentDate = new Date();
      const activeUsers = allUsers.filter(
        (user) =>
          user.subscribeExpirationDate &&
          new Date(user.subscribeExpirationDate) > currentDate,
      );

      const expiredUsers = allUsers.filter(
        (user) =>
          user.subscribeExpirationDate &&
          new Date(user.subscribeExpirationDate) <= currentDate,
      );

      const blockedUsers = allUsers.filter(
        (user) => !user.isActive,
      );

      // Get recent users (last 7 days)
      const sevenDaysAgo = new Date(
        currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const recentUsers = allUsers
        .filter(
          (user) => user.createdAt && new Date(user.createdAt) > sevenDaysAgo,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5);

      return {
        totalUsers: allUsers.length,
        activeSubscriptions: activeUsers.length,
        expiredSubscriptions: expiredUsers.length,
        blockedUsers: blockedUsers.length,
        totalSubscriptions: allSubscriptions.length,
        recentUsers,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error fetching user statistics', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  formatUserStatistics(stats: AdminStats): string {
    let message = `📊 *User & Subscription Statistics*\n\n`;

    message += `👥 *Users Overview:*\n`;
    message += `• Total Users: ${stats.totalUsers}\n`;
    message += `• Active Subscriptions: ${stats.activeSubscriptions}\n`;
    message += `• Expired Subscriptions: ${stats.expiredSubscriptions}\n`;
    message += `• Blocked Users: ${stats.blockedUsers}\n\n`;

    message += `📋 *Subscriptions:*\n`;
    message += `• Total Subscription Plans: ${stats.totalSubscriptions}\n\n`;

    if (stats.recentUsers.length > 0) {
      message += `🆕 *Recent Users (Last 7 days):*\n`;
      stats.recentUsers.forEach((user, index) => {
        const joinDate = user.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : 'Unknown';
        message += `${index + 1}. User ${user.telegramId} - ${joinDate}\n`;
      });
    } else {
      message += `🆕 *Recent Users:* No new users in the last 7 days\n`;
    }

    return message;
  }

  /**
   * Log manager action for audit purposes
   */
  logManagerAction(
    manager: Manager,
    action: string,
    details?: Record<string, any>,
  ): void {
    const logData = {
      managerId: manager.telegramId,
      username: manager.username,
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };

    this.logger.debug(`Manager Action: ${action}`, logData);
  }
}
