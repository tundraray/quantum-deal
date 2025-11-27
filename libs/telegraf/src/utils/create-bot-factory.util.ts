import { Context, Telegraf } from 'telegraf';
import { TelegrafModuleOptions } from '../interfaces';
import { Logger } from '@nestjs/common';

export function createBotFactory(
  options: TelegrafModuleOptions,
): Promise<Telegraf<Context>> {
  const bot = new Telegraf<Context>(options.token, options.options);

  bot.use(...(options.middlewares ?? []));
  bot.catch((err, ctx) =>
    Logger.error(err, `Telegraf: ${ctx.botInfo?.username ?? 'unknown'}`),
  );

  if (options.launchOptions !== false) {
    bot.launch(options.launchOptions ?? {});
  }

  return Promise.resolve(bot);
}
