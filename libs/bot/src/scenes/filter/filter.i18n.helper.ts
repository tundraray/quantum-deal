import { Injectable, Logger } from '@nestjs/common';
import type { Language } from './filter.translations';
import { translations } from './filter.translations';

/**
 * FilterI18nHelper
 *
 * Provides internationalization support for the filter feature.
 * Handles translation lookups, pluralization, and formatting.
 */
@Injectable()
export class FilterI18nHelper {
  private readonly logger = new Logger(FilterI18nHelper.name);
  private readonly defaultLanguage: Language = 'en';

  /**
   * Get translation by key path
   *
   * Supports nested keys using dot notation (e.g., 'errors.user_not_found').
   * Replaces placeholders in format {key} with provided values.
   *
   * @param lang - Language code (will be normalized to valid Language)
   * @param keyPath - Dot-separated path to translation key
   * @param placeholders - Optional object with placeholder replacements
   * @returns Translated and formatted string
   *
   * @example
   * t('ru', 'errors.user_not_found')
   * // → "Ошибка: не удалось определить пользователя"
   *
   * t('ru', 'ui.selected_count', { count: 5, total: 28 })
   * // → "📊 Выбрано: 5 из 28"
   */
  t(
    lang: string | null | undefined,
    keyPath: string,
    placeholders?: Record<string, string | number>,
  ): string {
    const normalizedLang = this.normalizeLang(lang);
    const translation = this.getTranslation(normalizedLang, keyPath);

    if (translation === null) {
      this.logger.warn(
        `Translation not found: ${keyPath} for language ${normalizedLang}`,
      );
      return keyPath;
    }

    return this.replacePlaceholders(translation, placeholders);
  }

  /**
   * Get pluralized form based on count and language rules
   *
   * Supports different pluralization rules for each language:
   * - Russian/Ukrainian/Kazakh: 3 forms (one, few, many)
   * - English/French: 2 forms (one, many)
   * - Hindi: 2 forms (one for 0 or 1, many for others)
   * - Uzbek/Tajik: 1 form (other)
   *
   * @param lang - Language code
   * @param key - Plural key (e.g., 'instruments')
   * @param count - Number to determine plural form
   * @returns Pluralized string
   *
   * @example
   * plural('ru', 'instruments', 1)  // → "инструмент"
   * plural('ru', 'instruments', 2)  // → "инструмента"
   * plural('ru', 'instruments', 5)  // → "инструментов"
   */
  plural(lang: string | null | undefined, key: string, count: number): string {
    const normalizedLang = this.normalizeLang(lang);
    const pluralForm = this.getPluralForm(normalizedLang, count);
    const pluralForms = this.getPluralForms(normalizedLang, key);

    return pluralForms[pluralForm] || pluralForms['other'] || key;
  }

  /**
   * Format group button with emoji and count
   *
   * Shows different formats based on selection state:
   * - No selection: "💱 Валюты (28)"
   * - All selected: "💱 Валюты ✅ (28)"
   * - Partial: "💱 Валюты (5/28)"
   *
   * @param lang - Language code
   * @param groupKey - Group key (forex, commodities, crypto, stocks, european, us)
   * @param selected - Number of selected instruments
   * @param total - Total number of instruments
   * @returns Formatted button text
   *
   * @example
   * formatGroupButton('ru', 'forex', 0, 28)   // → "💱 Валюты (28)"
   * formatGroupButton('ru', 'forex', 28, 28)  // → "💱 Валюты ✅ (28)"
   * formatGroupButton('ru', 'forex', 5, 28)   // → "💱 Валюты (5/28)"
   */
  formatGroupButton(
    lang: string | null | undefined,
    groupKey: string,
    selected: number,
    total: number,
  ): string {
    const normalizedLang = this.normalizeLang(lang);
    const emoji = this.getGroupEmoji(groupKey);
    const groupName = this.t(normalizedLang, `groups.${groupKey}`);

    if (selected === 0 && total > 0) {
      return `${emoji} ${groupName} (${total})`;
    }
    if (selected === total && total > 0) {
      return `${emoji} ${groupName} ✅ (${total})`;
    }
    return `${emoji} ${groupName} (${selected}/${total})`;
  }

