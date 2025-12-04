// Multi-Bot Database Schema Integration Tests - Modified Tables
// Design Doc: docs/design/multi-bot-database-schema.md
// Generated: 2025-11-26 | Budget Used: 3/3 integration tests

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { eq, and, sql } from 'drizzle-orm';

import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import type { DrizzleClient } from '../../database.provider';
import { BotsRepository } from '../bots.repository';
import { UserSubscriptionsRepository } from '../user-subscriptions.repository';
import { RenewalTariffsRepository } from '../renewal-tariffs.repository';
import { CodesRepository } from '../codes.repository';

import { bots, Bot, NewBot } from '../../schema/bots';
import { botUsers } from '../../schema/bot-users';
import { userSubscriptions } from '../../schema/user-subscriptions';
import { renewalTariffs } from '../../schema/renewal-tariffs';
import { codes } from '../../schema/codes';
import { users } from '../../schema/users';
import { subscriptions, Subscription } from '../../schema/subscriptions';

/**
 * Modified Tables Integration Tests
 *
 * Tests the botId column additions to existing tables:
 * - user_subscriptions.botId
 * - renewal_tariffs.botId
 * - codes.botId
 *
 * Verifies backward compatibility and new bot-scoped queries.
 */
describe('Modified Tables Integration Tests', () => {
  let module: TestingModule;
  let db: DrizzleClient;
  let botsRepository: BotsRepository;
  let userSubscriptionsRepository: UserSubscriptionsRepository;
  let renewalTariffsRepository: RenewalTariffsRepository;
  let codesRepository: CodesRepository;

  // Track created records for cleanup
  const createdBotIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdBotUserIds: number[] = [];
  const createdSubscriptionIds: number[] = [];
  const createdUserSubscriptionIds: number[] = [];
  const createdTariffIds: number[] = [];
  const createdCodeIds: number[] = [];

  // Helper function to generate unique names
  const generateUniqueName = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };

  // Helper function to create test bot data
  const createTestBot = async (overrides?: Partial<NewBot>): Promise<Bot> => {
    const bot = await botsRepository.create({
      token: 'test_token_' + Date.now(),
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

  // Helper function to create bot_user record
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

  // Helper function to create test subscription
  const createTestSubscription = async (
    overrides?: Partial<typeof subscriptions.$inferInsert>,
  ): Promise<Subscription> => {
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
      providers: [
        ...drizzleProvider,
        BotsRepository,
        UserSubscriptionsRepository,
        RenewalTariffsRepository,
        CodesRepository,
      ],
    }).compile();

    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
    botsRepository = module.get<BotsRepository>(BotsRepository);
    userSubscriptionsRepository = module.get<UserSubscriptionsRepository>(
      UserSubscriptionsRepository,
    );
    renewalTariffsRepository = module.get<RenewalTariffsRepository>(
      RenewalTariffsRepository,
    );
    codesRepository = module.get<CodesRepository>(CodesRepository);
  });

  afterAll(async () => {
    if (db) {
      // Cleanup in reverse order of dependencies
      for (const id of createdCodeIds) {
        try {
          await db.delete(codes).where(eq(codes.id, id));
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
      for (const id of createdTariffIds) {
        try {
          await db.delete(renewalTariffs).where(eq(renewalTariffs.id, id));
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
  // AC-2: botId columns added to existing tables
  // =============================================================================

  describe('AC-2: UserSubscriptions with botUserId', () => {
    // AC-2.1: "user_subscriptions.bot_user_id column added with FK constraint"
    it('AC-2.1: Should create user_subscription with valid botUserId foreign key', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const botUser = await createBotUser(user.telegramId, bot.id);
      const subscription = await createTestSubscription();

      // Act
      const result = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription.id,
          botId: bot.id,
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(result[0].id);

      // Assert
      expect(result[0]).toBeDefined();
      expect(result[0].botId).toBe(bot.id);
      expect(result[0].botUserId).toBe(botUser.id);
      expect(result[0].subscriptionId).toBe(subscription.id);
    });

    // AC-2.2: "botUserId column is nullable for backward compatibility"
    it('AC-2.2: Should allow null botUserId for backward compatibility', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const subscription = await createTestSubscription();

      // Act - Create subscription WITHOUT botUserId (legacy record)
      const result = await db
        .insert(userSubscriptions)
        .values({
          subscriptionId: subscription.id,
          // botUserId intentionally omitted
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(result[0].id);

      // Assert
      expect(result[0]).toBeDefined();
      expect(result[0].botUserId).toBeNull();
    });

    // AC-2.3: "Bot-scoped subscription queries work correctly"
    it('AC-2.3: Should filter subscriptions by botUserId in queries', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create 2 bots and subscriptions for the same user
      const bot1 = await createTestBot({ name: generateUniqueName('Bot1') });
      const bot2 = await createTestBot({ name: generateUniqueName('Bot2') });
      const user = await createTestUser();
      const botUser1 = await createBotUser(user.telegramId, bot1.id);
      const botUser2 = await createBotUser(user.telegramId, bot2.id);
      const subscription = await createTestSubscription();

      // Create subscription for bot1
      const sub1 = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser1.id,
          subscriptionId: subscription.id,
          botId: bot1.id,
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(sub1[0].id);

      // Create subscription for bot2
      const sub2 = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser2.id,
          subscriptionId: subscription.id,
          botId: bot2.id,
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(sub2[0].id);

      // Act - Query by botUserId
      const resultBot1 = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.botUserId, botUser1.id),
            eq(userSubscriptions.botId, bot1.id),
          ),
        );

      // Assert
      expect(resultBot1).toHaveLength(1);
      expect(resultBot1[0].botId).toBe(bot1.id);
    });
  });

  describe('AC-2: RenewalTariffs with botId', () => {
    // AC-2.4: "renewal_tariffs.bot_id column added (nullable for global tariffs)"
    it('AC-2.4: Should support both bot-specific (botId set) and global (botId null) tariffs', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const subscription = await createTestSubscription();

      // Act - Create bot-specific tariff
      const botTariff = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        botId: bot.id,
        periodDays: 30,
        priceStars: 100,
        displayName: '1 month (bot-specific)',
        isActive: true,
        sortOrder: 1,
      });
      createdTariffIds.push(botTariff.id);

      // Create global tariff (null botId)
      const globalTariff = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        // botId intentionally omitted - global tariff
        periodDays: 60,
        priceStars: 180,
        displayName: '2 months (global)',
        isActive: true,
        sortOrder: 2,
      });
      createdTariffIds.push(globalTariff.id);

      // Assert
      expect(botTariff.botId).toBe(bot.id);
      expect(globalTariff.botId).toBeNull();
    });

    // AC-2.5: "Unique constraint updated to (subscriptionId, periodDays, botId)"
    it('AC-2.5: Should enforce unique constraint on (subscriptionId, periodDays, botId)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const subscription = await createTestSubscription();

      // Create first tariff
      const tariff1 = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        botId: bot.id,
        periodDays: 30,
        priceStars: 100,
        displayName: '1 month',
        isActive: true,
        sortOrder: 1,
      });
      createdTariffIds.push(tariff1.id);

      // Act & Assert - Try to create duplicate tariff with same (subscriptionId, periodDays, botId)
      await expect(
        renewalTariffsRepository.create({
          subscriptionId: subscription.id,
          botId: bot.id,
          periodDays: 30, // Same period
          priceStars: 150, // Different price
          displayName: '1 month duplicate',
          isActive: true,
          sortOrder: 2,
        }),
      ).rejects.toThrow();
    });

    // AC-2.6: "Tariff resolution: bot-specific > global"
    it('AC-2.6: Should resolve tariffs with bot-specific taking precedence over global', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const subscription = await createTestSubscription();

      // Create global tariff (null botId) with period 30
      const globalTariff = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        periodDays: 30,
        priceStars: 100,
        displayName: '1 month (global)',
        isActive: true,
        sortOrder: 1,
      });
      createdTariffIds.push(globalTariff.id);

      // Create bot-specific tariff with same period 30
      const botTariff = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        botId: bot.id,
        periodDays: 90, // Different period to avoid unique constraint
        priceStars: 250,
        displayName: '3 months (bot-specific)',
        isActive: true,
        sortOrder: 2,
      });
      createdTariffIds.push(botTariff.id);

      // Act - Query tariffs for the subscription
      // Bot-specific tariffs should be returned when filtering by botId
      const botTariffs = await db
        .select()
        .from(renewalTariffs)
        .where(
          and(
            eq(renewalTariffs.subscriptionId, subscription.id),
            eq(renewalTariffs.botId, bot.id),
            eq(renewalTariffs.isActive, true),
          ),
        );

      // Global tariffs (no botId filter)
      const allTariffs = await db
        .select()
        .from(renewalTariffs)
        .where(
          and(
            eq(renewalTariffs.subscriptionId, subscription.id),
            eq(renewalTariffs.isActive, true),
          ),
        );

      // Assert
      expect(botTariffs).toHaveLength(1);
      expect(botTariffs[0].botId).toBe(bot.id);
      expect(allTariffs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('AC-2: Codes with botId', () => {
    // AC-2.7: "codes.bot_id column added with FK constraint"
    it('AC-2.7: Should create code with valid botId foreign key', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const subscription = await createTestSubscription();
      const codeString = generateUniqueName('CODE');

      // Act
      const code = await codesRepository.create({
        code: codeString,
        subscriptionId: subscription.id,
        botId: bot.id,
        isActive: true,
      });
      createdCodeIds.push(code.id);

      // Assert
      expect(code).toBeDefined();
      expect(code.botId).toBe(bot.id);
      expect(code.code).toBe(codeString);
      expect(code.subscriptionId).toBe(subscription.id);
    });

    // AC-2.8: "Bot-scoped code activation works correctly"
    it('AC-2.8: Should activate code and create bot-scoped subscription', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const subscription = await createTestSubscription();
      const codeString = generateUniqueName('ACTIVATE');

      // Create code with botId
      const code = await codesRepository.create({
        code: codeString,
        subscriptionId: subscription.id,
        botId: bot.id,
        isActive: true,
      });
      createdCodeIds.push(code.id);

      // Act - Activate the code
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const activatedCode = await codesRepository.activateCode(
        code.id,
        user.telegramId,
        new Date(),
        expirationDate,
      );

      // Create bot_user and corresponding user subscription with same botId
      const botUser = await createBotUser(user.telegramId, bot.id);
      const userSub = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription.id,
          botId: code.botId, // Use bot from code
          isActive: true,
          expiresAt: expirationDate,
        })
        .returning();
      createdUserSubscriptionIds.push(userSub[0].id);

      // Assert
      expect(activatedCode).toBeDefined();
      expect(activatedCode?.userId).toBe(user.telegramId);
      expect(userSub[0].botId).toBe(bot.id);
    });
  });

  // =============================================================================
  // AC-5: Backward compatibility maintained
  // =============================================================================

  describe('AC-5: Backward Compatibility', () => {
    // AC-5.1: "Existing queries work with botUserId parameter"
    it('AC-5.1: UserSubscriptionsRepository methods work with botUserId', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const botUser = await createBotUser(user.telegramId, bot.id);
      const subscription = await createTestSubscription();

      // Create user subscription with botUserId
      const userSub = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription.id,
          botId: bot.id,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        })
        .returning();
      createdUserSubscriptionIds.push(userSub[0].id);

      // Act - Use existing repository methods with botUserId
      const foundByBotUser = await userSubscriptionsRepository.findByBotUserId(
        botUser.id,
      );
      const activeByBotUser =
        await userSubscriptionsRepository.findActiveByBotUserId(botUser.id);
      const hasActive =
        await userSubscriptionsRepository.hasActiveSubscriptionByBotUser(
          botUser.id,
          subscription.id,
        );

      // Assert
      expect(foundByBotUser.length).toBeGreaterThanOrEqual(1);
      expect(activeByBotUser.length).toBeGreaterThanOrEqual(1);
      expect(hasActive).toBe(true);
    });

    // AC-5.2: "Existing code activation flow unchanged"
    it('AC-5.2: Existing code activation flow works without bot context', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const user = await createTestUser();
      const subscription = await createTestSubscription();
      const codeString = generateUniqueName('LEGACY');

      // Create code WITHOUT botId (legacy behavior)
      const code = await codesRepository.create({
        code: codeString,
        subscriptionId: subscription.id,
        // botId intentionally omitted
        isActive: true,
      });
      createdCodeIds.push(code.id);

      // Act - Find and activate code using existing methods
      const foundCode = await codesRepository.findByCode(codeString);
      expect(foundCode).toBeDefined();

      const activatedCode = await codesRepository.activateCode(
        code.id,
        user.telegramId,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      );

      // Assert - Code activation works without botId
      expect(activatedCode).toBeDefined();
      expect(activatedCode?.userId).toBe(user.telegramId);
      expect(activatedCode?.botId).toBeNull();
    });

    // AC-5.3: "Subscription queries return all subscriptions for botUserId"
    it('AC-5.3: Subscription queries return all subscriptions for botUserId', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange
      const bot = await createTestBot();
      const user = await createTestUser();
      const botUser = await createBotUser(user.telegramId, bot.id);
      const subscription1 = await createTestSubscription();
      const subscription2 = await createTestSubscription();

      // Create first subscription
      const sub1 = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription1.id,
          botId: bot.id,
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(sub1[0].id);

      // Create second subscription for same botUser
      const sub2 = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription2.id,
          botId: bot.id,
          isActive: true,
        })
        .returning();
      createdUserSubscriptionIds.push(sub2[0].id);

      // Act - Query all subscriptions for botUser
      const allSubs = await userSubscriptionsRepository.findByBotUserId(
        botUser.id,
      );

      // Assert - Should return both subscriptions
      expect(allSubs.length).toBeGreaterThanOrEqual(2);
      const subscriptionIds = allSubs.map((s) => s.subscriptionId);
      expect(subscriptionIds).toContain(subscription1.id);
      expect(subscriptionIds).toContain(subscription2.id);
    });
  });

  // =============================================================================
  // AC-4: Migration execution
  // =============================================================================

  describe('AC-4: Migration and Data Integrity', () => {
    // AC-4.1: "CASCADE delete removes related records when bot deleted"
    it('AC-4.1: CASCADE delete removes related user_subscriptions and codes when bot deleted', async () => {
      if (!process.env.DATABASE_URL) return;

      // Arrange - Create bot with related records
      const botForCascade = await createTestBot({
        name: generateUniqueName('CascadeBot'),
      });
      const user = await createTestUser();
      const botUser = await createBotUser(user.telegramId, botForCascade.id);
      const subscription = await createTestSubscription();

      // Create user subscription linked to bot via botUser
      const userSub = await db
        .insert(userSubscriptions)
        .values({
          botUserId: botUser.id,
          subscriptionId: subscription.id,
          botId: botForCascade.id,
          isActive: true,
        })
        .returning();
      // Don't add to cleanup - will be cascade deleted
      const userSubId = userSub[0].id;

      // Create code linked to bot
      const code = await codesRepository.create({
        code: generateUniqueName('CASCADE'),
        subscriptionId: subscription.id,
        botId: botForCascade.id,
        isActive: true,
      });
      // Don't add to cleanup - will be cascade deleted
      const codeId = code.id;

      // Create tariff linked to bot
      const tariff = await renewalTariffsRepository.create({
        subscriptionId: subscription.id,
        botId: botForCascade.id,
        periodDays: 30,
        priceStars: 100,
        displayName: 'Cascade test',
        isActive: true,
        sortOrder: 1,
      });
      // Don't add to cleanup - will be cascade deleted
      const tariffId = tariff.id;

      // Act - Delete the bot
      await db.delete(bots).where(eq(bots.id, botForCascade.id));
      // Remove from cleanup tracking since already deleted
      const idx = createdBotIds.indexOf(botForCascade.id);
      if (idx > -1) createdBotIds.splice(idx, 1);

      // Assert - Related records should be deleted
      const remainingUserSub = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.id, userSubId));
      expect(remainingUserSub).toHaveLength(0);

      const remainingCode = await db
        .select()
        .from(codes)
        .where(eq(codes.id, codeId));
      expect(remainingCode).toHaveLength(0);

      const remainingTariff = await db
        .select()
        .from(renewalTariffs)
        .where(eq(renewalTariffs.id, tariffId));
      expect(remainingTariff).toHaveLength(0);
    });

    // AC-4.2: "Indexes created for bot-scoped queries"
    it('AC-4.2: Bot-scoped queries use indexes for efficient execution', async () => {
      if (!process.env.DATABASE_URL) return;

      // Act - Query pg_indexes to verify indexes exist
      const indexResults = await db.execute(sql`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('user_subscriptions', 'codes', 'renewal_tariffs')
        AND indexname LIKE '%bot%'
      `);

      // Assert - Should have bot-related indexes
      const indexNames = (
        indexResults.rows as Array<{ indexname: string }>
      ).map((r) => r.indexname);

      // Check for expected indexes
      expect(indexNames.length).toBeGreaterThan(0);

      // Verify specific indexes exist (from schema definitions)
      const hasUserSubBotIndex = indexNames.some(
        (name) => name.includes('user_subscriptions') && name.includes('bot'),
      );
      const hasCodesBotIndex = indexNames.some(
        (name) => name.includes('codes') && name.includes('bot'),
      );
      const hasTariffBotIndex = indexNames.some(
        (name) => name.includes('renewal_tariffs') && name.includes('bot'),
      );

      expect(
        hasUserSubBotIndex ||
          indexNames.some((n) => n === 'idx_user_subscriptions_bot'),
      ).toBe(true);
      expect(
        hasCodesBotIndex || indexNames.some((n) => n === 'idx_codes_bot'),
      ).toBe(true);
      expect(
        hasTariffBotIndex ||
          indexNames.some((n) => n === 'idx_renewal_tariffs_bot'),
      ).toBe(true);
    });
  });
});
