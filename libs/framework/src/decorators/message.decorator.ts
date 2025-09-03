import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from '../interfaces/context.interface';
import { deunionize } from 'telegraf';

export const CallbackQueryData = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const telegrafCtx =
      TelegrafExecutionContext.create(ctx).getContext<Context>();

    if (!telegrafCtx.callbackQuery) {
      return undefined;
    }
    return deunionize(telegrafCtx.callbackQuery).data;
  },
);
