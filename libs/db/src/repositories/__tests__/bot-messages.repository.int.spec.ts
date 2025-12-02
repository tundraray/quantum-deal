// Multi-Bot Database Schema Integration Tests - BotMessagesRepository
// Design Doc: docs/design/multi-bot-database-schema.md
// Task: docs/plans/tasks/20251126-feature-multi-bot-database-schema-task-3-4.md

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BotMessagesRepository } from '../bot-messages.repository';
import { BotsRepository } from '../bots.repository';
import { DRIZZLE_CLIENT, drizzleProvider } from '../../database.provider';
import { bots, NewBot } from '../../schema/bots';
import { botMessages } from '../../schema/bot-messages';
import { messages } from '../../schema/messages';
import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../../database.provider';

/**
 * BotMessagesRepository Integration Tests
 *
 * Tests the BotMessagesRepository against a real database to verify:
 * - Per-bot message overrides
 * - Message resolution hierarchy
 * - Composite unique constraint on (botId, type, lang)
 *
 * Per ADR-004 Decision 3: Global defaults + per-bot overrides
 * Resolution: bot_messages(botId, type, lang) > messages(type, lang) > messages(type, 'en') > hardcoded fallback
 */
describe('BotMessagesRepository Integration Tests', () => {
  let repository: BotMessagesRepository;
  let botsRepository: BotsRepository;
  let db: DrizzleClient;
  let module: TestingModule;

  // Track created records for cleanup
  const createdBotIds: number[] = [];
  const createdMessageIds: number[] = [];
  const createdGlobalMessageIds: number[] = [];

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
      providers: [...drizzleProvider, BotMessagesRepository, BotsRepository],
    }).compile();

    repository = module.get<BotMessagesRepository>(BotMessagesRepository);
    botsRepository = module.get<BotsRepository>(BotsRepository);
    db = module.get<DrizzleClient>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    // Cleanup created test records in reverse order (messages first, then bots)
    if (db) {
      // Clean up bot messages
      for (const id of createdMessageIds) {
        try {
          await db.delete(botMessages).where(eq(botMessages.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }

      // Clean up global messages
      for (const id of createdGlobalMessageIds) {
        try {
          await db.delete(messages).where(eq(messages.id, id));
        } catch {
          // Ignore cleanup errors
        }
      }

      // Clean up bots (CASCADE will clean related bot_messages)
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
  const trackBot = (botId: number): number => {
    createdBotIds.push(botId);
    return botId;
  };

  // Helper to track created bot messages for cleanup
  const trackBotMessage = (messageId: number): number => {
    createdMessageIds.push(messageId);
    return messageId;
  };

  // Helper to track created global messages for cleanup
  const trackGlobalMessage = (messageId: number): number => {
    createdGlobalMessageIds.push(messageId);
    return messageId;
  };

  // =============================================================================
  // AC-1: New tables created with correct columns, types, constraints
  // =============================================================================

  describe('AC-1: Bot messages table schema and constraints', () => {
    // AC-1.1: "bot_messages table created with composite unique constraint"
    it('AC-1.1: Should enforce unique constraint on (botId, type, lang) combination', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create a bot
      const bot = await botsRepository.create(
        createTestBotData({
          name: generateUniqueBotName('UniqueConstraintBot'),
        }),
      );
      trackBot(bot.id);

      // Create first message override
      const message1 = await repository.upsert(
        bot.id,
        'welcome',
        'en',
        'Welcome!',
      );
      trackBotMessage(message1.id);

      // Act & Assert - Try to insert duplicate (should update instead via upsert)
      const message2 = await repository.upsert(
        bot.id,
        'welcome',
        'en',
        'Updated Welcome!',
      );

      // Should be the same record (updated, not new)
      expect(message2.id).toBe(message1.id);
      expect(message2.message).toBe('Updated Welcome!');

      // Verify direct insert would fail (via create bypassing upsert)
      await expect(
        repository.create({
          botId: bot.id,
          type: 'welcome',
          lang: 'en',
          message: 'Duplicate',
        }),
      ).rejects.toThrow();
    });

    // AC-1.2: "Foreign key references bots table with CASCADE"
    it('AC-1.2: CASCADE deletes bot_messages when parent bot is deleted', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create a bot with message overrides
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('CascadeBot') }),
      );
      // Don't track this bot - we're deliberately deleting it

      const message = await repository.upsert(
        bot.id,
        'welcome',
        'en',
        'Welcome to CASCADE test!',
      );
      // Don't track - should be deleted by CASCADE

      // Verify message exists
      const foundBefore = await repository.findById(message.id);
      expect(foundBefore).not.toBeNull();

      // Act - Delete the bot
      await botsRepository.delete(bot.id);

      // Assert - Message should be deleted by CASCADE
      const foundAfter = await repository.findById(message.id);
      expect(foundAfter).toBeNull();
    });
  });

  // =============================================================================
  // AC-3: Repositories provide required methods
  // =============================================================================

  describe('AC-3: BotMessagesRepository methods', () => {
    // AC-3.1: "resolveMessage() follows hierarchy: bot override > global > fallback"
    it('AC-3.1: resolveMessage() returns bot override when exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot and message override
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('OverrideBot') }),
      );
      trackBot(bot.id);

      const botOverrideMessage = 'Custom bot-specific welcome message!';
      const message = await repository.upsert(
        bot.id,
        'test_override',
        'en',
        botOverrideMessage,
      );
      trackBotMessage(message.id);

      // Also create a global message for the same type
      const globalMessage = await db
        .insert(messages)
        .values({
          type: 'test_override',
          lang: 'en',
          message: 'Global welcome',
        })
        .returning();
      trackGlobalMessage(globalMessage[0].id);

      // Act
      const resolved = await repository.resolveMessage(
        bot.id,
        'test_override',
        'en',
      );

      // Assert - Should return bot override, not global
      expect(resolved).toBe(botOverrideMessage);
    });

    // AC-3.2: "resolveMessage() falls back to global message when no bot override"
    it('AC-3.2: resolveMessage() falls back to global message when no bot override exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot WITHOUT message override
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('FallbackBot') }),
      );
      trackBot(bot.id);

      // Create only global message
      const globalMessageText = 'Global fallback message';
      const globalMessage = await db
        .insert(messages)
        .values({
          type: 'test_fallback',
          lang: 'en',
          message: globalMessageText,
        })
        .returning();
      trackGlobalMessage(globalMessage[0].id);

      // Act
      const resolved = await repository.resolveMessage(
        bot.id,
        'test_fallback',
        'en',
      );

      // Assert - Should return global message
      expect(resolved).toBe(globalMessageText);
    });

    // AC-3.3: "resolveMessage() falls back to English when requested language not found"
    it('AC-3.3: resolveMessage() falls back to English when requested language not available', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot and only English global message
      const bot = await botsRepository.create(
        createTestBotData({
          name: generateUniqueBotName('EnglishFallbackBot'),
        }),
      );
      trackBot(bot.id);

      const englishMessage = 'English fallback message';
      const globalMessage = await db
        .insert(messages)
        .values({
          type: 'test_en_fallback',
          lang: 'en',
          message: englishMessage,
        })
        .returning();
      trackGlobalMessage(globalMessage[0].id);

      // Act - Request Russian, but only English exists
      const resolved = await repository.resolveMessage(
        bot.id,
        'test_en_fallback',
        'ru',
      );

      // Assert - Should return English fallback
      expect(resolved).toBe(englishMessage);
    });

    // AC-3.4: "resolveMessage() returns hardcoded fallback when no message found"
    it('AC-3.4: resolveMessage() returns hardcoded fallback when message not found anywhere', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot with NO messages anywhere
      const bot = await botsRepository.create(
        createTestBotData({
          name: generateUniqueBotName('HardcodedFallbackBot'),
        }),
      );
      trackBot(bot.id);

      // Act - Request a message type that doesn't exist
      const resolved = await repository.resolveMessage(
        bot.id,
        'nonexistent_message_type',
        'en',
      );

      // Assert - Should return hardcoded fallback (not null, not throw)
      expect(resolved).toBeDefined();
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
    });

    // AC-3.5: "upsert() creates or updates message override"
    it('AC-3.5: upsert() creates new override if not exists, updates if exists', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create bot
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('UpsertBot') }),
      );
      trackBot(bot.id);

      // Act - Create new message
      const created = await repository.upsert(
        bot.id,
        'upsert_test',
        'en',
        'Initial message',
      );
      trackBotMessage(created.id);

      // Assert - Created successfully
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.message).toBe('Initial message');

      // Act - Update existing message
      const updated = await repository.upsert(
        bot.id,
        'upsert_test',
        'en',
        'Updated message',
      );

      // Assert - Same ID, updated content
      expect(updated.id).toBe(created.id);
      expect(updated.message).toBe('Updated message');
    });

    // Additional test: resolveMessage with null botId (global only)
    it('resolveMessage() works with null botId (global only lookup)', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create only global message
      const globalMessageText = 'Global message for null bot';
      const globalMessage = await db
        .insert(messages)
        .values({
          type: 'test_null_bot',
          lang: 'en',
          message: globalMessageText,
        })
        .returning();
      trackGlobalMessage(globalMessage[0].id);

      // Act - Request with null botId
      const resolved = await repository.resolveMessage(
        null,
        'test_null_bot',
        'en',
      );

      // Assert - Should return global message
      expect(resolved).toBe(globalMessageText);
    });
  });

  // =============================================================================
  // Message lookup operations
  // =============================================================================

  describe('Message Lookup Operations', () => {
    // AC-LOOKUP.1: "findByBotTypeAndLang() returns specific override"
    it('AC-LOOKUP.1: findByBotTypeAndLang() returns exact message override match', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('FindByBot') }),
      );
      trackBot(bot.id);

      const message = await repository.upsert(
        bot.id,
        'lookup_test',
        'ru',
        'Russian message',
      );
      trackBotMessage(message.id);

      // Act
      const found = await repository.findByBotTypeAndLang(
        bot.id,
        'lookup_test',
        'ru',
      );

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
      expect(found?.message).toBe('Russian message');
    });

    it('findByBotTypeAndLang() returns null for non-existent combination', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('FindByBotNull') }),
      );
      trackBot(bot.id);

      // Act - Query for non-existent type
      const found = await repository.findByBotTypeAndLang(
        bot.id,
        'nonexistent_type',
        'en',
      );

      // Assert
      expect(found).toBeNull();
    });

    // AC-LOOKUP.2: "findAllByBotId() returns all overrides for a bot"
    it('AC-LOOKUP.2: findAllByBotId() returns all message overrides for bot', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('FindAllBot') }),
      );
      trackBot(bot.id);

      // Create multiple message overrides
      const msg1 = await repository.upsert(
        bot.id,
        'welcome',
        'en',
        'Welcome EN',
      );
      const msg2 = await repository.upsert(
        bot.id,
        'welcome',
        'ru',
        'Welcome RU',
      );
      const msg3 = await repository.upsert(
        bot.id,
        'goodbye',
        'en',
        'Goodbye EN',
      );
      trackBotMessage(msg1.id);
      trackBotMessage(msg2.id);
      trackBotMessage(msg3.id);

      // Act
      const allMessages = await repository.findAllByBotId(bot.id);

      // Assert
      expect(allMessages).toHaveLength(3);
      expect(allMessages.map((m) => m.id)).toContain(msg1.id);
      expect(allMessages.map((m) => m.id)).toContain(msg2.id);
      expect(allMessages.map((m) => m.id)).toContain(msg3.id);
    });

    it('findAllByType() returns all overrides for a specific message type', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange - Create two bots with same message type
      const bot1 = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('TypeBot1') }),
      );
      const bot2 = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('TypeBot2') }),
      );
      trackBot(bot1.id);
      trackBot(bot2.id);

      const uniqueType = `type_test_${Date.now()}`;
      const msg1 = await repository.upsert(
        bot1.id,
        uniqueType,
        'en',
        'Bot1 message',
      );
      const msg2 = await repository.upsert(
        bot2.id,
        uniqueType,
        'en',
        'Bot2 message',
      );
      trackBotMessage(msg1.id);
      trackBotMessage(msg2.id);

      // Act
      const byType = await repository.findAllByType(uniqueType);

      // Assert
      expect(byType.length).toBeGreaterThanOrEqual(2);
      expect(byType.map((m) => m.id)).toContain(msg1.id);
      expect(byType.map((m) => m.id)).toContain(msg2.id);
    });
  });

  // =============================================================================
  // Partner Bot Messages (Task 02)
  // =============================================================================

  describe('Partner Bot Messages', () => {
    // Test partner_welcome message in all 8 languages
    it('should resolve partner_welcome message for all 8 languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_welcome',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        expect(resolved).not.toBe('Message not available'); // Should not be hardcoded fallback
      }
    });

    // Test partner_channel_prompt with variable placeholders
    it('should resolve partner_channel_prompt message with placeholders in all languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_channel_prompt',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        // Check for variable placeholders
        expect(resolved).toContain('{channelUrl}');
        expect(resolved).toContain('{channelName}');
      }
    });

    // Test partner_verification_failed with placeholder
    it('should resolve partner_verification_failed message with {channelName} placeholder in all languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_verification_failed',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        expect(resolved).toContain('{channelName}');
      }
    });

    // Test partner_trial_activated with placeholders
    it('should resolve partner_trial_activated message with {expiryDate} and {daysRemaining} placeholders in all languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_trial_activated',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        expect(resolved).toContain('{expiryDate}');
        expect(resolved).toContain('{daysRemaining}');
      }
    });

    // Test partner_trial_expired with placeholder
    it('should resolve partner_trial_expired message with {expiryDate} placeholder in all languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_trial_expired',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        expect(resolved).toContain('{expiryDate}');
      }
    });

    // Test partner_coming_soon (no placeholders)
    it('should resolve partner_coming_soon message in all languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      for (const lang of languages) {
        const resolved = await repository.resolveMessage(
          null,
          'partner_coming_soon',
          lang,
        );

        expect(resolved).toBeDefined();
        expect(typeof resolved).toBe('string');
        expect(resolved.length).toBeGreaterThan(0);
        expect(resolved).not.toBe('Message not available'); // Should not be hardcoded fallback
      }
    });

    // Comprehensive test for all 6 message types
    it('should resolve all 6 partner message types across all 8 languages', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      const messageTypes = [
        'partner_welcome',
        'partner_channel_prompt',
        'partner_verification_failed',
        'partner_trial_activated',
        'partner_trial_expired',
        'partner_coming_soon',
      ];
      const languages = ['ru', 'en', 'uk', 'hi', 'fr', 'kk', 'uz', 'tg'];

      // Total should be 48 messages (6 types × 8 languages)
      let successCount = 0;

      for (const type of messageTypes) {
        for (const lang of languages) {
          const resolved = await repository.resolveMessage(null, type, lang);

          expect(resolved).toBeDefined();
          expect(typeof resolved).toBe('string');
          expect(resolved.length).toBeGreaterThan(0);

          // Should not be hardcoded fallback
          if (resolved !== 'Message not available') {
            successCount++;
          }
        }
      }

      // All 48 messages should be found
      expect(successCount).toBe(48);
    });
  });

  // =============================================================================
  // Delete operations
  // =============================================================================

  describe('Delete Operations', () => {
    it('deleteOverride() deletes existing override and returns true', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('DeleteBot') }),
      );
      trackBot(bot.id);

      const message = await repository.upsert(
        bot.id,
        'delete_test',
        'en',
        'To be deleted',
      );
      // Don't track - we're deleting it

      // Act
      const result = await repository.deleteOverride(
        bot.id,
        'delete_test',
        'en',
      );

      // Assert
      expect(result).toBe(true);

      // Verify deletion
      const found = await repository.findById(message.id);
      expect(found).toBeNull();
    });

    it('deleteOverride() returns false for non-existent override', async () => {
      // Skip if no database
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Arrange
      const bot = await botsRepository.create(
        createTestBotData({ name: generateUniqueBotName('DeleteNotFoundBot') }),
      );
      trackBot(bot.id);

      // Act - Try to delete non-existent message
      const result = await repository.deleteOverride(
        bot.id,
        'nonexistent',
        'en',
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
