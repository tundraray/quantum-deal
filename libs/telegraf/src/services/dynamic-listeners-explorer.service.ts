import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Module } from '@nestjs/core/injector/module';
import { ParamMetadata } from '@nestjs/core/helpers/interfaces';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator';
import { Composer, Context, Scenes, Telegraf } from 'telegraf';

import { MetadataAccessorService } from './metadata-accessor.service';
import {
  DYNAMIC_TELEGRAF_MODULE_OPTIONS,
  PARAM_ARGS_METADATA,
} from '../telegraf.constants';
import { BaseExplorerService } from './base-explorer.service';
import { TelegrafParamsFactory } from '../factories/telegraf-params-factory';
import { TelegrafContextType } from '../execution-context';
import type {
  TelegrafDynamicModuleOptions,
  BotSettings,
  ListenerMetadata,
} from '../interfaces';

/**
 * Type for class constructor or function targets.
 * Uses Function type for compatibility with @nestjs/core which uses Function in its types.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type MetadataTarget = Function;

/**
 * Service responsible for discovering and registering handlers on dynamic bot instances.
 *
 * This service extends BaseExplorerService to provide module scanning utilities
 * and implements handler registration for dynamic bots loaded from database.
 *
 * Key responsibilities:
 * - Scan shared handler modules for @Update, @Composer, @Scene, @Wizard classes
 * - Register listeners on per-bot Telegraf/Stage instances
 * - Apply @ForBot and @RequiresFeature filtering for per-bot customization
 * - Wrap handler callbacks with NestJS context for dependency injection
 */
@Injectable()
export class DynamicListenersExplorerService extends BaseExplorerService {
  private readonly logger = new Logger(DynamicListenersExplorerService.name);
  private readonly telegrafParamsFactory = new TelegrafParamsFactory();

  constructor(
    @Inject(DYNAMIC_TELEGRAF_MODULE_OPTIONS)
    private readonly options: TelegrafDynamicModuleOptions,
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {
    super();
  }

  /**
   * Register all handlers from shared handler modules on a dynamic bot instance.
   *
   * This is the main entry point called by DynamicTelegrafService during bot initialization.
   * It scans all shared handler modules and registers appropriate handlers based on
   * @ForBot and @RequiresFeature decorators.
   *
   * @param bot - The Telegraf bot instance to register handlers on
   * @param botId - The database ID of the bot (for @ForBot filtering)
   * @param stage - The per-bot Stage instance for scene management
   * @param settings - Bot-specific settings (for @RequiresFeature filtering)
   */
  registerHandlers(
    bot: Telegraf<Context>,
    botId: number,
    stage: Scenes.Stage<Scenes.SceneContext>,
    settings: BotSettings | null,
  ): void {
    const modules = this.getModules(
      this.modulesContainer,
      this.options.sharedHandlerModules,
    );

    // Register @Update decorated classes (global handlers)
    this.registerUpdates(modules, bot, botId, settings);

    // Register @Composer decorated classes (stage middlewares)
    this.registerComposers(modules, stage);

    // Register @Scene and @Wizard decorated classes
    this.registerScenes(modules, stage, botId);

    this.logger.debug(`Handlers registered for bot ID ${botId}`);
  }

  /**
   * Register @Update decorated classes on the bot instance.
   *
   * This method filters @Update decorated classes from shared handler modules
   * and registers them on the bot, applying @ForBot and @RequiresFeature filtering.
   *
   * Filtering rules:
   * 1. @ForBot(botId) - Handler only registered if targetBotId matches current botId
   * 2. @RequiresFeature(key) - Handler only registered if feature is enabled in settings
   *
   * @param modules - Modules to scan for @Update decorated classes
   * @param bot - The Telegraf bot instance to register handlers on
   * @param botId - The database ID of the current bot (for @ForBot filtering)
   * @param settings - Bot-specific settings (for @RequiresFeature filtering)
   */
  private registerUpdates(
    modules: Module[],
    bot: Telegraf<Context>,
    botId: number,
    settings: BotSettings | null,
  ): void {
    const updates = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterUpdates(instance),
    );
    for (const wrapper of updates) {
      // Check for bot-specific handler targeting

      const targetBotId = this.metadataAccessor.getBotTargetMetadata(
        wrapper.metatype as MetadataTarget,
      );
      // Skip handler if it targets a different bot
      if (targetBotId !== undefined && targetBotId !== botId) {
        continue;
      }
      // Check feature flags for conditional handlers
      if (!this.shouldRegisterHandler(wrapper, settings)) {
        continue;
      }

      this.registerListeners(bot, wrapper);
      this.logger.debug(`Registered update for bot ID ${botId}`);
    }
  }

