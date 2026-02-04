// Multi-Bot Signal Broadcasting Integration Tests - SubscriptionsRepository
// Design Doc: docs/design/multi-bot-signal-broadcasting-design.md
// Task: docs/plans/tasks/20251201-feature-multi-bot-signal-broadcasting-task-3-1.md

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';

import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import type { DrizzleClient } from '../../database.provider';
import { SubscriptionsRepository } from '../subscriptions.repository';
import { BotsRepository } from '../bots.repository';

import { bots, NewBot } from '../../schema/bots';
import { users } from '../../schema/users';
import { botUsers } from '../../schema/bot-users';
import { subscriptions } from '../../schema/subscriptions';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { subscriptionFeatures } from '../../schema/subscription-features';
import { userSubscriptionFeatures } from '../../schema/user-subscription-features';

/**
 * SubscriptionsRepository Integration Tests
 *
 * Tests the findBySectorForBot method for multi-bot signal broadcasting.
 * Per ADR-007 Decision 3: Per-bot user filtering with findBySectorForBot()
 *
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - Database schema migrated
 */
describe('SubscriptionsRepository Integration Tests', () => {
  let repository: SubscriptionsRepository;
  let botsRepository: BotsRepository;
  let db: DrizzleClient;
  let module: TestingModule;

  // Track created records for cleanup
  const createdBotIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdBotUserIds: number[] = [];
  const createdSubscriptionIds: number[] = [];
  const createdUserSubscriptionIds: number[] = [];
  const createdSubscriptionFeatureIds: number[] = [];
  const createdUserSubscriptionFeatureIds: number[] = [];

  // Helper function to generate unique names
  const generateUniqueName = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };

  // Helper function to create test bot data
  const createTestBot = async (overrides?: Partial<NewBot>) => {
    const bot = await botsRepository.create({
      token: 'test_token_' + Date.now() + Math.random(),
      name: generateUniqueName('TestBot'),
      isDynamic: true,
      isActive: true,
      ...overrides,
    });
    createdBotIds.push(bot.id);
    return bot;
  };

  // Helper function to create test user
  const createTestUser = async (telegramId?: number) => {
    const id = telegramId ?? Math.floor(Math.random() * 1000000000);
    const result = await db
      .insert(users)
      .values({
        telegramId: id,
        username: generateUniqueName('testuser'),
        firstName: 'Test',
      })
      .returning();
    createdUserIds.push(result[0].telegramId);
    return result[0];
  };

  // Helper function to create test subscription with tier_based_filtering feature
  const createTestSubscription = async (
    sector: string = '*',
    overrides?: Partial<typeof subscriptions.$inferInsert>,
  ) => {
    const result = await db
      .insert(subscriptions)
      .values({
        name: generateUniqueName('TestSubscription'),
        type: 'signals',
        isActive: true,
        ...overrides,
      })
      .returning();
    createdSubscriptionIds.push(result[0].id);

    // Add tier_based_filtering feature
    const featureResult = await db
      .insert(subscriptionFeatures)
      .values({
        subscriptionId: result[0].id,
        featureKey: 'tier_based_filtering',
        isEnabled: true,
        config: { sectors: [sector] },
      })
      .returning();
    createdSubscriptionFeatureIds.push(featureResult[0].id);

    return result[0];
  };

  // Helper to create bot_user record
  const createBotUser = async (userId: number, botId: number) => {
    const result = await db
      .insert(botUsers)
      .values({
        userId,
        botId,
        isActive: true,
      })
      .returning();
    createdBotUserIds.push(result[0].id);
    return result[0];
  };

  // Helper to create user subscription with specific botId
  // Now requires botUserId (from bot_users table) instead of userId
  const createUserSubscription = async (
    telegramId: number,
    subscriptionId: number,
    botId: number,
    expiresAt?: Date,
  ) => {
    // First create bot_user record
    const botUser = await createBotUser(telegramId, botId);

    const expiration =
      expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const result = await db
      .insert(userSubscriptions)
      .values({
        botUserId: botUser.id,
        subscriptionId,
        botId,
        isActive: true,
        expiresAt: expiration,
      })
      .returning();
    createdUserSubscriptionIds.push(result[0].id);
    return result[0];
  };

  // Helper to add custom_user_filtering feature to subscription
  const addCustomFilteringFeature = async (
    subscriptionId: number,
    isEnabled: boolean = true,
  ) => {
    const featureResult = await db
      .insert(subscriptionFeatures)
      .values({
        subscriptionId,
        featureKey: 'custom_user_filtering',
        isEnabled,
        config: {},
      })
      .returning();
    createdSubscriptionFeatureIds.push(featureResult[0].id);
    return featureResult[0];
  };

  // Helper to set user filter settings in user_subscription_features table
  const setUserFilterSettings = async (
    botUserId: number,
    settings: { symbols?: string[] },
    isActive: boolean = true,
  ) => {
    const result = await db
      .insert(userSubscriptionFeatures)
      .values({
        botUserId,
        featureKey: 'custom_user_filtering',
        settings,
        isActive,
      })
      .returning();
    createdUserSubscriptionFeatureIds.push(result[0].id);
    return result[0];
  };

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
      providers: [...drizzleProvider, SubscriptionsRepository, BotsRepository],
    }).compile();

    repository = module.get<SubscriptionsRepository>(SubscriptionsRepository);
    botsRepository = module.get<BotsRepository>(BotsRepository);
    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    if (db) {
      // Cleanup in reverse order of dependencies
      for (const id of createdUserSubscriptionFeatureIds) {
        try {
          await db
            .delete(userSubscriptionFeatures)
            .where(eq(userSubscriptionFeatures.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
      for (const id of createdSubscriptionFeatureIds) {
        try {
          await db
            .delete(subscriptionFeatures)
            .where(eq(subscriptionFeatures.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
      for (const id of createdUserSubscriptionIds) {
        try {
          await db
            .delete(userSubscriptions)
            .where(eq(userSubscriptions.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
      for (const id of createdSubscriptionIds) {
        try {
          await db.delete(subscriptions).where(eq(subscriptions.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
      for (const id of createdBotUserIds) {
        try {
          await db.delete(botUsers).where(eq(botUsers.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }
      for (const id of createdUserIds) {
        try {
          await db.delete(users).where(eq(users.telegramId, id));
        } catch {
          // Ignore cleanup errors
        }
      }
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

  // =============================================================================
  // AC-003: findBySectorForBot returns users for specific bot
  // Note: Static bot support (botId=null) has been removed in the new architecture
  // =============================================================================

  describe('AC-003: findBySectorForBot returns users for specific bot', () => {
    it('AC-003: Should return users subscribed to the specified bot', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create bots for comparison
      const bot1 = await createTestBot();
      const bot2 = await createTestBot();

      // Create users
      const userBot1 = await createTestUser();
      const userBot2 = await createTestUser();

      // Create subscription with 'crypto' sector
      const subscription = await createTestSubscription('crypto');

      // Create user subscriptions for different bots
      await createUserSubscription(
        userBot1.telegramId,
        subscription.id,
        bot1.id,
      );

      await createUserSubscription(
        userBot2.telegramId,
        subscription.id,
        bot2.id,
      );

      // Act - Query for bot1 users
      const result = await repository.findBySectorForBot('crypto', bot1.id);

      // Assert - Should only contain bot1 user
      const resultUserIds = result.map((r) => r.userTelegramId);
      expect(resultUserIds).toContain(String(userBot1.telegramId));
      expect(resultUserIds).not.toContain(String(userBot2.telegramId));
    });

    it('AC-003: Should return empty array when no users subscribed to specified bot', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create bots and user
      const bot1 = await createTestBot();
      const bot2 = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('forex');

      // Create user subscription only for bot1
      await createUserSubscription(user.telegramId, subscription.id, bot1.id);

      // Act - Query for bot2 users (no subscriptions)
      const result = await repository.findBySectorForBot('forex', bot2.id);

      // Assert - Should not contain bot1 user
      const resultUserIds = result.map((r) => r.userTelegramId);
      expect(resultUserIds).not.toContain(String(user.telegramId));
    });
  });

  // =============================================================================
  // AC-004: findBySectorForBot(sector, N) returns ONLY users with botId = N
  // =============================================================================

  describe('AC-004: findBySectorForBot with specific botId', () => {
    it('AC-004: Should return ONLY users with matching botId when botId is specified', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create two bots
      const bot1 = await createTestBot({ name: generateUniqueName('Bot1') });
      const bot2 = await createTestBot({ name: generateUniqueName('Bot2') });

      // Create users
      const userBot1 = await createTestUser();
      const userBot2 = await createTestUser();

      // Create subscription with 'stocks' sector
      const subscription = await createTestSubscription('stocks');

      // Create subscriptions for different bots
      await createUserSubscription(
        userBot1.telegramId,
        subscription.id,
        bot1.id,
      );
      await createUserSubscription(
        userBot2.telegramId,
        subscription.id,
        bot2.id,
      );

      // Act - Query for bot1 users
      const result = await repository.findBySectorForBot('stocks', bot1.id);

      // Assert - Should only contain bot1 user
      const resultUserIds = result.map((r) => r.userTelegramId);
      expect(resultUserIds).toContain(String(userBot1.telegramId));
      expect(resultUserIds).not.toContain(String(userBot2.telegramId));
    });

    it('AC-004: Should return empty array when no users have specified botId', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot1 = await createTestBot();
      const bot2 = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('commodities');

      // Create subscription only for bot1
      await createUserSubscription(user.telegramId, subscription.id, bot1.id);

      // Act - Query for bot2 users (no subscriptions)
      const result = await repository.findBySectorForBot(
        'commodities',
        bot2.id,
      );

      // Assert - Should not contain bot1 user
      const resultUserIds = result.map((r) => r.userTelegramId);
      expect(resultUserIds).not.toContain(String(user.telegramId));
    });
  });

  // =============================================================================
  // Additional Tests: Filters and Features
  // =============================================================================

  describe('findBySectorForBot: isActive and expiresAt filters', () => {
    it('Should exclude inactive subscriptions', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Create bot_user and inactive user subscription
      const botUser = await createBotUser(user.telegramId, bot.id);
      const result = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription.id,
          botId: bot.id,
          isActive: false, // Inactive
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();
      createdUserSubscriptionIds.push(result[0].id);

      // Act
      const queryResult = await repository.findBySectorForBot('crypto', bot.id);

      // Assert - Should not contain inactive user
      const resultUserIds = queryResult.map((r) => r.userTelegramId);
      expect(resultUserIds).not.toContain(String(user.telegramId));
    });

    it('Should exclude expired subscriptions', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Create expired user subscription
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await createUserSubscription(
        user.telegramId,
        subscription.id,
        bot.id,
        expiredDate,
      );

      // Act
      const queryResult = await repository.findBySectorForBot('crypto', bot.id);

      // Assert - Should not contain expired user
      const resultUserIds = queryResult.map((r) => r.userTelegramId);
      expect(resultUserIds).not.toContain(String(user.telegramId));
    });
  });

  describe('findBySectorForBot: hasCustomFiltering flag', () => {
    it('Should include hasCustomFiltering=true when custom_user_filtering is enabled', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Add custom_user_filtering feature enabled
      await addCustomFilteringFeature(subscription.id, true);

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Act
      const result = await repository.findBySectorForBot('crypto', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.hasCustomFiltering).toBe(true);
    });

    it('Should include hasCustomFiltering=false when custom_user_filtering is not enabled', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('forex');

      // No custom_user_filtering feature added

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Act
      const result = await repository.findBySectorForBot('forex', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.hasCustomFiltering).toBe(false);
    });
  });

  describe('findBySectorForBot: wildcard sector matching', () => {
    it('Should match subscriptions with wildcard sector (*)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();

      // Create subscription with wildcard sector
      const subscription = await createTestSubscription('*');

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Act - Query for any sector should match wildcard
      const result = await repository.findBySectorForBot('any_sector', bot.id);

      // Assert
      const resultUserIds = result.map((r) => r.userTelegramId);
      expect(resultUserIds).toContain(String(user.telegramId));
    });
  });

  // =============================================================================
  // filterSettings: Task 6 - Repository Extension for Signal Batching
  // Design Doc: signal-batching-design.md v1.4
  // =============================================================================

  describe('findBySectorForBot: filterSettings from user_subscription_features', () => {
    it('Should return filterSettings when user has custom filtering configured', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Enable custom_user_filtering feature at subscription level
      await addCustomFilteringFeature(subscription.id, true);

      // Create user subscription (which creates bot_user record)
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Get the botUserId from the recently created bot_user
      const botUserId = createdBotUserIds[createdBotUserIds.length - 1];

      // Set user-level filter settings
      await setUserFilterSettings(botUserId, {
        symbols: ['EURUSD', 'GBPUSD'],
      });

      // Act
      const result = await repository.findBySectorForBot('crypto', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.hasCustomFiltering).toBe(true);
      expect(userResult?.filterSettings).toEqual({
        symbols: ['EURUSD', 'GBPUSD'],
      });
    });

    it('Should return null filterSettings when user has no custom filtering configured', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('forex');

      // No custom_user_filtering feature enabled
      // No user filter settings set

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Act
      const result = await repository.findBySectorForBot('forex', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.hasCustomFiltering).toBe(false);
      expect(userResult?.filterSettings).toBeNull();
    });

    it('Should handle empty symbols array in filterSettings', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('stocks');

      // Enable custom_user_filtering feature
      await addCustomFilteringFeature(subscription.id, true);

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Get the botUserId from the recently created bot_user
      const botUserId = createdBotUserIds[createdBotUserIds.length - 1];

      // Set filter settings with empty symbols array
      await setUserFilterSettings(botUserId, { symbols: [] });

      // Act
      const result = await repository.findBySectorForBot('stocks', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.filterSettings).toEqual({ symbols: [] });
    });

    it('Should return null filterSettings when user_subscription_features is inactive', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('commodities');

      // Enable custom_user_filtering feature at subscription level
      await addCustomFilteringFeature(subscription.id, true);

      // Create user subscription
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Get the botUserId from the recently created bot_user
      const botUserId = createdBotUserIds[createdBotUserIds.length - 1];

      // Set filter settings but mark as inactive
      await setUserFilterSettings(
        botUserId,
        { symbols: ['BTCUSD'] },
        false, // is_active = false
      );

      // Act
      const result = await repository.findBySectorForBot('commodities', bot.id);

      // Assert
      const userResult = result.find(
        (r) => r.userTelegramId === String(user.telegramId),
      );
      expect(userResult).toBeDefined();
      expect(userResult?.hasCustomFiltering).toBe(true); // Subscription feature is enabled
      expect(userResult?.filterSettings).toBeNull(); // But user settings are inactive
    });
  });

  // =============================================================================
  // Backward Compatibility: Existing findBySector method
  // =============================================================================

  describe('Backward Compatibility: findBySector method unchanged', () => {
    it('Should still work with existing findBySector method', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Create user subscription with botId
      await createUserSubscription(user.telegramId, subscription.id, bot.id);

      // Act - Use existing findBySector method
      const result = await repository.findBySector('crypto');

      // Assert - Should still return results (may include other test data)
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
