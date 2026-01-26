import { Injectable, Logger } from '@nestjs/common';
import {
  BotMessagesRepository,
  MessagesRepository,
  MessageType,
} from '@quantumdeal/db';
import {
  I18nMessages,
  I18nMessageValue,
  InterpolationParams,
  ILocalizationContext,
  ILocalizationService,
} from './interfaces';

/**
 * LocalizationContext - Fluent context for translation resolution
 *
 * Holds bot and language context for resolving translations with fallback hierarchy:
 * 1. bot_messages (if botId) via findByBotTypeAndLang
 * 2. messages via findByTypeAndLang
 * 3. i18n registry (search all namespaces)
 * 4. Return key itself as last resort
 */
export class LocalizationContext implements ILocalizationContext {
  private langCode: string = 'en';
  private namespace: string | null = null;
  private readonly logger = new Logger(LocalizationContext.name);

  constructor(
    private readonly botId: number | null,
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly i18nRegistry: Map<string, I18nMessages>,
  ) {}

  /**
   * Set the i18n namespace for translation resolution
   * When set, i18n fallback will only search in this namespace
   * @param namespace - Namespace identifier (e.g., 'renewal', 'trial')
   * @returns The context for method chaining (fluent API)
   */
  use(namespace: string): ILocalizationContext {
    this.namespace = namespace;
    return this;
  }

  /**
   * Set the language code for translation resolution
   * @param langCode - Language code (e.g., 'ru', 'en')
   * @returns The context for method chaining (fluent API)
   */
  lang(langCode: string): ILocalizationContext {
    this.langCode = langCode;
    return this;
  }

  /**
   * Resolve a translation key with optional interpolation parameters
   *
   * Fallback hierarchy:
   * 1. bot_messages (if botId set)
   * 2. messages (global)
   * 3. i18n registry
   * 4. Key itself as last resort
   *
   * Language fallback: requested lang -> 'en'
   *
   * @param key - Translation key to resolve
   * @param params - Optional parameters for template interpolation
   * @returns Promise resolving to the translated string (never rejects)
   */
  async t(key: string, params?: InterpolationParams): Promise<string> {
    try {
      // Try with requested language first
      let result = await this.resolveKey(key, this.langCode, params);
      if (result !== undefined) {
        this.logger.debug(
          `Resolved translation: key=${key}, lang=${this.langCode}`,
        );
        return result;
      }

      // Language fallback to 'en' if not English
      if (this.langCode !== 'en') {
        this.logger.debug(
          `Language fallback: from=${this.langCode} to=en, key=${key}`,
        );
        result = await this.resolveKey(key, 'en', params);
        if (result !== undefined) {
          return result;
        }
      }

      // All fallbacks failed, return key itself
      this.logger.warn(
        `Translation not found, using key: key=${key}, lang=${this.langCode}, botId=${this.botId}`,
      );
      return key;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `DB error during translation resolution: error=${errorMessage}, key=${key}`,
      );
      // Never throw, return key as fallback
      return key;
    }
  }

  /**
   * Resolve key through fallback hierarchy for a specific language
   * @returns undefined if not found in any source
   */
  private async resolveKey(
    key: string,
    lang: string,
    params?: InterpolationParams,
  ): Promise<string | undefined> {
    // 1. Try bot_messages (if botId set)
    if (this.botId !== null) {
      const botMessage = await this.botMessagesRepository.findByBotTypeAndLang(
        this.botId,
        key,
        lang,
      );
      if (botMessage) {
        this.logger.debug(
          `Resolved from bot_messages: key=${key}, botId=${this.botId}`,
        );
        return this.interpolate(botMessage.message, params);
      }
    }

    // 2. Try messages (global)
    const globalMessage = await this.messagesRepository.findByTypeAndLang(
      key as MessageType,
      lang,
    );
    if (globalMessage?.message) {
      this.logger.debug(`Resolved from messages: key=${key}`);
      return this.interpolate(globalMessage.message, params);
    }

    // 3. Try i18n registry (search all namespaces)
    const i18nResult = this.resolveFromI18n(key, lang, params);
    if (i18nResult !== undefined) {
      this.logger.debug(`Resolved from i18n: key=${key}`);
      return i18nResult;
    }

    // Not found
    return undefined;
  }

  /**
   * Search i18n registry for a key
   * If namespace is set via use(), searches only in that namespace
   * Otherwise searches across all namespaces
   */
  private resolveFromI18n(
    key: string,
    lang: string,
    params?: InterpolationParams,
  ): string | undefined {
    // If namespace is set, search only in that namespace
    if (this.namespace) {
      const messages = this.i18nRegistry.get(this.namespace);
      if (messages) {
        const langMessages = messages[lang as keyof I18nMessages];
        if (langMessages && key in langMessages) {
          const value = langMessages[key];
          return this.resolveI18nValue(value, params);
        }
      }
      return undefined;
    }

    // No namespace set, search all namespaces
    for (const [, messages] of this.i18nRegistry) {
      const langMessages = messages[lang as keyof I18nMessages];
      if (langMessages && key in langMessages) {
        const value = langMessages[key];
        return this.resolveI18nValue(value, params);
      }
    }
    return undefined;
  }

  /**
   * Resolve i18n value - handles both string and function-based messages
   */
  private resolveI18nValue(
    value: I18nMessageValue,
    params?: InterpolationParams,
  ): string {
    if (typeof value === 'function') {
      // Function-based i18n message - call with params values as args
      const args = params ? Object.values(params) : [];
      return value(...args);
    }
    // String value - apply template interpolation
    return this.interpolate(value, params);
  }

  /**
   * Template interpolation - replace {placeholder} with param values
   * Leaves placeholder as-is if param not provided
   */
  private interpolate(template: string, params?: InterpolationParams): string {
    if (!params) {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, placeholder: string) => {
      if (placeholder in params) {
        return String(params[placeholder]);
      }
      // Leave placeholder as-is if param not provided
      return match;
    });
  }
}

/**
 * LocalizationService - Centralized localization service with fluent API
 *
 * Provides a unified translation resolution mechanism with cascading fallback hierarchy:
 * bot-specific overrides (DB) -> global messages (DB) -> hardcoded i18n files
 *
 * Usage:
 * ```typescript
 * const text = await localizationService
 *   .forBot(botId)
 *   .lang('ru')
 *   .t('welcome', { name: 'John' });
 * ```
 */
@Injectable()
export class LocalizationService implements ILocalizationService {
  private readonly logger = new Logger(LocalizationService.name);
  private readonly i18nRegistry = new Map<string, I18nMessages>();

  constructor(
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly messagesRepository: MessagesRepository,
  ) {
    this.logger.debug('LocalizationService initialized');
  }

  /**
   * Create a localization context for a specific bot
   * @param botId - Bot ID for bot-specific overrides, or null for global
   * @returns Localization context for fluent chaining
   */
  forBot(botId: number | null): ILocalizationContext {
    return new LocalizationContext(
      botId,
      this.botMessagesRepository,
      this.messagesRepository,
      this.i18nRegistry,
    );
  }

  /**
   * Register i18n messages from a namespace (e.g., hardcoded i18n files)
   * @param namespace - Namespace identifier for the messages
   * @param messages - i18n messages structure for all languages
   */
  registerI18n(namespace: string, messages: I18nMessages): void {
    this.i18nRegistry.set(namespace, messages);
    this.logger.debug(`Registered i18n namespace: ${namespace}`);
  }
}
