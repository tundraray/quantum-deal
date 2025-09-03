import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from '../interfaces/context.interface';

export const UpdateType = createParamDecorator((_, ctx: ExecutionContext) => {
  const telegrafCtx =
    TelegrafExecutionContext.create(ctx).getContext<Context>();
  return telegrafCtx.updateType;
});
