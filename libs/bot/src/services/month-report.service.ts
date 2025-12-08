import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import {
  OrdersRepository,
  UserSubscriptionsRepository,
  MessagesRepository,
  Order,
  MessageType,
} from '@quantumdeal/db';
import { NotificationService } from '@quantumdeal/framework/notifications';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/framework/notifications';
import { ConfigService } from '@nestjs/config';

enum ReportType {
  MONTHLY = 'monthly',
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

interface ClientMonthlyReportData {
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

interface SharedMonthlyReportData {
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
export class MonthReportService {
  private readonly logger = new Logger(MonthReportService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly notificationService: NotificationService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Scheduled task: Generate monthly reports on the 1st day of each month at 09:00 UTC+3
   * Cron expression: "0 0 6 1 * *" (1st day of month at 06:00 UTC = 09:00 UTC+3)
   */
  async generateScheduledMonthlyReport(): Promise<void> {
    this.logger.log('Starting scheduled monthly report generation');

    try {
      await this.generateClientMonthlyReports();
      this.logger.log('Monthly report generation completed successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Monthly report generation failed: ${err.message}`,
        err.stack,
      );
    }
  }

  onModuleInit(): void {
    const timezone = this.configService.get<string>(
      'REPORTS_TIMEZONE',
      'Europe/Moscow',
    );
    const monthlyCron = this.configService.get<string>(
      'MONTHLY_REPORT_CRON',
      '0 0 6 1 * *',
    );
    const monthlyEnabled = this.configService.get<boolean>(
      'MONTHLY_REPORT_ENABLED',
      true,
    );

    if (monthlyEnabled) {
      try {
        const monthlyJob = new CronJob(
          `${monthlyCron}`,
          () => this.generateScheduledMonthlyReport(),
          null,
          false,
          timezone,
        );
        this.schedulerRegistry.addCronJob('monthly-report', monthlyJob);
        monthlyJob.start();
        this.logger.log(
          `Monthly report cron scheduled: ${monthlyCron} (${timezone})`,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to register monthly cron '${monthlyCron}': ${err.message}`,
          err.stack,
        );
      }
    } else {
      this.logger.log(
        'Monthly report cron disabled via MONTHLY_REPORT_ENABLED',
      );
    }
  }

  /**
   * Generate client-specific monthly reports for all active subscribers
   * Uses shared data approach - calculates data once and formats per client's language
   */
  async generateClientMonthlyReports(): Promise<ClientReportResult> {
    this.logger.log(
      'Starting client-specific monthly reports generation (optimized approach)',
    );

    try {
      const activeClients = await this.getActiveClientsWithSubscriptions();

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
        `Found ${activeClients.length} active clients with valid subscriptions for monthly reports`,
      );

      const sharedMonthlyData = await this.generateMonthlyReportData();

      const results = await Promise.allSettled(
        activeClients.map((client) =>
          this.sendClientMonthlyReportWithSharedData(client, sharedMonthlyData),
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
            `Successfully generated monthly report for client ${client.telegramId}`,
          );
        } else {
          failedReports++;
          const error =
            result.status === 'rejected'
              ? (result.reason as Error).message
              : 'Monthly report generation failed';

          errors.push({
            telegramId: client.telegramId,
            error,
          });

          this.logger.warn(
            `Failed to generate monthly report for client ${client.telegramId}: ${error}`,
          );
        }
      });

      this.logger.log(
        `Client monthly reports completed: ${successfulReports} successful, ${failedReports} failed`,
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
        `Failed to generate client monthly reports: ${err.message}`,
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

  private calculateMonthlyPeriod(): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();

    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    return { startDate, endDate };
  }

  private async getActiveClientsWithSubscriptions(): Promise<
    ClientSubscription[]
  > {
    try {
      // Get all active users with active subscriptions (signals only)
      const results =
        await this.userSubscriptionsRepository.findActiveUsersWithActiveSubscription(
          1,
          'signals',
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

  private async generateMonthlyReportData(): Promise<SharedMonthlyReportData> {
    this.logger.debug('Generating shared monthly report data for all clients');

    try {
      const { startDate, endDate } = this.calculateMonthlyPeriod();

      const tradingActivity = await this.gatherAllMonthlyTradingActivityData(
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
        `Failed to generate shared monthly report data: ${err.message}`,
        err.stack,
      );
      throw new Error('Failed to generate shared monthly report data');
    }
  }

  private async gatherAllMonthlyTradingActivityData(
    startDate: Date,
    endDate: Date,
  ): Promise<
    TradingActivityStats & {
      bestTradeSymbol?: string;
      bestTradeProfit?: number;
    }
  > {
    this.logger.debug(
      'Gathering ALL monthly trading activity data (no filtering)',
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
        `Processed ${totalOrders} total orders across all sectors for monthly report`,
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
        'Failed to gather ALL monthly trading activity data',
        error,
      );
      throw new Error('Failed to gather ALL monthly trading activity data');
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

  private async sendClientMonthlyReportWithSharedData(
    client: ClientSubscription,
    sharedData: SharedMonthlyReportData,
  ): Promise<boolean> {
    try {
      const clientReport: ClientMonthlyReportData = {
        reportType: ReportType.MONTHLY,
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

      const reportMessage = await this.formatClientMonthlyReport(clientReport);

      this.notificationService.addMessage(
        client.telegramId,
        client.botId,
        reportMessage,
        {
          messageType: QueuedMessageType.HTML,
          priority: MessagePriority.NORMAL,
        },
      );

      this.logger.debug(
        `Successfully sent monthly report to client ${client.telegramId} using shared data`,
      );

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send monthly report to client ${client.telegramId}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private async formatClientMonthlyReport(
    data: ClientMonthlyReportData,
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
        'monthly_report' as MessageType,
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
        `Failed to format monthly report for client ${data.client.telegramId}: ${err.message}`,
        err.stack,
      );

      return `📊 Monthly summary:\n🔹 Total orders: ${totalOrders}\n🔹 Total result: ${profitSign}${totalProfit.toFixed(
        2,
      )} USD\n🔹 Best trade: ${bestTradeSymbol} (${bestTradeProfit.toFixed(
        2,
      )} USD)\nKeep up the great work!`;
    }
  }
}
