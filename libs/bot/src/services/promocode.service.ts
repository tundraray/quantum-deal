import { Injectable, Logger } from '@nestjs/common';
import {
  PromocodesRepository,
  PromocodeActivationsRepository,
  UserDiscountsRepository,
  type Promocode,
  type PromocodeActivation,
  type UserDiscount,
  type RenewalTariff,
} from '@quantumdeal/db';
import type { DiscountType } from '@quantumdeal/db/schema';

/**
 * Validation result for promocode validation
 */
export interface ValidationResult {
  ok: boolean;
  promocode?: Promocode;
  error?:
    | 'INVALID_CODE'
    | 'CODE_INACTIVE'
    | 'CODE_NOT_VALID_FOR_BOT'
    | 'CODE_NOT_YET_VALID'
    | 'CODE_EXPIRED'
    | 'CODE_ALREADY_USED'
    | 'CODE_ALREADY_USED_BY_YOU'
    | 'CODE_LIMIT_REACHED';
}

/**
 * Activation result for promocode activation
 */
export interface ActivationResult {
  ok: boolean;
  activation?: PromocodeActivation;
  userDiscount?: UserDiscount;
  error?: string;
}

/**
 * Discount information for price calculation
 */
export interface DiscountInfo {
  type: DiscountType;
  value: number;
  sourceType: 'promocode' | 'system_rule';
  sourceId: number;
}

/**
 * Extended tariff with discount information
 */
export interface DiscountedTariff extends RenewalTariff {
  originalPrice: number;
  discountedPrice: number;
  hasDiscount: boolean;
  savings: number;
}

/**
 * Minimum price floor in Stars
 * Enforced per design doc constraint
 */
const MINIMUM_PRICE_STARS = 1;

/**
 * PromocodeService
 *
 * Handles promocode validation, activation, and discount calculation.
 * Integrates with the payment flow and renewal scene to provide
 * user-specific discounts.
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 * ADR Reference: ADR-010-promocode-discount-system.md
 *
 * Responsibilities:
 * - Validate promocode strings against database records
 * - Activate promocodes and create user_discount records
 * - Calculate discounted prices with minimum floor enforcement
 * - Select best discount when multiple are available (maximum savings)
 * - Generate discounted tariff lists for display
 */
@Injectable()
export class PromocodeService {
  private readonly logger = new Logger(PromocodeService.name);

  constructor(
    private readonly promocodesRepository: PromocodesRepository,
    private readonly promocodeActivationsRepository: PromocodeActivationsRepository,
    private readonly userDiscountsRepository: UserDiscountsRepository,
  ) {}

  /**
   * Validate a promocode for a specific user and bot
   *
   * Validation checks (in order):
   * 1. Code exists in database (case-insensitive)
   * 2. Code is active (is_active = true)
   * 3. Code matches bot scope (global or bot-specific)
   * 4. Code is within validity period (valid_from <= now <= valid_until)
   * 5. Single-use: not already activated by anyone
   * 6. Multi-use: not already activated by this user
   * 7. Max activations limit not reached
   *
   * @param code - The promocode string to validate
   * @param botUserId - The bot user ID (bot_users.id)
   * @param botId - The bot ID for scope validation (null for global)
   * @returns ValidationResult with ok flag and promocode or error
   */
  async validatePromocode(
    code: string,
    botUserId: number,
    botId: number | null,
  ): Promise<ValidationResult> {
    try {
      this.logger.debug({
        message: 'Validating promocode',
        code,
        botUserId,
        botId,
      });

      // 1. Find promocode by code (case-insensitive)
      const promocode = await this.promocodesRepository.findByCode(code);

      if (!promocode) {
        this.logger.debug({ message: 'Promocode not found', code });
        return { ok: false, error: 'INVALID_CODE' };
      }

      // 2. Check if active
      if (!promocode.isActive) {
        this.logger.debug({
          message: 'Promocode is inactive',
          code,
          promocodeId: promocode.id,
        });
        return { ok: false, error: 'CODE_INACTIVE' };
      }

      // 3. Check bot scope
      // Global promocodes (botId=NULL) work everywhere
      // Bot-specific promocodes only work in their bot
      if (promocode.botId !== null && promocode.botId !== botId) {
        this.logger.debug({
          message: 'Promocode not valid for bot',
          code,
          promocodeBotId: promocode.botId,
          requestedBotId: botId,
        });
        return { ok: false, error: 'CODE_NOT_VALID_FOR_BOT' };
      }

      // 4. Check validity period
      const now = new Date();

      if (promocode.validFrom && promocode.validFrom > now) {
        this.logger.debug({
          message: 'Promocode not yet valid',
          code,
          validFrom: promocode.validFrom,
        });
        return { ok: false, error: 'CODE_NOT_YET_VALID' };
      }

      if (promocode.validUntil && promocode.validUntil < now) {
        this.logger.debug({
          message: 'Promocode expired',
          code,
          validUntil: promocode.validUntil,
        });
        return { ok: false, error: 'CODE_EXPIRED' };
      }

      // 5 & 6. Check usage based on type
      if (promocode.type === 'single_use') {
        // Single-use: check if anyone has activated
        const activationCount =
          await this.promocodeActivationsRepository.countByPromocodeId(
            promocode.id,
          );

        if (activationCount > 0) {
          this.logger.debug({
            message: 'Single-use promocode already used',
            code,
            promocodeId: promocode.id,
          });
          return { ok: false, error: 'CODE_ALREADY_USED' };
        }
      } else if (promocode.type === 'multi_use') {
        // Multi-use: check if this user has activated
        const hasActivated =
          await this.promocodeActivationsRepository.hasUserActivated(
            promocode.id,
            botUserId,
          );

        if (hasActivated) {
          this.logger.debug({
            message: 'Multi-use promocode already used by user',
            code,
            promocodeId: promocode.id,
            botUserId,
          });
          return { ok: false, error: 'CODE_ALREADY_USED_BY_YOU' };
        }
      }

      // 7. Check max activations limit
      if (promocode.maxActivations !== null) {
        const activationCount =
          await this.promocodeActivationsRepository.countByPromocodeId(
            promocode.id,
          );

        if (activationCount >= promocode.maxActivations) {
          this.logger.debug({
            message: 'Promocode activation limit reached',
            code,
            promocodeId: promocode.id,
            currentActivations: activationCount,
            maxActivations: promocode.maxActivations,
          });
          return { ok: false, error: 'CODE_LIMIT_REACHED' };
        }
      }

      this.logger.log({
        message: 'Promocode validated successfully',
        code,
        promocodeId: promocode.id,
        botUserId,
      });

      return { ok: true, promocode };
    } catch (error) {
      this.logger.error({
        message: 'Error validating promocode',
        code,
        botUserId,
        error: (error as Error).message,
      });
      return { ok: false, error: 'INVALID_CODE' };
    }
  }

