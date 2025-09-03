import { Injectable } from '@nestjs/common';
import { LLMService } from '@quantumdeal/framework';
import { CodesRepository, UsersRepository, User } from '@quantumdeal/db';
import { welcome } from './promts/welcome';
import { UserContext } from './interfaces';

@Injectable()
export class BotService {
  constructor(
    private readonly llmService: LLMService,
    private readonly usersRepository: UsersRepository,
    private readonly codesRepository: CodesRepository,
  ) {}

  async onStart(user: User, code?: string) {
    const updatedUser = code ? await this.activateCode(user, code) : user;

    const welcomeMessage = await this.llmService.generateText({
      model: 'gpt-5-mini',
      systemPrompt: welcome,
      prompt: JSON.stringify(updatedUser),
    });
    return welcomeMessage;
  }

  async onLang(ctx: UserContext, code?: string) {
    const [, , message] = await Promise.all([
      this.usersRepository.update(ctx.user!.telegramId, {
        lang: code,
      }),
      await ctx.telegram.answerCbQuery(ctx.callbackQuery?.id ?? ''),
      await this.llmService.generateText({
        model: 'gpt-5-nano',
        prompt: `You are telegram bot assistant. Send short, friendly message about language change to ${code}. The message in ${code} language.`,
      }),
    ]);

    await ctx.reply(message);
  }

  private async activateCode(user: User, code: string) {
    const $code = await this.codesRepository.findByCode(code);
    if ($code) {
      await this.codesRepository.update($code.id, {
        userId: user.telegramId,
        activationDate: new Date(),
      });
      const currentExpirationDate = user.subscribeExpirationDate
        ? new Date(user.subscribeExpirationDate)
        : new Date();

      return await this.usersRepository.update(user.telegramId, {
        subscribeId: $code.subscriptionId,
        subscribeExpirationDate: new Date(
          new Date(currentExpirationDate).getTime() + 30 * 24 * 60 * 60 * 1000,
        ),
      });
    }
    return user;
  }

  echo(text: string): string {
    return `Echo: ${text}`;
  }
}
