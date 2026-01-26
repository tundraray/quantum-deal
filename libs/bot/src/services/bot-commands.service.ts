import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from '@quantumdeal/telegraf';
import { Telegraf } from 'telegraf';
import type { BotCommand } from 'telegraf/types';
import { UserContext } from '../interfaces';
import { FeatureFlag } from '@quantumdeal/db/schema';

/**
 * Command Translations
 *
 * Translations for bot command descriptions in all supported languages.
 * Languages: ru, en, uk, hi, fr, kk, uz, tg
 */
const COMMAND_TRANSLATIONS: Record<string, Record<string, string>> = {
  start: {
    ru: 'Запустить бота и увидеть информацию о подписке',
    en: 'Start the bot and view subscription information',
    uk: 'Запустити бота і переглянути інформацію про підписку',
    hi: 'बॉट शुरू करें और सदस्यता जानकारी देखें',
    fr: "Démarrer le bot et voir les informations d'abonnement",
    kk: 'Ботты іске қосу және жазылым туралы ақпаратты көру',
    uz: "Botni ishga tushirish va obuna ma'lumotlarini ko'rish",
    tg: 'Ботро оғоз кардан ва маълумоти обуна',
  },
  lang: {
    ru: 'Изменить язык интерфейса',
    en: 'Change interface language',
    uk: 'Змінити мову інтерфейсу',
    hi: 'इंटरफ़ेस भाषा बदलें',
    fr: "Changer la langue de l'interface",
    kk: 'Интерфейс тілін өзгерту',
    uz: "Interfeys tilini o'zgartirish",
    tg: 'Забони интерфейсро иваз кардан',
  },
  filter: {
    ru: 'Настроить фильтр торговых инструментов',
    en: 'Configure trading instrument filters',
    uk: 'Налаштувати фільтр торгових інструментів',
    hi: 'ट्रेडिंग उपकरण फ़िल्टर कॉन्फ़िगर करें',
    fr: "Configurer les filtres d'instruments de trading",
    kk: 'Сауда құралдарының сүзгісін баптау',
    uz: 'Savdo vositalari filtrlarini sozlash',
    tg: 'Филтри асбобҳои тиҷоратро танзим кардан',
  },
};

/**
 * Bot Commands Service
 *
 * Manages personalized bot command menus for users.
 *
 * Features:
 * - Sets commands based on user's language preference
 * - Personalizes command list based on enabled feature flags
 * - Supports Telegram Bot API's setMyCommands with scope parameter
 *
 * Command Visibility Rules:
 * - /start, /lang: Always visible for all users
 * - /filter: Only visible for users with CUSTOM_USER_FILTERING feature
 */
@Injectable()
export class BotCommandsService {
  private readonly logger = new Logger(BotCommandsService.name);

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
  ) {}

  /**
   * Sets personalized commands menu for a specific user
   *
   * This method:
   * 1. Builds command list based on user's enabled features
   * 2. Translates command descriptions to user's language
   * 3. Sets commands via Telegram Bot API with user-specific scope
   *
   * @param userId - Telegram user ID
   * @param enabledFeatures - Set of enabled feature flags for the user
   * @param lang - User's preferred language code (defaults to 'en')
   */
  async setUserCommands(
    userId: number,
    enabledFeatures: Set<FeatureFlag>,
    lang: string = 'en',
  ): Promise<void> {
    try {
      const commands = this.buildCommandsForUser(enabledFeatures, lang);

      const result = await this.bot.telegram.setMyCommands(commands, {
        scope: { type: 'chat', chat_id: userId },
      });

      this.logger.debug(
        `Set ${commands.length} commands for user ${userId} (lang: ${lang} result: ${result})`,
      );
    } catch (error) {
      this.logger.error(`Failed to set commands for user ${userId}`, error);
      // Don't throw - command menu is not critical for bot functionality
    }
  }

  /**
   * Builds command list based on user's features and language
   *
   * Command Visibility:
   * - /start: Always shown
   * - /lang: Always shown
   * - /filter: Only shown if CUSTOM_USER_FILTERING feature is enabled
   *
   * @param enabledFeatures - Set of enabled feature flags
   * @param lang - Language code for translations
   * @returns Array of bot commands with localized descriptions
   */
  private buildCommandsForUser(
    enabledFeatures: Set<FeatureFlag>,
    lang: string,
  ): BotCommand[] {
    const commands: BotCommand[] = [
      {
        command: 'start',
        description: this.translate('start', lang),
      },
      {
        command: 'lang',
        description: this.translate('lang', lang),
      },
    ];

    // Add /filter command only for users with custom filtering feature
    if (enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)) {
      commands.push({
        command: 'filter',
        description: this.translate('filter', lang),
      });
    }

    return commands;
  }

  /**
   * Translates command description to specified language
   *
   * Falls back to English if translation not found.
   *
   * @param commandKey - Command key (e.g., 'start', 'lang', 'filter')
   * @param lang - Target language code
   * @returns Translated command description
   */
  private translate(commandKey: string, lang: string): string {
    const translations = COMMAND_TRANSLATIONS[commandKey];
    if (!translations) {
      this.logger.warn(`No translations found for command: ${commandKey}`);
      return commandKey;
    }

    return translations[lang] || translations['en'] || commandKey;
  }
}
