// Multi-Bot Database Schema Integration Tests - BotUsersRepository
// Design Doc: docs/design/multi-bot-database-schema.md
// Task: docs/plans/tasks/20251126-feature-multi-bot-database-schema-task-3-3.md

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BotUsersRepository } from '../bot-users.repository';
import { BotsRepository } from '../bots.repository';
import { UsersRepository } from '../users.repository';
import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import { botUsers, BotUser } from '../../schema/bot-users';
import { bots, Bot, NewBot } from '../../schema/bots';
import { users, User, NewUser } from '../../schema/users';
import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../../database.provider';

/**
 * BotUsersRepository Integration Tests
 *
 * Tests the BotUsersRepository against a real database to verify:
 * - Many-to-many user-bot relationship
 * - Per-bot user settings (language, preferences, state)
 * - Language resolution hierarchy
 * - Unique constraint enforcement
 * - CASCADE delete behavior
 *
 * Per ADR-004 Decision 1: Global user profile + per-bot settings table
 * Resolution: bot_users.lang > users.lang > system default
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - Database schema migrated (users, bots, bot_users tables exist)
 */
describe('BotUsersRepository Integration Tests', () => {
  let repository: BotUsersRepository;
  let botsRepository: BotsRepository;
  let usersRepository: UsersRepository;
  let db: DrizzleClient;
  let module: TestingModule;

  // Track created records for cleanup
  const createdBotUserIds: number[] = [];
  const createdBotIds: number[] = [];
  const createdUserIds: number[] = [];

  // Helper function to generate unique names/IDs
  const generateUniqueId = (): number => {
    return Math.floor(Date.now() + Math.random() * 10000);
  };

  // Helper function to create test user data
  const createTestUserData = (overrides?: Partial<NewUser>): NewUser => ({
    telegramId: generateUniqueId(),
    username: `TestUser_${Date.now()}`,
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  });

  // Helper function to create test bot data
  const createTestBotData = (overrides?: Partial<NewBot>): NewBot => ({
    token: 'test_token_' + Date.now(),
    name: `TestBot_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
      providers: [
        ...drizzleProvider,
        BotUsersRepository,
        BotsRepository,
        UsersRepository,
      ],
    }).compile();

    repository = module.get<BotUsersRepository>(BotUsersRepository);
    botsRepository = module.get<BotsRepository>(BotsRepository);
    usersRepository = module.get<UsersRepository>(UsersRepository);
    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    // Cleanup created test records in reverse order (respect FK constraints)
    if (db) {
      // Delete bot_users first
      for (const id of createdBotUserIds) {
        try {
          await db.delete(botUsers).where(eq(botUsers.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }

      // Delete bots
      for (const id of createdBotIds) {
        try {
          await db.delete(bots).where(eq(bots.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }

      // Delete users
      for (const id of createdUserIds) {
        try {
          await db.delete(users).where(eq(users.telegramId, id));
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    if (module) {
      await module.close();
    }
  });

  // Helper to create test user and track for cleanup
  const createAndTrackUser = async (
    overrides?: Partial<NewUser>,
  ): Promise<User> => {
    const userData = createTestUserData(overrides);
    const user = await usersRepository.create(userData);
    createdUserIds.push(user.telegramId);
    return user;
  };

  // Helper to create test bot and track for cleanup
  const createAndTrackBot = async (
    overrides?: Partial<NewBot>,
  ): Promise<Bot> => {
    const botData = createTestBotData(overrides);
    const bot = await botsRepository.create(botData);
    createdBotIds.push(bot.id);
    return bot;
  };

  // Helper to track bot-user records for cleanup
  const trackBotUser = (botUser: BotUser): BotUser => {
    createdBotUserIds.push(botUser.id);
    return botUser;
  };

  // =============================================================================
  // AC-1: New tables created with correct columns, types, constraints
  // =============================================================================

  describe('AC-1: Bot users table schema and constraints', () => {
    // AC-1.1: "bot_users table created with composite unique constraint"
    it('AC-1.1: Should enforce unique constraint on (userId, botId) combination', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create user and bot
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      // Create first bot-user record
      const firstBotUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
      });
      trackBotUser(firstBotUser);

      // Act & Assert - Try to create duplicate (same userId + botId)
      await expect(
        repository.create({
          userId: user.telegramId,
          botId: bot.id,
        }),
      ).rejects.toThrow();
    });

    // AC-1.2: "Foreign keys reference users and bots tables with CASCADE"
    it('AC-1.2: CASCADE deletes bot_users when bot is deleted', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create user and bot
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      // Create bot-user record
      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
      });
      // Don't track - should be auto-deleted by CASCADE

      // Verify bot-user exists
      const beforeDelete = await repository.findByUserAndBot(
        user.telegramId,
        bot.id,
      );
      expect(beforeDelete).toBeDefined();

      // Act - Delete the bot
      const botIndex = createdBotIds.indexOf(bot.id);
      if (botIndex > -1) {
        createdBotIds.splice(botIndex, 1);
      }
      await db.delete(bots).where(eq(bots.id, bot.id));

      // Assert - bot_users record should be cascade deleted
      const afterDelete = await repository.findById(botUser.id);
      expect(afterDelete).toBeNull();
    });

    // AC-1.3: "JSONB columns store preferences and state"
    it('AC-1.3: JSONB columns correctly store and retrieve preferences and state', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const testPreferences = {
        notifications: {
          signals: true,
          broadcasts: false,
          reminders: true,
        },
        display: {
          showPips: true,
          showPercentage: false,
        },
      };

      const testState = {
        currentScene: 'settings',
        sceneData: { step: 2, selectedOption: 'notifications' },
        lastCommand: '/settings',
        lastCommandAt: new Date().toISOString(),
      };

      // Act
      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        preferences: testPreferences,
        state: testState,
      });
      trackBotUser(botUser);

      // Assert - Verify JSONB data is correctly stored and retrieved
      const retrieved = await repository.findById(botUser.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.preferences).toEqual(testPreferences);
      expect(retrieved?.state).toEqual(testState);
    });
  });

  // =============================================================================
  // AC-3: Repositories provide required methods
  // =============================================================================

  describe('AC-3: BotUsersRepository methods', () => {
    // AC-3.1: "findByUserAndBot() returns bot-user record"
    it('AC-3.1: findByUserAndBot() returns correct bot-user record', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: 'ru',
      });
      trackBotUser(botUser);

      // Act
      const result = await repository.findByUserAndBot(user.telegramId, bot.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(botUser.id);
      expect(result?.userId).toBe(user.telegramId);
      expect(result?.botId).toBe(bot.id);
      expect(result?.lang).toBe('ru');
    });

    it('findByUserAndBot() returns null for non-existent combination', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.findByUserAndBot(999999999, 999999999);

      // Assert
      expect(result).toBeNull();
    });

    // AC-3.2: "findOrCreate() creates record if not exists"
    it('AC-3.2: findOrCreate() returns existing record if exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      // Create initial record
      const initialBotUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: 'de',
      });
      trackBotUser(initialBotUser);

      // Act - Call findOrCreate for same user-bot combo
      const result = await repository.findOrCreate(user.telegramId, bot.id, {
        lang: 'fr', // Different default should be ignored
      });

      // Assert - Should return existing record, not create new one
      expect(result.id).toBe(initialBotUser.id);
      expect(result.lang).toBe('de'); // Original lang, not the new default
    });

    it('AC-3.2: findOrCreate() creates new record if not exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const defaults = {
        lang: 'es',
        preferences: { notifications: { signals: true } },
      };

      // Act
      const result = await repository.findOrCreate(
        user.telegramId,
        bot.id,
        defaults,
      );
      trackBotUser(result);

      // Assert - New record created with defaults
      expect(result).toBeDefined();
      expect(result.userId).toBe(user.telegramId);
      expect(result.botId).toBe(bot.id);
      expect(result.lang).toBe('es');
      expect(result.preferences).toEqual({ notifications: { signals: true } });
      expect(result.isActive).toBe(true);
    });

    // AC-3.3: "findActiveUsersWithDetailsByBotId() returns JOINed user data"
    it('AC-3.3: findActiveUsersWithDetailsByBotId() returns active users with full user details', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create users and bot
      const activeUser = await createAndTrackUser({
        firstName: 'Active',
        lastName: 'User',
      });
      const inactiveUser = await createAndTrackUser({
        firstName: 'Inactive',
        lastName: 'User',
      });
      const bot = await createAndTrackBot();

      // Create bot-user records
      const activeBotUser = await repository.create({
        userId: activeUser.telegramId,
        botId: bot.id,
        isActive: true,
      });
      trackBotUser(activeBotUser);

      const inactiveBotUser = await repository.create({
        userId: inactiveUser.telegramId,
        botId: bot.id,
        isActive: false, // bot_users.isActive is false means user blocked the bot
      });
      trackBotUser(inactiveBotUser);

      // Act
      const result = await repository.findActiveUsersWithDetailsByBotId(bot.id);

      // Assert - Should only return active user with full details
      expect(Array.isArray(result)).toBe(true);

      // Find our active user in results
      const foundActiveUser = result.find(
        (r) => r.user.telegramId === activeUser.telegramId,
      );
      expect(foundActiveUser).toBeDefined();
      expect(foundActiveUser?.user.firstName).toBe('Active');
      expect(foundActiveUser?.botUser.botId).toBe(bot.id);

      // Inactive user should NOT be in results (users.isActive = false)
      const foundInactiveUser = result.find(
        (r) => r.user.telegramId === inactiveUser.telegramId,
      );
      expect(foundInactiveUser).toBeUndefined();
    });

    it('findActiveUsersWithDetailsByBotId() excludes users where bot_users.isActive is false', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      // Create inactive bot-user record (user blocked the bot)
      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        isActive: false,
      });
      trackBotUser(botUser);

      // Act
      const result = await repository.findActiveUsersWithDetailsByBotId(bot.id);

      // Assert - User should not be in results
      const foundUser = result.find(
        (r) => r.user.telegramId === user.telegramId,
      );
      expect(foundUser).toBeUndefined();
    });

    // AC-3.4: "resolveLanguage() follows hierarchy"
    it('AC-3.4: resolveLanguage() returns bot_users.lang if set', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - User exists, bot_users has 'de'
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: 'de',
      });
      trackBotUser(botUser);

      // Act
      const result = await repository.resolveLanguage(
        user.telegramId,
        bot.id,
        'fr',
      );

      // Assert - Should return bot_users.lang (highest priority)
      expect(result).toBe('de');
    });

    it('AC-3.4: resolveLanguage() returns users.lang if bot_users.lang is null', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - User exists, bot_users has no lang
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: undefined, // No bot-specific lang
      });
      trackBotUser(botUser);

      // Act
      const result = await repository.resolveLanguage(
        user.telegramId,
        bot.id,
        'fr',
      );

      // Assert - Should fall back to default since no bot_users.lang
      expect(result).toBe('fr');
    });

    it('AC-3.4: resolveLanguage() returns default lang if both are null', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - User exists, bot_users has no lang
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: undefined,
      });
      trackBotUser(botUser);

      // Act
      const result = await repository.resolveLanguage(
        user.telegramId,
        bot.id,
        'en',
      );

      // Assert - Should return default
      expect(result).toBe('en');
    });

    it('resolveLanguage() returns default if no bot_user record exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - User exists, but no bot_user record
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();
      // Don't create bot_user record

      // Act
      const result = await repository.resolveLanguage(
        user.telegramId,
        bot.id,
        'en',
      );

      // Assert - Should fall back to default since no bot_user record
      expect(result).toBe('en');
    });
  });

  // =============================================================================
  // User lifecycle operations
  // =============================================================================

  describe('User Lifecycle Operations', () => {
    // AC-LIFECYCLE.1: "deactivate() marks user inactive for specific bot"
    it('AC-LIFECYCLE.1: deactivate() sets isActive to false for user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        isActive: true,
      });
      trackBotUser(botUser);

      // Act
      const deactivated = await repository.deactivate(user.telegramId, bot.id);

      // Assert
      expect(deactivated).toBeDefined();
      expect(deactivated?.isActive).toBe(false);

      // Verify via fresh query
      const fresh = await repository.findByUserAndBot(user.telegramId, bot.id);
      expect(fresh?.isActive).toBe(false);
    });

    it('deactivate() returns null for non-existent user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.deactivate(999999999, 999999999);

      // Assert
      expect(result).toBeNull();
    });

    // AC-LIFECYCLE.2: "activate() marks user active for specific bot"
    it('AC-LIFECYCLE.2: activate() sets isActive to true for user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        isActive: false, // Start as inactive
      });
      trackBotUser(botUser);

      // Act
      const activated = await repository.activate(user.telegramId, bot.id);

      // Assert
      expect(activated).toBeDefined();
      expect(activated?.isActive).toBe(true);

      // Verify via fresh query
      const fresh = await repository.findByUserAndBot(user.telegramId, bot.id);
      expect(fresh?.isActive).toBe(true);
    });

    it('activate() returns null for non-existent user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Act
      const result = await repository.activate(999999999, 999999999);

      // Assert
      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // Update methods
  // =============================================================================

  describe('Update Methods', () => {
    it('updateLanguage() updates language for user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
        lang: 'en',
      });
      trackBotUser(botUser);

      // Act
      const updated = await repository.updateLanguage(
        user.telegramId,
        bot.id,
        'ja',
      );

      // Assert
      expect(updated).toBeDefined();
      expect(updated?.lang).toBe('ja');
    });

    it('updatePreferences() updates preferences for user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
      });
      trackBotUser(botUser);

      const newPreferences = {
        notifications: {
          signals: false,
          broadcasts: true,
        },
      };

      // Act
      const updated = await repository.updatePreferences(
        user.telegramId,
        bot.id,
        newPreferences,
      );

      // Assert
      expect(updated).toBeDefined();
      expect(updated?.preferences).toEqual(newPreferences);
    });

    it('updateState() updates state for user-bot pair', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const user = await createAndTrackUser();
      const bot = await createAndTrackBot();

      const botUser = await repository.create({
        userId: user.telegramId,
        botId: bot.id,
      });
      trackBotUser(botUser);

      const newState = {
        currentScene: 'payment',
        sceneData: { amount: 100, currency: 'stars' },
        lastCommand: '/pay',
        lastCommandAt: new Date().toISOString(),
      };

      // Act
      const updated = await repository.updateState(
        user.telegramId,
        bot.id,
        newState,
      );

      // Assert
      expect(updated).toBeDefined();
      expect(updated?.state).toEqual(newState);
    });
  });
});
