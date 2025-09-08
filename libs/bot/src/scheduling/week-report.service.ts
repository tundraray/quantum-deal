import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, gte, sql, inArray } from 'drizzle-orm';
import {
  UsersRepository,
  OrdersRepository,
  SubscriptionsRepository,
  MessagesRepository,
  users,
  subscriptions,
  Order,
  MessageType,
} from '@quantumdeal/db';
import { Telegraf, Context } from 'telegraf';

enum ReportType {
  WEEKLY = 'weekly',
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
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly username?: string | null;
  readonly lang?: string | null;
  readonly subscriptionId: number;
  readonly subscriptionName: string;
  readonly subscriptionScope: unknown;
  readonly subscriptionExpirationDate: Date;
}

interface ClientWeeklyReportData {
  readonly reportType: ReportType;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
  readonly client: {
    readonly telegramId: number;
    readonly lang?: string | null;
    readonly subscription: {
      readonly id: number;
      readonly name: string;
      readonly scope: unknown;
      readonly expirationDate: Date;
    };
  };
  readonly tradingActivity: TradingActivityStats;
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
      readonly scope: unknown;
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

/**
 * Service for generating weekly and monthly reports about client activity and trading performance
 * Implements clean architecture principles with single responsibility and extensible design
 */
@Injectable()
export class WeekReportService {
  private readonly logger = new Logger(WeekReportService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly messagesRepository: MessagesRepository,
  ) {}

