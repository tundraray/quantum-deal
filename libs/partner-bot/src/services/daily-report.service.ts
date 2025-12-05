import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import {
  OrdersRepository,
  UserSubscriptionsRepository,
  MessagesRepository,
  Order,
  MessageType,
  BotsRepository,
  BotMessagesRepository,
  BotSettingsRepository,
} from '@quantumdeal/db';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/bot/interfaces';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '@quantumdeal/bot/services/notification.service';
import { BUTTON_KEYS, CALLBACK_DATA } from '../constants';
import { isValidHttpsUrl } from '../utils/url-validation.utils';

enum ReportType {
  DAILY = 'daily',
}

interface TradingActivityStats {
  readonly totalOrders: number;
  readonly profitableOrders: number;
  readonly lossingOrders: number;
  readonly totalProfit: number;
  readonly totalLoss: number;
  readonly ordersBySymbol: Record<string, number>;
}

interface ClientSubscription {
  readonly telegramId: number;
  readonly botId: number;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly username?: string | null;
  readonly lang?: string | null;
  readonly subscriptionId: number;
  readonly subscriptionName: string;
  readonly subscriptionExpirationDate: Date;
}

interface ClientDailyReportData {
  readonly reportType: ReportType;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;

  readonly client: {
    readonly telegramId: number;
    readonly lang?: string | null;
    readonly subscription: {
      readonly id: number;
      readonly expirationDate: Date;
    };
  };
  readonly tradingActivity: TradingActivityStats & {
    readonly bestTradeSymbol?: string;
    readonly bestTradeProfit?: number;
  };
}

interface SharedDailyReportData {
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
  readonly tradingActivity: TradingActivityStats & {
    readonly bestTradeSymbol?: string;
    readonly bestTradeProfit?: number;
  };
}

interface ClientReportResult {
  readonly success: boolean;
  readonly processedClients: number;
  readonly successfulReports: number;
  readonly failedReports: number;
  readonly errors: Array<{
    readonly telegramId: number;
    readonly error: string;
  }>;
}

