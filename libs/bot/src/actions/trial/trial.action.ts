import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Action, Ctx, Update } from '@quantumdeal/telegraf';
import { ConfigService } from '@nestjs/config';
import type { UserContext } from '../../interfaces';
import { TrialService } from '../../services/trial.service';
import { BotCommandsService } from '../../services/bot-commands.service';
import { TelegrafExceptionFilter } from '@quantumdeal/framework';
import { getTrialMessage } from './trial.i18n';

@Update()
@UseFilters(TelegrafExceptionFilter)
@Injectable()
export class TrialAction {
  private readonly logger = new Logger(TrialAction.name);

  constructor(
    private readonly trialService: TrialService,
    private readonly botCommandsService: BotCommandsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle trial activation callback
   * Callback data format: 'activate_trial'
   */
  @Action('activate_trial')
  async handleActivateTrial(@Ctx() ctx: UserContext): Promise<void> {
    const user = ctx.user;
    const lang = user?.lang ?? 'en';

    if (!user) {
      await ctx.answerCbQuery(getTrialMessage(lang, 'userNotFound'));
      return;
    }

    try {
      // Answer callback query immediately
      await ctx.answerCbQuery();

      // Send typing indicator
      await ctx.sendChatAction('typing');
      // Check eligibility (double-check)
      const eligible = await this.trialService.isEligible(user.botUserId);
      if (!eligible) {
        await ctx.reply(getTrialMessage(lang, 'trialNotAvailable'));
        return;
      }

      // Activate trial (using botUserId, not telegramId)
      const result = await this.trialService.activate(user.botUserId);

      if (!result.success) {
        await ctx.reply(
          getTrialMessage(
            lang,
            'activationFailed',
            result.error || 'Unknown error',
          ),
        );
        return;
      }

      // Update bot commands menu (user now has subscription features)
      await this.botCommandsService.setUserCommands(
        user.telegramId,
        user.enabledFeatures,
        lang,
      );

      // Send success message
      const expiryDate = result.expiresAt
        ? result.expiresAt.toLocaleDateString(
            lang === 'ru' ? 'ru-RU' : 'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            },
          )
        : 'unknown';

      // Get trial duration from config
      const trialDuration = this.configService.get<number>(
        'TRIAL_DURATION_DAYS',
        7,
      );

      await ctx.reply(
        getTrialMessage(lang, 'trialActivated', trialDuration, expiryDate),
      );

      this.logger.log(`Trial activated for user ${user.telegramId}`);
    } catch (error) {
      this.logger.error(
        `Error activating trial for user ${user.telegramId}`,
        error,
      );
      await ctx.reply(getTrialMessage(lang, 'genericError'));
    }
  }
}
