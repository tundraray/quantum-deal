import { Composer, Middleware } from 'telegraf';

export type Filter<T extends any[], F> = T extends []
  ? []
  : T extends [infer Head, ...infer Tail]
    ? Head extends F
      ? Filter<Tail, F>
      : [Head, ...Filter<Tail, F>]
    : [];

export type OnlyFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type ParametersOrNever<T> = T extends (...args: any[]) => any
  ? Parameters<T>
  : never;

/**
 * Extract method args, filtering out Middleware types.
 * For methods that only take middleware (like enter/leave), returns any[]
 * to allow empty invocation.
 */
export type ComposerMethodArgs<
  TComposer extends Composer<any>,
  U extends
    OnlyFunctionPropertyNames<TComposer> = OnlyFunctionPropertyNames<TComposer>,
> =
  Filter<ParametersOrNever<TComposer[U]>, Middleware<any>> extends never[]
    ? any[]
    : Filter<ParametersOrNever<TComposer[U]>, Middleware<any>>;