@Injectable()
export class DailyReportService {
  private readonly logger = new Logger(DailyReportService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly notificationService: NotificationService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly botsRepository: BotsRepository,
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Scheduled task: Generate daily reports every day at 09:00 UTC+3
   * Cron expression: "0 0 6 * * *" (Daily at 06:00 UTC = 09:00 UTC+3)
   */
  async generateScheduledDailyReport(): Promise<void> {
    this.logger.log('Starting scheduled daily report generation');

    try {
      const dynamicsBots = await this.botsRepository.findActiveDynamic();
      const sharedDailyData = await this.generateDailyReportData();
      for (const bot of dynamicsBots) {
        await this.generateClientDailyReports(bot.id, sharedDailyData);
      }
      this.logger.log('Daily report generation completed successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Daily report generation failed: ${err.message}`,
        err.stack,
      );
    }
  }

  onModuleInit(): void {
    const timezone = this.configService.get<string>(
      'REPORTS_TIMEZONE',
      'Europe/Moscow',
    );
    const dailyCron = this.configService.get<string>(
      'DAILY_REPORT_CRON',
      '0 0 6 * * *',
    );
    const dailyEnabled = this.configService.get<boolean>(
      'DAILY_REPORT_ENABLED',
      true,
    );

    if (dailyEnabled) {
      try {
        const dailyJob = new CronJob(
          `${dailyCron}`,
          () => this.generateScheduledDailyReport(),
          null,
          false,
          timezone,
        );
        this.schedulerRegistry.addCronJob('daily-report', dailyJob);
        dailyJob.start();
        this.logger.log(
          `Daily report cron scheduled: ${dailyCron} (${timezone})`,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to register daily cron '${dailyCron}': ${err.message}`,
          err.stack,
        );
      }
    } else {
      this.logger.log('Daily report cron disabled via DAILY_REPORT_ENABLED');
    }
  }

  /**
   * Generate client-specific daily reports for all active subscribers
   * Uses shared data approach - calculates data once and formats per client's language
   */
  async generateClientDailyReports(
    botId: number,
    sharedDailyData: SharedDailyReportData,
  ): Promise<ClientReportResult> {
    this.logger.log(
      'Starting client-specific daily reports generation (optimized approach)',
    );

    try {
      const activeClients = await this.getActiveClientsWithSubscriptions(botId);

      if (activeClients.length === 0) {
        this.logger.debug('No active clients with valid subscriptions found');
        return {
          success: true,
          processedClients: 0,
          successfulReports: 0,
          failedReports: 0,
          errors: [],
        };
      }

      this.logger.log(
        `Found ${activeClients.length} active clients with valid subscriptions for daily reports`,
      );

      const results = await Promise.allSettled(
        activeClients.map((client) =>
          this.sendClientDailyReportWithSharedData(client, sharedDailyData),
        ),
      );

      let successfulReports = 0;
      let failedReports = 0;
      const errors: Array<{ telegramId: number; error: string }> = [];

      results.forEach((result, index) => {
        const client = activeClients[index];

        if (result.status === 'fulfilled' && result.value) {
          successfulReports++;
          this.logger.debug(
            `Successfully generated daily report for client ${client.telegramId}`,
          );
        } else {
          failedReports++;
          const error =
            result.status === 'rejected'
              ? (result.reason as Error).message
              : 'Daily report generation failed';

          errors.push({
            telegramId: client.telegramId,
            error,
          });

          this.logger.warn(
            `Failed to generate daily report for client ${client.telegramId}: ${error}`,
          );
        }
      });

      this.logger.log(
        `Client daily reports completed: ${successfulReports} successful, ${failedReports} failed`,
      );

      return {
        success: failedReports === 0,
        processedClients: activeClients.length,
        successfulReports,
        failedReports,
        errors,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate client daily reports: ${err.message}`,
        err.stack,
      );

      return {
        success: false,
        processedClients: 0,
        successfulReports: 0,
        failedReports: 1,
        errors: [{ telegramId: 0, error: err.message }],
      };
    }
  }

  private calculateDailyPeriod(): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    // Calculate for yesterday
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
      999,
    );

    return { startDate, endDate };
  }

