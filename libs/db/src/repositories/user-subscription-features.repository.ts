import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  userSubscriptionFeatures,
  UserSubscriptionFeature,
  NewUserSubscriptionFeature,
  UserFeatureSettings,
} from '../schema/user-subscription-features';
import { FeatureFlag } from '../schema/subscription-features';

/**
 * Repository for managing user-specific feature settings
 *
 * This repository handles the persistence layer for user-configurable features.
 * Users can customize how features behave through JSONB settings storage.
 *
 * Key Operations:
 * - Get user settings for a feature
 * - Upsert (create or update) settings
 * - Delete/deactivate settings
 */
@Injectable()
export class UserSubscriptionFeaturesRepository extends BaseRepository<
  UserSubscriptionFeature,
  NewUserSubscriptionFeature,
  number
> {
  protected table = userSubscriptionFeatures;
  protected idColumn = userSubscriptionFeatures.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  // ==========================================
  // NEW: Methods using botUserId (bot_users.id)
  // ==========================================

  /**
   * Get bot user's settings for a specific feature
   *
   * This method returns only active settings.
   *
   * @param botUserId - The bot_users.id (internal ID, NOT telegramId)
   * @param featureKey - The feature to retrieve settings for
   * @returns The user's feature settings or null if not found
   */
  async getBotUserFeatureSettings(
    botUserId: number,
    featureKey: FeatureFlag,
  ): Promise<UserSubscriptionFeature | null> {
    const result = await this.db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.botUserId, botUserId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get all active feature settings for a bot user
   *
   * @param botUserId - The bot_users.id (internal ID, NOT telegramId)
   * @returns Array of all active bot user feature settings
   */
  async getAllBotUserSettings(
    botUserId: number,
  ): Promise<UserSubscriptionFeature[]> {
    return this.db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.botUserId, botUserId),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      );
  }

  /**
   * Create or update bot user feature settings
   *
   * @param botUserId - The bot_users.id (internal ID, NOT telegramId)
   * @param featureKey - The feature to configure
   * @param settings - Feature-specific configuration object
   * @param userId - The user's telegramId (required during transition period for NOT NULL constraint)
   * @returns The upserted user feature settings record
   */
  async upsertBotUserSettings(
    botUserId: number,
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): Promise<UserSubscriptionFeature> {
    const [result] = await this.db
      .insert(userSubscriptionFeatures)
      .values({
        botUserId,
        featureKey,
        settings,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [
          userSubscriptionFeatures.botUserId,
          userSubscriptionFeatures.featureKey,
        ],
        set: {
          botUserId,
          settings,
          isActive: true,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    return result;
  }

  /**
   * Deactivate bot user settings (soft delete)
   *
   * @param botUserId - The bot_users.id (internal ID, NOT telegramId)
   * @param featureKey - The feature to deactivate
   */
  async deactivateBotUserSettings(
    botUserId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .update(userSubscriptionFeatures)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(userSubscriptionFeatures.botUserId, botUserId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Check if bot user has configured settings for a feature
   *
   * @param botUserId - The bot_users.id (internal ID, NOT telegramId)
   * @param featureKey - The feature to check
   * @returns true if bot user has any settings (active or inactive)
   */
  async hasBotUserConfiguredFeature(
    botUserId: number,
    featureKey: FeatureFlag,
  ): Promise<boolean> {
    const result = await this.db
      .select({ exists: sql<number>`1` })
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.botUserId, botUserId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   *
   * Delete user feature settings (hard delete)
   *
   * Permanently removes the user's settings for a feature.
   * This resets the feature to its default behavior.
   *
   * Use case: User clicks "Reset to defaults"
   *
   * @param botUserId - The bot user ID
   * @param featureKey - The feature to reset
   */
  async deleteUserSettings(
    botUserId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .delete(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.botUserId, botUserId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }
}
