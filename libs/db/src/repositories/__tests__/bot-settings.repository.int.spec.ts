// Multi-Bot Database Schema Integration Tests - BotSettingsRepository
// Design Doc: docs/design/multi-bot-database-schema.md
// Task: docs/plans/tasks/20251126-feature-multi-bot-database-schema-task-3-2.md

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BotSettingsRepository } from '../bot-settings.repository';
import { BotsRepository } from '../bots.repository';
import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import { bots, NewBot } from '../../schema/bots';
import {
  botSettings,
  BotSettings,
  PaymentSettings,
  DEFAULT_BOT_SETTINGS,
} from '../../schema/bot-settings';
import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../../database.provider';

/**
 * BotSettingsRepository Integration Tests
 *
 * Tests the BotSettingsRepository against a real database to verify:
 * - 1:1 relationship with bots table
 * - JSONB settings storage and retrieval
 * - Feature flag updates
 *
 * Per ADR-004 Decision 5: JSONB storage for flexible feature flags
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - Database schema migrated (bots and bot_settings tables exist)
 */
describe('BotSettingsRepository Integration Tests', () => {
  let repository: BotSettingsRepository;
  let botsRepository: BotsRepository;
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
    name: generateUniqueBotName('SettingsTestBot'),
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
      providers: [...drizzleProvider, BotSettingsRepository, BotsRepository],
    }).compile();

    repository = module.get<BotSettingsRepository>(BotSettingsRepository);
    botsRepository = module.get<BotsRepository>(BotsRepository);
    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    // Cleanup created test records (cascade will delete bot_settings)
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
  const trackBot = (botId: number): void => {
    createdBotIds.push(botId);
  };

  // =============================================================================
  // AC-1: New tables created with correct columns, types, constraints
  // =============================================================================

  describe('AC-1: Bot settings table schema and constraints', () => {
    // AC-1.1: "bot_settings table created with FK to bots"
    // ROI: 85 | Business Value: 9 (core infrastructure) | Frequency: 10
    // Behavior: Create bot_settings with valid botId -> Success, FK enforced
    // @category: core-functionality
    // @dependency: Database, Foreign Key constraints
    // @complexity: medium
    it('AC-1.1: Should create bot_settings with valid botId foreign key reference', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create a bot first
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

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

      // Act
      const created = await repository.upsert(bot.id, {
        settings: testSettings,
      });

      // Assert
      expect(created).toBeDefined();
      expect(created.botId).toBe(bot.id);
      expect(created.settings).toBeDefined();
      expect(created.settings.features.trialEnabled).toBe(true);
      expect(created.settings.features.paymentsEnabled).toBe(false);
    });

    // AC-1.2: "botId column has UNIQUE constraint (1:1 relationship)"
    // ROI: 80 | Business Value: 8 (data integrity) | Frequency: 8
    // Behavior: Create two settings for same bot -> Constraint violation error
    // @category: core-functionality
    // @dependency: Database constraints
    // @complexity: low
    it('AC-1.2: Should enforce 1:1 relationship with unique botId constraint', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create a bot and its settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      // Create first settings
      await repository.upsert(bot.id, {
        settings: DEFAULT_BOT_SETTINGS,
      });

      // Act & Assert - Direct insert should fail (upsert handles this, but raw insert should fail)
      await expect(
        db.insert(botSettings).values({
          botId: bot.id,
          settings: DEFAULT_BOT_SETTINGS,
        }),
      ).rejects.toThrow();
    });

    // AC-1.3: "CASCADE delete removes settings when bot deleted"
    // ROI: 78 | Business Value: 8 (referential integrity) | Frequency: 5
    // Behavior: Delete bot -> Associated settings automatically deleted
    // @category: core-functionality
    // @dependency: Database CASCADE
    // @complexity: medium
    it('AC-1.3: CASCADE delete removes bot_settings when parent bot is deleted', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with settings
      const bot = await botsRepository.create(createTestBotData());
      // Don't track - we'll delete it manually

      await repository.upsert(bot.id, {
        settings: DEFAULT_BOT_SETTINGS,
      });

      // Verify settings exist
      const settingsBeforeDelete = await repository.findByBotId(bot.id);
      expect(settingsBeforeDelete).not.toBeNull();

      // Act - Delete the bot
      await botsRepository.delete(bot.id);

      // Assert - Settings should be automatically deleted
      const settingsAfterDelete = await repository.findByBotId(bot.id);
      expect(settingsAfterDelete).toBeNull();
    });
  });

  // =============================================================================
  // AC-3: Repositories provide required methods
  // =============================================================================

  describe('AC-3: BotSettingsRepository methods', () => {
    // AC-3.1: "findByBotId() returns settings for specific bot"
    // ROI: 82 | Business Value: 9 (feature flag checks) | Frequency: 10
    // Behavior: Query by botId -> Returns settings JSONB or null
    // @category: core-functionality
    // @dependency: BotSettingsRepository, Database
    // @complexity: low
    it('AC-3.1: findByBotId() returns correct settings for bot', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

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
        ui: {
          welcomeImage: 'https://example.com/image.png',
          brandColor: '#FF5500',
        },
      };

      await repository.upsert(bot.id, { settings: testSettings });

      // Act
      const result = await repository.findByBotId(bot.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.botId).toBe(bot.id);
      expect((result?.settings as BotSettings).features.trialEnabled).toBe(
        false,
      );
      expect((result?.settings as BotSettings).features.paymentsEnabled).toBe(
        true,
      );
      expect((result?.settings as BotSettings).defaults.subscriptionDays).toBe(
        60,
      );
      expect((result?.settings as BotSettings).defaults.language).toBe('ru');
      expect((result?.settings as BotSettings).ui?.welcomeImage).toBe(
        'https://example.com/image.png',
      );
    });

    // Additional: findByBotId returns null for non-existent bot
    it('findByBotId() returns null for non-existent bot', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.findByBotId(999999999);

      // Assert
      expect(result).toBeNull();
    });

    // AC-3.2: "upsert() creates or updates settings atomically"
    // ROI: 85 | Business Value: 9 (admin operations) | Frequency: 7
    // Behavior: Upsert non-existent -> Creates; Upsert existing -> Updates
    // @category: core-functionality
    // @dependency: BotSettingsRepository, Database
    // @complexity: medium
    it('AC-3.2: upsert() creates new settings if not exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot without settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      // Verify no settings exist
      const beforeUpsert = await repository.findByBotId(bot.id);
      expect(beforeUpsert).toBeNull();

      const newSettings: BotSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: true,
          signalsEnabled: false,
          broadcastEnabled: false,
        },
        defaults: {
          subscriptionDays: 45,
          trialDays: 10,
          language: 'en',
        },
      };

      // Act
      const result = await repository.upsert(bot.id, { settings: newSettings });

      // Assert
      expect(result).toBeDefined();
      expect(result.botId).toBe(bot.id);
      expect(result.settings.features.signalsEnabled).toBe(false);
      expect(result.settings.defaults.subscriptionDays).toBe(45);
    });

    it('AC-3.2: upsert() updates settings if exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with initial settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      const initialSettings: BotSettings = {
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

      await repository.upsert(bot.id, { settings: initialSettings });

      // Updated settings
      const updatedSettings: BotSettings = {
        features: {
          trialEnabled: false,
          paymentsEnabled: true,
          signalsEnabled: true,
          broadcastEnabled: true,
        },
        defaults: {
          subscriptionDays: 90,
          trialDays: 21,
          language: 'ru',
        },
      };

      // Act
      const result = await repository.upsert(bot.id, {
        settings: updatedSettings,
      });

      // Assert - Should be updated, not duplicated
      expect(result).toBeDefined();
      expect(result.settings.features.trialEnabled).toBe(false);
      expect(result.settings.features.paymentsEnabled).toBe(true);
      expect(result.settings.features.broadcastEnabled).toBe(true);
      expect(result.settings.defaults.subscriptionDays).toBe(90);
      expect(result.settings.defaults.language).toBe('ru');

      // Verify only one record exists
      const allSettingsForBot = await db
        .select()
        .from(botSettings)
        .where(eq(botSettings.botId, bot.id));
      expect(allSettingsForBot.length).toBe(1);
    });

    // AC-1.1: FK violation on upsert for non-existent bot
    it('AC-1.1: upsert() throws on FK violation (non-existent bot)', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act & Assert - Should throw FK violation error
      await expect(
        repository.upsert(999999999, { settings: DEFAULT_BOT_SETTINGS }),
      ).rejects.toThrow();
    });

    // AC-3.3: "updateFeatureFlags() merges partial updates into JSONB"
    // ROI: 80 | Business Value: 8 (feature toggles) | Frequency: 6
    // Behavior: Update single feature flag -> Other flags preserved
    // @category: core-functionality
    // @dependency: BotSettingsRepository, JSONB operations
    // @complexity: medium
    it('AC-3.3: updateFeatureFlags() merges partial updates preserving existing settings', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with initial settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      const initialSettings: BotSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: true,
          signalsEnabled: true,
          broadcastEnabled: false,
        },
        defaults: {
          subscriptionDays: 30,
          trialDays: 7,
          language: 'en',
        },
      };

      await repository.upsert(bot.id, { settings: initialSettings });

      // Act - Update only some feature flags
      const result = await repository.updateFeatureFlags(bot.id, {
        broadcastEnabled: true,
        paymentsEnabled: false,
      });

      // Assert
      expect(result).not.toBeNull();
      expect((result?.settings as BotSettings).features.trialEnabled).toBe(
        true,
      ); // Preserved
      expect((result?.settings as BotSettings).features.signalsEnabled).toBe(
        true,
      ); // Preserved
      expect((result?.settings as BotSettings).features.broadcastEnabled).toBe(
        true,
      ); // Updated
      expect((result?.settings as BotSettings).features.paymentsEnabled).toBe(
        false,
      ); // Updated

      // Verify defaults are also preserved
      expect((result?.settings as BotSettings).defaults.subscriptionDays).toBe(
        30,
      );
      expect((result?.settings as BotSettings).defaults.trialDays).toBe(7);
      expect((result?.settings as BotSettings).defaults.language).toBe('en');
    });

    // Additional: updateFeatureFlags returns null for non-existent settings
    it('updateFeatureFlags() returns null for non-existent settings', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.updateFeatureFlags(999999999, {
        trialEnabled: false,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // JSONB storage verification
  // =============================================================================

  describe('JSONB Settings Storage', () => {
    // AC-JSONB.1: "DEFAULT_BOT_SETTINGS applied when not specified"
    // ROI: 75 | Business Value: 7 (developer experience) | Frequency: 8
    // Behavior: Create settings without explicit value -> Default settings applied
    // @category: edge-case
    // @dependency: Database, Schema defaults
    // @complexity: low
    it('AC-JSONB.1: Should apply DEFAULT_BOT_SETTINGS when settings not specified', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      // Act - Insert via raw insert without specifying settings (uses DB default)
      await db.insert(botSettings).values({
        botId: bot.id,
        // settings not specified - should use schema default
      });

      // Assert
      const result = await repository.findByBotId(bot.id);
      expect(result).not.toBeNull();
      expect((result?.settings as BotSettings).features.trialEnabled).toBe(
        DEFAULT_BOT_SETTINGS.features.trialEnabled,
      );
      expect((result?.settings as BotSettings).features.paymentsEnabled).toBe(
        DEFAULT_BOT_SETTINGS.features.paymentsEnabled,
      );
      expect((result?.settings as BotSettings).features.signalsEnabled).toBe(
        DEFAULT_BOT_SETTINGS.features.signalsEnabled,
      );
      expect((result?.settings as BotSettings).features.broadcastEnabled).toBe(
        DEFAULT_BOT_SETTINGS.features.broadcastEnabled,
      );
      expect((result?.settings as BotSettings).defaults.subscriptionDays).toBe(
        DEFAULT_BOT_SETTINGS.defaults.subscriptionDays,
      );
    });

    // AC-JSONB.2: "Settings JSONB structure matches BotSettings interface"
    // ROI: 78 | Business Value: 8 (type safety) | Frequency: 10
    // Behavior: Save and retrieve settings -> Structure matches interface
    // @category: integration
    // @dependency: BotSettingsRepository, TypeScript types
    // @complexity: medium
    it('AC-JSONB.2: Settings JSONB correctly serializes/deserializes BotSettings interface', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with complex settings
      const bot = await botsRepository.create(createTestBotData());
      trackBot(bot.id);

      const complexSettings: BotSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: true,
          signalsEnabled: false,
          broadcastEnabled: true,
        },
        defaults: {
          subscriptionDays: 365,
          trialDays: 30,
          language: 'de',
        },
        ui: {
          welcomeImage: 'https://cdn.example.com/welcome.png',
          brandColor: '#123456',
        },
      };

      const paymentSettings: PaymentSettings = {
        starsEnabled: true,
        minAmount: 100,
        maxAmount: 50000,
        refundWindowHours: 48,
      };

      // Act
      await repository.upsert(bot.id, {
        settings: complexSettings,
        paymentSettings: paymentSettings,
      });

      // Assert - Retrieve and verify complete structure
      const result = await repository.findByBotId(bot.id);
      expect(result).not.toBeNull();

      // Verify settings structure
      const settings = result?.settings as BotSettings;
      expect(settings).toEqual(complexSettings);
      expect(settings.features.trialEnabled).toBe(true);
      expect(settings.features.broadcastEnabled).toBe(true);
      expect(settings.defaults.subscriptionDays).toBe(365);
      expect(settings.ui?.welcomeImage).toBe(
        'https://cdn.example.com/welcome.png',
      );
      expect(settings.ui?.brandColor).toBe('#123456');

      // Verify payment settings structure
      const payment = result?.paymentSettings as PaymentSettings;
      expect(payment).toEqual(paymentSettings);
      expect(payment.starsEnabled).toBe(true);
      expect(payment.minAmount).toBe(100);
      expect(payment.maxAmount).toBe(50000);
      expect(payment.refundWindowHours).toBe(48);
    });
  });
});
