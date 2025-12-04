import {
  Injectable,
  Logger,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  Update,
  Command,
  Ctx,
  Action,
  RequiresFeature,
} from '@quantumdeal/telegraf';
import { Markup, deunionize } from 'telegraf';
import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  CallbackQueryData,
  SplitCommandPipe,
} from '@quantumdeal/framework';
import {
  BotMessagesRepository,
  BotUsersRepository,
  BotSettingsRepository,
  DEFAULT_LANGS,
  type LangOption,
} from '@quantumdeal/db';
import type { PartnerBotContext } from '../../interfaces';
import { PARTNER_FLOW_FEATURE_KEY } from '../../constants';

/**
 * LangUpdate
 *
 * Handles /lang command and language selection callbacks for partner bot.
 * Uses static messages from database via BotMessagesRepository.
 *
 * Features:
 * - Shows localized language selection prompt from database
 * - Updates user's language preference in database
 * - Provides localized confirmation messages
 *
 * Available to all users (no @RequiresFeature restriction).
 */
@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@Injectable()
export class LangUpdate {
  private readonly logger = new Logger(LangUpdate.name);

  constructor(
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Handle /lang command
   *
   * Shows language selection keyboard to user.
   *
   * @param ctx - Telegram context
   */
  @Command('lang')
  async onLang(@Ctx() ctx: PartnerBotContext): Promise<void> {
    await this.showLanguageSelection(ctx);
  }

  /**
   * Handle "Change Language" button from /start command
   * Callback data format: 'change_lang'
   */
  @Action('change_lang')
  async onChangeLang(@Ctx() ctx: PartnerBotContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.showLanguageSelection(ctx);
  }

  /**
   * Show language selection keyboard
   * Shared logic for /lang command and change_lang action
   *
   * @param ctx - Telegram context
   */
  private async showLanguageSelection(ctx: PartnerBotContext): Promise<void> {
    if (!ctx.from) {
      this.logger.debug('User not found in context');
      return;
    }

    const userId = ctx.from.id;
    const botId = ctx.botId;
    const defaultLang = ctx.from.language_code || 'en';

    try {
      // Resolve user language
      const lang = botId
        ? await this.botUsersRepository.resolveLanguage(
            userId,
            botId,
            defaultLang,
          )
        : defaultLang;

      // Get langs from bot settings or use defaults
      const langs = await this.getBotLangs(botId);

      // Get message from database
      const selectMessage = await this.getLanguageSelectionMessage(botId, lang);

      await ctx.reply(selectMessage, {
        parse_mode: 'HTML',
        ...this.buildLangKeyboard(langs, 2),
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
   * @param ctx - Telegram context
   * @param args - Callback arguments [command, languageCode, extraArgs]
   */
  @Action(/^\/lang/)
  async onLanguageCallback(
    @Ctx() ctx: PartnerBotContext,
    @CallbackQueryData(new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined],
  ): Promise<void> {
    const cbq = deunionize(ctx.callbackQuery);
    const [, languageCode] = args ?? [];

    // Parse language code from callback
    if (!languageCode) {
      return;
    }

    if (!ctx.from || !cbq?.data) {
      this.logger.debug('User or callback data not found');
      return;
    }

    const userId = ctx.from.id;
    const botId = ctx.botId;

    // Get langs from bot settings and validate language code
    const langs = await this.getBotLangs(botId);
    const validLang = langs.find((l) => l.code === languageCode);
    if (!validLang) {
      this.logger.warn({ message: 'Invalid language code', languageCode });
      await ctx.answerCbQuery('Invalid language selection');
      return;
    }

    try {
      // Change user's language
      await this.changeLanguage(userId, botId, languageCode);

      // Get confirmation message
      const confirmationMessage = await this.getLanguageChangedMessage(
        botId,
        languageCode,
      );

      // Answer callback query
      await ctx.telegram.answerCbQuery(ctx.callbackQuery?.id ?? '');

      // Send confirmation message
      await ctx.reply(confirmationMessage, { parse_mode: 'HTML' });

      this.logger.log({
        message: 'Language changed',
        userId,
        botId,
        languageCode,
      });
    } catch (error) {
      this.logger.error('Error in language callback', error);
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }

  /**
   * Get language selection prompt message from database
   *
   * @param botId - Bot ID (optional)
   * @param lang - User's current language
   * @returns Language selection prompt
   */
  private async getLanguageSelectionMessage(
    botId: number | undefined,
    lang: string,
  ): Promise<string> {
    try {
      return await this.botMessagesRepository.resolveMessage(
        botId ?? 0,
        'lang_select_prompt',
        lang,
      );
    } catch (error) {
      this.logger.error('Error getting language selection message', error);
      return 'Please select your preferred language / Выберите предпочитаемый язык';
    }
  }

  /**
   * Get language changed confirmation message from database
   *
   * @param botId - Bot ID (optional)
   * @param lang - New language code
   * @returns Confirmation message in the new language
   */
  private async getLanguageChangedMessage(
    botId: number | undefined,
    lang: string,
  ): Promise<string> {
    try {
      return await this.botMessagesRepository.resolveMessage(
        botId ?? 0,
        'lang_changed',
        lang,
      );
    } catch (error) {
      this.logger.error('Error getting language changed message', error);
      return `Language changed to ${lang} successfully!`;
    }
  }

  /**
   * Change user's language preference
   *
   * @param userId - User's Telegram ID
   * @param botId - Bot ID (optional)
   * @param languageCode - New language code
   */
  private async changeLanguage(
    userId: number,
    botId: number | undefined,
    languageCode: string,
  ): Promise<void> {
    // Update user's language in database
    await this.botUsersRepository.updateLanguage(
      userId,
      botId ?? 1,
      languageCode,
    );
  }

  /**
   * Get language options for the bot from settings
   *
   * @param botId - Bot ID (optional)
   * @returns Array of language options from bot settings or defaults
   */
  private async getBotLangs(botId: number | undefined): Promise<LangOption[]> {
    if (!botId) {
      return DEFAULT_LANGS;
    }

    try {
      const settingsRecord =
        await this.botSettingsRepository.findByBotId(botId);
      return settingsRecord?.settings?.langs ?? DEFAULT_LANGS;
    } catch (error) {
      this.logger.error('Error getting bot langs from settings', error);
      return DEFAULT_LANGS;
    }
  }

  /**
   * Build inline keyboard for language selection
   *
   * @param langs - Array of language options
   * @param cols - Number of columns (default: 2)
   * @returns Telegraf inline keyboard markup
   */
  private buildLangKeyboard(langs: LangOption[], cols = 2) {
    const rows: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < langs.length; i += cols) {
      rows.push(
        langs
          .slice(i, i + cols)
          .map((l) => Markup.button.callback(l.label, `/lang ${l.code}`)),
      );
    }
    return Markup.inlineKeyboard(rows);
  }
}
