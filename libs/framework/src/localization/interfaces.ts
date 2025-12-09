/**
 * LocalizationService interfaces and types
 *
 * Provides type definitions for the centralized localization service
 * with fluent API pattern for translation resolution.
 */

/**
 * Supported language codes
 */
export type LangCode = 'ru' | 'en' | 'uk' | 'hi' | 'fr' | 'kk' | 'uz' | 'tg' | 'tl';

/**
 * i18n message value - can be string or function for parameterized messages
 */
export type I18nMessageValue = string | ((...args: unknown[]) => string);

/**
 * Messages for a single language
 */
export type I18nLanguageMessages = Record<string, I18nMessageValue>;

/**
 * Complete i18n messages structure (all languages)
 * Partial allows registering messages for subset of supported languages
 */
export type I18nMessages = Partial<Record<LangCode, I18nLanguageMessages>>;

/**
 * Parameters for template interpolation
 * Used for replacing {placeholder} patterns in message templates
 */
export type InterpolationParams = Record<string, unknown>;

/**
 * Fluent context interface for chaining
 * Holds bot and language context for translation resolution
 */
export interface ILocalizationContext {
  /**
   * Set the i18n namespace for translation resolution
   * When set, i18n fallback will only search in this namespace
   * @param namespace - Namespace identifier (e.g., 'renewal', 'trial')
   * @returns The context for method chaining
   */
  use(namespace: string): ILocalizationContext;

  /**
   * Set the language code for translation resolution
   * @param langCode - Language code (e.g., 'ru', 'en')
   * @returns The context for method chaining
   */
  lang(langCode: string): ILocalizationContext;

  /**
   * Resolve a translation key with optional interpolation parameters
   * @param key - Translation key to resolve
   * @param params - Optional parameters for template interpolation
   * @returns Promise resolving to the translated string (never rejects)
   */
  t(key: string, params?: InterpolationParams): Promise<string>;
}

/**
 * Main localization service interface
 * Entry point for the fluent API
 */
export interface ILocalizationService {
  /**
   * Create a localization context for a specific bot
   * @param botId - Bot ID for bot-specific overrides, or null for global
   * @returns Localization context for fluent chaining
   */
  forBot(botId: number | null): ILocalizationContext;

  /**
   * Register i18n messages from a namespace (e.g., hardcoded i18n files)
   * @param namespace - Namespace identifier for the messages
   * @param messages - i18n messages structure for all languages
   */
  registerI18n(namespace: string, messages: I18nMessages): void;
}

/**
 * Registration options for i18n files
 * Provided for future extensibility
 */
export interface I18nRegistrationOptions {
  namespace: string;
  messages: I18nMessages;
}
