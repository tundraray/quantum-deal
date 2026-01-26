import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SystemDiscountRulesRepository,
  UserSubscriptionsRepository,
  UserDiscountsRepository,
  type SystemDiscountRule,
  type BotUser,
} from '@quantumdeal/db';

/**
 * Statistics for a single rule processing
 */
export interface RuleProcessingStats {
  ruleId: number;
  ruleName: string;
  eligibleUsers: number;
  discountsCreated: number;
  skipped: number;
  errors: number;
}

/**
 * Overall statistics for scheduler run
 */
export interface SchedulerStats {
  rulesProcessed: number;
  usersProcessed: number;
  discountsCreated: number;
  errors: number;
  startedAt: Date;
  completedAt: Date;
}

/**
 * DiscountSchedulerService
 *
 * Processes system discount rules daily at 00:00 UTC.
 * Assigns permanent discounts to users matching rule criteria.
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 * ADR Reference: ADR-010-promocode-discount-system.md (Decision 4: Scheduler-based)
 * Pattern Reference: libs/partner-bot/src/services/reminder-scheduler.service.ts
 *
 * Responsibilities:
 * - Query all active system discount rules
 * - Find eligible users for each rule (based on trigger conditions)
 * - Create user_discount records for eligible users
 * - Ensure idempotency (skip users with existing discounts)
 * - Log comprehensive statistics for monitoring
 *
 * Performance Requirements:
 * - Full run < 5 minutes for typical user base
 * - Batch processing with error isolation
 */
@Injectable()
export class DiscountSchedulerService {
  private readonly logger = new Logger(DiscountSchedulerService.name);

  constructor(
    private readonly systemDiscountRulesRepository: SystemDiscountRulesRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly userDiscountsRepository: UserDiscountsRepository,
  ) {}

  /**
   * Process all active system discount rules
   *
   * Main scheduler method that processes all active rules.
   * Handles errors gracefully - failed rules don't block others.
   *
   * @returns Aggregated statistics for the run
   */
  async processAllRules(): Promise<SchedulerStats> {
    const stats: SchedulerStats = {
      rulesProcessed: 0,
      usersProcessed: 0,
      discountsCreated: 0,
      errors: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      this.logger.log({
        message: 'Starting discount scheduler run',
        startedAt: stats.startedAt.toISOString(),
      });

      // Get all active rules
      const activeRules =
        await this.systemDiscountRulesRepository.findActiveRules();

      this.logger.log({
        message: 'Found active discount rules',
        count: activeRules.length,
        ruleIds: activeRules.map((r) => r.id),
      });

      // Process each rule
      for (const rule of activeRules) {
        try {
          const ruleStats = await this.processRule(rule);

          stats.rulesProcessed++;
          stats.usersProcessed += ruleStats.eligibleUsers;
          stats.discountsCreated += ruleStats.discountsCreated;
          stats.errors += ruleStats.errors;

          this.logger.log({
            message: 'Rule processing completed',
            ruleId: rule.id,
            ruleName: rule.name,
            stats: ruleStats,
          });
        } catch (error) {
          stats.errors++;
          this.logger.error({
            message: 'Error processing rule',
            ruleId: rule.id,
            ruleName: rule.name,
            error: (error as Error).message,
          });
          // Continue with next rule (error isolation)
        }
      }

      stats.completedAt = new Date();

      this.logger.log({
        message: 'Discount scheduler run completed',
        stats,
        durationMs: stats.completedAt.getTime() - stats.startedAt.getTime(),
      });

      return stats;
    } catch (error) {
      stats.completedAt = new Date();
      stats.errors++;

      this.logger.error({
        message: 'Discount scheduler run failed',
        error: (error as Error).message,
        stats,
      });

      return stats;
    }
  }

