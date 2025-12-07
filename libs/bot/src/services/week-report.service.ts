import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  OrdersRepository,
  UserSubscriptionsRepository,
  SubscriptionFeaturesRepository,
  MessagesRepository,
  Order,
  MessageType,
} from '@quantumdeal/db';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { NotificationService } from './notification.service';
import { InstrumentFilterService } from './instrument-filter.service';
import {
  MessagePriority,
  QueuedMessageType,
} from '../interfaces/notification.interface';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '@quantumdeal/framework';
import { createUpgradeToVipButton } from '../helpers/upgrade-button.helper';

enum ReportType {
  WEEKLY = 'weekly',
}

interface FilteredInstrumentsStats {
  readonly totalFilteredOrders: number; // Total orders missed due to instrument filters
  readonly filteredPercentage: number; // Percentage of missed orders
  readonly topMissedInstruments: ReadonlyArray<{
    // Top 3 most missed instruments
    readonly symbol: string;
    readonly count: number;
  }>;
}

interface TradingActivityStats {
  // Aggregated statistics for client's subscription
  readonly totalOrders: number;
  readonly profitableOrders: number;
  readonly lossingOrders: number;
  readonly totalProfit: number;
  readonly totalLoss: number;
  readonly ordersBySymbol: Record<string, number>;

  // VIP reference data (all sectors combined for comparison)
  readonly vipTotalOrders: number;
  readonly vipProfitableOrders: number;
  readonly vipLossingOrders: number;
  readonly vipTotalProfit: number;
  readonly vipTotalLoss: number;
  readonly vipNetResult: number;

  // Instrument filtering statistics (for CUSTOM_USER_FILTERING feature)
  readonly filteredByInstruments?: FilteredInstrumentsStats;
}

interface ClientSubscription {
  readonly telegramId: number;
  readonly botUserId: number;
  readonly botId: number;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly username?: string | null;
  readonly lang?: string | null;
  readonly subscriptionId: number;
  readonly subscriptionName: string;
  readonly subscriptionSectors: string[]; // Sectors from subscription_features.config.sectors
  readonly subscriptionExpirationDate: Date;
}

interface ClientWeeklyReportData {
  readonly reportType: ReportType;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
  readonly client: {
    readonly telegramId: number;
    readonly botId: number;
    readonly lang?: string | null;
    readonly subscription: {
      readonly id: number;
      readonly name: string;
      readonly sectors: string[]; // Sectors from subscription_features.config.sectors
      readonly expirationDate: Date;
    };
  };
  readonly tradingActivity: TradingActivityStats;
}

