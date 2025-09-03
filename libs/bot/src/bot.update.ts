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
  ReverseTextPipe,
  CallbackQueryData,
  SplitCommandPipe,
} from '@quantumdeal/framework';
import { BotService } from './bot.service';
import { langKeyboard } from './lang';
import type { UserContext } from './interfaces';
import { UsersRepository } from '@quantumdeal/db';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
    private readonly botService: BotService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Start()
  async onStart(
    @Ctx() ctx: UserContext,
    @Message('text', new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined] | undefined,
  ): Promise<void> {
    const user = ctx.user;
    if (user) {
      const me = await this.bot.telegram.getMe();
      await this.bot.telegram
        .sendChatAction(me.id, 'typing')
        .catch((e) => this.logger.error('Error sending chat action', e));

      const [, code] = args ?? [];

      const welcomeMessage = await this.botService.onStart(user, code);

      await ctx.reply(welcomeMessage, langKeyboard(2));
    } else {
      this.logger.debug('User not found');
    }
  }

  @Command('lang')
  async onLang(@Ctx() ctx: UserContext): Promise<void> {
    if (ctx.user) {
      const welcomeMessage = await this.botService.onStart(ctx.user);

      await ctx.reply(welcomeMessage, langKeyboard(2));
    }
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
          break;
      }
    }
  }

  @On('text')
  onMessage(
    @Message('text', new ReverseTextPipe()) reversedText: string,
  ): string {
    return this.botService.echo(reversedText);
  }
}