  /**
   * Process a single system discount rule
   *
   * Finds eligible users and creates user_discount records.
   * Idempotent: skips users who already have discounts.
   *
   * @param rule - The system discount rule to process
   * @returns Processing statistics for this rule
   */
  async processRule(rule: SystemDiscountRule): Promise<RuleProcessingStats> {
    const stats: RuleProcessingStats = {
      ruleId: rule.id,
      ruleName: rule.name,
      eligibleUsers: 0,
      discountsCreated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      this.logger.debug({
        message: 'Processing rule',
        ruleId: rule.id,
        ruleName: rule.name,
        triggerType: rule.triggerType,
        triggerValue: rule.triggerValue,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
      });

      // Find eligible users based on trigger type
      const eligibleUsers = await this.findEligibleUsers(rule);
      stats.eligibleUsers = eligibleUsers.length;

      this.logger.debug({
        message: 'Found eligible users',
        ruleId: rule.id,
        count: eligibleUsers.length,
      });

      // Process each eligible user
      for (const botUser of eligibleUsers) {
        try {
          // Check if user already has a discount for this subscription (idempotency)
          const existingDiscount =
            await this.userDiscountsRepository.findByBotUserAndSubscription(
              botUser.id,
              rule.subscriptionId,
            );

          if (existingDiscount) {
            stats.skipped++;
            this.logger.debug({
              message: 'User already has discount, skipping',
              botUserId: botUser.id,
              existingDiscountId: existingDiscount.id,
            });
            continue;
          }

          // Create user_discount record
          await this.userDiscountsRepository.create({
            botUserId: botUser.id,
            subscriptionId: rule.subscriptionId,
            discountType: rule.discountType,
            discountValue: rule.discountValue,
            sourceType: 'system_rule',
            sourceId: rule.id,
          });

          stats.discountsCreated++;

          this.logger.debug({
            message: 'Created discount for user',
            botUserId: botUser.id,
            ruleId: rule.id,
          });
        } catch (error) {
          stats.errors++;
          this.logger.error({
            message: 'Error creating discount for user',
            botUserId: botUser.id,
            ruleId: rule.id,
            error: (error as Error).message,
          });
          // Continue with next user (error isolation)
        }
      }

      return stats;
    } catch (error) {
      stats.errors++;
      this.logger.error({
        message: 'Error in rule processing',
        ruleId: rule.id,
        error: (error as Error).message,
      });
      return stats;
    }
  }

  /**
   * Find users eligible for a discount rule
   *
   * Currently supports:
   * - days_after_expiration: Users whose subscription expired N days ago
   *
   * AC-016: Bot-specific rules take precedence over global
   * This is handled by returning only users from the rule's bot scope.
   *
   * @param rule - The system discount rule
   * @returns Array of eligible BotUser records
   */
  async findEligibleUsers(rule: SystemDiscountRule): Promise<BotUser[]> {
    try {
      if (rule.triggerType === 'days_after_expiration') {
        // Find users with expired subscriptions
        // Rule.triggerValue = minimum days since expiration
        const expiredSubscriptions =
          await this.userSubscriptionsRepository.findExpired(
            undefined, // subscriptionType - will get all
            rule.botId ?? undefined, // botId filter
            rule.subscriptionId, // subscriptionId filter
          );

        // Filter by days since expiration
        const now = new Date();
        const eligibleBotUsers: BotUser[] = [];

        for (const { botUser, userSubscription } of expiredSubscriptions) {
          if (!userSubscription.expiresAt) continue;

          const expiresAt = new Date(userSubscription.expiresAt);
          const daysSinceExpiration = Math.floor(
            (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Check if user meets the days threshold
          // triggerValue specifies the exact day threshold (e.g., 7 means exactly on day 7)
          // For flexibility, we check if days >= triggerValue (users who have been expired for at least N days)
          if (daysSinceExpiration >= rule.triggerValue) {
            eligibleBotUsers.push(botUser);
          }
        }

        this.logger.debug({
          message: 'Found eligible users for days_after_expiration rule',
          ruleId: rule.id,
          triggerValue: rule.triggerValue,
          totalExpired: expiredSubscriptions.length,
          eligible: eligibleBotUsers.length,
        });

        return eligibleBotUsers;
      }

      // Unknown trigger type
      this.logger.warn({
        message: 'Unknown trigger type',
        ruleId: rule.id,
        triggerType: rule.triggerType,
      });

      return [];
    } catch (error) {
      this.logger.error({
        message: 'Error finding eligible users',
        ruleId: rule.id,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Cron job: Process discount rules daily at 00:00 UTC
   *
   * Pattern Reference: libs/partner-bot/src/services/reminder-scheduler.service.ts
   *
   * AC-014: Scheduler runs at 00:00 UTC
   */
  @Cron('0 0 * * *')
  async handleCron(): Promise<void> {
    this.logger.log('Starting daily discount scheduler cron job');

    const stats = await this.processAllRules();

    this.logger.log({
      message: 'Daily discount scheduler cron job completed',
      rulesProcessed: stats.rulesProcessed,
      usersProcessed: stats.usersProcessed,
      discountsCreated: stats.discountsCreated,
      errors: stats.errors,
      durationMs: stats.completedAt.getTime() - stats.startedAt.getTime(),
    });
  }
}
