import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if user is eligible for trial
   * Eligibility: No subscription history for this specific bot-user
   * @param botUserId - The bot_users.id (NOT telegramId)
   */
  async isEligible(botUserId: number): Promise<boolean> {
    // Check if TRIAL_ENABLED is true
    const trialEnabled = this.configService.get<boolean>('TRIAL_ENABLED', true);
    if (!trialEnabled) {
      this.logger.debug('Trial system is disabled');
      return false;
    }

    // Simple: no subscription history for this bot-user = eligible
    const existing =
      await this.userSubscriptionsRepository.findByBotUserId(botUserId);
    const eligible = existing.length === 0;

    this.logger.debug(`BotUser ${botUserId} trial eligibility: ${eligible}`);
    return eligible;
  }

  /**
   * Activate trial subscription for user
   * Creates user_subscription record with configurable expiration (TRIAL_DURATION_DAYS)
   * @param botUserId - The bot_users.id (NOT telegramId)
   */
  async activate(
    botUserId: number,
    trialDays?: number,
  ): Promise<{
    success: boolean;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      // Double-check eligibility
      const eligible = await this.isEligible(botUserId);
      if (!eligible) {
        return { success: false, error: 'Trial already used or not enabled' };
      }

      // Get trial subscription from DB using feature flag
      const trialSubscription =
        await this.subscriptionsRepository.findTrialSubscription();
      if (!trialSubscription) {
        this.logger.error(
          'Trial subscription not found in database (missing is_trial feature flag)',
        );
        return { success: false, error: 'Trial not available' };
      }

      // Get trial duration from config
      const durationDays =
        trialDays ?? this.configService.get<number>('TRIAL_DURATION_DAYS', 7);

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(durationDays));

      // Create user_subscription record with botUserId
      await this.userSubscriptionsRepository.activateForBotUser(
        botUserId,
        trialSubscription.id,
        expiresAt,
      );

      this.logger.log(
        `Trial activated for botUser ${botUserId}, expires: ${expiresAt.toISOString()}`,
      );

      return { success: true, expiresAt };
    } catch (error) {
      this.logger.error(
        `Failed to activate trial for botUser ${botUserId}`,
        error,
      );
      return { success: false, error: 'Failed to activate trial' };
    }
  }
}
