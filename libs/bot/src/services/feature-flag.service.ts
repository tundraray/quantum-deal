import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionFeaturesRepository } from '@quantumdeal/db';
import { FeatureFlag, FeatureConfig } from '@quantumdeal/db/schema';

/**
 * User Features Interface
 *
 * Aggregated feature data for a user from all active subscriptions.
 * Used to enrich UserContext with feature information.
 */
export interface UserFeatures {
  /**
   * Set of enabled feature keys for the user
   * This is a union of features from all active subscriptions
   */
  enabledFeatures: Set<FeatureFlag>;

  /**
   * Map of feature-specific configurations
   * If a feature appears in multiple subscriptions, configs are merged
   */
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}

/**
 * Feature Flag Service
 *
 * Provides read-only access to feature flags for users.
 * This service aggregates features from all active subscriptions.
 *
 * NOTE: This service is READ-ONLY. Features are managed via:
 * - Direct SQL queries
 * - Admin panel (external tool)
 * - Database migrations for feature rollouts
 *
 * The bot only reads features for access control, it does not modify them.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly featuresRepository: SubscriptionFeaturesRepository,
  ) {}

  /**
   * Get all enabled features for a user
   *
   * This aggregates features from ALL active subscriptions (union).
   * If a feature appears in multiple subscriptions, configs are merged.
   *
   * Example:
   * - User has 2 active subscriptions: Basic and VIP
   * - Basic: [TIER_BASED_FILTERING]
   * - VIP: [TIER_BASED_FILTERING, CUSTOM_USER_FILTERING]
   * - Result: [TIER_BASED_FILTERING, CUSTOM_USER_FILTERING]
   *
   * @param userId - The user's Telegram ID
   * @returns UserFeatures object with enabled features and configs
   */
  async getUserFeatures(userId: number): Promise<UserFeatures> {
    const features = await this.featuresRepository.getFeaturesByUserId(userId);

    const enabledFeatures = new Set<FeatureFlag>();
    const featureConfigs = new Map<FeatureFlag, FeatureConfig>();

    for (const feature of features) {
      const featureKey = feature.featureKey as FeatureFlag;
      enabledFeatures.add(featureKey);

      // Merge configs if feature appears in multiple subscriptions
      if (featureConfigs.has(featureKey)) {
        const existingConfig = featureConfigs.get(featureKey)!;
        featureConfigs.set(featureKey, {
          ...existingConfig,
          ...feature.config,
        });
      } else {
        featureConfigs.set(featureKey, feature.config);
      }
    }

    this.logger.debug(
      `User ${userId} has ${enabledFeatures.size} enabled features: ${Array.from(enabledFeatures).join(', ')}`,
    );

    return { enabledFeatures, featureConfigs };
  }
}