  /**
   * Register @Composer decorated classes on the Stage instance.
   *
   * This method filters @Composer decorated classes from shared handler modules,
   * creates Composer instances, registers listeners on them, and adds them as
   * stage middlewares. This enables guard/logging middleware patterns in scenes.
   *
   * @param modules - Modules to scan for @Composer decorated classes
   * @param stage - The per-bot Stage instance to register middlewares on
   */
  private registerComposers(
    modules: Module[],
    stage: Scenes.Stage<Scenes.SceneContext>,
  ): void {
    const composers = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterComposers(instance),
    );

    for (const wrapper of composers) {
      const composer = new Composer();
      this.registerListeners(composer, wrapper);
      stage.use(composer);
    }
  }

  /**
   * Register @Scene and @Wizard decorated classes on the Stage instance.
   *
   * This method filters @Scene and @Wizard decorated classes, creates scene instances,
   * and registers them on the per-bot Stage.
   *
   * @param modules - Modules to scan for scene classes
   * @param stage - The per-bot Stage instance for scene registration
   * @param botId - The database ID of the current bot (for logging)
   */
  private registerScenes(
    modules: Module[],
    stage: Scenes.Stage<Scenes.SceneContext>,
    botId: number,
  ): void {
    const scenes = this.flatMap<InstanceWrapper>(modules, (wrapper) =>
      this.filterScenes(wrapper),
    );

    const sceneIds = new Set<string>();

    for (const wrapper of scenes) {
      const instance = wrapper.instance as { constructor: MetadataTarget };
      const sceneMetadata = this.metadataAccessor.getSceneMetadata(
        instance.constructor,
      );

      if (!sceneMetadata) continue;

      const { sceneId, type, options } = sceneMetadata;

      // Prevent duplicate scene IDs
      if (sceneIds.has(sceneId)) {
        this.logger.warn(
          `Duplicate scene ID "${sceneId}" detected for bot ${botId}, skipping`,
        );
        continue;
      }
      sceneIds.add(sceneId);

      // Create scene based on type
      // Note: Using <any> type and 'as any' cast to match existing pattern in
      // listeners-explorer.service.ts due to telegraf's complex type constraints
      const scene =
        type === 'base'
          ? new Scenes.BaseScene<any>(sceneId, options || ({} as any))
          : new Scenes.WizardScene<any>(sceneId, options || ({} as any));

      // Register scene on stage
      stage.register(scene);

      // Register listeners on scene
      if (type === 'base') {
        this.registerListeners(scene, wrapper);
      } else {
        this.registerWizardListeners(
          scene as Scenes.WizardScene<Scenes.WizardContext>,
          wrapper,
        );
      }
    }
  }

  /**
   * Determine if a handler should be registered based on @RequiresFeature metadata.
   *
   * Checks if the handler has a feature flag requirement and evaluates it against
   * the bot's settings. Returns true if:
   * - Handler has no @RequiresFeature decorator, OR
   * - Handler has @RequiresFeature and the feature is enabled in bot settings
   *
   * @param wrapper - The instance wrapper containing the handler
   * @param settings - Bot-specific settings with feature flags
   * @returns true if the handler should be registered
   */
  private shouldRegisterHandler(
    wrapper: InstanceWrapper,
    settings: BotSettings | null,
  ): boolean {
    const featureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as MetadataTarget,
    );

    // No feature flag requirement = always register
    if (!featureFlag) return true;

    // Has feature flag but no settings = skip registration
    if (!settings?.features) return false;

    // Check if feature is enabled
    const features = settings.features as Record<string, boolean>;
    return features[featureFlag] === true;
  }

  /**
   * Filter instance wrappers to find @Update decorated classes.
   */
  private filterUpdates(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    const instance = wrapper.instance as object | null;
    if (!instance) return undefined;

    const isUpdate = this.metadataAccessor.isUpdate(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    if (!isUpdate) return undefined;

    return this.filterDynamicHandlers(wrapper);
  }

  /**
   * Filter instance wrappers to find @Composer decorated classes.
   */
  private filterComposers(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    if (!wrapper.instance) return undefined;

    const isComposer = this.metadataAccessor.isComposer(
      wrapper.metatype as MetadataTarget,
    );
    if (!isComposer) return undefined;

    return this.filterDynamicHandlers(wrapper);
  }

  /**
   * Filter instance wrappers to find @Scene and @Wizard decorated classes.
   */
  private filterScenes(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    if (!wrapper.instance) return undefined;

    const isScene = this.metadataAccessor.isScene(
      wrapper.metatype as MetadataTarget,
    );
    if (!isScene) return undefined;

    return this.filterDynamicHandlers(wrapper);
  }

  private filterDynamicHandlers(
    wrapper: InstanceWrapper,
  ): InstanceWrapper<unknown> | undefined {
    if (!wrapper.instance) return undefined;

    const isFeatureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );
    const isBotTargetId = this.metadataAccessor.getBotTargetMetadata(
      wrapper.metatype as (...args: unknown[]) => unknown,
    );

    if (!!isFeatureFlag || !!isBotTargetId) {
      return wrapper;
    }

    return undefined;
  }
  /**
   * Register listener methods from a handler class on a Composer.
   *
   * Scans the handler's prototype for methods decorated with listener decorators
   * (@Start, @Command, @On, etc.) and registers them on the Composer instance.
   *
   * @param composer - The Composer instance to register listeners on
   * @param wrapper - The instance wrapper containing the handler class
   */
  private registerListeners(
    composer: Composer<Context>,
    wrapper: InstanceWrapper,
  ): void {
    const instance = wrapper.instance as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(instance) as Record<
      string,
      unknown
    >;
    this.metadataScanner.scanFromPrototype(instance, prototype, (name) => {
      this.registerIfListener(composer, instance, prototype, name);
      return;
    });
  }

  /**
   * Register wizard step methods from a @Wizard decorated class.
   *
   * Scans the wizard class for @WizardStep decorated methods and organizes them
   * into step middleware. Also registers basic listeners (non-step methods).
   *
   * @param wizard - The WizardScene instance to register steps on
   * @param wrapper - The instance wrapper containing the wizard class
   */
  private registerWizardListeners(
    wizard: Scenes.WizardScene<Scenes.WizardContext>,
    wrapper: InstanceWrapper,
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
        const methodRef = prototype[methodName] as MetadataTarget;
        const metadata = this.metadataAccessor.getWizardStepMetadata(methodRef);
        if (!metadata) {
          basicListeners.push(methodName);
          return undefined;
        }
        wizardSteps.push({ step: metadata.step, methodName });
      },
    );

    // Register basic listeners first
    for (const methodName of basicListeners) {
      this.registerIfListener(wizard, instance, prototype, methodName);
    }

    // Group and sort wizard steps
    const group = wizardSteps
      .sort((a, b) => a.step - b.step)
      .reduce<Record<number, WizardMetadata[]>>(
        (prev, cur) => ({
          ...prev,
          [cur.step]: [...(prev[cur.step] || []), cur],
        }),
        {},
      );

    // Create step middleware
    wizard.steps = Object.values(group).map((stepsMetadata) => {
      const composer = new Composer();
      for (const stepMethod of stepsMetadata) {
        this.registerIfListener(
          composer,
          instance,
          prototype,
          stepMethod.methodName,
          [{ method: 'use', args: [] }],
        );
      }
      return composer.middleware();
    });
  }

  /**
   * Register a single listener method if it has listener metadata.
   *
   * Checks if the method has listener decorator metadata and if so, creates a
   * context callback and registers it on the Composer using the appropriate method.
   *
   * @param composer - The Composer instance to register the listener on
   * @param instance - The handler class instance
   * @param prototype - The handler class prototype
   * @param methodName - The name of the method to register
   * @param defaultMetadata - Optional default metadata if no decorator found
   */
  private registerIfListener(
    composer: Composer<Context>,
    instance: Record<string, unknown>,
    prototype: Record<string, unknown>,
    methodName: string,
    defaultMetadata?: ListenerMetadata[],
  ): void {
    const methodRef = prototype[methodName] as MetadataTarget;
    const metadata =
      this.metadataAccessor.getListenerMetadata(methodRef) || defaultMetadata;

    if (!metadata || metadata.length < 1) {
      return;
    }

    const listenerCallbackFn = this.createContextCallback(
      instance,
      prototype,
      methodName,
    );

    for (const { method, args } of metadata) {
      const composerMethod = composer[method as keyof Composer<Context>];
      if (typeof composerMethod !== 'function') {
        this.logger.warn(`Unknown composer method: ${method}`);
        continue;
      }

      (composerMethod as (...callArgs: unknown[]) => void).call(
        composer,
        ...args,
        async (ctx: Context, next: () => Promise<void>): Promise<void> => {
          const result: unknown = await listenerCallbackFn(ctx, next);

          if (result !== undefined && result !== null) {
            // Result can be any value returned by handler
            let replyText: string;
            if (typeof result === 'string') {
              replyText = result;
            } else if (
              typeof result === 'number' ||
              typeof result === 'boolean'
            ) {
              replyText = String(result);
            } else {
              replyText = JSON.stringify(result);
            }
            await ctx.reply(replyText);
          }
        },
      );
    }
  }

  /**
   * Create a context callback wrapper for handler methods.
   *
   * This wraps handler methods with NestJS ExternalContextCreator to enable
   * parameter decoration (@Ctx, @Message, @Sender, etc.) in handler methods.
   *
   * @param instance - The handler class instance
   * @param prototype - The handler class prototype
   * @param methodName - The method name to wrap
   * @returns A wrapped callback function with parameter injection
   */
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
