// Unit Tests for DynamicTelegrafCoreModule.forRootAsync()
// Test Type: Unit Tests
// Focus: Verify async module configuration and provider setup

import { DynamicModule, Provider, Type } from '@nestjs/common';
import { DynamicTelegrafCoreModule } from '../../dynamic-telegraf-core.module';
import { DYNAMIC_TELEGRAF_MODULE_OPTIONS } from '../../telegraf.constants';
import {
  BOT_CONFIGURATION_PROVIDER,
  TelegrafDynamicModuleAsyncOptions,
  TelegrafDynamicModuleFactoryOptions,
  BotConfigurationProvider,
  DynamicBotConfig,
} from '../../interfaces';

// Mock bot configuration provider
class MockBotConfigProvider implements BotConfigurationProvider {
  async loadDynamicBots(): Promise<DynamicBotConfig[]> {
    return [];
  }
}

// Mock shared handler module
class MockSharedHandlerModule {}

describe('DynamicTelegrafCoreModule', () => {
  describe('forRoot()', () => {
    it('should return a DynamicModule with correct structure', () => {
      // Act
      const result = DynamicTelegrafCoreModule.forRoot({
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [MockSharedHandlerModule],
        webhookDomain: 'https://example.com',
      });

      // Assert
      expect(result.module).toBe(DynamicTelegrafCoreModule);
      expect(result.exports).toContain(DYNAMIC_TELEGRAF_MODULE_OPTIONS);
    });

    it('should include shared handler modules in imports', () => {
      // Act
      const result = DynamicTelegrafCoreModule.forRoot({
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [MockSharedHandlerModule],
        webhookDomain: 'https://example.com',
      });

      // Assert
      expect(result.imports).toContain(
        MockSharedHandlerModule as unknown as Type,
      );
    });
  });

  describe('forRootAsync()', () => {
    it('should return a DynamicModule with correct structure', () => {
      // Arrange
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [MockSharedHandlerModule],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      expect(result.module).toBe(DynamicTelegrafCoreModule);
      expect(result.exports).toContain(DYNAMIC_TELEGRAF_MODULE_OPTIONS);
    });

    it('should include shared handler modules in imports', () => {
      // Arrange
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [MockSharedHandlerModule],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      expect(result.imports).toContain(
        MockSharedHandlerModule as unknown as Type,
      );
    });

    it('should include additional imports from options', () => {
      // Arrange
      class ConfigModule {}
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [MockSharedHandlerModule],
        imports: [ConfigModule],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      expect(result.imports).toContain(ConfigModule);
    });

    it('should create BOT_CONFIGURATION_PROVIDER with useClass', () => {
      // Arrange
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      const botConfigProvider = result.providers?.find(
        (p): p is Provider & { provide: symbol | string; useClass: Type } =>
          typeof p === 'object' &&
          'provide' in p &&
          p.provide === BOT_CONFIGURATION_PROVIDER,
      );
      expect(botConfigProvider).toBeDefined();
      expect(botConfigProvider?.useClass).toBe(MockBotConfigProvider);
    });

    it('should create async options provider with useFactory', () => {
      // Arrange
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      const asyncProvider = result.providers?.find(
        (p): p is Provider & { provide: string; useFactory: Function } =>
          typeof p === 'object' &&
          'provide' in p &&
          p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
      );
      expect(asyncProvider).toBeDefined();
      expect(asyncProvider?.useFactory).toBeDefined();
    });

    it('should pass inject array to async options provider', () => {
      // Arrange
      class ConfigService {}
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [],
        inject: [ConfigService],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      const asyncProvider = result.providers?.find(
        (p): p is Provider & { provide: string; inject: unknown[] } =>
          typeof p === 'object' &&
          'provide' in p &&
          p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
      );
      expect(asyncProvider?.inject).toContain(ConfigService);
    });

    it('should use empty array when inject is not provided', () => {
      // Arrange
      const options: TelegrafDynamicModuleAsyncOptions = {
        botConfigProvider: MockBotConfigProvider,
        sharedHandlerModules: [],
        useFactory: () => ({
          webhookDomain: 'https://example.com',
        }),
      };

      // Act
      const result = DynamicTelegrafCoreModule.forRootAsync(options);

      // Assert
      const asyncProvider = result.providers?.find(
        (p): p is Provider & { provide: string; inject: unknown[] } =>
          typeof p === 'object' &&
          'provide' in p &&
          p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
      );
      expect(asyncProvider?.inject).toEqual([]);
    });

    describe('useFactory execution', () => {
      it('should combine factory options with static options', async () => {
        // Arrange
        const factoryOptions: TelegrafDynamicModuleFactoryOptions = {
          webhookDomain: 'https://async.example.com',
          globalMiddlewares: [],
        };

        const options: TelegrafDynamicModuleAsyncOptions = {
          botConfigProvider: MockBotConfigProvider,
          sharedHandlerModules: [MockSharedHandlerModule],
          imports: [],
          useFactory: () => factoryOptions,
        };

        // Act
        const result = DynamicTelegrafCoreModule.forRootAsync(options);
        const asyncProvider = result.providers?.find(
          (
            p,
          ): p is Provider & {
            provide: string;
            useFactory: (...args: unknown[]) => Promise<unknown>;
          } =>
            typeof p === 'object' &&
            'provide' in p &&
            p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
        );

        // Execute the factory
        const combinedOptions = await asyncProvider?.useFactory();

        // Assert
        expect(combinedOptions).toEqual({
          botConfigProvider: MockBotConfigProvider,
          sharedHandlerModules: [MockSharedHandlerModule],
          imports: [],
          webhookDomain: 'https://async.example.com',
          globalMiddlewares: [],
        });
      });

      it('should handle async factory function', async () => {
        // Arrange
        const options: TelegrafDynamicModuleAsyncOptions = {
          botConfigProvider: MockBotConfigProvider,
          sharedHandlerModules: [],
          useFactory: async () => {
            // Simulate async config loading
            await new Promise((resolve) => setTimeout(resolve, 10));
            return {
              webhookDomain: 'https://delayed.example.com',
            };
          },
        };

        // Act
        const result = DynamicTelegrafCoreModule.forRootAsync(options);
        const asyncProvider = result.providers?.find(
          (
            p,
          ): p is Provider & {
            provide: string;
            useFactory: (...args: unknown[]) => Promise<unknown>;
          } =>
            typeof p === 'object' &&
            'provide' in p &&
            p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
        );

        // Execute the factory
        const combinedOptions = await asyncProvider?.useFactory();

        // Assert
        expect(combinedOptions).toMatchObject({
          webhookDomain: 'https://delayed.example.com',
        });
      });

      it('should pass injected dependencies to factory', async () => {
        // Arrange
        const mockConfigValue = 'https://injected.example.com';
        const mockConfigService = {
          get: jest.fn().mockReturnValue(mockConfigValue),
        };

        const options: TelegrafDynamicModuleAsyncOptions = {
          botConfigProvider: MockBotConfigProvider,
          sharedHandlerModules: [],
          inject: ['ConfigService'],
          useFactory: (config: typeof mockConfigService) => ({
            webhookDomain: config.get('WEBHOOK_DOMAIN'),
          }),
        };

        // Act
        const result = DynamicTelegrafCoreModule.forRootAsync(options);
        const asyncProvider = result.providers?.find(
          (
            p,
          ): p is Provider & {
            provide: string;
            useFactory: (...args: unknown[]) => Promise<unknown>;
          } =>
            typeof p === 'object' &&
            'provide' in p &&
            p.provide === DYNAMIC_TELEGRAF_MODULE_OPTIONS,
        );

        // Execute the factory with mocked dependency
        const combinedOptions =
          await asyncProvider?.useFactory(mockConfigService);

        // Assert
        expect(mockConfigService.get).toHaveBeenCalledWith('WEBHOOK_DOMAIN');
        expect(combinedOptions).toMatchObject({
          webhookDomain: mockConfigValue,
        });
      });
    });
  });
});
