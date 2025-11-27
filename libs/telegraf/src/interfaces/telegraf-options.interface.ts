import { ModuleMetadata, Type, Abstract } from '@nestjs/common/interfaces';
import { Middleware, Telegraf, Context } from 'telegraf';

/** Type for module class references */
type ModuleClass = new (...args: unknown[]) => unknown;

export interface TelegrafModuleOptions {
  token: string;
  botName?: string;
  options?: Partial<Telegraf.Options<Context>>;
  launchOptions?: Telegraf.LaunchOptions | false;
  include?: ModuleClass[];
  middlewares?: ReadonlyArray<Middleware<Context>>;
}

export interface TelegrafOptionsFactory {
  createTelegrafOptions():
    | Promise<TelegrafModuleOptions>
    | TelegrafModuleOptions;
}

export interface TelegrafModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  botName?: string;
  useExisting?: Type<TelegrafOptionsFactory>;
  useClass?: Type<TelegrafOptionsFactory>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<TelegrafModuleOptions> | TelegrafModuleOptions;
  inject?: Array<Type<unknown> | string | symbol | Abstract<unknown>>;
}