  private async getActiveClientsWithSubscriptions(
    botId: number,
  ): Promise<ClientSubscription[]> {
    try {
      // Get all active users with active subscriptions (signals only)
      const results =
        await this.userSubscriptionsRepository.findActiveUsersWithActiveSubscription(
          'signals',
          botId,
        );

      if (results.length === 0) {
        return [];
      }

      // Transform to ClientSubscription format
      const clientSubscriptions: ClientSubscription[] = results.map(
        (result) => ({
          telegramId: result.user.telegramId,
          botId: result.botUser.botId,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          username: result.user.username,
          lang: result.botUser.lang,
          subscriptionId: result.subscription.id,
          subscriptionName: result.subscription.name,
          subscriptionExpirationDate:
            result.userSubscription.expiresAt || new Date(),
        }),
      );

      return clientSubscriptions;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get active clients with subscriptions: ${err.message}`,
        err.stack,
      );
      return [];
    }
  }

  private async generateDailyReportData(): Promise<SharedDailyReportData> {
    this.logger.debug(`Generating shared daily report data for all clients`);

    try {
      const { startDate, endDate } = this.calculateDailyPeriod();

      const tradingActivity = await this.gatherAllDailyTradingActivityData(
        startDate,
        endDate,
      );

      return {
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date(),
        tradingActivity,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate shared daily report data: ${err.message}`,
        err.stack,
      );
      throw new Error('Failed to generate shared daily report data');
    }
  }

  private async gatherAllDailyTradingActivityData(
    startDate: Date,
    endDate: Date,
  ): Promise<
    TradingActivityStats & {
      bestTradeSymbol?: string;
      bestTradeProfit?: number;
    }
  > {
    this.logger.debug(
      `Gathering ALL daily trading activity data (no filtering)`,
    );

    try {
      const allOrders = await this.ordersRepository.findAllByPeriod(
        startDate,
        endDate,
      );

      const closedOrdersOnly = allOrders.filter((order) => !!order.closeTime);
      const totalOrders = closedOrdersOnly.length;

      const profitLossData =
        this.calculateProfitLossFromOrders(closedOrdersOnly);
      const symbolBreakdown =
        this.calculateSymbolBreakdownFromOrders(closedOrdersOnly);

      const bestTrade = this.findBestTrade(closedOrdersOnly);

      this.logger.debug(
        `Processed ${totalOrders} total orders across all sectors for daily report`,
      );

      return {
        totalOrders,
        profitableOrders: profitLossData.profitableOrders,
        lossingOrders: profitLossData.lossingOrders,
        totalProfit: profitLossData.totalProfit,
        totalLoss: profitLossData.totalLoss,
        ordersBySymbol: symbolBreakdown,
        bestTradeSymbol: bestTrade?.symbol,
        bestTradeProfit: bestTrade?.profit,
      };
    } catch (error) {
      this.logger.error(
        'Failed to gather ALL daily trading activity data',
        error,
      );
      throw new Error('Failed to gather ALL daily trading activity data');
    }
  }

  private findBestTrade(
    orders: Order[],
  ): { symbol: string; profit: number } | null {
    const ordersWithProfit = orders.filter(
      (order) =>
        order.profit !== null && order.profit !== undefined && order.profit > 0,
    );

    if (ordersWithProfit.length === 0) {
      return null;
    }

    const bestOrder = ordersWithProfit.reduce((best, current) => {
      return (current.profit ?? 0) > (best.profit ?? 0) ? current : best;
    });

    return {
      symbol: bestOrder.symbol || 'unknown',
      profit: Math.round((bestOrder.profit ?? 0) * 100) / 100,
    };
  }

  private calculateProfitLossFromOrders(orders: Order[]): {
    profitableOrders: number;
    lossingOrders: number;
    totalProfit: number;
    totalLoss: number;
  } {
    const ordersWithProfit = orders.filter(
      (order) => order.profit !== null && order.profit !== undefined,
    );
    const profitableOrders = ordersWithProfit.filter(
      (order) => (order.profit ?? 0) > 0,
    );
    const lossingOrders = ordersWithProfit.filter(
      (order) => (order.profit ?? 0) < 0,
    );

    const totalProfit = profitableOrders.reduce(
      (sum, order) => sum + (order.profit ?? 0),
      0,
    );
    const totalLoss = Math.abs(
      lossingOrders.reduce((sum, order) => sum + (order.profit ?? 0), 0),
    );

    return {
      profitableOrders: profitableOrders.length,
      lossingOrders: lossingOrders.length,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalLoss: Math.round(totalLoss * 100) / 100,
    };
  }

  private calculateSymbolBreakdownFromOrders(
    orders: Order[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    orders.forEach((order) => {
      const symbol = order.symbol || 'unknown';
      breakdown[symbol] = (breakdown[symbol] || 0) + 1;
    });
    return breakdown;
  }

  private async sendClientDailyReportWithSharedData(
    client: ClientSubscription,
    sharedData: SharedDailyReportData,
  ): Promise<boolean> {
    try {
      const clientReport: ClientDailyReportData = {
        reportType: ReportType.DAILY,
        periodStart: sharedData.periodStart,
        periodEnd: sharedData.periodEnd,
        generatedAt: sharedData.generatedAt,
        client: {
          telegramId: client.telegramId,
          lang: client.lang,
          subscription: {
            id: client.subscriptionId,
            expirationDate: client.subscriptionExpirationDate,
          },
        },
        tradingActivity: sharedData.tradingActivity,
      };

      const reportMessage = await this.formatClientDailyReport(clientReport);

      // Get referral URL from settings
      const settingsRecord = await this.botSettingsRepository.findByBotId(
        client.botId,
      );
      const settings = settingsRecord?.settings as
        | { referralUrl?: string }
        | undefined;
      const referralUrl = settings?.referralUrl;

      const extendTrialButtonText = await this.botMessagesRepository
        .resolveMessage(
          client.botId,
          BUTTON_KEYS.EXTEND_TRIAL,
          client.lang ?? 'en',
        )
        .catch(() => 'Extend Free Period 🎁');

      // Create extend trial button conditionally (url if valid HTTPS, callback_data otherwise)
      const extendTrialButton = isValidHttpsUrl(referralUrl ?? '')
        ? { text: extendTrialButtonText, url: referralUrl as string }
        : {
            text: extendTrialButtonText,
            callback_data: CALLBACK_DATA.EXTEND_TRIAL,
          };

      this.notificationService.addMessage(
        client.telegramId,
        client.botId,
        reportMessage,
        {
          messageType: QueuedMessageType.HTML,
          priority: MessagePriority.NORMAL,
          buttons: [[extendTrialButton]],
        },
      );

      this.logger.debug(
        `Successfully sent daily report to client ${client.telegramId} using shared data`,
      );

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send daily report to client ${client.telegramId}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private async formatClientDailyReport(
    data: ClientDailyReportData,
  ): Promise<string> {
    const clientLang = data.client.lang || 'en';
    const totalOrders = data.tradingActivity.totalOrders;
    const totalProfit =
      data.tradingActivity.totalProfit - data.tradingActivity.totalLoss;
    const profitSign = totalProfit >= 0 ? '+' : '';
    const bestTradeSymbol = data.tradingActivity.bestTradeSymbol || 'N/A';
    const bestTradeProfit = data.tradingActivity.bestTradeProfit || 0;
    const bestTradeProfitSign = bestTradeProfit >= 0 ? '+' : '';
    const maxProfitTrade =
      bestTradeSymbol === 'N/A'
        ? 'N/A'
        : `${bestTradeSymbol} (${bestTradeProfitSign}${bestTradeProfit.toFixed(2)} USD)`;

    const allOrders =
      Object.keys(data.tradingActivity.ordersBySymbol).length > 0
        ? Object.entries(data.tradingActivity.ordersBySymbol)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([symbol]) => symbol)
        : [];

    const bestSymbol1 = allOrders[0] || 'N/A';
    const bestSymbol2 = allOrders[1] || 'N/A';
    const bestSymbol3 = allOrders[2] || 'N/A';

    try {
      const template = await this.messagesRepository.getReportTemplate(
        'daily_report' as MessageType,
        clientLang,
      );

      return template
        .replace(/\{TotalOrders\}/g, totalOrders.toString())
        .replace(/\{TotalProfit\}/g, `${profitSign}${totalProfit.toFixed(2)}`)
        .replace(/\{MaxProfitTrade\}/g, maxProfitTrade)
        .replace(/\{BestSymbol\}/g, bestTradeSymbol)
        .replace(/\{BestSymbol_1\}/g, bestSymbol1)
        .replace(/\{BestSymbol_2\}/g, bestSymbol2)
        .replace(/\{BestSymbol_3\}/g, bestSymbol3)
        .replace(/\{BestTradeSymbol\}/g, bestTradeSymbol)
        .replace(/\{BestTradeProfit\}/g, bestTradeProfit.toFixed(2));
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to format daily report for client ${data.client.telegramId}: ${err.message}`,
        err.stack,
      );

      return `📊 Daily summary:\n🔹 Total orders: ${totalOrders}\n🔹 Total result: ${profitSign}${totalProfit.toFixed(
        2,
      )} USD\n🔹 Best trade: ${bestTradeSymbol} (${bestTradeProfit.toFixed(
        2,
      )} USD)\nKeep up the great work!`;
    }
  }
}
