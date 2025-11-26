import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from '@quantumdeal/telegraf';
import { Context } from '../interfaces/context.interface';

export const UpdateType = createParamDecorator((_, ctx: ExecutionContext) => {
  const telegrafCtx =
    TelegrafExecutionContext.create(ctx).getContext<Context>();
  return telegrafCtx.updateType;
});