  /**
   * Scheduled task: Generate weekly reports every Sunday at 19:00 UTC+3
   * Cron expression: "0 0 16 * * 0" (Sunday at 16:00 UTC = 19:00 UTC+3)
   */
  @Cron('0 0 16 * * 0', {
    timeZone: 'Europe/Moscow',
  })
  async generateScheduledWeeklyReport(): Promise<void> {
    this.logger.log('Starting scheduled weekly report generation');

    try {
      // Generate client-specific reports
      await this.generateClientWeeklyReports();

      this.logger.log('Weekly report generation completed successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Weekly report generation failed: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Scheduled task: Generate monthly reports on the 1st day of each month at 09:00 UTC+3
   * Cron expression: "0 0 6 1 * *" (1st day of month at 06:00 UTC = 09:00 UTC+3)
   */
  @Cron('0 0 6 1 * *', {
    timeZone: 'Europe/Moscow',
  })
  async generateScheduledMonthlyReport(): Promise<void> {
    this.logger.log('Starting scheduled monthly report generation');

    try {
      // Generate client-specific monthly reports
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

  /**
   * Generate client-specific weekly reports for all active subscribers
   */
  async generateClientWeeklyReports(
    bot?: Telegraf<Context>,
  ): Promise<ClientReportResult> {
    this.logger.log('Starting client-specific weekly reports generation');

    try {
      // Get all active clients with valid subscriptions
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
        `Found ${activeClients.length} active clients with valid subscriptions`,
      );

      const results = await Promise.allSettled(
        activeClients.map((client) => this.generateClientReport(client, bot)),
      );

      // Process results
      let successfulReports = 0;
      let failedReports = 0;
      const errors: Array<{ telegramId: number; error: string }> = [];

      results.forEach((result, index) => {
        const client = activeClients[index];

        if (result.status === 'fulfilled' && result.value) {
          successfulReports++;
          this.logger.debug(
            `Successfully generated report for client ${client.telegramId}`,
          );
        } else {
          failedReports++;
          const error =
            result.status === 'rejected'
              ? (result.reason as Error).message
              : 'Report generation failed';

          errors.push({
            telegramId: client.telegramId,
            error,
          });

          this.logger.warn(
            `Failed to generate report for client ${client.telegramId}: ${error}`,
          );
        }
      });

      this.logger.log(
        `Client reports completed: ${successfulReports} successful, ${failedReports} failed`,
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
        `Failed to generate client weekly reports: ${err.message}`,
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

  /**
   * Generate shared monthly report data that will be reused for all clients
   * This method calculates ALL trading statistics for the month once, without any subscription filtering
   * Monthly reports show the same data for all users, only language/template differs
   */
  private async generateMonthlyReportData(): Promise<SharedMonthlyReportData> {
    this.logger.debug('Generating shared monthly report data for all clients');

    try {
      const { startDate, endDate } = this.calculateMonthlyPeriod();

      // Get ALL orders for the month (no subscription filtering for monthly reports)
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

  /**
   * Generate client-specific monthly reports for all active subscribers
   * Uses shared data approach - calculates data once and formats per client's language
   */
  async generateClientMonthlyReports(
    bot?: Telegraf<Context>,
  ): Promise<ClientReportResult> {
    this.logger.log(
      'Starting client-specific monthly reports generation (optimized approach)',
    );

    try {
      // Get all active clients with valid subscriptions
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

      // OPTIMIZATION: Generate shared monthly data ONCE for all clients
      // This calculates all trading statistics once instead of N times for N clients
      const sharedMonthlyData = await this.generateMonthlyReportData();

      // Generate personalized reports using the shared data (only template/language differs)
      const results = await Promise.allSettled(
        activeClients.map((client) =>
          this.sendClientMonthlyReportWithSharedData(
            client,
            sharedMonthlyData,
            bot,
          ),
        ),
      );

      // Process results
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

  private calculateWeeklyPeriod(): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const currentDay = now.getDay();

    // Always calculate for last week
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - currentDay - 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  private calculateMonthlyPeriod(): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();

    // Always calculate for last month
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
      const now = new Date();

      // Get all users with active subscriptions
      const usersWithSubscriptions = await this.usersRepository.findBy(
        and(
          sql`${users.subscribeId} IS NOT NULL`,
          sql`${users.subscribeExpirationDate} IS NOT NULL`,
          gte(users.subscribeExpirationDate, now),
        ),
      );

      if (usersWithSubscriptions.length === 0) {
        return [];
      }

      // Get subscription details
      const subscriptionIds = [
        ...new Set(
          usersWithSubscriptions.map((u) => u.subscribeId).filter(Boolean),
        ),
      ];
      const subscriptionDetails = await this.subscriptionsRepository.findBy(
        inArray(subscriptions.id, subscriptionIds as number[]),
      );

      const subscriptionMap = new Map(
        subscriptionDetails.map((sub) => [sub.id, sub]),
      );

      // Build client subscription objects
      const clientSubscriptions: ClientSubscription[] = [];

      for (const user of usersWithSubscriptions) {
        if (user.subscribeId && user.subscribeExpirationDate) {
          const subscription = subscriptionMap.get(user.subscribeId);

          if (subscription) {
            clientSubscriptions.push({
              telegramId: user.telegramId,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              lang: user.lang,
              subscriptionId: subscription.id,
              subscriptionName: subscription.name,
              subscriptionScope: subscription.scope,
              subscriptionExpirationDate: new Date(
                user.subscribeExpirationDate,
              ),
            });
          }
        }
      }

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

  /**
   * Generate a personalized report for a specific client
   */
  private async generateClientReport(
    client: ClientSubscription,
    bot?: Telegraf<Context>,
  ): Promise<boolean> {
    try {
      const { startDate, endDate } = this.calculateWeeklyPeriod();

      // Get sector-filtered trading data for this client
      const tradingActivity = await this.gatherClientTradingActivityData(
        startDate,
        endDate,
        client.subscriptionScope,
      );

      // Build client-specific report data
      const clientReport: ClientWeeklyReportData = {
        reportType: ReportType.WEEKLY,
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date(),
        client: {
          telegramId: client.telegramId,
          lang: client.lang, // Add language to client data
          subscription: {
            id: client.subscriptionId,
            name: client.subscriptionName,
            scope: client.subscriptionScope,
            expirationDate: client.subscriptionExpirationDate,
          },
        },
        tradingActivity,
      };

      // Always send personalized report (saves to messages table)
      await this.sendClientReport(clientReport, bot);

      this.logger.debug(
        `Generated personalized report for client ${client.telegramId}`,
      );

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate report for client ${client.telegramId}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private async gatherClientTradingActivityData(
    startDate: Date,
    endDate: Date,
    subscriptionScope: unknown,
  ): Promise<TradingActivityStats> {
    this.logger.debug('Gathering client-specific trading activity data');

    try {
      // Determine which sectors to include
      const allowedSectors = this.extractAllowedSectors(subscriptionScope);
      const isAllSectors = allowedSectors.includes('*');

      this.logger.debug(
        `Client subscription allows sectors: ${isAllSectors ? 'ALL' : allowedSectors.join(', ')}`,
      );

      const allOrders = isAllSectors
        ? await this.ordersRepository.findByEventPeriod(startDate, endDate)
        : await this.ordersRepository.findByEventPeriod(
            startDate,
            endDate,
            allowedSectors,
          );

      // Calculate all stats based on filtered orders (only closed orders)
      const closedOrdersOnly = allOrders.filter((order) => !!order.closeTime);
      const totalOrders = closedOrdersOnly.length;

      const profitLossData =
        this.calculateProfitLossFromOrders(closedOrdersOnly);
      const symbolBreakdown =
        this.calculateSymbolBreakdownFromOrders(closedOrdersOnly);

      return {
        totalOrders,
        profitableOrders: profitLossData.profitableOrders,
        lossingOrders: profitLossData.lossingOrders,
        totalProfit: profitLossData.totalProfit,
        totalLoss: profitLossData.totalLoss,
        ordersBySymbol: symbolBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to gather client trading activity data', error);
      throw new Error('Failed to gather client trading activity data');
    }
  }

  /**
   * Gather ALL trading activity data for monthly reports (no subscription filtering)
   * This method gets all orders for all sectors and calculates comprehensive statistics
   */
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
      // Get ALL orders for the time period
      const allOrders = await this.ordersRepository.findAllByPeriod(
        startDate,
        endDate,
      );

      // Calculate all stats based on all orders (only closed orders)
      const closedOrdersOnly = allOrders.filter((order) => !!order.closeTime);
      const totalOrders = closedOrdersOnly.length;

      const profitLossData =
        this.calculateProfitLossFromOrders(closedOrdersOnly);
      const symbolBreakdown =
        this.calculateSymbolBreakdownFromOrders(closedOrdersOnly);

      // Find best trade (most profitable single trade)
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

  /**
   * Find the most profitable single trade from a list of orders
   */
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

  private extractAllowedSectors(subscriptionScope: unknown): string[] {
    if (!subscriptionScope) {
      return [];
    }

    // Handle different scope formats
    if (typeof subscriptionScope === 'string') {
      return subscriptionScope === '*' ? ['*'] : [subscriptionScope];
    }

    if (Array.isArray(subscriptionScope)) {
      return subscriptionScope.filter((sector) => typeof sector === 'string');
    }

    if (typeof subscriptionScope === 'object' && subscriptionScope !== null) {
      const scope = subscriptionScope as Record<string, unknown>;

      if ('sectors' in scope) {
        const sectors = scope.sectors;
        if (sectors === '*') {
          return ['*'];
        }
        if (Array.isArray(sectors)) {
          return sectors.filter(
            (sector): sector is string => typeof sector === 'string',
          );
        }
        if (typeof sectors === 'string') {
          return [sectors];
        }
      }

      if ('*' in scope && scope['*']) {
        return ['*'];
      }

      return Object.keys(scope).filter(
        (key) => typeof key === 'string' && scope[key] === true,
      );
    }

    return [];
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

  private async sendClientReport(
    clientReport: ClientWeeklyReportData,
    bot?: Telegraf<Context>,
  ): Promise<void> {
    try {
      const reportMessage = await this.formatClientWeeklyReport(clientReport);
      if (bot) {
        await bot.telegram.sendMessage(
          clientReport.client.telegramId,
          reportMessage,
          {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          },
        );
      }

      this.logger.debug(
        `Successfully saved and sent weekly report to client ${clientReport.client.telegramId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send weekly report to client ${clientReport.client.telegramId}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Send monthly report to a specific client using shared data
   * This method only formats the shared data according to client's language/template
   */
  private async sendClientMonthlyReportWithSharedData(
    client: ClientSubscription,
    sharedData: SharedMonthlyReportData,
    bot?: Telegraf<Context>,
  ): Promise<boolean> {
    try {
      // Build client-specific report structure for formatting
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
            scope: client.subscriptionScope,
            expirationDate: client.subscriptionExpirationDate,
          },
        },
        // Use shared trading activity data (no filtering needed for monthly reports)
        tradingActivity: sharedData.tradingActivity,
      };

      const reportMessage = await this.formatClientMonthlyReport(clientReport);
      if (bot) {
        await bot.telegram.sendMessage(client.telegramId, reportMessage, {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        });
      }

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

  private async formatClientWeeklyReport(
    data: ClientWeeklyReportData,
  ): Promise<string> {
    const clientLang = data.client.lang || 'en';
    const profit = data.tradingActivity.totalProfit;
    const loss = data.tradingActivity.totalLoss;
    const netResult = profit - loss;
    const positiveTrades = data.tradingActivity.profitableOrders;
    const negativeTrades = data.tradingActivity.lossingOrders;

    try {
      const template = await this.messagesRepository.getReportTemplate(
        'weekly_report' as MessageType,
        clientLang,
      );

      return template
        .replace(/\{profit\}/g, profit.toFixed(2))
        .replace(/\{loss\}/g, loss.toFixed(2))
        .replace(/\{net_result\}/g, netResult.toFixed(2))
        .replace(/\{positive_trades\}/g, positiveTrades.toString())
        .replace(/\{negative_trades\}/g, negativeTrades.toString());
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to format weekly report for client ${data.client.telegramId}: ${err.message}`,
        err.stack,
      );

      return `🤝 Weekly summary:
📈 Profit: ${profit.toFixed(2)} USD
📉 Loss: ${loss.toFixed(2)} USD
💹 Result: ${netResult.toFixed(2)} USD
The key is consistency.`;
    }
  }

  /**
   * Format monthly report message with template placeholders replacement
   */
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

    // Get top 3 most traded symbols by volume
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

      return `📊 Monthly summary:
🔹 Total orders: ${totalOrders}
🔹 Total result: ${profitSign}${totalProfit.toFixed(2)} USD
🔹 Best trade: ${bestTradeSymbol} (${bestTradeProfit.toFixed(2)} USD)
Keep up the great work!`;
    }
  }
}