// Monthly report types moved to MonthReportService

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
    private readonly ordersRepository: OrdersRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionFeaturesRepository: SubscriptionFeaturesRepository,
    private readonly notificationService: NotificationService,
    private readonly instrumentFilterService: InstrumentFilterService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly sentryService: SentryService,
  ) {}

  /**
   * Scheduled task: Generate weekly reports every Sunday at 19:00 UTC+3
   * Cron expression: "0 0 16 * * 0" (Sunday at 16:00 UTC = 19:00 UTC+3)
   */
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

  onModuleInit(): void {
    const timezone = this.configService.get<string>(
      'REPORTS_TIMEZONE',
      'Europe/Moscow',
    );
    const weeklyCron = this.configService.get<string>(
      'WEEKLY_REPORT_CRON',
      '0 0 16 * * 0',
    );
    const weeklyEnabled = this.configService.get<boolean>(
      'WEEKLY_REPORT_ENABLED',
      true,
    );

    if (weeklyEnabled) {
      try {
        const weeklyJob = new CronJob(
          `${weeklyCron}`,
          () => this.generateScheduledWeeklyReport(),
          null,
          false,
          timezone,
        );
        this.schedulerRegistry.addCronJob('weekly-report', weeklyJob);
        weeklyJob.start();
        this.logger.log(
          `Weekly report cron scheduled: ${weeklyCron} (${timezone})`,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to register weekly cron '${weeklyCron}': ${err.message}`,
          err.stack,
        );
      }
    } else {
      this.logger.log('Weekly report cron disabled via WEEKLY_REPORT_ENABLED');
    }
  }

  // Monthly scheduling moved to MonthReportService

  /**
   * Generate client-specific weekly reports for all active subscribers
   */
  async generateClientWeeklyReports(): Promise<ClientReportResult> {
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
        activeClients.map((client) => this.generateClientReport(client)),
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

  // Monthly data generation moved to MonthReportService

  /**
   * Generate client-specific monthly reports for all active subscribers
   * Uses shared data approach - calculates data once and formats per client's language
   */
  // Monthly report generation moved to MonthReportService

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

  // Monthly period calculation moved to MonthReportService

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

      // Transform to ClientSubscription format with sectors from subscription_features
      const clientSubscriptions: ClientSubscription[] = await Promise.all(
        results.map(async (result) => {
          // Get sectors from TIER_BASED_FILTERING feature config
          const sectors = await this.getSubscriptionSectors(
            result.subscription.id,
          );

          return {
            telegramId: result.user.telegramId,
            botUserId: result.botUser.id,
            botId: result.botUser.botId,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            username: result.user.username,
            lang: result.botUser.lang,
            subscriptionId: result.subscription.id,
            subscriptionName: result.subscription.name,
            subscriptionSectors: sectors,
            subscriptionExpirationDate:
              result.userSubscription.expiresAt || new Date(),
          };
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

  /**
   * Get sectors from subscription_features.config.sectors for TIER_BASED_FILTERING feature
   * Returns empty array if feature not found or no sectors configured
   */
  private async getSubscriptionSectors(
    subscriptionId: number,
  ): Promise<string[]> {
    try {
      const feature = await this.subscriptionFeaturesRepository.getFeature(
        subscriptionId,
        FeatureFlag.TIER_BASED_FILTERING,
      );

      if (!feature || !feature.isEnabled || !feature.config) {
        return [];
      }

      const sectors = feature.config.sectors;
      if (Array.isArray(sectors)) {
        return sectors.filter((s): s is string => typeof s === 'string');
      }

      return [];
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `Failed to get sectors for subscription ${subscriptionId}: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Generate a personalized report for a specific client
   */
  private async generateClientReport(
    client: ClientSubscription,
  ): Promise<boolean> {
    try {
      const { startDate, endDate } = this.calculateWeeklyPeriod();

      // Get sector-filtered trading data for this client (includes instrument filtering stats)
      const tradingActivity = await this.gatherClientTradingActivityData(
        client.botUserId,
        startDate,
        endDate,
        client.subscriptionSectors,
      );

      // Build client-specific report data
      const clientReport: ClientWeeklyReportData = {
        reportType: ReportType.WEEKLY,
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date(),
        client: {
          telegramId: client.telegramId,
          botId: client.botId,
          lang: client.lang, // Add language to client data
          subscription: {
            id: client.subscriptionId,
            name: client.subscriptionName,
            sectors: client.subscriptionSectors,
            expirationDate: client.subscriptionExpirationDate,
          },
        },
        tradingActivity,
      };

      // Always send personalized report (saves to messages table)
      await this.sendClientReport(clientReport);

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
    botUserId: number,
    startDate: Date,
    endDate: Date,
    subscriptionSectors: string[],
  ): Promise<TradingActivityStats> {
    this.logger.debug(
      `Gathering client-specific trading activity data for bot user ${botUserId}`,
    );

    try {
      // Use sectors directly from subscription_features.config.sectors
      const isAllSectors = subscriptionSectors.includes('*');

      this.logger.debug(
        `Client subscription allows sectors: ${isAllSectors ? 'ALL' : subscriptionSectors.join(', ')}`,
      );

      const allTradingActivity = await this.ordersRepository.findByEventPeriod(
        startDate,
        endDate,
      );

      const allOrdersInSectors = isAllSectors
        ? allTradingActivity
        : await this.ordersRepository.findByEventPeriod(
            startDate,
            endDate,
            subscriptionSectors,
          );

      // Calculate instrument filtering statistics (for CUSTOM_USER_FILTERING feature)
      const filteredByInstruments =
        await this.calculateFilteredInstrumentsStats(
          botUserId,
          allOrdersInSectors,
        );

      // Apply instrument filters to get final orders for this user
      const userFilteredOrders = filteredByInstruments
        ? await this.applyInstrumentFilters(botUserId, allOrdersInSectors)
        : allOrdersInSectors;

      // Calculate all stats based on filtered orders (only closed orders)
      const closedOrdersOnly = userFilteredOrders.filter(
        (order) => !!order.closeTime,
      );
      const totalOrders = closedOrdersOnly.length;

      const profitLossData =
        this.calculateProfitLossFromOrders(closedOrdersOnly);
      const symbolBreakdown =
        this.calculateSymbolBreakdownFromOrders(closedOrdersOnly);

      const vipProfitLossData =
        this.calculateProfitLossFromOrders(allTradingActivity);
      const vipNetResult =
        vipProfitLossData.totalProfit - vipProfitLossData.totalLoss;

      return {
        totalOrders,
        profitableOrders: profitLossData.profitableOrders,
        lossingOrders: profitLossData.lossingOrders,
        totalProfit: profitLossData.totalProfit,
        totalLoss: profitLossData.totalLoss,
        ordersBySymbol: symbolBreakdown,

        // VIP reference data (all sectors combined)
        vipTotalOrders: allTradingActivity.length,
        vipProfitableOrders: vipProfitLossData.profitableOrders,
        vipLossingOrders: vipProfitLossData.lossingOrders,
        vipTotalProfit: vipProfitLossData.totalProfit,
        vipTotalLoss: vipProfitLossData.totalLoss,
        vipNetResult,

        // Instrument filtering statistics (only for users with CUSTOM_USER_FILTERING)
        filteredByInstruments,
      };
    } catch (error) {
      this.logger.error('Failed to gather client trading activity data', error);
      throw new Error('Failed to gather client trading activity data');
    }
  }

  /**
   * Calculate statistics for orders filtered by instrument selection
   * Only applies to users with CUSTOM_USER_FILTERING feature
   *
   * @param userId - User's telegram ID
   * @param allOrdersInSectors - All orders in user's allowed sectors
   * @returns FilteredInstrumentsStats or undefined if feature not enabled or no filters
   */
  private async calculateFilteredInstrumentsStats(
    botUserId: number,
    allOrdersInSectors: Order[],
  ): Promise<FilteredInstrumentsStats | undefined> {
    try {
      // Check if user has CUSTOM_USER_FILTERING feature enabled
      const hasFeature = await this.subscriptionFeaturesRepository.hasFeature(
        botUserId,
        FeatureFlag.CUSTOM_USER_FILTERING,
      );

      if (!hasFeature) {
        this.logger.debug(
          `Bot user ${botUserId} does not have CUSTOM_USER_FILTERING feature`,
        );
        return undefined;
      }

      // Get user's instrument filters
      const userSymbols =
        await this.instrumentFilterService.getUserFilterSymbols(botUserId);

      // Empty array means all instruments selected (no filtering)
      if (userSymbols.length === 0) {
        this.logger.debug(
          `Bot user ${botUserId} has no instrument filters (all selected)`,
        );
        return undefined;
      }

      this.logger.debug(
        `Bot user ${botUserId} has ${userSymbols.length} instrument filters`,
      );

      // Create a set of user's selected symbols for fast lookup
      const selectedSymbolsSet = new Set(userSymbols);

      // Filter out orders that don't match user's selected instruments
      const closedOrdersInSectors = allOrdersInSectors.filter(
        (order) => !!order.closeTime,
      );
      const missedOrders = closedOrdersInSectors.filter(
        (order) => !selectedSymbolsSet.has(order.symbol),
      );

      const totalFilteredOrders = missedOrders.length;

      // If no orders were filtered out, no need to show statistics
      if (totalFilteredOrders === 0) {
        this.logger.debug(
          `Bot user ${botUserId} has no filtered orders (all available orders match filters)`,
        );
        return undefined;
      }

      // Calculate percentage
      const totalAvailableOrders = closedOrdersInSectors.length;
      const filteredPercentage =
        totalAvailableOrders > 0
          ? Math.round((totalFilteredOrders / totalAvailableOrders) * 100)
          : 0;

      // Calculate top missed instruments
      const missedBySymbol = new Map<string, number>();
      missedOrders.forEach((order) => {
        const count = missedBySymbol.get(order.symbol) || 0;
        missedBySymbol.set(order.symbol, count + 1);
      });

      // Sort by count descending and take top 3
      const topMissedInstruments = Array.from(missedBySymbol.entries())
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      this.logger.debug(
        `Bot user ${botUserId}: ${totalFilteredOrders} orders filtered (${filteredPercentage}%), ` +
          `top missed: ${topMissedInstruments.map((i) => `${i.symbol}:${i.count}`).join(', ')}`,
      );

      return {
        totalFilteredOrders,
        filteredPercentage,
        topMissedInstruments,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to calculate filtered instruments stats for bot user ${botUserId}: ${err.message}`,
        err.stack,
      );
      // Return undefined on error to not break report generation
      return undefined;
    }
  }

  /**
   * Apply user's instrument filters to orders
   * Returns all orders if no filters are configured
   *
   * @param botUserId - Bot user ID
   * @param orders - Orders to filter
   * @returns Filtered orders
   */
  private async applyInstrumentFilters(
    botUserId: number,
    orders: Order[],
  ): Promise<Order[]> {
    try {
      const userSymbols =
        await this.instrumentFilterService.getUserFilterSymbols(botUserId);

      // Empty array means all instruments (no filtering)
      if (userSymbols.length === 0) {
        return orders;
      }

      // Filter orders by user's selected symbols
      const selectedSymbolsSet = new Set(userSymbols);
      return orders.filter((order) => selectedSymbolsSet.has(order.symbol));
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to apply instrument filters for bot user ${botUserId}: ${err.message}`,
        err.stack,
      );
      // Return all orders on error to not break report generation
      return orders;
    }
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
  ): Promise<void> {
    try {
      const reportMessage = await this.formatClientWeeklyReport(clientReport);

      // Check if user has VIP subscription (sectors contains '*' means all sectors)
      const isVipSubscription =
        clientReport.client.subscription.sectors.includes('*');

      // Create upgrade button for non-VIP users
      const buttons = isVipSubscription
        ? undefined
        : createUpgradeToVipButton(clientReport.client.lang || 'en');

      this.notificationService.addMessage(
        clientReport.client.telegramId,
        clientReport.client.botId,
        reportMessage,
        {
          messageType: QueuedMessageType.HTML,
          priority: MessagePriority.NORMAL,
          buttons,
        },
      );

      this.logger.debug(
        `Successfully saved and sent weekly report to client ${clientReport.client.telegramId} (VIP: ${isVipSubscription}, buttons: ${buttons ? 'yes' : 'no'})`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send weekly report to client ${clientReport.client.telegramId}: ${err.message}`,
        err.stack,
      );
    }
  }

  // Monthly delivery moved to MonthReportService

  private async formatClientWeeklyReport(
    data: ClientWeeklyReportData,
  ): Promise<string> {
    const clientLang = data.client.lang || 'en';
    const profit = data.tradingActivity.totalProfit;
    const loss = data.tradingActivity.totalLoss;
    const netResult = profit - loss; // loss is already negative
    const positiveTrades = data.tradingActivity.profitableOrders;
    const negativeTrades = data.tradingActivity.lossingOrders;

    // VIP reference data
    const vipProfit = data.tradingActivity.vipTotalProfit;
    const vipLoss = data.tradingActivity.vipTotalLoss;
    const vipNetResult = data.tradingActivity.vipNetResult;
    const vipPositiveTrades = data.tradingActivity.vipProfitableOrders;
    const vipNegativeTrades = data.tradingActivity.vipLossingOrders;

    // Instrument filtering statistics (optional)
    const filteredStats = data.tradingActivity.filteredByInstruments;

    // Determine template name based on subscription and filter status
    // VIP users with active filters get special template with filter stats
    const hasActiveFilters = filteredStats !== undefined;
    const isVipSubscription = data.client.subscription.sectors.includes('*');

    let templateName: string;
    if (hasActiveFilters && isVipSubscription) {
      // VIP with active filters - use special template with filter stats section
      templateName = 'weekly_report_3';
    } else if (isVipSubscription) {
      // VIP without filters - use base template (no filter stats section)
      templateName = 'weekly_report';
    } else {
      // Other subscriptions - use subscription-specific template
      templateName = `weekly_report_${data.client.subscription.id}`;
    }

    this.logger.debug(
      `Using template '${templateName}' for user ${data.client.telegramId} ` +
        `(subscription: ${data.client.subscription.id}, VIP: ${isVipSubscription}, hasFilters: ${hasActiveFilters})`,
    );

    try {
      let template = await this.messagesRepository
        .getReportTemplate(templateName as MessageType, clientLang)
        .catch(() => {
          return null;
        });

      if (!template) {
        this.logger.debug(
          `Weekly report template not found for template name '${templateName}', falling back to 'weekly_report'`,
        );
        template = await this.messagesRepository.getReportTemplate(
          'weekly_report' as MessageType,
          clientLang,
        );
      }

      // Replace standard placeholders
      let formattedTemplate = template
        .replace(/\{profit\}/g, profit.toFixed(2))
        .replace(/\{loss\}/g, Math.abs(loss).toFixed(2))
        .replace(/\{net_result\}/g, netResult.toFixed(2))
        .replace(/\{positive_trades\}/g, positiveTrades.toString())
        .replace(/\{negative_trades\}/g, negativeTrades.toString())
        .replace(/\{vip_profit\}/g, vipProfit.toFixed(2))
        .replace(/\{vip_loss\}/g, Math.abs(vipLoss).toFixed(2))
        .replace(/\{vip_net_result\}/g, vipNetResult.toFixed(2))
        .replace(/\{vip_positive_trades\}/g, vipPositiveTrades.toString())
        .replace(/\{vip_negative_trades\}/g, vipNegativeTrades.toString());

      // Replace instrument filtering placeholders if available
      if (filteredStats) {
        formattedTemplate = formattedTemplate
          .replace(
            /\{filtered_orders_count\}/g,
            filteredStats.totalFilteredOrders.toString(),
          )
          .replace(
            /\{filtered_percentage\}/g,
            filteredStats.filteredPercentage.toString(),
          )
          .replace(
            /\{top_missed_1\}/g,
            filteredStats.topMissedInstruments[0]?.symbol || '-',
          )
          .replace(
            /\{top_missed_count_1\}/g,
            filteredStats.topMissedInstruments[0]?.count.toString() || '0',
          )
          .replace(
            /\{top_missed_2\}/g,
            filteredStats.topMissedInstruments[1]?.symbol || '-',
          )
          .replace(
            /\{top_missed_count_2\}/g,
            filteredStats.topMissedInstruments[1]?.count.toString() || '0',
          )
          .replace(
            /\{top_missed_3\}/g,
            filteredStats.topMissedInstruments[2]?.symbol || '-',
          )
          .replace(
            /\{top_missed_count_3\}/g,
            filteredStats.topMissedInstruments[2]?.count.toString() || '0',
          );
      } else {
        // If no filtered stats, replace placeholders with empty strings or defaults
        formattedTemplate = formattedTemplate
          .replace(/\{filtered_orders_count\}/g, '0')
          .replace(/\{filtered_percentage\}/g, '0')
          .replace(/\{top_missed_1\}/g, '-')
          .replace(/\{top_missed_count_1\}/g, '0')
          .replace(/\{top_missed_2\}/g, '-')
          .replace(/\{top_missed_count_2\}/g, '0')
          .replace(/\{top_missed_3\}/g, '-')
          .replace(/\{top_missed_count_3\}/g, '0');
      }

      return formattedTemplate;
    } catch (error) {
      const err = error as Error;
      this.sentryService.captureException(err, {
        client: data.client,
        weekly_report: templateName,
      });

      this.logger.error(
        `Failed to format weekly report for client ${data.client.telegramId}: ${err.message}`,
        err.stack,
      );

      // Fallback template with filtering stats if available
      let fallbackReport = `🤝 Weekly summary — ${data.client.subscription.name}:
📈 Profit: ${profit.toFixed(2)} USD
📉 Loss: ${Math.abs(loss).toFixed(2)} USD
💹 Result: ${netResult.toFixed(2)} USD
✅ Positive trades: ${positiveTrades}
❌ Negative trades: ${negativeTrades}`;

      if (filteredStats) {
        fallbackReport += `

📊 Filter Statistics:
Missed due to filters: ${filteredStats.totalFilteredOrders} signals (${filteredStats.filteredPercentage}%)

Top missed instruments:`;
        if (filteredStats.topMissedInstruments[0]) {
          fallbackReport += `\n💱 ${filteredStats.topMissedInstruments[0].symbol}: ${filteredStats.topMissedInstruments[0].count} signals`;
        }
        if (filteredStats.topMissedInstruments[1]) {
          fallbackReport += `\n🛢️ ${filteredStats.topMissedInstruments[1].symbol}: ${filteredStats.topMissedInstruments[1].count} signals`;
        }
        if (filteredStats.topMissedInstruments[2]) {
          fallbackReport += `\n💰 ${filteredStats.topMissedInstruments[2].symbol}: ${filteredStats.topMissedInstruments[2].count} signals`;
        }
      }

      fallbackReport += `

🟣 VIP reference:
📈 Profit: ${vipProfit.toFixed(2)} USD
📉 Loss: ${Math.abs(vipLoss).toFixed(2)} USD
💹 Result: ${vipNetResult.toFixed(2)} USD
✅ Positive trades: ${vipPositiveTrades}
❌ Negative trades: ${vipNegativeTrades}
The key is consistency.`;

      return fallbackReport;
    }
  }

  // Monthly formatting moved to MonthReportService
}
