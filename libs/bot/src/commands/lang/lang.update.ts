import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import { Command, Update, Ctx, Action } from '@quantumdeal/telegraf';
import { deunionize } from 'telegraf';
import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  CallbackQueryData,
  SplitCommandPipe,
  LLMService,
} from '@quantumdeal/framework';
import { BotUsersRepository } from '@quantumdeal/db';
import type { UserContext } from '../../interfaces';
import { BotCommandsService } from '../../services/bot-commands.service';
import { langKeyboard } from '../../lang';

/**
 * LangUpdate
 *
 * Handles /lang command and language selection callbacks.
 *
 * Features:
 * - Generates localized language selection prompts using LLM
 * - Updates user's language preference in database
 * - Refreshes bot commands menu with new language
 * - Provides localized confirmation messages
 */
@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class LangUpdate {
  private readonly logger = new Logger(LangUpdate.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botCommandsService: BotCommandsService,
  ) {}

  /**
   * Handle /lang command
   *
   * Shows language selection keyboard to user.
   *
   * @param ctx - Telegram context
   */
  @Command('lang')
  async onLang(@Ctx() ctx: UserContext): Promise<void> {
    await this.showLanguageSelection(ctx);
  }

  /**
   * Handle "Change Language" button from /start command
   * Callback data format: 'change_lang'
   */
  @Action('change_lang')
  async onChangeLang(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.showLanguageSelection(ctx);
  }

  /**
   * Show language selection keyboard
   * Shared logic for /lang command and change_lang action
   *
   * @param ctx - Telegram context
   */
  private async showLanguageSelection(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      this.logger.debug('User not found in context');
      return;
    }

    try {
      const welcomeMessage = await this.getLanguageSelectionMessage(
        ctx.user.lang ?? 'en',
      );

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...langKeyboard(2),
      });
    } catch (error) {
      this.logger.error('Error in showing language selection', error);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Handle language selection callback
   *
   * Triggered when user clicks on a language button.
   * Callback format: "/lang <code>"
   *
   * NOTE: Changed from @On('callback_query') to @Action() to avoid conflicts
   * with other callback handlers (e.g., RenewalAction, TrialAction)
   *
   * @param ctx - Telegram context
   * @param args - Callback arguments [command, languageCode, extraArgs]
   */
  @Action(/^\/lang/)
  async onLanguageCallback(
    @Ctx() ctx: UserContext,
    @CallbackQueryData(new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined],
  ): Promise<void> {
    const cbq = deunionize(ctx.callbackQuery);
    const [, languageCode] = args ?? [];

    // Parse language code from callback
    if (!languageCode) {
      return;
    }

    if (!ctx.user || !cbq?.data) {
      this.logger.debug('User or callback data not found');
      return;
    }

    try {
      // Change user's language
      const confirmationMessage = await this.changeLanguage(
        ctx.user.telegramId,
        languageCode,
      );

      // Refresh commands menu with new language
      await this.botCommandsService.setUserCommands(
        ctx.user.telegramId,
        ctx.user.enabledFeatures,
        languageCode,
      );

      // Answer callback query
      await ctx.telegram.answerCbQuery(ctx.callbackQuery?.id ?? '');

      // Send confirmation message
      await ctx.reply(confirmationMessage);
    } catch (error) {
      this.logger.error('Error in language callback', error);
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }

  /**
   * Get welcome message in user's language
   *
   * Used when user invokes /lang command without selecting a language yet.
   *
   * @param languageCode - User's current language
   * @returns Welcome message with language selection prompt
   */
  private async getLanguageSelectionMessage(
    languageCode: string,
  ): Promise<string> {
    try {
      const message = await this.llmService.generateText({
        model: 'gpt-5-nano',
        prompt: `You are telegram bot assistant. Generate a friendly message asking user to select their preferred language. Write message in ${languageCode} language. Keep it short (1-2 sentences).`,
      });

      return message;
    } catch (error) {
      this.logger.error('Error generating language selection message', error);

      // Fallback message if LLM fails
      return 'Please select your preferred language / Выберите предпочитаемый язык';
    }
  }

  /**
   * Change user's language preference
   *
   * @param userId - User's Telegram ID
   * @param languageCode - New language code (e.g., 'en', 'ru', 'fr')
   * @returns Localized confirmation message
   */
  private async changeLanguage(
    userId: number,
    languageCode: string,
  ): Promise<string> {
    // Update user's language in database
    await this.botUsersRepository.updateLanguage(userId, 1, languageCode);

    this.logger.log(`User ${userId} changed language to ${languageCode}`);

    try {
      // Generate localized confirmation message
      const confirmationMessage = await this.llmService.generateText({
        model: 'gpt-5-nano',
        prompt: `You are telegram bot assistant. Send short, friendly message about language change to ${languageCode}. The message in ${languageCode} language.`,
      });

      return confirmationMessage;
    } catch (error) {
      this.logger.error('Error generating language change confirmation', error);

      // Fallback confirmation messages by language
      const fallbackMessages: Record<string, string> = {
        en: 'Language changed to English successfully!',
        ru: 'Язык успешно изменен на русский!',
        es: '¡Idioma cambiado a español con éxito!',
        fr: 'Langue changée en français avec succès!',
        de: 'Sprache erfolgreich auf Deutsch geändert!',
      };

      return (
        fallbackMessages[languageCode] ||
        `Language changed to ${languageCode} successfully!`
      );
    }
  }
}
