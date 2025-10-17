import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';

import {
  InjectBot,
  On,
  Message,
  Start,
  Update,
  Ctx,
  Command,
} from 'nestjs-telegraf';
import { deunionize, Telegraf } from 'telegraf';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  CallbackQueryData,
  SplitCommandPipe,
} from '@quantumdeal/framework';
import { BotService } from './bot.service';
import { BotCommandsService } from './services/bot-commands.service';
import { langKeyboard } from './lang';
import type { UserContext } from './interfaces';
import { FILTER_SCENE_ID } from './constants';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
    private readonly botService: BotService,
    private readonly botCommandsService: BotCommandsService,
  ) {}

  @Start()
  async onStart(
    @Ctx() ctx: UserContext,
    @Message('text', new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined] | undefined,
  ): Promise<void> {
    const user = ctx.user;
    if (user) {
      await this.bot.telegram
        .sendChatAction(user.telegramId, 'typing')
        .catch((e) => this.logger.error('Error sending chat action', e));

      const [, code] = args ?? [];

      const welcomeMessage = await this.botService.onStart(user, code);

      // Set personalized commands menu based on user's features and language
      // NOTE: This must be called AFTER onStart because onStart may activate
      // a subscription code and update the user's feature flags
      if (!code) {
        // Only set commands here if no code was provided
        // If code was provided, onStart will handle command menu update
        await this.botCommandsService.setUserCommands(
          user.telegramId,
          user.enabledFeatures,
          user.lang ?? 'en',
        );
      }

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...langKeyboard(2),
      });
    } else {
      this.logger.debug('User not found');
    }
  }

  @Command('lang')
  async onLang(@Ctx() ctx: UserContext): Promise<void> {
    if (ctx.user) {
      const welcomeMessage = await this.botService.onStart(ctx.user);

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...langKeyboard(2),
      });
    }
  }

  @Command('filter')
  async onFilter(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Сначала нужно зарегистрироваться. Используйте /start');
      return;
    }

    // Enter filter scene
    await ctx.scene.enter(FILTER_SCENE_ID);
  }

  @On('callback_query')
  async onLangAction(
    @Ctx() ctx: UserContext,
    @CallbackQueryData(new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined],
  ): Promise<void> {
    const cbq = deunionize(ctx.callbackQuery);
    const [command, code] = args ?? [];

    if (ctx.user && cbq?.data) {
      switch (command) {
        case '/lang':
          await this.botService.onLang(ctx, code);

          // Refresh commands menu with new language
          if (code) {
            await this.botCommandsService.setUserCommands(
              ctx.user.telegramId,
              ctx.user.enabledFeatures,
              code,
            );
          }
          break;
      }
    }
  }
}
