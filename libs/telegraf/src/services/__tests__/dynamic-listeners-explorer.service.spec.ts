// DynamicListenersExplorerService Unit Tests - Design Doc: docs/designs/dynamic-telegraf-module-design.md
// Generated: 2025-11-27 | Budget Used: 2/3 unit tests (supplementary to dynamic-telegraf.service.spec.ts)
// Test Type: Unit Tests
// Implementation Timing: Created alongside feature implementation

import { DynamicListenersExplorerService } from '../dynamic-listeners-explorer.service';
import { MetadataAccessorService } from '../metadata-accessor.service';
import { ModulesContainer } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator';
import type { Telegraf, Context, Scenes } from 'telegraf';
import type {
  TelegrafDynamicModuleOptions,
  BotSettings,
} from '../../interfaces';

/**
 * DynamicListenersExplorerService Unit Tests
 *
 * These tests verify handler registration mechanics:
 * - @Update class scanning and registration
 * - @Scene and @Wizard class registration on per-bot Stage
 * - @Composer middleware registration
 * - Metadata extraction via MetadataAccessorService
 *
 * Mock Strategy:
 * - Mock ModulesContainer with test handler classes
 * - Mock MetadataAccessorService
 * - Mock Telegraf/Composer instances
 * - Use real DynamicListenersExplorerService
 *
 * Prerequisites:
 * - DynamicListenersExplorerService implementation
 * - BaseExplorerService implementation
 * - MetadataAccessorService implementation
 */
