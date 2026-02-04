import { pgTable, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { bots } from './bots';
import { BatchingConfig } from '@quantumdeal/telegraf';

/**
 * Language Option Interface
 *
 * Defines a language choice for the bot's language selection.
 */
export interface LangOption {
  code: string;
  label: string;
}

/**
 * Default Languages
 *
 * Standard language options available for bots.
 */
export const DEFAULT_LANGS: LangOption[] = [
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'uk', label: '🇺🇦 Українська' },
  { code: 'hi', label: '🇮🇳 हिंदी' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'kk', label: '🇰🇿 Қазақша' },
  { code: 'uz', label: "🇺🇿 O'zbekcha" },
  { code: 'tg', label: '🇹🇯 Тоҷикӣ' },
];

/**
 * Bot Settings Interface
 *
 * Defines the JSONB structure for per-bot feature configuration.
 * Enables flexible feature flags without schema migrations.
 */
/**
 * UI Settings Interface
 *
 * Optional UI customization settings for bots.
 */
export interface UiSettings {
  welcomeImage?: string;
  brandColor?: string;
}

export interface BotSettings {
  features: {
    trialEnabled: boolean;
    paymentsEnabled: boolean;
    signalsEnabled: boolean;
    broadcastEnabled: boolean;
    /** Signal batching configuration. Default: enabled with 5s window */
    batching?: BatchingConfig;
  };
  defaults: {
    subscriptionDays: number;
    trialDays: number;
    language: string;
  };
  /** Per-bot language options. Falls back to DEFAULT_LANGS if not set. */
  langs?: LangOption[];
  /** Optional UI customization settings. */
  ui?: UiSettings;
}

/**
 * Payment Settings Interface
 *
 * Defines the JSONB structure for per-bot payment configuration.
 */
export interface PaymentSettings {
  starsEnabled: boolean;
  minAmount: number;
  maxAmount: number;
  refundWindowHours: number;
}

/**
 * Default Bot Settings
 *
 * Applied when creating new bot_settings records.
 */
export const DEFAULT_BOT_SETTINGS: BotSettings = {
  features: {
    trialEnabled: true,
    paymentsEnabled: true,
    signalsEnabled: true,
    broadcastEnabled: false,
    batching: {
      enabled: false,
      windowMs: 60000,
    },
  },
  defaults: {
    subscriptionDays: 30,
    trialDays: 7,
    language: 'en',
  },
};

/**
 * Bot Settings Table
 *
 * Stores JSONB settings for each bot with 1:1 relationship.
 * Enables per-bot configuration without schema changes.
 *
 * Business Rules:
 * - One settings record per bot (UNIQUE constraint on botId)
 * - Cascades on bot deletion
 * - settings column has default values for new bots
 * - paymentSettings is optional (nullable)
 */
export const botSettings = pgTable('bot_settings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  botId: bigint('bot_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => bots.id, { onDelete: 'cascade' }),
  settings: jsonb('settings')
    .$type<BotSettings>()
    .notNull()
    .default(DEFAULT_BOT_SETTINGS),
  paymentSettings: jsonb('payment_settings').$type<PaymentSettings>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * TypeScript Types
 */
export type BotSettingsRecord = typeof botSettings.$inferSelect;
export type NewBotSettingsRecord = typeof botSettings.$inferInsert;
