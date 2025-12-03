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
import { subscriptions } from '../../schema/subscriptions';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { subscriptionFeatures } from '../../schema/subscription-features';

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
  const createdSubscriptionIds: number[] = [];
  const createdUserSubscriptionIds: number[] = [];
  const createdSubscriptionFeatureIds: number[] = [];

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
        isActive: true,
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

  // Helper to create user subscription with specific botId
  const createUserSubscription = async (
    userId: number,
    subscriptionId: number,
    botId: number | null,
    expiresAt?: Date,
  ) => {
    const expiration =
      expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const result = await db
      .insert(userSubscriptions)
      .values({
        userId,
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
  // AC-003: findBySectorForBot(sector, null) returns ONLY users with botId IS NULL
  // =============================================================================

  describe('AC-003: findBySectorForBot with botId=null (static bot)', () => {
    it('AC-003: Should return ONLY users with botId IS NULL when botId is null', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create bot for comparison
      const dynamicBot = await createTestBot();

      // Create users
      const userStaticBot = await createTestUser();
      const userDynamicBot = await createTestUser();

      // Create subscription with 'crypto' sector
      const subscription = await createTestSubscription('crypto');

      // Create user subscription for static bot (botId = null)
      await createUserSubscription(
        userStaticBot.telegramId,
        subscription.id,
        null, // Static bot
      );

      // Create user subscription for dynamic bot (botId = N)
      await createUserSubscription(
        userDynamicBot.telegramId,
        subscription.id,
        dynamicBot.id,
      );

      // Act - Query for static bot users (botId = null)
      const result = await repository.findBySectorForBot('crypto', null);

      // Assert - Should only contain static bot user
      const resultUserIds = result.map((r) => r.userId);
      expect(resultUserIds).toContain(userStaticBot.telegramId);
      expect(resultUserIds).not.toContain(userDynamicBot.telegramId);
    });

    it('AC-003: Should return empty array when no users have botId IS NULL', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create bot and user
      const dynamicBot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription('forex');

      // Create user subscription only for dynamic bot
      await createUserSubscription(
        user.telegramId,
        subscription.id,
        dynamicBot.id,
      );

      // Act - Query for static bot users (botId = null)
      const result = await repository.findBySectorForBot('forex', null);

      // Assert - Should not contain dynamic bot user
      const resultUserIds = result.map((r) => r.userId);
      expect(resultUserIds).not.toContain(user.telegramId);
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
      const userStaticBot = await createTestUser();

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
      await createUserSubscription(
        userStaticBot.telegramId,
        subscription.id,
        null,
      );

      // Act - Query for bot1 users
      const result = await repository.findBySectorForBot('stocks', bot1.id);

      // Assert - Should only contain bot1 user
      const resultUserIds = result.map((r) => r.userId);
      expect(resultUserIds).toContain(userBot1.telegramId);
      expect(resultUserIds).not.toContain(userBot2.telegramId);
      expect(resultUserIds).not.toContain(userStaticBot.telegramId);
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
      const resultUserIds = result.map((r) => r.userId);
      expect(resultUserIds).not.toContain(user.telegramId);
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

      // Create inactive user subscription
      const result = await db
        .insert(userSubscriptions)
        .values({
          userId: user.telegramId,
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
      const resultUserIds = queryResult.map((r) => r.userId);
      expect(resultUserIds).not.toContain(user.telegramId);
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
      const resultUserIds = queryResult.map((r) => r.userId);
      expect(resultUserIds).not.toContain(user.telegramId);
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
      const userResult = result.find((r) => r.userId === user.telegramId);
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
      const userResult = result.find((r) => r.userId === user.telegramId);
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
      const resultUserIds = result.map((r) => r.userId);
      expect(resultUserIds).toContain(user.telegramId);
    });
  });

  // =============================================================================
  // Backward Compatibility: Existing findBySector method
  // =============================================================================

  describe('Backward Compatibility: findBySector method unchanged', () => {
    it('Should still work with existing findBySector method', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const user = await createTestUser();
      const subscription = await createTestSubscription('crypto');

      // Create user subscription (botId null for static bot)
      await createUserSubscription(user.telegramId, subscription.id, null);

      // Act - Use existing findBySector method
      const result = await repository.findBySector('crypto');

      // Assert - Should still return results (may include other test data)
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
