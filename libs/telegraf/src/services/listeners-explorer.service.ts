import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef, ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Module } from '@nestjs/core/injector/module';
import { ParamMetadata } from '@nestjs/core/helpers/interfaces';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator';
import { Composer, Context, Scenes, Telegraf } from 'telegraf';

import { MetadataAccessorService } from './metadata-accessor.service';
import {
  PARAM_ARGS_METADATA,
  TELEGRAF_BOT_NAME,
  TELEGRAF_MODULE_OPTIONS,
  TELEGRAF_STAGE,
} from '../telegraf.constants';
import { BaseExplorerService } from './base-explorer.service';
import { TelegrafParamsFactory } from '../factories/telegraf-params-factory';
import { TelegrafContextType } from '../execution-context';
import type { TelegrafModuleOptions } from '../interfaces';
import { ListenerMetadata } from '../interfaces';

@Injectable()
export class ListenersExplorerService
  extends BaseExplorerService
  implements OnModuleInit
{
  private readonly telegrafParamsFactory = new TelegrafParamsFactory();
  private bot: Telegraf<any>;

  constructor(
    @Inject(TELEGRAF_STAGE)
    private readonly stage: Scenes.Stage<any>,
    @Inject(TELEGRAF_MODULE_OPTIONS)
    private readonly telegrafOptions: TelegrafModuleOptions,
    @Inject(TELEGRAF_BOT_NAME)
    private readonly botName: string,
    private readonly moduleRef: ModuleRef,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
    private readonly modulesContainer: ModulesContainer,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {
    super();
  }

  onModuleInit(): void {
    this.bot = this.moduleRef.get<Telegraf<any>>(this.botName, {
      strict: false,
    });
    this.explore();

    this.bot.use(this.stage.middleware());

    this.exploreUpdates();
  }

  explore(): void {
    const modules = this.getModules(
      this.modulesContainer,
      this.telegrafOptions.include || [],
    );

    this.registerComposers(modules);
    this.registerScenes(modules);
  }

  exploreUpdates(): void {
    const modules = this.getModules(
      this.modulesContainer,
      this.telegrafOptions.include || [],
    );

    this.registerUpdates(modules);
  }

  private registerComposers(modules: Module[]): void {
    const updates = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterComposers(instance),
    );
    updates.forEach((wrapper) => {
      const composer = new Composer();
      this.registerListeners(composer, wrapper);
      this.stage.use(composer);
    });
  }

  private registerUpdates(modules: Module[]): void {
    // IMPORTANT: Do NOT explore imports recursively for Updates!
    // Due to NestJS's @Global module behavior, TelegrafCoreModule imports all bot modules,
    // which creates a complex interconnected graph. If we explore imports, we'd register
    // Update classes from ALL bot modules for EVERY bot, causing handler conflicts.
    // Only look at providers directly in the explicitly included modules.
    const updates = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterUpdates(instance),
    );
    updates.forEach((wrapper) => {
      this.registerListeners(this.bot, wrapper);
    });
  }

  private registerScenes(modules: Module[]): void {
    const scenes = this.flatMap<InstanceWrapper>(modules, (wrapper) =>
      this.filterScenes(wrapper),
    );
    const sceneIds: string[] = [];
    scenes.forEach((wrapper) => {
      const instance = wrapper.instance as {
        constructor: new (...args: unknown[]) => unknown;
      };
      const sceneMetadata = this.metadataAccessor.getSceneMetadata(
        instance.constructor,
      );
      if (!sceneMetadata) {
        return;
      }
      const { sceneId, type, options } = sceneMetadata;
      if (sceneIds.includes(sceneId)) {
        throw new Error(`Two scenes with the same id ${sceneId} were detected`);
      }
      sceneIds.push(sceneId);

      const scene: Scenes.BaseScene<any> | Scenes.WizardScene<any> =
        type === 'base'
          ? new Scenes.BaseScene<any>(sceneId, options || ({} as any))
          : new Scenes.WizardScene<any>(sceneId, options || ({} as any));
      this.stage.register(scene);

      if (type === 'base') {
        this.registerListeners(scene, wrapper);
      } else {
        this.registerWizardListeners(scene as Scenes.WizardScene<any>, wrapper);
      }
    });
  }

  private filterComposers(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    const instance = wrapper.instance as object | null;
    if (!instance) return undefined;

    const isFeatureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (isFeatureFlag) {
      return undefined;
    }

    const isComposer = this.metadataAccessor.isComposer(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (!isComposer) return undefined;

    return wrapper;
  }

  private filterUpdates(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    const instance = wrapper.instance as object | null;
    if (!instance) return undefined;

    const isFeatureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (isFeatureFlag) {
      return undefined;
    }

    const isUpdate = this.metadataAccessor.isUpdate(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (!isUpdate) return undefined;

    return wrapper;
  }

  private filterScenes(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    const instance = wrapper.instance as object | null;
    if (!instance) return undefined;

    const isFeatureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (isFeatureFlag) {
      return undefined;
    }

    const isScene = this.metadataAccessor.isScene(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (!isScene) return undefined;

    return wrapper;
  }

  private registerListeners(
    composer: Composer<Context>,
    wrapper: InstanceWrapper<unknown>,
  ): void {
    const instance = wrapper.instance as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(instance) as Record<
      string,
      unknown
    >;
    this.metadataScanner.scanFromPrototype(instance, prototype, (name) =>
      this.registerIfListener(composer, instance, prototype, name),
    );
  }

  private registerWizardListeners(
    wizard: Scenes.WizardScene<any>,
    wrapper: InstanceWrapper<unknown>,
  ): void {
    const instance = wrapper.instance as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(instance) as Record<
      string,
      unknown
    >;

    type WizardMetadata = { step: number; methodName: string };
    const wizardSteps: WizardMetadata[] = [];
    const basicListeners: string[] = [];

    this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (methodName) => {
        const methodRef = prototype[methodName] as (
          ...args: unknown[]
        ) => unknown;
        const metadata = this.metadataAccessor.getWizardStepMetadata(methodRef);
        if (!metadata) {
          basicListeners.push(methodName);
          return undefined;
        }
        wizardSteps.push({ step: metadata.step, methodName });
      },
    );

    for (const methodName of basicListeners) {
      this.registerIfListener(wizard, instance, prototype, methodName);
    }

    const group = wizardSteps
      .sort((a, b) => a.step - b.step)
      .reduce<{ [key: number]: WizardMetadata[] }>(
        (prev, cur) => ({
          ...prev,
          [cur.step]: [...(prev[cur.step] || []), cur],
        }),
        {},
      );

    wizard.steps = Object.values(group).map((stepsMetadata) => {
      const composer = new Composer();
      stepsMetadata.forEach((stepMethod) => {
        this.registerIfListener(
          composer,
          instance,
          prototype,
          stepMethod.methodName,
          [{ method: 'use', args: [] }],
        );
      });
      return composer.middleware();
    });
  }

  private registerIfListener(
    composer: Composer<Context>,
    instance: Record<string, unknown>,
    prototype: Record<string, unknown>,
    methodName: string,
    defaultMetadata?: ListenerMetadata[],
  ): void {
    const methodRef = prototype[methodName] as (...args: unknown[]) => unknown;
    const metadata =
      this.metadataAccessor.getListenerMetadata(methodRef) || defaultMetadata;
    if (!metadata || metadata.length < 1) {
      return undefined;
    }

    const listenerCallbackFn = this.createContextCallback(
      instance,
      prototype,
      methodName,
    );

    for (const { method, args } of metadata) {
      /* Basic callback */
      // composer[method](...args, listenerCallbackFn);

      /* Complex callback return value handing */
      const composerMethod = composer[method as keyof typeof composer] as (
        ...composeArgs: unknown[]
      ) => void;
      composerMethod.call(
        composer,
        ...args,
        async (ctx: Context, next: () => Promise<void>): Promise<void> => {
          const result = (await listenerCallbackFn(ctx, next)) as unknown;
          if (result !== undefined && result !== null) {
            const message =
              typeof result === 'string' ? result : JSON.stringify(result);
            await ctx.reply(message);
          }
          // TODO-Possible-Feature: Add more supported return types
        },
      );
    }
  }

  createContextCallback<T extends Record<string, unknown>>(
    instance: T,
    prototype: Record<string, unknown>,
    methodName: string,
  ) {
    const paramsFactory = this.telegrafParamsFactory;
    const methodRef = prototype[methodName] as (...args: unknown[]) => unknown;
    return this.externalContextCreator.create<
      Record<number, ParamMetadata>,
      TelegrafContextType
    >(
      instance,
      methodRef,
      methodName,
      PARAM_ARGS_METADATA,
      paramsFactory,
      undefined,
      undefined,
      undefined,
      'telegraf',
    );
  }
}
