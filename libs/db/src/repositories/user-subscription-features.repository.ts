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
    userId: number,
  ): Promise<UserSubscriptionFeature> {
    const [result] = await this.db
      .insert(userSubscriptionFeatures)
      .values({
        botUserId,
        userId, // Required during transition period
        featureKey,
        settings,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [
          userSubscriptionFeatures.userId,
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

  // ==========================================
  // DEPRECATED: Methods using userId (telegramId)
  // ==========================================

  /**
   * @deprecated Use getBotUserFeatureSettings(botUserId, featureKey) instead.
   * Will be removed after migration validation period.
   *
   * Get user's settings for a specific feature
   *
   * This method returns only active settings.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to retrieve settings for
   * @returns The user's feature settings or null if not found
   */
  async getUserFeatureSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<UserSubscriptionFeature | null> {
    const result = await this.db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * @deprecated Use getAllBotUserSettings(botUserId) instead.
   * Will be removed after migration validation period.
   *
   * Get all active feature settings for a user
   *
   * Returns all feature configurations the user has customized.
   *
   * @param userId - The user's Telegram ID
   * @returns Array of all active user feature settings
   */
  async getAllUserSettings(userId: number): Promise<UserSubscriptionFeature[]> {
    return this.db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      );
  }

  /**
   * @deprecated Use upsertBotUserSettings(botUserId, featureKey, settings, userId) instead.
   * Will be removed after migration validation period.
   *
   * Create or update user feature settings
   *
   * Uses INSERT ... ON CONFLICT to handle both creation and updates.
   * This is the primary method for saving user preferences.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to configure
   * @param settings - Feature-specific configuration object
   * @returns The upserted user feature settings record
   */
  async upsertUserSettings(
    userId: number,
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): Promise<UserSubscriptionFeature> {
    const [result] = await this.db
      .insert(userSubscriptionFeatures)
      .values({
        userId,
        featureKey,
        settings,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [
          userSubscriptionFeatures.userId,
          userSubscriptionFeatures.featureKey,
        ],
        set: {
          settings,
          isActive: true,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    return result;
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

  /**
   * @deprecated Use deactivateBotUserSettings(botUserId, featureKey) instead.
   * Will be removed after migration validation period.
   *
   * Deactivate user settings (soft delete)
   *
   * Sets isActive=false but preserves the settings.
   * Useful when user downgrades but may upgrade again later.
   *
   * Use case: VIP → Basic downgrade (preserve custom filters for future upgrade)
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to deactivate
   */
  async deactivateUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .update(userSubscriptionFeatures)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Reactivate previously deactivated user settings
   *
   * Sets isActive=true to restore preserved settings.
   *
   * Use case: User upgrades back to VIP, restore their old custom filters
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to reactivate
   */
  async reactivateUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.db
      .update(userSubscriptionFeatures)
      .set({ isActive: true, updatedAt: sql`now()` })
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * @deprecated Use hasBotUserConfiguredFeature(botUserId, featureKey) instead.
   * Will be removed after migration validation period.
   *
   * Check if user has configured settings for a feature
   *
   * Returns true if settings exist, regardless of active status.
   * Useful to show "You had this feature before" messages.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to check
   * @returns true if user has any settings (active or inactive)
   */
  async hasConfiguredFeature(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<boolean> {
    const result = await this.db
      .select({ exists: sql<number>`1` })
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get all users who have configured a specific feature
   *
   * Returns only users with active settings.
   * Useful for analytics and bulk operations.
   *
   * @param featureKey - The feature to search for
   * @returns Array of user IDs with active settings for this feature
   */
  async getUsersWithFeatureSettings(
    featureKey: FeatureFlag,
  ): Promise<number[]> {
    const result = await this.db
      .selectDistinct({ userId: userSubscriptionFeatures.userId })
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.featureKey, featureKey),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      );

    return result.map((r) => r.userId);
  }

  /**
   * Update specific field in settings JSONB
   *
   * Allows partial updates without overwriting the entire settings object.
   * Uses PostgreSQL's jsonb_set function for atomic updates.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to update
   * @param path - JSONB path as array (e.g., ['symbols'] for settings.symbols)
   * @param value - New value to set
   */
  async updateSettingsField(
    userId: number,
    featureKey: FeatureFlag,
    path: string[],
    value: unknown,
  ): Promise<void> {
    const pathStr = `{${path.join(',')}}`;
    await this.db
      .update(userSubscriptionFeatures)
      .set({
        settings: sql`jsonb_set(settings, ${pathStr}, ${JSON.stringify(value)}::jsonb)`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }
}
