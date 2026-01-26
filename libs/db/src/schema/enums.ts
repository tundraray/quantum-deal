import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Database enums and constants
 */

/**
 * Admin permission levels
 */
export enum AdminLevel {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  SUPER = 'super',
}

/**
 * Promocode types
 * - single_use: Deactivated globally after first activation
 * - multi_use: One use per user, unlimited total users
 * - system: System-generated, not for manual entry
 */
export const promocodeTypeEnum = pgEnum('promocode_type', [
  'single_use',
  'multi_use',
  'system',
]);

export type PromocodeType = (typeof promocodeTypeEnum.enumValues)[number];

/**
 * Discount types (shared with system rules)
 * - percentage: Value is 1-100 representing %
 * - fixed: Value is Stars amount to subtract
 */
export const discountTypeEnum = pgEnum('discount_type', [
  'percentage',
  'fixed',
]);

export type DiscountType = (typeof discountTypeEnum.enumValues)[number];

/**
 * Trigger types for system discount rules
 * - days_after_expiration: Trigger N days after subscription expiration
 */
export const triggerTypeEnum = pgEnum('trigger_type', [
  'days_after_expiration',
]);

export type TriggerType = (typeof triggerTypeEnum.enumValues)[number];
