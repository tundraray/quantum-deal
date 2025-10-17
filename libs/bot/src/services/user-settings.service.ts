import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  UserSubscriptionFeaturesRepository,
  SubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import { FeatureFlag, UserFeatureSettings } from '@quantumdeal/db/schema';

/**
 * User Settings Service
 *
 * Manages user-specific settings for enabled features.
 * Users can customize how features behave through this service.
 *
 * Validation Rules:
 * - User must have access to the feature before configuring it
 * - Settings must conform to feature-specific schemas
 * - TIER_BASED_FILTERING cannot be configured by users (subscription-level only)
 */
@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    private readonly userFeaturesRepo: UserSubscriptionFeaturesRepository,
    private readonly subscriptionFeaturesRepo: SubscriptionFeaturesRepository,
  ) {}

  /**
   * Get user's settings for a feature
   *
   * Returns null if:
   * - User doesn't have access to the feature
   * - User hasn't configured settings yet
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to get settings for
   * @returns User's settings or null
   */
  async getUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<UserFeatureSettings | null> {
    // Verify user has access to this feature
    const hasAccess = await this.subscriptionFeaturesRepo.hasFeature(
      userId,
      featureKey,
    );

    if (!hasAccess) {
      this.logger.warn(
        `User ${userId} attempted to access settings for unavailable feature ${featureKey}`,
      );
      return null;
    }

    const settings = await this.userFeaturesRepo.getUserFeatureSettings(
      userId,
      featureKey,
    );

    return settings?.settings || null;
  }

  /**
   * Save user's settings for a feature
   *
   * Validates that:
   * 1. User has access to the feature
   * 2. Settings conform to feature-specific schema
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to configure
   * @param settings - Feature-specific settings object
   * @throws BadRequestException if user doesn't have access or settings are invalid
   */
  async saveUserSettings(
    userId: number,
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): Promise<void> {
    // Verify user has access to this feature
    const hasAccess = await this.subscriptionFeaturesRepo.hasFeature(
      userId,
      featureKey,
    );

    if (!hasAccess) {
      throw new BadRequestException(
        `Feature ${featureKey} not available in your subscription`,
      );
    }

    // Validate settings based on feature type
    this.validateSettings(featureKey, settings);

    await this.userFeaturesRepo.upsertUserSettings(
      userId,
      featureKey,
      settings,
    );

    this.logger.log(
      `User ${userId} updated settings for feature ${featureKey}`,
    );
  }

  /**
   * Reset user's settings to defaults
   *
   * Deletes the user's custom settings, reverting to default behavior.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to reset
   */
  async resetUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.userFeaturesRepo.deleteUserSettings(userId, featureKey);
    this.logger.log(
      `User ${userId} reset settings for feature ${featureKey} to defaults`,
    );
  }

  /**
   * Deactivate user's settings (soft delete)
   *
   * Preserves settings but marks them as inactive.
   * Useful for downgrades - settings can be restored on upgrade.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to deactivate
   */
  async deactivateUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.userFeaturesRepo.deactivateUserSettings(userId, featureKey);
    this.logger.log(
      `User ${userId} deactivated settings for feature ${featureKey} (preserved for future upgrade)`,
    );
  }

  /**
   * Reactivate previously deactivated settings
   *
   * Restores preserved settings when user upgrades.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to reactivate
   */
  async reactivateUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.userFeaturesRepo.reactivateUserSettings(userId, featureKey);
    this.logger.log(
      `User ${userId} reactivated settings for feature ${featureKey}`,
    );
  }

  /**
   * Validate settings based on feature type
   *
   * Each feature has its own validation rules.
   *
   * @param featureKey - The feature being configured
   * @param settings - Settings to validate
   * @throws BadRequestException if settings are invalid
   */
  private validateSettings(
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): void {
    switch (featureKey) {
      case FeatureFlag.TIER_BASED_FILTERING:
        this.validateTierFilteringSettings();
        break;
      case FeatureFlag.CUSTOM_USER_FILTERING:
        this.validateCustomFilteringSettings(settings);
        break;
      default: {
        const exhaustiveCheck: never = featureKey;
        throw new BadRequestException(
          `Unknown feature: ${String(exhaustiveCheck)}`,
        );
      }
    }
  }

  /**
   * Validate TIER_BASED_FILTERING settings
   *
   * This feature is configured at subscription level, not user level.
   * Users cannot configure tier-based filtering.
   */
  private validateTierFilteringSettings(): void {
    throw new BadRequestException(
      'TIER_BASED_FILTERING is configured at subscription level, not user level. ' +
        'Users cannot modify tier-based filters - they are system-controlled.',
    );
  }

  /**
   * Validate CUSTOM_USER_FILTERING settings
   *
   * Schema:
   * {
   *   symbols: string[]  // Array of symbol names like ['GBPUSD.a', 'EURUSD.a']
   * }
   *
   * Rules:
   * - symbols must be an array of strings
   * - Empty array is valid (means no filtering, receive all signals)
   */
  private validateCustomFilteringSettings(settings: unknown): void {
    if (typeof settings !== 'object' || settings === null) {
      throw new BadRequestException('Settings must be an object');
    }

    const config = settings as Record<string, unknown>;

    // Validate symbols field if present
    if (config.symbols !== undefined) {
      if (!Array.isArray(config.symbols)) {
        throw new BadRequestException('symbols must be an array');
      }

      if (
        config.symbols.some((symbol: unknown) => typeof symbol !== 'string')
      ) {
        throw new BadRequestException(
          'symbols must be an array of strings (e.g., ["GBPUSD.a", "EURUSD.a", "BTCUSD.a"])',
        );
      }

      // Note: We're not validating if symbols exist in the instruments table here
      // That validation should happen when user selects instruments in the UI
      // This allows for forward compatibility if new instruments are added
    }
  }

  /**
   * Get default settings for a feature
   *
   * Returns the default configuration when user hasn't customized.
   *
   * @param featureKey - The feature to get defaults for
   * @returns Default settings object
   */
  getDefaultSettings(featureKey: FeatureFlag): UserFeatureSettings {
    const defaults: Record<FeatureFlag, UserFeatureSettings> = {
      [FeatureFlag.TIER_BASED_FILTERING]: {},
      [FeatureFlag.CUSTOM_USER_FILTERING]: {
        symbols: [], // Empty array = no filtering, receive all signals
      },
    };

    return defaults[featureKey] || {};
  }

  /**
   * Check if user has configured custom settings
   *
   * Returns true if user has modified settings from defaults.
   *
   * @param userId - The user's Telegram ID
   * @param featureKey - The feature to check
   * @returns true if user has custom settings
   */
  async hasCustomSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<boolean> {
    return this.userFeaturesRepo.hasConfiguredFeature(userId, featureKey);
  }
}
