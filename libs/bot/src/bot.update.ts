import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';

import { Help, InjectBot, On, Message, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  ReverseTextPipe,
} from '@quantumdeal/framework';
import { BotService } from './bot.service';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<Context>,
    private readonly echoService: BotService,
  ) {}

  @Start()
  async onStart(): Promise<string> {
    const me = await this.bot.telegram.getMe();
    this.bot.telegram
      .sendChatAction(me.id, 'typing')
      .catch(this.logger.error.bind(this.logger));

    return `Hey, I'm ${me.first_name}`;
  }

  @Help()
  async onHelp(): Promise<string> {
    return Promise.resolve('Send me any text');
  }

  @On('text')
  onMessage(
    @Message('text', new ReverseTextPipe()) reversedText: string,
  ): string {
    return this.echoService.echo(reversedText);
  }
}