  /**
   * Activate a promocode for a user
   *
   * Creates activation record and user_discount.
   * For single-use codes, deactivates the promocode after activation.
   *
   * @param promocodeId - The promocode ID to activate
   * @param botUserId - The bot user ID (bot_users.id)
   * @param subscriptionId - The subscription ID to apply discount to
   * @returns ActivationResult with activation and userDiscount or error
   */
  async activatePromocode(
    promocodeId: number,
    botUserId: number,
    subscriptionId: number,
  ): Promise<ActivationResult> {
    try {
      this.logger.log({
        message: 'Activating promocode',
        promocodeId,
        botUserId,
        subscriptionId,
      });

      // Get promocode details
      const promocode = await this.promocodesRepository.findById(promocodeId);

      if (!promocode) {
        return { ok: false, error: 'Promocode not found' };
      }

      // Create activation record
      const activation = await this.promocodeActivationsRepository.create({
        promocodeId,
        botUserId,
      });

      // Create or update user_discount (upsert replaces existing)
      const userDiscount = await this.userDiscountsRepository.upsert({
        botUserId,
        subscriptionId,
        discountType: promocode.discountType,
        discountValue: promocode.discountValue,
        sourceType: 'promocode',
        sourceId: promocodeId,
      });

      // For single-use codes, deactivate after successful activation
      if (promocode.type === 'single_use') {
        await this.promocodesRepository.deactivate(promocodeId);
        this.logger.log({
          message: 'Single-use promocode deactivated',
          promocodeId,
        });
      }

      // Update promocode timestamp (for tracking)
      await this.promocodesRepository.incrementActivationCount(promocodeId);

      this.logger.log({
        message: 'Promocode activated successfully',
        promocodeId,
        botUserId,
        activationId: activation.id,
        userDiscountId: userDiscount.id,
      });

      return { ok: true, activation, userDiscount };
    } catch (error) {
      this.logger.error({
        message: 'Error activating promocode',
        promocodeId,
        botUserId,
        error: (error as Error).message,
      });
      return { ok: false, error: (error as Error).message };
    }
  }

