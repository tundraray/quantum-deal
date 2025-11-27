import { Context, Composer } from 'telegraf';
import { ComposerMethodArgs, OnlyFunctionPropertyNames } from '../types';
import { LISTENERS_METADATA } from '../telegraf.constants';
import { ListenerMetadata } from '../interfaces';

export function createListenerDecorator<
  TComposer extends Composer<Context>,
  TMethod extends
    OnlyFunctionPropertyNames<TComposer> = OnlyFunctionPropertyNames<TComposer>,
>(method: TMethod) {
  return (...args: ComposerMethodArgs<TComposer, TMethod>): MethodDecorator => {
    return (
      target: object,
      _key?: string | symbol,
      descriptor?: TypedPropertyDescriptor<unknown>,
    ) => {
      const metadata: ListenerMetadata[] = [
        {
          method,
          args,
        } as ListenerMetadata,
      ];

      if (descriptor) {
        const previousValue: ListenerMetadata[] =
          (Reflect.getMetadata(
            LISTENERS_METADATA,
            descriptor.value as object,
          ) as ListenerMetadata[] | undefined) ?? [];
        const value: ListenerMetadata[] = [...previousValue, ...metadata];
        Reflect.defineMetadata(
          LISTENERS_METADATA,
          value,
          descriptor.value as object,
        );
        return descriptor;
      }

      Reflect.defineMetadata(LISTENERS_METADATA, metadata, target);
      return target;
    };
  };
}