  /**
   * Normalize language code to valid Language type
   *
   * Falls back to default language if invalid.
   *
   * @param lang - Input language code
   * @returns Valid Language code
   */
  private normalizeLang(lang: string | null | undefined): Language {
    if (!lang) {
      return this.defaultLanguage;
    }

    const normalizedLang = lang.toLowerCase();
    const validLanguages: Language[] = [
      'ru',
      'en',
      'uk',
      'hi',
      'fr',
      'kk',
      'uz',
      'tg',
    ];

    if (validLanguages.includes(normalizedLang as Language)) {
      return normalizedLang as Language;
    }

    this.logger.debug(`Invalid language code: ${lang}, using default`);
    return this.defaultLanguage;
  }

  /**
   * Get translation from nested object using dot notation
   *
   * @param lang - Language code
   * @param keyPath - Dot-separated path (e.g., 'errors.user_not_found')
   * @returns Translation string or null if not found
   */
  private getTranslation(lang: Language, keyPath: string): string | null {
    const keys = keyPath.split('.');
    let current: unknown = translations[lang];

    for (const key of keys) {
      if (typeof current !== 'object' || current === null) {
        // Try fallback to English
        if (lang !== 'en') {
          return this.getTranslation('en', keyPath);
        }
        return null;
      }

      if (key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Try fallback to English
        if (lang !== 'en') {
          return this.getTranslation('en', keyPath);
        }
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Replace placeholders in translation string
   *
   * Placeholders are in format {key} and will be replaced with values
   * from the placeholders object.
   *
   * @param text - Text with placeholders
   * @param placeholders - Object with replacement values
   * @returns Text with placeholders replaced
   */
  private replacePlaceholders(
    text: string,
    placeholders?: Record<string, string | number>,
  ): string {
    if (!placeholders) {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, (match, key: string) => {
      if (key in placeholders) {
        return String(placeholders[key]);
      }
      return match;
    });
  }

  /**
   * Get plural form for a given count and language
   *
   * Implements pluralization rules for each supported language.
   *
   * @param lang - Language code
   * @param count - Number to determine plural form
   * @returns Plural form key ('one', 'few', 'many', or 'other')
   */
  private getPluralForm(
    lang: Language,
    count: number,
  ): 'one' | 'few' | 'many' | 'other' {
    const n = Math.abs(count);
    const mod10 = n % 10;
    const mod100 = n % 100;

    switch (lang) {
      case 'ru':
      case 'uk':
      case 'kk':
        // Russian, Ukrainian, Kazakh: 3 forms
        if (mod10 === 1 && mod100 !== 11) {
          return 'one';
        }
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
          return 'few';
        }
        return 'many';

      case 'en':
      case 'fr':
        // English, French: 2 forms
        if (n === 1) {
          return 'one';
        }
        return 'many';

      case 'hi':
        // Hindi: 2 forms (0 or 1 → one, else → many)
        if (n === 0 || n === 1) {
          return 'one';
        }
        return 'many';

      case 'uz':
      case 'tg':
        // Uzbek, Tajik: 1 form
        return 'other';

      default:
        return 'other';
    }
  }

  /**
   * Get plural forms for a specific key
   *
   * @param lang - Language code
   * @param key - Plural key (currently only 'instruments' is supported)
   * @returns Object with plural forms
   */
  private getPluralForms(lang: Language, key: string): Record<string, string> {
    const langTranslations = translations[lang];

    if (
      langTranslations.plurals &&
      typeof langTranslations.plurals === 'object'
    ) {
      const pluralKey = key as keyof typeof langTranslations.plurals;
      if (pluralKey in langTranslations.plurals) {
        return langTranslations.plurals[pluralKey] as Record<string, string>;
      }
    }

    // Fallback to English
    if (lang !== 'en') {
      return this.getPluralForms('en', key);
    }

    this.logger.warn(`Plural forms not found for key: ${key}`);
    return { other: key };
  }

  /**
   * Get emoji for instrument group
   *
   * @param group - Group key
   * @returns Emoji character
   */
  private getGroupEmoji(group: string): string {
    const emojis: Record<string, string> = {
      forex: '💱',
      commodities: '🛢️',
      crypto: '💰',
      stocks: '📈',
      european: '🇪🇺',
      us: '🇺🇸',
    };

    return emojis[group] || '📊';
  }
}