describe('DynamicListenersExplorerService Unit Tests', () => {
  // =============================================================================
  // Mock Setup
  // =============================================================================

  let service: DynamicListenersExplorerService;
  let mockModulesContainer: ModulesContainer;
  let mockMetadataAccessor: MetadataAccessorService;
  let mockMetadataScanner: MetadataScanner;
  let mockExternalContextCreator: ExternalContextCreator;
  let mockOptions: TelegrafDynamicModuleOptions;
  let mockBot: Telegraf<Context>;
  let mockStage: Scenes.Stage<Scenes.SceneContext>;
  let mockSettings: BotSettings | null;

  class MockSharedHandlerModule {}

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ModulesContainer
    mockModulesContainer = {
      get: jest.fn().mockReturnValue(undefined),
      values: jest.fn().mockReturnValue([]),
    } as unknown as ModulesContainer;

    // Mock MetadataAccessorService
    mockMetadataAccessor = {
      isUpdate: jest.fn().mockReturnValue(false),
      isComposer: jest.fn().mockReturnValue(false),
      isScene: jest.fn().mockReturnValue(false),
      getListenerMetadata: jest.fn().mockReturnValue(undefined),
      getSceneMetadata: jest.fn().mockReturnValue(undefined),
      getWizardStepMetadata: jest.fn().mockReturnValue(undefined),
      getBotTargetMetadata: jest.fn().mockReturnValue(undefined),
      getFeatureFlagMetadata: jest.fn().mockReturnValue(undefined),
    } as unknown as MetadataAccessorService;

    // Mock MetadataScanner
    mockMetadataScanner = {
      scanFromPrototype: jest.fn(),
    } as unknown as MetadataScanner;

    // Mock ExternalContextCreator
    mockExternalContextCreator = {
      create: jest.fn().mockReturnValue(jest.fn()),
    } as unknown as ExternalContextCreator;

    // Mock Options
    mockOptions = {
      botConfigProvider:
        class {} as TelegrafDynamicModuleOptions['botConfigProvider'],
      sharedHandlerModules: [MockSharedHandlerModule],
      webhookDomain: 'https://example.com',
    };

    // Mock Telegraf bot
    mockBot = {
      use: jest.fn(),
      start: jest.fn(),
      command: jest.fn(),
      on: jest.fn(),
    } as unknown as Telegraf<Context>;

    // Mock Stage
    mockStage = {
      use: jest.fn(),
      register: jest.fn(),
      middleware: jest.fn().mockReturnValue(jest.fn()),
    } as unknown as Scenes.Stage<Scenes.SceneContext>;

    // Mock Settings
    mockSettings = {
      features: {
        trialEnabled: true,
        paymentsEnabled: false,
        signalsEnabled: true,
        broadcastEnabled: false,
        partnerFlowEnabled: false,
      },
      defaults: {
        subscriptionDays: 30,
        trialDays: 7,
        language: 'en',
      },
    };

    // Create service instance with mocks
    service = new DynamicListenersExplorerService(
      mockOptions,
      mockModulesContainer,
      mockMetadataAccessor,
      mockMetadataScanner,
      mockExternalContextCreator,
    );
  });

  // =============================================================================
  // registerHandlers Method
  // =============================================================================

  describe('registerHandlers', () => {
    it('scans shared handler modules for registration', async () => {
      // Arrange - spy on getModules (inherited from BaseExplorerService)
      const getModulesSpy = jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([]);

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(getModulesSpy).toHaveBeenCalledWith(
        mockModulesContainer,
        mockOptions.sharedHandlerModules,
      );
    });

    it('calls registerUpdates with discovered modules', async () => {
      // Arrange
      const registerUpdatesSpy = jest
        .spyOn(
          service as unknown as {
            registerUpdates: (...args: unknown[]) => void;
          },
          'registerUpdates',
        )
        .mockImplementation(() => {});
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([]);

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(registerUpdatesSpy).toHaveBeenCalled();
    });

    it('calls registerComposers with discovered modules', async () => {
      // Arrange
      const registerComposersSpy = jest
        .spyOn(
          service as unknown as {
            registerComposers: (...args: unknown[]) => void;
          },
          'registerComposers',
        )
        .mockImplementation(() => {});
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([]);

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(registerComposersSpy).toHaveBeenCalled();
    });

    it('calls registerScenes with discovered modules', async () => {
      // Arrange
      const registerScenesSpy = jest
        .spyOn(
          service as unknown as {
            registerScenes: (...args: unknown[]) => void;
          },
          'registerScenes',
        )
        .mockImplementation(() => {});
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([]);

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(registerScenesSpy).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Handler Discovery
  // =============================================================================

  describe('Handler Discovery', () => {
    // @Update class scanning
    // ROI: 75 | Business Value: 8 (core functionality) | Frequency: 9
    // Behavior: Classes decorated with @Update are discovered from shared handler modules
    // Verification: filterUpdates returns correct wrappers, count matches decorated classes
    // @category: core-functionality
    // @dependency: ModulesContainer, MetadataAccessorService
    // @complexity: medium
    it('Discovers all @Update decorated classes from shared handler modules', () => {
      // Arrange
      const mockWrapper = {
        instance: { onStart: jest.fn() },
        metatype: class TestUpdate {},
      };

      // Configure mock to identify @Update decorated class
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Act
      const result = (
        service as unknown as { filterUpdates: (wrapper: unknown) => unknown }
      ).filterUpdates(mockWrapper);

      // Assert
      expect(result).toBe(mockWrapper);
      expect(mockMetadataAccessor.isUpdate).toHaveBeenCalledWith(
        mockWrapper.metatype,
      );
    });

    it('filterUpdates returns undefined for non-@Update classes', () => {
      // Arrange
      const mockWrapper = {
        instance: { someMethod: jest.fn() },
        metatype: class RegularClass {},
      };

      // Configure mock to return false (not @Update decorated)
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(false);

      // Act
      const result = (
        service as unknown as { filterUpdates: (wrapper: unknown) => unknown }
      ).filterUpdates(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    it('filterUpdates returns undefined when wrapper has no instance', () => {
      // Arrange
      const mockWrapper = {
        instance: undefined,
        metatype: class TestUpdate {},
      };

      // Act
      const result = (
        service as unknown as { filterUpdates: (wrapper: unknown) => unknown }
      ).filterUpdates(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    // @Scene class scanning
    // ROI: 70 | Business Value: 7 (feature) | Frequency: 6
    // Behavior: Classes decorated with @Scene are discovered for Stage registration
    // Verification: filterScenes returns scene wrappers with correct metadata
    // @category: core-functionality
    // @dependency: ModulesContainer, MetadataAccessorService
    // @complexity: medium
    it('Discovers all @Scene decorated classes from shared handler modules', () => {
      // Arrange
      const mockWrapper = {
        instance: { onEnter: jest.fn() },
        metatype: class TestScene {},
      };

      // Configure mock to identify @Scene decorated class
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(true);

      // Act
      const result = (
        service as unknown as { filterScenes: (wrapper: unknown) => unknown }
      ).filterScenes(mockWrapper);

      // Assert
      expect(result).toBe(mockWrapper);
      expect(mockMetadataAccessor.isScene).toHaveBeenCalledWith(
        mockWrapper.metatype,
      );
    });

    it('filterScenes returns undefined for non-@Scene classes', () => {
      // Arrange
      const mockWrapper = {
        instance: { someMethod: jest.fn() },
        metatype: class RegularClass {},
      };

      // Configure mock to return false (not @Scene decorated)
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(false);

      // Act
      const result = (
        service as unknown as { filterScenes: (wrapper: unknown) => unknown }
      ).filterScenes(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    it('filterScenes returns undefined when wrapper has no instance', () => {
      // Arrange
      const mockWrapper = {
        instance: undefined,
        metatype: class TestScene {},
      };

      // Act
      const result = (
        service as unknown as { filterScenes: (wrapper: unknown) => unknown }
      ).filterScenes(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    // @Wizard class scanning
    // ROI: 68 | Business Value: 7 (feature) | Frequency: 5
    // Behavior: Classes decorated with @Wizard are discovered for wizard registration
    // Verification: filterScenes returns wizard wrappers with type='wizard'
    // @category: core-functionality
    // @dependency: ModulesContainer, MetadataAccessorService
    // @complexity: medium
    it('Discovers all @Wizard decorated classes from shared handler modules', () => {
      // Arrange
      const mockWrapper = {
        instance: { step1: jest.fn() },
        metatype: class TestWizard {},
      };

      // @Wizard classes are also identified by isScene returning true
      // The difference is in the sceneMetadata.type ('wizard' vs 'base')
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(true);

      // Act
      const result = (
        service as unknown as { filterScenes: (wrapper: unknown) => unknown }
      ).filterScenes(mockWrapper);

      // Assert
      expect(result).toBe(mockWrapper);
    });
  });

  // =============================================================================
  // Listener Registration
  // =============================================================================

  describe('Listener Registration', () => {
    // @Start, @Command, @On listener registration
    // ROI: 78 | Business Value: 9 (core functionality) | Frequency: 10
    // Behavior: Methods with listener decorators registered on Composer
    // Verification: composer.start, composer.command, composer.on called with callbacks
    // @category: core-functionality
    // @dependency: MetadataAccessorService, Composer
    // @complexity: medium
    it('Registers @Start, @Command, @On decorated methods on Composer', async () => {
      // Arrange
      class TestHandler {
        onStart() {
          return 'started';
        }
        onHelp() {
          return 'help';
        }
        onMessage() {
          return;
        }
      }

      const handlerInstance = new TestHandler();
      const mockWrapper = {
        instance: handlerInstance,
        metatype: TestHandler,
      };

      const mockModule = {
        providers: new Map([['TestHandler', mockWrapper]]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(false);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Mock metadataScanner to scan prototype methods
      (mockMetadataScanner.scanFromPrototype as jest.Mock).mockImplementation(
        (instance, prototype, callback) => {
          // Simulate scanning methods
          callback('onStart');
          callback('onHelp');
          callback('onMessage');
        },
      );

      // Mock listener metadata for each method
      (
        mockMetadataAccessor.getListenerMetadata as jest.Mock
      ).mockImplementation((methodRef) => {
        if (methodRef === TestHandler.prototype.onStart) {
          return [{ method: 'start', args: [] }];
        }
        if (methodRef === TestHandler.prototype.onHelp) {
          return [{ method: 'command', args: ['help'] }];
        }
        if (methodRef === TestHandler.prototype.onMessage) {
          return [{ method: 'on', args: ['message'] }];
        }
        return undefined;
      });

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(mockBot.start).toHaveBeenCalled();
      expect(mockBot.command).toHaveBeenCalledWith(
        'help',
        expect.any(Function),
      );
      expect(mockBot.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    // Listener callback wrapping
    // ROI: 65 | Business Value: 6 (functionality) | Frequency: 10
    // Behavior: Callbacks wrapped with NestJS context for DI parameters
    // Verification: createContextCallback creates function with param injection
    // @category: core-functionality
    // @dependency: ExternalContextCreator, TelegrafParamsFactory
    // @complexity: high
    it('Wraps listener callbacks with NestJS external context for dependency injection', () => {
      // Arrange
      class InjectedHandler {
        onStart() {
          return 'message';
        }
      }

      const handlerInstance = new InjectedHandler();
      const prototype = Object.getPrototypeOf(handlerInstance);

      // Act
      const callback = service.createContextCallback(
        handlerInstance as unknown as Record<string, unknown>,
        prototype,
        'onStart',
      );

      // Assert - createContextCallback should use ExternalContextCreator
      expect(mockExternalContextCreator.create).toHaveBeenCalledWith(
        handlerInstance,
        expect.any(Function),
        'onStart',
        expect.any(String), // PARAM_ARGS_METADATA
        expect.anything(), // paramsFactory
        undefined,
        undefined,
        undefined,
        'telegraf',
      );
      expect(typeof callback).toBe('function');
    });

    // Return value handling
    // ROI: 55 | Business Value: 4 (convenience) | Frequency: 5
    // Behavior: Non-void return from handler auto-replied via ctx.reply()
    // Verification: When handler returns string, ctx.reply called with that string
    // @category: integration
    // @dependency: Telegraf Context
    // @complexity: low
    it('Auto-replies with handler return value when non-void', async () => {
      // Arrange
      class ReplyHandler {
        onStart() {
          return 'Hello!';
        }
      }

      const handlerInstance = new ReplyHandler();
      const mockWrapper = {
        instance: handlerInstance,
        metatype: ReplyHandler,
      };

      const mockModule = {
        providers: new Map([['ReplyHandler', mockWrapper]]),
        imports: new Set(),
      };

      // Mock context with reply method
      const mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      } as unknown as Context;

      const mockNext = jest.fn().mockResolvedValue(undefined);

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(false);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Mock metadataScanner to scan prototype methods
      (mockMetadataScanner.scanFromPrototype as jest.Mock).mockImplementation(
        (instance, prototype, callback) => {
          callback('onStart');
        },
      );

      // Mock listener metadata for onStart
      (mockMetadataAccessor.getListenerMetadata as jest.Mock).mockReturnValue([
        { method: 'start', args: [] },
      ]);

      // Mock ExternalContextCreator to return a function that returns 'Hello!'
      (mockExternalContextCreator.create as jest.Mock).mockReturnValue(
        jest.fn().mockResolvedValue('Hello!'),
      );

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Get the registered callback and execute it
      const registeredCallback = (mockBot.start as jest.Mock).mock.calls[0][0];
      await registeredCallback(mockCtx, mockNext);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith('Hello!');
    });

    it('Does not auto-reply when handler returns void', async () => {
      // Arrange
      class VoidHandler {
        onStart() {
          /* no return */
        }
      }

      const handlerInstance = new VoidHandler();
      const mockWrapper = {
        instance: handlerInstance,
        metatype: VoidHandler,
      };

      const mockModule = {
        providers: new Map([['VoidHandler', mockWrapper]]),
        imports: new Set(),
      };

      // Mock context with reply method
      const mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      } as unknown as Context;

      const mockNext = jest.fn().mockResolvedValue(undefined);

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(false);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Mock metadataScanner to scan prototype methods
      (mockMetadataScanner.scanFromPrototype as jest.Mock).mockImplementation(
        (instance, prototype, callback) => {
          callback('onStart');
        },
      );

      // Mock listener metadata for onStart
      (mockMetadataAccessor.getListenerMetadata as jest.Mock).mockReturnValue([
        { method: 'start', args: [] },
      ]);

      // Mock ExternalContextCreator to return a function that returns undefined (void)
      (mockExternalContextCreator.create as jest.Mock).mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Get the registered callback and execute it
      const registeredCallback = (mockBot.start as jest.Mock).mock.calls[0][0];
      await registeredCallback(mockCtx, mockNext);

      // Assert - reply should NOT have been called
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Scene Registration
  // =============================================================================

  describe('Scene Registration', () => {
    // BaseScene registration
    // ROI: 70 | Business Value: 7 (feature) | Frequency: 6
    // Behavior: @Scene creates BaseScene and registers on per-bot Stage
    // Verification: stage.register called with BaseScene instance, sceneId matches
    // @category: core-functionality
    // @dependency: Scenes.Stage, Scenes.BaseScene
    // @complexity: medium
    it('Registers @Scene classes as BaseScene on per-bot Stage', async () => {
      // Arrange
      class GreetingScene {
        onEnter() {}
      }
      const mockModule = {
        providers: new Map([
          [
            'GreetingScene',
            {
              instance: new GreetingScene(),
              metatype: GreetingScene,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isScene to identify our scene class
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);

      // Mock getSceneMetadata to return base scene metadata
      (mockMetadataAccessor.getSceneMetadata as jest.Mock).mockReturnValue({
        sceneId: 'greeting-scene',
        type: 'base',
        options: {},
      });

      // Mock registerListeners
      jest
        .spyOn(
          service as unknown as {
            registerListeners: (composer: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(mockStage.register).toHaveBeenCalled();
    });

    // WizardScene registration
    // ROI: 68 | Business Value: 7 (feature) | Frequency: 5
    // Behavior: @Wizard creates WizardScene with steps from @WizardStep
    // Verification: WizardScene.steps populated with step middlewares
    // @category: core-functionality
    // @dependency: Scenes.Stage, Scenes.WizardScene
    // @complexity: high
    it('Registers @Wizard classes as WizardScene with @WizardStep middlewares', async () => {
      // Arrange
      class SetupWizard {
        step1() {}
        step2() {}
      }
      const mockModule = {
        providers: new Map([
          [
            'SetupWizard',
            {
              instance: new SetupWizard(),
              metatype: SetupWizard,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isScene to identify our wizard class
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);

      // Mock getSceneMetadata to return wizard scene metadata
      (mockMetadataAccessor.getSceneMetadata as jest.Mock).mockReturnValue({
        sceneId: 'setup-wizard',
        type: 'wizard',
        options: {},
      });

      // Mock registerWizardListeners
      jest
        .spyOn(
          service as unknown as {
            registerWizardListeners: (
              wizard: unknown,
              wrapper: unknown,
            ) => void;
          },
          'registerWizardListeners',
        )
        .mockImplementation(() => {});

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert
      expect(mockStage.register).toHaveBeenCalled();
    });

    // Duplicate scene ID detection
    // ROI: 62 | Business Value: 6 (data integrity) | Frequency: 2
    // Behavior: Duplicate sceneId logged as warning, second scene skipped
    // Verification: Warning logged, only first scene registered
    // @category: edge-case
    // @dependency: Logger, Scenes.Stage
    // @complexity: low
    it('Warns and skips duplicate scene IDs during registration', async () => {
      // Arrange
      class Scene1 {
        onEnter() {}
      }
      class Scene2 {
        onEnter() {}
      }
      const mockModule = {
        providers: new Map([
          [
            'Scene1',
            {
              instance: new Scene1(),
              metatype: Scene1,
            },
          ],
          [
            'Scene2',
            {
              instance: new Scene2(),
              metatype: Scene2,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isScene to identify both scene classes
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(true);
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);

      // Mock getSceneMetadata to return same sceneId for both
      (mockMetadataAccessor.getSceneMetadata as jest.Mock).mockReturnValue({
        sceneId: 'duplicate-scene',
        type: 'base',
        options: {},
      });

      // Mock registerListeners
      jest
        .spyOn(
          service as unknown as {
            registerListeners: (composer: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Mock logger.warn to capture warnings
      const mockLogger = {
        warn: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        error: jest.fn(),
      };
      (service as unknown as { logger: typeof mockLogger }).logger = mockLogger;

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert - Warning should be logged for duplicate scene ID
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate scene ID'),
      );
    });
  });

  // =============================================================================
  // Bot Target Filtering
  // =============================================================================

  describe('Bot Target Filtering (@ForBot)', () => {
    // @ForBot metadata extraction
    // ROI: 70 | Business Value: 7 (customization) | Frequency: 6
    // Behavior: getBotTargetMetadata extracts bot ID from @ForBot decorator
    // Verification: Returns number for targeted handler, undefined for shared handler
    // @category: core-functionality
    // @dependency: MetadataAccessorService
    // @complexity: low
    it('extracts bot target ID from @ForBot decorator metadata', () => {
      // Arrange
      class Bot1Handler {}
      const targetBotId = 1;

      // Configure mock to return bot target ID
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        targetBotId,
      );

      // Act
      const result = mockMetadataAccessor.getBotTargetMetadata(Bot1Handler);

      // Assert
      expect(result).toBe(targetBotId);
      expect(mockMetadataAccessor.getBotTargetMetadata).toHaveBeenCalledWith(
        Bot1Handler,
      );
    });

    it('returns undefined when no @ForBot decorator', () => {
      // Arrange
      class SharedHandler {}

      // Configure mock to return undefined (no @ForBot decorator)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );

      // Act
      const result = mockMetadataAccessor.getBotTargetMetadata(SharedHandler);

      // Assert
      expect(result).toBeUndefined();
    });

    // Filtering logic in registerUpdates
    // ROI: 72 | Business Value: 7 (customization) | Frequency: 6
    // Behavior: Handler skipped if targetBotId !== currentBotId
    // Verification: Handler not registered when IDs don't match
    // @category: core-functionality
    // @dependency: DynamicListenersExplorerService
    // @complexity: medium
    it('Skips handler registration when @ForBot botId does not match current bot', async () => {
      // Arrange
      const targetBotId = 1;
      const currentBotId = 2;

      class Bot1OnlyHandler {}
      const mockModule = {
        providers: new Map([
          [
            'Bot1OnlyHandler',
            {
              instance: new Bot1OnlyHandler(),
              metatype: Bot1OnlyHandler,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Mock @ForBot targeting to bot 1
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        targetBotId,
      );

      // Mock registerListeners to track calls
      const registerListenersSpy = jest
        .spyOn(
          service as unknown as {
            registerListeners: (bot: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act - register on bot 2 (not the target)
      await service.registerHandlers(
        mockBot,
        currentBotId,
        mockStage,
        mockSettings,
      );

      // Assert - should NOT have called registerListeners since bot IDs don't match
      expect(registerListenersSpy).not.toHaveBeenCalled();
    });

    it('Registers handler when @ForBot botId matches current bot', async () => {
      // Arrange
      const targetBotId = 1;
      const currentBotId = 1;

      class Bot1OnlyHandler {}
      const mockModule = {
        providers: new Map([
          [
            'Bot1OnlyHandler',
            {
              instance: new Bot1OnlyHandler(),
              metatype: Bot1OnlyHandler,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Mock @ForBot targeting to bot 1
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        targetBotId,
      );

      // Mock feature flag to return undefined (no feature requirement)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Mock registerListeners to track calls
      const registerListenersSpy = jest
        .spyOn(
          service as unknown as {
            registerListeners: (bot: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act - register on bot 1 (the target)
      await service.registerHandlers(
        mockBot,
        currentBotId,
        mockStage,
        mockSettings,
      );

      // Assert - should have called registerListeners since bot IDs match
      expect(registerListenersSpy).toHaveBeenCalled();
    });

    it('Registers shared handler (no @ForBot) on all bots', async () => {
      // Arrange
      class SharedHandler {}
      const mockModule = {
        providers: new Map([
          [
            'SharedHandler',
            {
              instance: new SharedHandler(),
              metatype: SharedHandler,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );

      // Mock feature flag to return undefined (no feature requirement)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Mock registerListeners to track calls
      const registerListenersSpy = jest
        .spyOn(
          service as unknown as {
            registerListeners: (bot: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act - register on any bot
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert - should have called registerListeners since no @ForBot restriction
      expect(registerListenersSpy).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Feature Flag Filtering
  // =============================================================================

  describe('Feature Flag Filtering (@RequiresFeature)', () => {
    // @RequiresFeature metadata extraction
    // ROI: 68 | Business Value: 7 (feature flags) | Frequency: 6
    // Behavior: getFeatureFlagMetadata extracts feature key from @RequiresFeature
    // Verification: Returns feature key string, undefined if no decorator
    // @category: core-functionality
    // @dependency: MetadataAccessorService
    // @complexity: low
    it('extracts feature key from @RequiresFeature decorator metadata', () => {
      // Arrange
      class PaymentsHandler {}
      const featureKey = 'paymentsEnabled';

      // Configure mock to return feature key
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(featureKey);

      // Act
      const result =
        mockMetadataAccessor.getFeatureFlagMetadata(PaymentsHandler);

      // Assert
      expect(result).toBe(featureKey);
      expect(mockMetadataAccessor.getFeatureFlagMetadata).toHaveBeenCalledWith(
        PaymentsHandler,
      );
    });

    it('returns undefined when no @RequiresFeature decorator', () => {
      // Arrange
      class RegularHandler {}

      // Configure mock to return undefined (no @RequiresFeature)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Act
      const result =
        mockMetadataAccessor.getFeatureFlagMetadata(RegularHandler);

      // Assert
      expect(result).toBeUndefined();
    });

    // Feature flag evaluation
    // ROI: 70 | Business Value: 7 (feature flags) | Frequency: 6
    // Behavior: shouldRegisterHandler checks bot.settings.features[key] === true
    // Verification: Returns true when feature enabled, false when disabled or missing
    // @category: core-functionality
    // @dependency: DynamicListenersExplorerService
    // @complexity: medium
    it('shouldRegisterHandler returns true when no feature flag required', () => {
      // Arrange
      const mockWrapper = {
        instance: {},
        metatype: class NoFeatureHandler {},
      };

      // No feature flag required
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue(undefined);

      // Act
      const shouldRegister = (
        service as unknown as {
          shouldRegisterHandler: (
            wrapper: unknown,
            settings: BotSettings | null,
          ) => boolean;
        }
      ).shouldRegisterHandler(mockWrapper, mockSettings);

      // Assert
      expect(shouldRegister).toBe(true);
    });

    it('shouldRegisterHandler returns true when feature is enabled', () => {
      // Arrange
      const mockWrapper = {
        instance: {},
        metatype: class TrialHandler {},
      };

      // Feature flag requires trialEnabled (which is true in mockSettings)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue('trialEnabled');

      // Act
      const shouldRegister = (
        service as unknown as {
          shouldRegisterHandler: (
            wrapper: unknown,
            settings: BotSettings | null,
          ) => boolean;
        }
      ).shouldRegisterHandler(mockWrapper, mockSettings);

      // Assert
      expect(shouldRegister).toBe(true);
    });

    it('shouldRegisterHandler returns false when feature is disabled', () => {
      // Arrange
      const mockWrapper = {
        instance: {},
        metatype: class PaymentsHandler {},
      };

      // Feature flag requires paymentsEnabled (which is false in mockSettings)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue('paymentsEnabled');

      // Act
      const shouldRegister = (
        service as unknown as {
          shouldRegisterHandler: (
            wrapper: unknown,
            settings: BotSettings | null,
          ) => boolean;
        }
      ).shouldRegisterHandler(mockWrapper, mockSettings);

      // Assert
      expect(shouldRegister).toBe(false);
    });

    it('shouldRegisterHandler returns false when settings is null but feature is required', () => {
      // Arrange
      const mockWrapper = {
        instance: {},
        metatype: class FeatureHandler {},
      };

      // Feature flag required but settings is null
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue('someFeature');

      // Act
      const shouldRegister = (
        service as unknown as {
          shouldRegisterHandler: (
            wrapper: unknown,
            settings: BotSettings | null,
          ) => boolean;
        }
      ).shouldRegisterHandler(mockWrapper, null);

      // Assert
      expect(shouldRegister).toBe(false);
    });

    it('Skips handler registration when @RequiresFeature check fails', async () => {
      // Arrange
      class PaymentsHandler {}
      const mockModule = {
        providers: new Map([
          [
            'PaymentsHandler',
            {
              instance: new PaymentsHandler(),
              metatype: PaymentsHandler,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );

      // Mock feature flag to require paymentsEnabled (which is false)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue('paymentsEnabled');

      // Mock registerListeners to track calls
      const registerListenersSpy = jest
        .spyOn(
          service as unknown as {
            registerListeners: (bot: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act - settings has paymentsEnabled: false
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert - should NOT have called registerListeners since feature is disabled
      expect(registerListenersSpy).not.toHaveBeenCalled();
    });

    it('Registers handler when @RequiresFeature check passes', async () => {
      // Arrange
      class TrialHandler {}
      const mockModule = {
        providers: new Map([
          [
            'TrialHandler',
            {
              instance: new TrialHandler(),
              metatype: TrialHandler,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isUpdate to identify handler
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(true);

      // Mock @ForBot to return undefined (shared handler)
      (mockMetadataAccessor.getBotTargetMetadata as jest.Mock).mockReturnValue(
        undefined,
      );

      // Mock feature flag to require trialEnabled (which is true)
      (
        mockMetadataAccessor.getFeatureFlagMetadata as jest.Mock
      ).mockReturnValue('trialEnabled');

      // Mock registerListeners to track calls
      const registerListenersSpy = jest
        .spyOn(
          service as unknown as {
            registerListeners: (bot: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act - settings has trialEnabled: true
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert - should have called registerListeners since feature is enabled
      expect(registerListenersSpy).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Composer Registration
  // =============================================================================

  describe('Composer Registration', () => {
    // @Composer class scanning
    // ROI: 70 | Business Value: 7 (feature) | Frequency: 6
    // Behavior: Classes decorated with @Composer are discovered from shared handler modules
    // Verification: filterComposers returns correct wrappers
    // @category: core-functionality
    // @dependency: ModulesContainer, MetadataAccessorService
    // @complexity: medium
    it('discovers @Composer decorated classes from shared handler modules', () => {
      // Arrange
      const mockWrapper = {
        instance: { onUse: jest.fn() },
        metatype: class TestComposer {},
      };

      // Configure mock to identify @Composer decorated class
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(true);

      // Act
      const result = (
        service as unknown as { filterComposers: (wrapper: unknown) => unknown }
      ).filterComposers(mockWrapper);

      // Assert
      expect(result).toBe(mockWrapper);
      expect(mockMetadataAccessor.isComposer).toHaveBeenCalledWith(
        mockWrapper.metatype,
      );
    });

    it('filterComposers returns undefined for non-@Composer classes', () => {
      // Arrange
      const mockWrapper = {
        instance: { someMethod: jest.fn() },
        metatype: class RegularClass {},
      };

      // Configure mock to return false (not @Composer decorated)
      (mockMetadataAccessor.isComposer as jest.Mock).mockReturnValue(false);

      // Act
      const result = (
        service as unknown as { filterComposers: (wrapper: unknown) => unknown }
      ).filterComposers(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    it('filterComposers returns undefined when wrapper has no instance', () => {
      // Arrange
      const mockWrapper = {
        instance: undefined,
        metatype: class TestComposer {},
      };

      // Act
      const result = (
        service as unknown as { filterComposers: (wrapper: unknown) => unknown }
      ).filterComposers(mockWrapper);

      // Assert
      expect(result).toBeUndefined();
    });

    // @Composer stage middleware registration
    // ROI: 72 | Business Value: 8 (functionality) | Frequency: 6
    // Behavior: @Composer classes registered as stage middlewares via stage.use()
    // Verification: stage.use called with Composer instance
    // @category: core-functionality
    // @dependency: Scenes.Stage, Composer
    // @complexity: medium
    it('registers @Composer classes as stage middlewares', async () => {
      // Arrange
      class GuardComposer {
        onUse() {
          return;
        }
      }
      const mockModule = {
        providers: new Map([
          [
            'GuardComposer',
            {
              instance: new GuardComposer(),
              metatype: GuardComposer,
            },
          ],
        ]),
        imports: new Set(),
      };

      // Mock getModules to return our test module
      jest
        .spyOn(
          service as unknown as { getModules: () => unknown[] },
          'getModules',
        )
        .mockReturnValue([mockModule]);

      // Mock isComposer to identify our composer class
      (mockMetadataAccessor.isComposer as jest.Mock).mockImplementation(
        (metatype) => {
          return metatype === GuardComposer;
        },
      );
      (mockMetadataAccessor.isUpdate as jest.Mock).mockReturnValue(false);
      (mockMetadataAccessor.isScene as jest.Mock).mockReturnValue(false);

      // Mock registerListeners to prevent actual listener registration
      jest
        .spyOn(
          service as unknown as {
            registerListeners: (composer: unknown, wrapper: unknown) => void;
          },
          'registerListeners',
        )
        .mockImplementation(() => {});

      // Act
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings);

      // Assert - stage.use should be called with the composer middleware
      expect(mockStage.use).toHaveBeenCalled();
    });
  });
});
