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
   * Eligibility: No subscription history (user_subscriptions table has 0 records)
   */
  async isEligible(userId: number): Promise<boolean> {
    // Check if TRIAL_ENABLED is true
    const trialEnabled = this.configService.get<boolean>('TRIAL_ENABLED', true);
    if (!trialEnabled) {
      this.logger.debug('Trial system is disabled');
      return false;
    }

    // Simple: no subscription history = eligible
    const existing =
      await this.userSubscriptionsRepository.findByUserId(userId);
    const eligible = existing.length === 0;

    this.logger.debug(`User ${userId} trial eligibility: ${eligible}`);
    return eligible;
  }

  /**
   * Activate trial subscription for user
   * Creates user_subscription record with configurable expiration (TRIAL_DURATION_DAYS)
   */
  async activate(userId: number): Promise<{
    success: boolean;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      // Double-check eligibility
      const eligible = await this.isEligible(userId);
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
      const durationDays = this.configService.get<number>(
        'TRIAL_DURATION_DAYS',
        7,
      );

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
      // Create user_subscription record
      await this.userSubscriptionsRepository.activate(
        userId,
        trialSubscription.id,
        expiresAt,
      );

      this.logger.log(
        `Trial activated for user ${userId}, expires: ${expiresAt.toISOString()}`,
      );

      return { success: true, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to activate trial for user ${userId}`, error);
      return { success: false, error: 'Failed to activate trial' };
    }
  }
}
