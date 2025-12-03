import { Injectable, Logger } from '@nestjs/common';
import { Update, Command, Ctx, RequiresFeature } from '@quantumdeal/telegraf';
import { BotMessagesRepository, BotUsersRepository } from '@quantumdeal/db';
import { PartnerFlowService } from '../../services/partner-flow.service';
import type { PartnerBotContext } from '../../interfaces';
import { PARTNER_FLOW_FEATURE_KEY } from '../../constants';

/**
 * StartCommandUpdate
 *
 * Handles /start command for partner bot flow.
 * Sends welcome message and initiates channel subscription prompt flow.
 *
 * This handler is only registered on bots where partnerFlowEnabled = true
 * in bot_settings.features (via @RequiresFeature decorator).
 *
 * Flow:
 * 1. User sends /start command
 * 2. Send partner_welcome message
 * 3. Initialize bot_users.state.verification to 'awaiting_channel_subscription'
 * 4. Call PartnerFlowService.sendChannelPrompt()
 *
 * Integration:
 * - BotMessagesRepository: Resolve partner_welcome message with fallback chain
 * - BotUsersRepository: Update verification state
 * - PartnerFlowService: Send channel subscription prompt
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@Injectable()
export class StartCommandUpdate {
  private readonly logger = new Logger(StartCommandUpdate.name);

  constructor(
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly partnerFlowService: PartnerFlowService,
    private readonly botUsersRepository: BotUsersRepository,
  ) {}

  /**
   * Handle /start command
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Command('start')
  async handleStart(@Ctx() ctx: PartnerBotContext): Promise<void> {
    if (!ctx.from) {
      this.logger.debug('No user context found');
      return;
    }

    const userId = ctx.from.id;
    const defaultLang = ctx.from.language_code || 'en';
    const botId = ctx.botId;

    if (!botId) {
      this.logger.error({
        message: 'botId not available in context',
        userId,
      });
      await ctx.reply('Configuration error. Please try again later.');
      return;
    }

    try {
      // Resolve user language from bot_users or fallback
      const lang = await this.botUsersRepository.resolveLanguage(
        userId,
        botId,
        defaultLang,
      );

      // Retrieve welcome message
      const welcomeMessage = await this.botMessagesRepository.resolveMessage(
        botId,
        'partner_welcome',
        lang,
      );

      // Send welcome message
      await ctx.reply(welcomeMessage);

      // Initialize verification state
      await this.botUsersRepository.updateState(userId, botId, {
        verificationState: 'awaiting_channel_subscription',
        verificationAttempts: 0,
        lastVerificationAttempt: new Date(),
      } as any);

      // Send channel subscription prompt
      await this.partnerFlowService.sendChannelPrompt(userId, botId, lang);

      this.logger.log({
        message: '/start command completed',
        userId,
        botId,
        lang,
      });
    } catch (error) {
      this.logger.error({
        message: 'Error in /start command',
        userId,
        botId,
        error: (error as Error).message,
      });

      // Send generic error message to user
      await ctx
        .reply('Sorry, something went wrong. Please try again later.')
        .catch((e) => {
          this.logger.error({
            message: 'Failed to send error message',
            error: (e as Error).message,
          });
        });
    }
  }
}
