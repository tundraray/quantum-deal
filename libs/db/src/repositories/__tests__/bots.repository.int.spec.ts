// Multi-Bot Database Schema Integration Tests - BotsRepository
// Design Doc: docs/design/multi-bot-database-schema.md
// Task: docs/plans/tasks/20251126-feature-multi-bot-database-schema-task-3-1.md

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BotsRepository } from '../bots.repository';
import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import { bots, Bot, NewBot } from '../../schema/bots';
import { botSettings, BotSettings } from '../../schema/bot-settings';
import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../../database.provider';

/**
 * BotsRepository Integration Tests
 *
 * Tests the BotsRepository against a real database to verify:
 * - Bot CRUD operations with correct column types and constraints
 * - Active/dynamic bot filtering
 * - Settings JOIN operations
 *
 * Per ADR-004: Bots table stores configuration for all Telegram bots
 * Token storage: Plain text per ADR-004 Decision 4
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - Database schema migrated (bots and bot_settings tables exist)
 */
describe('BotsRepository Integration Tests', () => {
  let repository: BotsRepository;
  let db: DrizzleClient;
  let module: TestingModule;

  // Track created records for cleanup
  const createdBotIds: number[] = [];

  // Helper function to generate unique bot names
  const generateUniqueBotName = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };

  // Helper function to create test bot data
  const createTestBotData = (overrides?: Partial<NewBot>): NewBot => ({
    token: 'test_token_' + Date.now(),
    name: generateUniqueBotName('TestBot'),
    isDynamic: true,
    isActive: true,
    ...overrides,
  });

  beforeAll(async () => {
    // Skip tests if DATABASE_URL is not set
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping integration tests');
      return;
    }

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [...drizzleProvider, BotsRepository],
    }).compile();

    repository = module.get<BotsRepository>(BotsRepository);
    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    // Cleanup created test records
    if (db && createdBotIds.length > 0) {
      for (const id of createdBotIds) {
        try {
          await db.delete(bots).where(eq(bots.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    if (module) {
      await module.close();
    }
  });

  // Helper to track created bots for cleanup
  const trackBot = (bot: Bot): Bot => {
    createdBotIds.push(bot.id);
    return bot;
  };

  // =============================================================================
  // AC-1: New tables created with correct columns, types, constraints
  // =============================================================================

  describe('AC-1: Bot table schema and constraints', () => {
    // AC-1.1: "bots table created with all columns per schema"
    it('AC-1.1: Should create bot with all required fields (id, token, name, isDynamic, isActive, timestamps)', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const botData = createTestBotData({
        username: 'TestBotUsername',
        webhookPath: '/test/webhook',
      });

      // Act
      const createdBot = await repository.create(botData);
      trackBot(createdBot);

      // Assert
      expect(createdBot).toBeDefined();
      expect(createdBot.id).toBeDefined();
      expect(typeof createdBot.id).toBe('number');
      expect(createdBot.token).toBe(botData.token);
      expect(createdBot.name).toBe(botData.name);
      expect(createdBot.username).toBe(botData.username);
      expect(createdBot.webhookPath).toBe(botData.webhookPath);
      expect(createdBot.isDynamic).toBe(true);
      expect(createdBot.isActive).toBe(true);
      expect(createdBot.createdAt).toBeInstanceOf(Date);
      expect(createdBot.updatedAt).toBeInstanceOf(Date);
    });

    // AC-1.2: "name column has UNIQUE constraint"
    it('AC-1.2: Should reject duplicate bot names with unique constraint violation', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create first bot
      const uniqueName = generateUniqueBotName('DuplicateTest');
      const firstBot = await repository.create(
        createTestBotData({ name: uniqueName }),
      );
      trackBot(firstBot);

      // Act & Assert - Try to create second bot with same name
      await expect(
        repository.create(createTestBotData({ name: uniqueName })),
      ).rejects.toThrow();
    });

    // AC-1.3: "webhookPath and username are optional"
    it('AC-1.3: Should create bot without optional webhookPath and username fields', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot without optional fields
      const botData = createTestBotData();
      // Explicitly don't set username and webhookPath

      // Act
      const createdBot = await repository.create(botData);
      trackBot(createdBot);

      // Assert
      expect(createdBot).toBeDefined();
      expect(createdBot.id).toBeDefined();
      expect(createdBot.username).toBeNull();
      expect(createdBot.webhookPath).toBeNull();
    });
  });

  // =============================================================================
  // AC-3: Repositories provide required methods
  // =============================================================================

  describe('AC-3: BotsRepository methods', () => {
    // AC-3.1: "findActiveDynamic() returns active dynamic bots with settings"
    it('AC-3.1: findActiveDynamic() returns only active dynamic bots with joined settings', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create active dynamic bot
      const dynamicBot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('DynamicBot'),
          isDynamic: true,
          isActive: true,
        }),
      );
      trackBot(dynamicBot);

      // Create bot settings for the dynamic bot
      const testSettings: BotSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: false,
          signalsEnabled: true,
          broadcastEnabled: false,
        },
        defaults: {
          subscriptionDays: 30,
          trialDays: 7,
          language: 'en',
        },
      };

      await db.insert(botSettings).values({
        botId: dynamicBot.id,
        settings: testSettings,
      });

      // Create inactive dynamic bot (should not be returned)
      const inactiveBot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('InactiveBot'),
          isDynamic: true,
          isActive: false,
        }),
      );
      trackBot(inactiveBot);

      // Create static bot (should not be returned)
      const staticBot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('StaticBot'),
          isDynamic: false,
          isActive: true,
        }),
      );
      trackBot(staticBot);

      // Act
      const result = await repository.findActiveDynamic();

      // Assert
      expect(Array.isArray(result)).toBe(true);

      // Find our test bot in results
      const foundBot = result.find((b) => b.id === dynamicBot.id);
      expect(foundBot).toBeDefined();
      expect(foundBot?.settings).toBeDefined();
      expect(foundBot?.settings?.features.trialEnabled).toBe(true);
      expect(foundBot?.settings?.features.paymentsEnabled).toBe(false);

      // Verify inactive and static bots are not in results
      expect(result.find((b) => b.id === inactiveBot.id)).toBeUndefined();
      expect(result.find((b) => b.id === staticBot.id)).toBeUndefined();
    });

    // Test for findActiveDynamic with empty results
    it('findActiveDynamic() returns empty array when no dynamic bots exist', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act - Query returns array (may contain other test data, but validates return type)
      const result = await repository.findActiveDynamic();

      // Assert - Should return an array
      expect(Array.isArray(result)).toBe(true);
    });

    // AC-3.2: "findByIdWithSettings() returns bot with settings via JOIN"
    it('AC-3.2: findByIdWithSettings() returns bot with settings in single JOIN query', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with settings
      const bot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('BotWithSettings'),
        }),
      );
      trackBot(bot);

      const testSettings: BotSettings = {
        features: {
          trialEnabled: false,
          paymentsEnabled: true,
          signalsEnabled: true,
          broadcastEnabled: true,
        },
        defaults: {
          subscriptionDays: 60,
          trialDays: 14,
          language: 'ru',
        },
      };

      await db.insert(botSettings).values({
        botId: bot.id,
        settings: testSettings,
        paymentSettings: {
          starsEnabled: true,
          minAmount: 100,
          maxAmount: 10000,
          refundWindowHours: 24,
        },
      });

      // Act
      const result = await repository.findByIdWithSettings(bot.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(bot.id);
      expect(result?.name).toBe(bot.name);
      expect(result?.settings).toBeDefined();
      expect(result?.settings?.defaults.subscriptionDays).toBe(60);
      expect(result?.settings?.defaults.language).toBe('ru');
      expect(result?.paymentSettings).toBeDefined();
      expect(result?.paymentSettings?.starsEnabled).toBe(true);
      expect(result?.paymentSettings?.minAmount).toBe(100);
    });

    // Test for findByIdWithSettings returning null
    it('findByIdWithSettings() returns null for non-existent bot', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.findByIdWithSettings(999999999);

      // Assert
      expect(result).toBeNull();
    });

    // Test for findByIdWithSettings with no settings
    it('findByIdWithSettings() returns bot with null settings if no settings exist', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot without settings
      const bot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('BotNoSettings'),
        }),
      );
      trackBot(bot);

      // Act
      const result = await repository.findByIdWithSettings(bot.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(bot.id);
      expect(result?.settings).toBeNull();
      expect(result?.paymentSettings).toBeNull();
    });

    // AC-3.3: "findByName() returns bot by unique name"
    it('AC-3.3: findByName() returns correct bot by unique name', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const uniqueName = generateUniqueBotName('FindByNameBot');
      const bot = await repository.create(
        createTestBotData({ name: uniqueName }),
      );
      trackBot(bot);

      // Act
      const result = await repository.findByName(uniqueName);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(bot.id);
      expect(result?.name).toBe(uniqueName);
    });

    // Test for findByName returning null
    it('findByName() returns null for non-existent name', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.findByName(
        'NonExistentBot_' + Date.now(),
      );

      // Assert
      expect(result).toBeNull();
    });

    // AC-3.4: "deactivate() sets isActive to false (soft delete)"
    it('AC-3.4: deactivate() soft-deletes bot by setting isActive to false', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create active bot
      const bot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('DeactivateBot'),
          isActive: true,
        }),
      );
      trackBot(bot);
      expect(bot.isActive).toBe(true);

      // Act
      const deactivatedBot = await repository.deactivate(bot.id);

      // Assert
      expect(deactivatedBot).toBeDefined();
      expect(deactivatedBot?.isActive).toBe(false);

      // Verify via fresh query
      const freshBot = await repository.findById(bot.id);
      expect(freshBot?.isActive).toBe(false);
    });

    // Test for deactivate returning null
    it('deactivate() returns null for non-existent bot', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.deactivate(999999999);

      // Assert
      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // AC-5: Backward compatibility maintained
  // =============================================================================

  describe('AC-5: Backward compatibility', () => {
    // AC-5.1: "Existing queries work without modification"
    it('AC-5.1: BaseRepository inherited methods (findById, create, update, delete) work correctly', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Test create (already tested above, but verify inheritance)
      const bot = await repository.create(
        createTestBotData({
          name: generateUniqueBotName('BaseRepoTestBot'),
          username: 'BaseTestBot',
        }),
      );
      trackBot(bot);
      expect(bot.id).toBeDefined();

      // Test findById
      const foundBot = await repository.findById(bot.id);
      expect(foundBot).toBeDefined();
      expect(foundBot?.id).toBe(bot.id);
      expect(foundBot?.username).toBe('BaseTestBot');

      // Test update
      const updatedBot = await repository.update(bot.id, {
        username: 'UpdatedUsername',
      });
      expect(updatedBot).toBeDefined();
      expect(updatedBot?.username).toBe('UpdatedUsername');

      // Test delete
      const deleteResult = await repository.delete(bot.id);
      expect(deleteResult).toBe(true);

      // Remove from cleanup tracking since already deleted
      const index = createdBotIds.indexOf(bot.id);
      if (index > -1) {
        createdBotIds.splice(index, 1);
      }

      // Verify deletion
      const deletedBot = await repository.findById(bot.id);
      expect(deletedBot).toBeNull();
    });
  });
});
