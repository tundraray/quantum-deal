import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  subscriptionFeatures,
  SubscriptionFeature,
  NewSubscriptionFeature,
  FeatureFlag,
  FeatureConfig,
} from '../schema/subscription-features';
import { userSubscriptions } from '../schema/user-subscriptions';
import { subscriptions } from '../schema/subscriptions';

/**
 * Repository for managing subscription features (feature flags)
 *
 * This repository handles the persistence layer for feature flags,
 * supporting queries by subscription, user, and feature key.
 */
@Injectable()
export class SubscriptionFeaturesRepository extends BaseRepository<
  SubscriptionFeature,
  NewSubscriptionFeature,
  number
> {
  protected table = subscriptionFeatures;
  protected idColumn = subscriptionFeatures.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Get all enabled features for a specific subscription
   *
   * @param subscriptionId - The subscription ID
   * @returns Array of enabled features for the subscription
   */
  async getFeaturesBySubscriptionId(
    subscriptionId: number,
  ): Promise<SubscriptionFeature[]> {
    return this.db
      .select()
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );
  }

  /**
   * Get all enabled features for a user (aggregated from all active subscriptions)
   *
   * This method:
   * - Joins with user_subscriptions to find user's subscriptions
   * - Joins with subscriptions to verify subscription is active
   * - Filters for active user_subscriptions and enabled features
   * - Returns distinct features (user may have same feature from multiple subscriptions)
   *
   * @param userId - The user's Telegram ID
   * @returns Array of distinct enabled features for the user
   */
  async getFeaturesByUserId(userId: number): Promise<SubscriptionFeature[]> {
    return this.db
      .selectDistinct({
        id: subscriptionFeatures.id,
        subscriptionId: subscriptionFeatures.subscriptionId,
        featureKey: subscriptionFeatures.featureKey,
        isEnabled: subscriptionFeatures.isEnabled,
        config: subscriptionFeatures.config,
        createdAt: subscriptionFeatures.createdAt,
        updatedAt: subscriptionFeatures.updatedAt,
      })
      .from(subscriptionFeatures)
      .innerJoin(
        userSubscriptions,
        eq(
          subscriptionFeatures.subscriptionId,
          userSubscriptions.subscriptionId,
        ),
      )
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true),
          eq(subscriptions.isActive, true),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );
  }

  /**
   * Check if a user has a specific feature enabled
   *
   * This is an optimized check that returns true/false without loading full feature data.
   * Useful for permission checks and guards.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to check
   * @returns true if user has the feature enabled
   */
  async hasFeature(userId: number, featureKey: FeatureFlag): Promise<boolean> {
    const result = await this.db
      .select({ exists: sql<number>`1` })
      .from(subscriptionFeatures)
      .innerJoin(
        userSubscriptions,
        eq(
          subscriptionFeatures.subscriptionId,
          userSubscriptions.subscriptionId,
        ),
      )
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(subscriptionFeatures.featureKey, featureKey),
          eq(subscriptionFeatures.isEnabled, true),
          eq(userSubscriptions.isActive, true),
          eq(subscriptions.isActive, true),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get a specific feature with configuration for a subscription
   *
   * This returns the feature record regardless of enabled status,
   * allowing callers to check both state and configuration.
   *
   * @param subscriptionId - The subscription ID
   * @param featureKey - The feature to retrieve
   * @returns The feature record or null if not found
   */
  async getFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<SubscriptionFeature | null> {
    const result = await this.db
      .select()
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Add or update a feature for a subscription
   *
   * Uses INSERT ... ON CONFLICT to handle both creation and updates.
   * This is the primary method for modifying feature state.
   *
   * @param subscriptionId - The subscription ID
   * @param featureKey - The feature to upsert
   * @param isEnabled - Whether the feature is enabled (default: true)
   * @param config - Feature-specific configuration object (default: {})
   * @returns The upserted feature record
   */
  async upsertFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
    isEnabled: boolean = true,
    config: FeatureConfig = {},
  ): Promise<SubscriptionFeature> {
    const [result] = await this.db
      .insert(subscriptionFeatures)
      .values({
        subscriptionId,
        featureKey,
        isEnabled,
        config,
      })
      .onConflictDoUpdate({
        target: [
          subscriptionFeatures.subscriptionId,
          subscriptionFeatures.featureKey,
        ],
        set: {
          isEnabled,
          config,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    return result;
  }

  /**
   * Enable a feature for a subscription
   *
   * Convenience method that calls upsertFeature with isEnabled=true.
   * If the feature already exists, it will be re-enabled.
   *
   * @param subscriptionId - The subscription ID
   * @param featureKey - The feature to enable
   * @param config - Feature-specific configuration object (default: {})
   * @returns The enabled feature record
   */
  async enableFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
    config: FeatureConfig = {},
  ): Promise<SubscriptionFeature> {
    return this.upsertFeature(subscriptionId, featureKey, true, config);
  }

  /**
   * Disable a feature for a subscription (soft delete)
   *
   * Sets isEnabled=false but keeps the record and configuration.
   * The feature can be re-enabled later without losing config.
   *
   * @param subscriptionId - The subscription ID
   * @param featureKey - The feature to disable
   */
  async disableFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .update(subscriptionFeatures)
      .set({
        isEnabled: false,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Remove a feature from a subscription (hard delete)
   *
   * Permanently deletes the feature record and its configuration.
   * Use disableFeature() if you want to preserve the configuration.
   *
   * @param subscriptionId - The subscription ID
   * @param featureKey - The feature to remove
   */
  async removeFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .delete(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Set multiple features for a subscription (replaces existing)
   *
   * This is an atomic operation that:
   * 1. Deletes all existing features for the subscription
   * 2. Inserts the new feature set
   *
   * Useful for applying feature templates or performing bulk updates.
   *
   * @param subscriptionId - The subscription ID
   * @param features - Array of features to set
   */
  async setFeatures(
    subscriptionId: number,
    features: Array<{
      featureKey: FeatureFlag;
      isEnabled?: boolean;
      config?: FeatureConfig;
    }>,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      // Remove existing features
      await tx
        .delete(subscriptionFeatures)
        .where(eq(subscriptionFeatures.subscriptionId, subscriptionId));

      // Insert new features (if any)
      if (features.length > 0) {
        await tx.insert(subscriptionFeatures).values(
          features.map((f) => ({
            subscriptionId,
            featureKey: f.featureKey,
            isEnabled: f.isEnabled ?? true,
            config: f.config ?? {},
          })),
        );
      }
    });
  }

  /**
   * Get all subscriptions that have a specific feature enabled
   *
   * Returns subscription IDs only (not full subscription records).
   * Useful for bulk operations like feature rollouts or analytics.
   *
   * @param featureKey - The feature to search for
   * @returns Array of subscription IDs that have the feature enabled
   */
  async getSubscriptionsWithFeature(
    featureKey: FeatureFlag,
  ): Promise<number[]> {
    const result = await this.db
      .selectDistinct({ subscriptionId: subscriptionFeatures.subscriptionId })
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.featureKey, featureKey),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );

    return result.map((r) => r.subscriptionId);
  }
}