  /**
   * Get the user's active discount for a subscription
   *
   * Looks up user_discounts table for permanent discount.
   * Returns null if no discount exists.
   *
   * @param botUserId - The bot user ID (bot_users.id)
   * @param subscriptionId - The subscription ID
   * @returns UserDiscount or null
   */
  async getUserActiveDiscount(
    botUserId: number,
    subscriptionId: number,
  ): Promise<UserDiscount | null> {
    try {
      return await this.userDiscountsRepository.findByBotUserAndSubscription(
        botUserId,
        subscriptionId,
      );
    } catch (error) {
      this.logger.error({
        message: 'Error getting user active discount',
        botUserId,
        subscriptionId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Calculate the discounted price
   *
   * Applies discount based on type (percentage or fixed).
   * Enforces minimum price floor of 1 Star.
   * Returns floored integer result.
   *
   * AC-010: percentage = original - (original * discount_value / 100), floored
   * AC-011: fixed = original - discount_value
   * AC-012: minimum floor = 1 Star
   *
   * @param originalPrice - Original price in Stars
   * @param discount - Discount information
   * @returns Discounted price in Stars (integer, minimum 1)
   */
  calculateDiscountedPrice(
    originalPrice: number,
    discount: DiscountInfo,
  ): number {
    try {
      let discountedPrice: number;

      if (discount.type === 'percentage') {
        // Percentage discount: subtract percentage of original
        const discountAmount = (originalPrice * discount.value) / 100;
        discountedPrice = Math.floor(originalPrice - discountAmount);
      } else {
        // Fixed discount: subtract fixed amount
        discountedPrice = originalPrice - discount.value;
      }

      // Enforce minimum price floor
      if (discountedPrice < MINIMUM_PRICE_STARS) {
        discountedPrice = MINIMUM_PRICE_STARS;
      }

      return discountedPrice;
    } catch (error) {
      this.logger.error({
        message: 'Error calculating discounted price',
        originalPrice,
        discount,
        error: (error as Error).message,
      });
      // Fail-safe: return original price
      return originalPrice;
    }
  }

  /**
   * Select the best discount from available options
   *
   * AC-013: Maximum discount selection (not additive)
   * Calculates actual savings for each discount at the given price
   * and returns the one with maximum savings.
   *
   * @param tariffPriceStars - The tariff price to calculate savings against
   * @param availableDiscounts - Array of available discounts
   * @returns The discount with maximum savings, or null if no discounts
   */
  selectBestDiscount(
    tariffPriceStars: number,
    availableDiscounts: DiscountInfo[],
  ): DiscountInfo | null {
    if (!availableDiscounts || availableDiscounts.length === 0) {
      return null;
    }

    if (availableDiscounts.length === 1) {
      return availableDiscounts[0];
    }

    // Calculate savings for each discount and select maximum
    let bestDiscount: DiscountInfo | null = null;
    let maxSavings = 0;

    for (const discount of availableDiscounts) {
      const discountedPrice = this.calculateDiscountedPrice(
        tariffPriceStars,
        discount,
      );
      const savings = tariffPriceStars - discountedPrice;

      if (savings > maxSavings) {
        maxSavings = savings;
        bestDiscount = discount;
      }
    }

    return bestDiscount;
  }

  /**
   * Get tariffs with discount information applied
   *
   * Maps tariffs to DiscountedTariff objects with calculated prices.
   * If no discount, returns tariffs with hasDiscount=false.
   *
   * @param tariffs - Array of renewal tariffs
   * @param discount - Discount to apply (null for no discount)
   * @returns Array of DiscountedTariff objects
   */
  getDiscountedTariffs(
    tariffs: RenewalTariff[],
    discount: DiscountInfo | null,
  ): DiscountedTariff[] {
    return tariffs.map((tariff) => {
      if (!discount) {
        return {
          ...tariff,
          originalPrice: tariff.priceStars,
          discountedPrice: tariff.priceStars,
          hasDiscount: false,
          savings: 0,
        };
      }

      const discountedPrice = this.calculateDiscountedPrice(
        tariff.priceStars,
        discount,
      );
      const savings = tariff.priceStars - discountedPrice;

      return {
        ...tariff,
        originalPrice: tariff.priceStars,
        discountedPrice,
        hasDiscount: savings > 0,
        savings,
      };
    });
  }

  /**
   * Convert UserDiscount to DiscountInfo
   *
   * Helper to transform database entity to service-level type.
   *
   * @param userDiscount - UserDiscount entity from database
   * @returns DiscountInfo for calculations
   */
  userDiscountToDiscountInfo(userDiscount: UserDiscount): DiscountInfo {
    return {
      type: userDiscount.discountType,
      value: userDiscount.discountValue,
      sourceType: userDiscount.sourceType as 'promocode' | 'system_rule',
      sourceId: userDiscount.sourceId,
    };
  }

  /**
   * Convert Promocode to DiscountInfo
   *
   * Helper to transform promocode entity to service-level type.
   * Used when validating a promocode before activation.
   *
   * @param promocode - Promocode entity from database
   * @returns DiscountInfo for calculations
   */
  promocodeToDiscountInfo(promocode: Promocode): DiscountInfo {
    return {
      type: promocode.discountType,
      value: promocode.discountValue,
      sourceType: 'promocode',
      sourceId: promocode.id,
    };
  }
}
