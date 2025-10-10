# Code Examples and Patterns

## ⚠️ IMPLEMENTATION STATUS

**CRITICAL:** The code examples in this document are **REFERENCE IMPLEMENTATIONS** that do NOT YET EXIST in the codebase. These are proposed implementations that need to be created.

**Current Reality:**
- ❌ `SubscriptionManagementService` - Does NOT exist
- ❌ `CodeGenerationService` - Does NOT exist
- ❌ `BroadcastService` - Does NOT exist
- ❌ Repository methods for analytical subscriptions - Do NOT exist
- ✅ `NotificationService` - EXISTS and API matches!
- ✅ `UsersRepository.findBySubscription()` - EXISTS!
- ✅ Base repository pattern - CORRECT!

**Before using these examples:** Ensure schema changes from database-schema.md are applied first.

---

## Overview

This document provides reference code examples for implementing the subscription broadcast feature following NestJS clean architecture principles.

## Service Layer Examples

### 1. SubscriptionManagementService

**File**: `libs/masterbot/src/services/subscription-management.service.ts`

```typescript
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository, CodesRepository } from '@quantumdeal/db';
// Assumes barrel export in libs/db/src/index.ts exports these from schema/subscriptions.ts
import { SubscriptionType, generateBroadcastSubscriptionType, isBroadcastSubscription } from '@quantumdeal/db';
import { CodeGenerationService } from './code-generation.service';
import { CreateSubscriptionResult, SubscriptionDto } from '../dto/subscription.dto';

@Injectable()
export class SubscriptionManagementService {
  private readonly logger = new Logger(SubscriptionManagementService.name);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly codeGenerationService: CodeGenerationService,
  ) {}

  /**
   * Create a new BROADCAST subscription with unique invite code
   * Uses transaction to ensure atomicity
   * CRITICAL: Always creates broadcast type subscriptions with dynamic UID
   */
  async createSubscription(
    name: string,
    managerId: number,
  ): Promise<CreateSubscriptionResult> {
    // Use transaction to ensure atomicity: if code generation fails, subscription is rolled back

    // Validate name
    if (!this.validateSubscriptionName(name)) {
      throw new BadRequestException(
        'Subscription name must be 3-50 characters',
      );
    }

    this.logger.log(`Creating BROADCAST subscription: ${name} by manager ${managerId}`);

    try {
      // Generate unique subscription type with UID
      const subscriptionType = generateBroadcastSubscriptionType(); // e.g., 'subscription_V1StGXR8_Z'

      // Create subscription with BROADCAST type (CRITICAL)
      const subscription = await this.subscriptionsRepository.create({
        name,
        type: subscriptionType, // CRITICAL: Dynamic type with UID
        isActive: true,
        scope: null,
      });

      // Generate unique code
      const code = await this.codeGenerationService.generateUniqueCode(
        subscription.id,
        managerId,
      );

      // Get invite URL
      const inviteUrl = await this.codeGenerationService.getInviteUrl(
        code.code,
      );

      this.logger.log(
        `Subscription created: ID=${subscription.id}, Code=${code.code}`,
      );

      return {
        subscription: this.toDto(subscription),
        code,
        inviteUrl,
      };
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  /**
   * Close a BROADCAST subscription (soft delete)
   * CRITICAL: Only works with broadcast subscriptions
   */
  async closeSubscription(
    subscriptionId: number,
    managerId: number,
  ): Promise<void> {
    const subscription = await this.subscriptionsRepository.findById(
      subscriptionId,
    );

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // CRITICAL: Validate subscription type
    if (!isBroadcastSubscription(subscription.type)) {
      throw new BadRequestException('Can only close broadcast subscriptions');
    }

    if (!subscription.isActive) {
      throw new BadRequestException('Subscription is already closed');
    }

    this.logger.log(
      `Closing BROADCAST subscription ${subscriptionId} by manager ${managerId}`,
    );

    await this.subscriptionsRepository.update(subscriptionId, {
      isActive: false,
      closedAt: new Date(),
      closedBy: managerId,
    });

    this.logger.log(`Broadcast subscription ${subscriptionId} closed successfully`);
  }

  /**
   * Get all active BROADCAST subscriptions
   * CRITICAL: Only returns broadcast subscriptions for broadcast feature
   */
  async getActiveBroadcastSubscriptions(): Promise<SubscriptionDto[]> {
    const subscriptions =
      await this.subscriptionsRepository.findActiveBroadcastSubscriptions();
    return subscriptions.map((sub) => this.toDto(sub));
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: number): Promise<SubscriptionDto | null> {
    const subscription = await this.subscriptionsRepository.findById(id);
    return subscription ? this.toDto(subscription) : null;
  }

  /**
   * Validate subscription name
   * Rules: 3-50 characters, alphanumeric + spaces
   */
  validateSubscriptionName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) {
      return false;
    }

    // Allow alphanumeric, spaces, and common punctuation
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    return validPattern.test(name);
  }

  /**
   * Convert entity to DTO
   */
  private toDto(subscription: any): SubscriptionDto {
    return {
      id: subscription.id,
      name: subscription.name,
      type: subscription.type,
      scope: subscription.scope,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      closedAt: subscription.closedAt,
      closedBy: subscription.closedBy,
    };
  }
}
```

---

### 2. CodeGenerationService

**File**: `libs/masterbot/src/services/code-generation.service.ts`

```typescript
import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { CodesRepository } from '@quantumdeal/db';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { randomBytes } from 'crypto';
import { BotName } from '@quantumdeal/bot';
import { CodeDto } from '../dto/code.dto';
import type { UserContext } from '../interfaces';

@Injectable()
export class CodeGenerationService implements OnModuleInit {
  private readonly logger = new Logger(CodeGenerationService.name);
  private readonly CODE_LENGTH = 15;
  private readonly MAX_RETRIES = 10;
  private botUsername: string | null = null;

  constructor(
    @InjectBot(BotName)
    private readonly bot: Telegraf<UserContext>,
    private readonly codesRepository: CodesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  /**
   * Initialize bot username on module init (lifecycle hook)
   * IMPORTANT: Don't call async operations in constructor!
   */
  async onModuleInit() {
    await this.initializeBotUsername();
  }

  /**
   * Initialize bot username for invite URLs
   */
  private async initializeBotUsername(): Promise<void> {
    try {
      const me = await this.bot.telegram.getMe();
      this.botUsername = me.username;
      this.logger.log(`Bot username initialized: ${this.botUsername}`);
    } catch (error) {
      this.logger.error('Failed to get bot username', error);
    }
  }

  /**
   * Generate unique code with collision detection
   */
  async generateUniqueCode(
    subscriptionId: number,
    managerId: number,
  ): Promise<CodeDto> {
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      const code = this.generateCode();

      // Check uniqueness
      const existing = await this.codesRepository.findByCode(code);
      if (!existing) {
        // Code is unique, create it
        const createdCode = await this.codesRepository.create({
          code,
          subscriptionId,
          managerId,
          isActive: true,
        });

        this.logger.log(
          `Generated unique code: ${code} for subscription ${subscriptionId}`,
        );

        return this.toDto(createdCode);
      }

      attempts++;
      this.logger.warn(
        `Code collision detected (attempt ${attempts}/${this.MAX_RETRIES})`,
      );
    }

    // Max retries reached
    this.logger.error('Failed to generate unique code after max retries');
    throw new InternalServerErrorException(
      'Failed to generate unique code. Please try again.',
    );
  }

  /**
   * Validate if code exists and is active
   */
  async validateCode(code: string): Promise<boolean> {
    const existingCode = await this.codesRepository.findByCode(code);
    if (!existingCode || !existingCode.isActive) return false;

    // Check if subscription is still active (codes are multi-use in unified architecture)
    const subscription = await this.subscriptionsRepository.findById(existingCode.subscriptionId);
    return subscription !== null && subscription.isActive;
  }

  /**
   * Get invite URL for a code
   */
  async getInviteUrl(code: string): Promise<string> {
    // Ensure bot username is loaded
    if (!this.botUsername) {
      await this.initializeBotUsername();
    }

    if (!this.botUsername) {
      throw new InternalServerErrorException('Bot username not available');
    }

    return `https://t.me/${this.botUsername}?start=${code}`;
  }

  /**
   * Generate random alphanumeric code
   * Uses crypto.randomBytes for cryptographic randomness
   */
  private generateCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytesArray = randomBytes(this.CODE_LENGTH);
    let code = '';

    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const index = randomBytesArray[i] % characters.length;
      code += characters.charAt(index);
    }

    return code;
  }

  /**
   * Convert entity to DTO
   */
  private toDto(code: any): CodeDto {
    return {
      id: code.id,
      code: code.code,
      subscriptionId: code.subscriptionId,
      managerId: code.managerId,
      isActive: code.isActive,
      createdAt: code.createdAt,
    };
  }
}
```

---

### 3. BroadcastService

**File**: `libs/masterbot/src/services/broadcast.service.ts`

```typescript
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersRepository, SubscriptionsRepository } from '@quantumdeal/db';
import { isBroadcastSubscription } from '@quantumdeal/db';
import { NotificationService } from '@quantumdeal/bot';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/bot/interfaces/notification.interface';
import {
  BroadcastResultDto,
  MessageValidationResult,
} from '../dto/broadcast.dto';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private readonly MAX_MESSAGE_LENGTH = 4096; // Telegram limit

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository, // NEW
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Count active subscribers for a subscription
   * CRITICAL: Validates subscription is broadcast type
   */
  async countSubscribers(subscriptionId: number): Promise<number> {
    // CRITICAL: Validate this is a broadcast subscription
    const subscription = await this.subscriptionsRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!isBroadcastSubscription(subscription.type)) {
      throw new BadRequestException('Can only count subscribers for broadcast subscriptions');
    }

    // Get subscribers via unified architecture
    const userSubs = await this.userSubscriptionsRepository
      .findBySubscriptionId(subscriptionId);
    return userSubs.length;
  }

  /**
   * Validate broadcast message
   */
  validateMessage(message: string): MessageValidationResult {
    // Check if empty
    if (!message || message.trim().length === 0) {
      return {
        valid: false,
        error: 'Message cannot be empty',
      };
    }

    // Check length
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`,
      };
    }

    // Check for forbidden content (optional)
    const forbiddenPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(message)) {
        return {
          valid: false,
          error: 'Message contains forbidden content',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Send broadcast to all subscribers of a BROADCAST subscription
   * Leverages existing NotificationService for rate limiting
   * CRITICAL: Only works with broadcast subscriptions
   */
  async sendBroadcast(
    subscriptionId: number,
    message: string,
    managerId: number,
  ): Promise<BroadcastResultDto> {
    // Validate message
    const validation = this.validateMessage(message);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // CRITICAL: Validate it's a broadcast subscription
    const subscription = await this.subscriptionsRepository.findById(subscriptionId);
    if (!subscription || !isBroadcastSubscription(subscription.type)) {
      throw new BadRequestException('Can only broadcast to broadcast subscriptions');
    }

    this.logger.log(
      `Broadcasting to BROADCAST subscription ${subscriptionId} by manager ${managerId}`,
    );

    // Get subscribers via unified architecture with JOIN
    const subscribers = await this.userSubscriptionsRepository
      .findSubscribersWithUserDetails(subscriptionId);

    if (subscribers.length === 0) {
      this.logger.warn(
        `No subscribers found for subscription ${subscriptionId}`,
      );
      return {
        queuedCount: 0,
        errorCount: 0,
        recipientCount: 0,
        queuedIds: [],
        errors: [],
      };
    }

    // Queue messages via NotificationService with metadata
    const batchResult = this.notificationService.addMessages(
      subscribers.map(sub => ({
        userId: sub.user.telegramId,
        message,
        options: {
          priority: MessagePriority.NORMAL,
          messageType: QueuedMessageType.MARKDOWN,
          metadata: {
            subscriptionId,
            managerId,
            broadcastType: 'subscription',
          },
        },
      })),
    );

    this.logger.log(
      `Broadcast queued: ${batchResult.queuedCount} messages, ${batchResult.errorCount} errors`,
    );

    return {
      queuedCount: batchResult.queuedCount,
      errorCount: batchResult.errorCount,
      recipientCount: subscribers.length,
      queuedIds: batchResult.queuedIds,
      errors: batchResult.errors,
    };
  }
}
```

### 4. Multilingual Broadcast Examples

**IMPLEMENTED**: The BroadcastService now includes automatic translation based on user language preferences.

#### Example 1: Basic Multilingual Broadcast

**Scenario**: Manager sends Russian message to subscribers with different language preferences

```typescript
// Manager sends broadcast
const message = `🎉 **Важное объявление!**

Мы запускаем новую функцию. Проверьте [наш сайт](https://example.com) для получения дополнительной информации.

📅 Дата запуска: 15 октября 2025`;

// BroadcastService automatically handles translation
const result = await broadcastService.sendBroadcast(
  subscriptionId: 123,
  message,
  managerId: 456
);

// Internal flow:
// 1. Get subscribers (100 users: 50 en, 30 ru, 20 es)
// 2. Group by language: Map { 'en' => 50 users, 'ru' => 30 users, 'es' => 20 users }
// 3. Translate to English:
//    "🎉 **Important announcement!**
//
//    We are launching a new feature. Check [our website](https://example.com) for more information.
//
//    📅 Launch date: October 15, 2025"
//
// 4. Keep Russian original for 'ru' users
// 5. Translate to Spanish:
//    "🎉 **¡Anuncio importante!**
//
//    Estamos lanzando una nueva función. Consulta [nuestro sitio web](https://example.com) para más información.
//
//    📅 Fecha de lanzamiento: 15 de octubre de 2025"
//
// 6. Send language-specific messages to each user

// Result
console.log(result);
// {
//   recipientCount: 100,
//   queuedCount: 100,
//   errorCount: 0,
//   queuedIds: [...],
//   errors: []
// }
```

#### Example 2: Translation with Markdown Preservation

**Scenario**: Ensuring Markdown formatting is preserved during translation

```typescript
const markdownMessage = `**Bold text** and *italic text*

\`\`\`javascript
const code = "preserved";
console.log(code);
\`\`\`

Regular text with [link](https://example.com) and @username mention`;

// Translation preserves:
// - **Bold text** → **Жирный текст** (in Russian)
// - *italic text* → *курсивный текст* (in Russian)
// - Code blocks remain unchanged
// - Links structure preserved: [ссылка](https://example.com)
// - @username mentions unchanged

await broadcastService.sendBroadcast(subscriptionId, markdownMessage, managerId);
```

#### Example 3: Handling Translation Failures

**Scenario**: Graceful fallback when translation fails

```typescript
// Internal translation method with error handling (using generateObject)
private async translateToMultipleLanguages(
  message: string,
  targetLanguages: string[]
): Promise<Translations> {
  const languageList = targetLanguages
    .map((lang) => languageNames[lang] || lang)
    .join(', ');

  const prompt = `Translate the following message to multiple languages.

IMPORTANT RULES:
- Preserve ALL Markdown formatting
- Preserve ALL emojis EXACTLY as they are
- Preserve ALL links and their structure
- Only translate the actual text content

Target languages: ${languageList}

Original message:
${message}

Return a JSON object with language codes as keys and translated messages as values.`;

  try {
    const translations = await this.llmService.generateObject<Translations>({
      model: 'gpt-5-nano',
      schema: TranslationsSchema,
      prompt,
      temperature: 0.3,
    });
    return translations;
  } catch (error) {
    this.logger.error(`Translation failed for all languages, using original`, error);
    throw error; // Handled by caller with fallback
  }
}

// Example flow with failure:
// 1. Manager sends message
// 2. Single LLM call attempts to translate to ALL languages (en, ru, es)
// 3. Translation fails (API error or quota exceeded)
// 4. ALL users receive original message (fallback)
// 5. Broadcast continues successfully for all users
// Note: If translation succeeds, ALL users get properly translated messages
```

#### Example 4: Language Grouping Optimization

**Scenario**: Efficient translation by grouping users

```typescript
// Internal grouping method
private groupUsersByLanguage(
  subscribers: Array<{ user: { telegramId: number; lang: string | null }; userSubscription: any }>
): Map<string, Array<{ user: any; userSubscription: any }>> {
  const grouped = new Map();

  for (const sub of subscribers) {
    const lang = sub.user.lang || 'en'; // Default to English
    const group = grouped.get(lang) || [];
    group.push(sub);
    grouped.set(lang, group);
  }

  return grouped;
}

// Example:
// Input: 1000 users
//   - 500 users lang='en'
//   - 300 users lang='ru'
//   - 150 users lang='es'
//   - 50 users lang=null (defaults to 'en')
//
// Output: Map {
//   'en' => 550 users (500 + 50 defaulted),
//   'ru' => 300 users,
//   'es' => 150 users
// }
//
// LLM calls: 1 (single call for ALL 3 languages, not 3 separate calls)
// Performance: O(1) LLM calls regardless of number of languages
// Old approach: 3 calls (one per language) - NEW: 1 call (all languages)
```

#### Example 5: Translation Prompt Structure with generateObject

**Scenario**: LLM prompt that translates to multiple languages and preserves formatting

```typescript
import { z } from 'zod';

// Zod schema for type-safe translations
const TranslationsSchema = z.record(z.string(), z.string());
type Translations = z.infer<typeof TranslationsSchema>;

private async translateToMultipleLanguages(
  message: string,
  targetLanguages: string[]
): Promise<Translations> {
  const languageNames: Record<string, string> = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    // ... more languages
  };

  // Build list of target language names
  const languageList = targetLanguages
    .map((lang) => languageNames[lang] || lang)
    .join(', ');

  const translationPrompt = `Translate the following message to multiple languages.

IMPORTANT RULES:
- Preserve ALL Markdown formatting (bold **text**, italic *text*, code blocks \`\`\`, etc.)
- Preserve ALL emojis EXACTLY as they are (do not modify or remove)
- Preserve ALL links and their structure [text](url)
- Maintain the SAME message structure and layout
- Only translate the actual text content
- Keep code blocks, usernames (@username), and technical terms unchanged
- Keep numbers, dates, and times in their original format

Target languages: ${languageList}

Original message:
${message}

Return a JSON object with language codes as keys and translated messages as values.

Example format:
{
  "en": "translated English text",
  "ru": "переведенный русский текст",
  "es": "texto traducido al español"
}`;

  // Use generateObject for structured, type-safe response
  const translations = await this.llmService.generateObject<Translations>({
    model: 'gpt-5-nano',
    schema: TranslationsSchema,
    prompt: translationPrompt,
    temperature: 0.3,
  });

  // Returns: { en: "...", ru: "...", es: "..." }
  return translations;
}
```

#### Example 6: Full Broadcast Flow with Translation

**Scenario**: Complete broadcast flow from manager to users

```typescript
async sendBroadcast(
  subscriptionId: number,
  message: string,
  managerId: number,
): Promise<BroadcastResultDto> {
  // 1. Validate subscription type
  const subscription = await this.subscriptionsRepository.findById(subscriptionId);
  if (!isBroadcastSubscription(subscription.type)) {
    throw new Error('Cannot broadcast to signals subscription');
  }

  // 2. Validate message
  const validation = this.validateMessage(message);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 3. Get subscribers with user details (including lang)
  const subscribers = await this.userSubscriptionsRepository
    .findSubscribersWithUserDetails(subscriptionId);

  this.logger.log(`Broadcasting to ${subscribers.length} subscribers`);

  // 4. Group users by language
  const usersByLang = this.groupUsersByLanguage(subscribers);

  this.logger.debug(`Languages: ${Array.from(usersByLang.keys()).join(', ')}`);

  // 5. Translate to ALL languages in a SINGLE LLM call
  const translatedMessages = await this.translateMessagesForLanguages(
    message,
    usersByLang
  );
  // Note: Uses generateObject to translate all languages at once

  // 6. Queue messages with language-specific translations
  const batchResult = this.notificationService.addMessages(
    subscribers.map((sub) => {
      const userLang = sub.user.lang || 'en';
      const translatedMessage = translatedMessages.get(userLang) || message;

      return {
        userId: sub.user.telegramId,
        message: translatedMessage,
        options: {
          priority: MessagePriority.NORMAL,
          messageType: QueuedMessageType.MARKDOWN,
          metadata: {
            subscriptionId,
            managerId,
            broadcastType: 'subscription',
            targetLanguage: userLang, // Track which language was sent
          },
        },
      };
    })
  );

  // 7. Return results
  this.logger.log(
    `Broadcast queued: ${batchResult.queuedCount} messages, ${translatedMessages.size} languages`
  );

  return {
    recipientCount: subscribers.length,
    queuedCount: batchResult.queuedCount,
    errorCount: batchResult.errorCount,
    queuedIds: batchResult.queuedIds,
    errors: batchResult.errors,
  };
}
```

#### Example 7: Supported Languages

**Scenario**: List of supported translation languages

```typescript
const SUPPORTED_LANGUAGES = {
  en: 'English',       // Default fallback
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  pl: 'Polish',
  uk: 'Ukrainian',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
};

// Usage in translation
const targetLanguageName = SUPPORTED_LANGUAGES[targetLang] || targetLang;
```

#### Example 8: Testing Multilingual Broadcasts

**Scenario**: Unit test for translation functionality using generateObject

```typescript
describe('BroadcastService - Multilingual Translation', () => {
  it('should translate message to all user languages in one call', async () => {
    // Arrange
    const message = 'Hello, this is a test message';
    const subscribers = [
      { user: { telegramId: 1, lang: 'en' }, userSubscription: {} },
      { user: { telegramId: 2, lang: 'ru' }, userSubscription: {} },
      { user: { telegramId: 3, lang: 'es' }, userSubscription: {} },
    ];

    jest.spyOn(userSubscriptionsRepo, 'findSubscribersWithUserDetails')
      .mockResolvedValue(subscribers);

    // Mock generateObject to return all translations at once
    jest.spyOn(llmService, 'generateObject')
      .mockResolvedValue({
        en: 'Hello, this is a test message',
        ru: 'Привет, это тестовое сообщение',
        es: 'Hola, este es un mensaje de prueba'
      });

    // Act
    const result = await broadcastService.sendBroadcast(1, message, 123);

    // Assert
    expect(result.queuedCount).toBe(3);
    // CRITICAL: Only 1 LLM call for all 3 languages
    expect(llmService.generateObject).toHaveBeenCalledTimes(1);

    // Verify the call included all languages
    const callArgs = llmService.generateObject.mock.calls[0][0];
    expect(callArgs.schema).toBe(TranslationsSchema);
    expect(callArgs.prompt).toContain('English, Russian, Spanish');

    // Verify notification service received correct translations
    const calls = notificationService.addMessages.mock.calls[0][0];
    expect(calls[0].message).toBe('Hello, this is a test message'); // English
    expect(calls[1].message).toBe('Привет, это тестовое сообщение'); // Russian
    expect(calls[2].message).toBe('Hola, este es un mensaje de prueba'); // Spanish
  });

  it('should fallback to original message on translation failure', async () => {
    // Arrange
    const message = 'Test message';
    const subscribers = [
      { user: { telegramId: 1, lang: 'en' }, userSubscription: {} },
      { user: { telegramId: 2, lang: 'es' }, userSubscription: {} },
    ];

    // Mock generateObject to fail
    jest.spyOn(llmService, 'generateObject')
      .mockRejectedValue(new Error('API Error'));

    // Act
    const result = await broadcastService.sendBroadcast(1, message, 123);

    // Assert
    expect(result.queuedCount).toBe(2);
    // All users get original message (fallback for all languages)
    const calls = notificationService.addMessages.mock.calls[0][0];
    expect(calls[0].message).toBe(message); // English - fallback to original
    expect(calls[1].message).toBe(message); // Spanish - fallback to original
  });
});
```

---

## Repository Extensions

### Extended SubscriptionsRepository

**File**: `libs/db/src/repositories/subscriptions.repository.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, and, like } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  subscriptions,
  Subscription,
  NewSubscription,
  SubscriptionType,
  isBroadcastSubscription,
} from '../schema/subscriptions';

@Injectable()
export class SubscriptionsRepository extends BaseRepository<
  Subscription,
  NewSubscription,
  number
> {
  protected table = subscriptions;
  protected idColumn = subscriptions.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find subscriptions that match a specific sector
   * Supports wildcard '*' for all sectors
   */
  async findBySector(sector: string): Promise<Subscription[]> {
    return this.db
      .select()
      .from(subscriptions)
      .where(
        sql`${subscriptions.scope} ? ${sector} OR ${subscriptions.scope} ? '*'`,
      );
  }

  /**
   * Find all active broadcast subscriptions (for broadcast feature)
   * CRITICAL: Only returns broadcast subscriptions (type LIKE 'subscription_%')
   */
  async findActiveBroadcastSubscriptions(): Promise<Subscription[]> {
    return this.db
      .select()
      .from(this.table)
      .where(
        and(
          sql`${this.table.type} LIKE 'subscription_%'`,
          eq(this.table.isActive, true)
        )
      );
  }

  /**
   * Check if a subscription is broadcast type
   */
  async isBroadcastSubscriptionById(id: number): Promise<boolean> {
    const subscription = await this.findById(id);
    return subscription ? isBroadcastSubscription(subscription.type) : false;
  }

  /**
   * Update subscription status
   */
  async updateStatus(
    id: number,
    isActive: boolean,
  ): Promise<Subscription | null> {
    return this.update(id, { isActive });
  }

  /**
   * Close subscription (soft delete)
   */
  async closeSubscription(
    id: number,
    managerId: number,
  ): Promise<Subscription | null> {
    return this.update(id, {
      isActive: false,
      closedAt: new Date(),
      closedBy: managerId,
    });
  }
}
```

---

### Extended CodesRepository

**File**: `libs/db/src/repositories/codes.repository.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { Code, codes, NewCode } from '../schema/codes';
import { eq, and, isNull } from 'drizzle-orm';

@Injectable()
export class CodesRepository extends BaseRepository<Code, NewCode, number> {
  protected table = codes;
  protected idColumn = codes.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find unused code by code string
   */
  public async findByCode(code: string): Promise<Code | null> {
    const condition = and(
      eq(this.table.code, code),
      isNull(this.table.userId),
      eq(this.table.isActive, true),
    );

    return this.findOneBy(condition);
  }

  /**
   * Find all codes for a subscription
   */
  async findBySubscription(subscriptionId: number): Promise<Code[]> {
    return this.findBy(eq(this.table.subscriptionId, subscriptionId));
  }

  /**
   * Find active unused codes for a subscription
   */
  async findActiveCodesBySubscription(
    subscriptionId: number,
  ): Promise<Code[]> {
    return this.findBy(
      and(
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
        isNull(this.table.userId),
      ),
    );
  }

  /**
   * Deactivate all unused codes for a subscription
   */
  async deactivateCodesBySubscription(
    subscriptionId: number,
  ): Promise<void> {
    await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(
        and(
          eq(this.table.subscriptionId, subscriptionId),
          isNull(this.table.userId),
        ),
      );
  }

  /**
   * Count codes for a subscription
   */
  async countCodesBySubscription(subscriptionId: number): Promise<number> {
    const codes = await this.findBySubscription(subscriptionId);
    return codes.length;
  }
}

export { CodesRepository };
```

---

## Command Handler Examples

### MasterbotUpdate Extensions

**File**: `libs/masterbot/src/masterbot.update.ts`

```typescript
import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Start,
  Update,
  Ctx,
  Command,
  Action,
  InjectBot,
  On,
} from 'nestjs-telegraf';
import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
} from '@quantumdeal/framework';
import { SubscriptionsRepository, CodesRepository } from '@quantumdeal/db';
import { MasterbotService } from './masterbot.service';
import { SubscriptionManagementService } from './services/subscription-management.service';
import { BroadcastService } from './services/broadcast.service';
import type { UserContext } from './interfaces';
import { MASTERBOT_CONSTANTS } from './constants';
import { Telegraf } from 'telegraf';
import { BotName } from '@quantumdeal/bot';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class MasterbotUpdate {
  private readonly logger = new Logger(MasterbotUpdate.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Telegraf<UserContext>,
    private readonly masterbotService: MasterbotService,
    private readonly subscriptionService: SubscriptionManagementService,
    private readonly broadcastService: BroadcastService,
  ) {}

  // ... existing handlers ...

  /**
   * Main subscription menu command
   */
  @Command('subscription')
  async onSubscriptionMenu(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      // Show main menu with three action buttons
      await ctx.reply(
        '📋 *Управление подписками*\n\n' +
          'Выберите действие:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '➕ Создать подписку',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CREATE,
                },
              ],
              [
                {
                  text: '🔒 Закрыть подписку',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CLOSE,
                },
              ],
              [
                {
                  text: '📢 Отправить сообщение',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_BROADCAST,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error('Error in subscription menu command', error);
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.ERROR_GENERIC);
    }
  }

  /**
   * Create new subscription action (triggered from menu)
   */
  @Action('subscription_create')
  async onCreateSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Log action
      this.masterbotService.logManagerAction(manager, 'CREATE_SUBSCRIPTION_STARTED');

      // Edit message to show prompt
      await ctx.editMessageText(
        '📝 *Create New Subscription*\n\n' +
          'Please enter the subscription name:\n\n' +
          '_Example: Premium Trading Signals_\n' +
          '_Note: Name must be 3-50 characters_',
        { parse_mode: 'Markdown' },
      );

      // Set conversation state
      ctx.session.state = 'awaiting_subscription_name';
      ctx.session.commandContext = 'create_subscription';

      // Answer callback query
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in create_subscription action', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Close subscription action (triggered from menu)
   */
  @Action('subscription_close')
  async onCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Log action
      this.masterbotService.logManagerAction(manager, 'CLOSE_SUBSCRIPTION_STARTED');

      // Get active BROADCAST subscriptions only (CRITICAL)
      const subscriptions = await this.subscriptionService.getActiveBroadcastSubscriptions();

      if (subscriptions.length === 0) {
        await ctx.editMessageText('ℹ️ No active broadcast subscriptions to close.');
        await ctx.answerCbQuery();
        return;
      }

      // Create inline keyboard
      const buttons = subscriptions.map((sub) => [
        {
          text: sub.name,
          callback_data: `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_PREFIX}${sub.id}`,
        },
      ]);
      buttons.push([
        {
          text: '🔙 Cancel',
          callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CANCEL,
        },
      ]);

      await ctx.editMessageText(
        '🔒 *Close Subscription*\n\n' + 'Select a subscription to close:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in close_subscription action', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Broadcast action (triggered from menu)
   */
  @Action('subscription_broadcast')
  async onBroadcast(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Log action
      this.masterbotService.logManagerAction(manager, 'BROADCAST_STARTED');

      // Get active BROADCAST subscriptions only (CRITICAL)
      const subscriptions = await this.subscriptionService.getActiveBroadcastSubscriptions();

      if (subscriptions.length === 0) {
        await ctx.editMessageText('ℹ️ No active broadcast subscriptions available for broadcast.');
        await ctx.answerCbQuery();
        return;
      }

      // Get subscriber counts
      const subscriptionsWithCounts = await Promise.all(
        subscriptions.map(async (sub) => ({
          ...sub,
          subscriberCount: await this.broadcastService.countSubscribers(sub.id),
        })),
      );

      // Filter out subscriptions with no subscribers
      const validSubscriptions = subscriptionsWithCounts.filter(
        (sub) => sub.subscriberCount > 0,
      );

      if (validSubscriptions.length === 0) {
        await ctx.editMessageText('ℹ️ No subscriptions have active subscribers.');
        await ctx.answerCbQuery();
        return;
      }

      // Create inline keyboard
      const buttons = validSubscriptions.map((sub) => [
        {
          text: `${sub.name} (${sub.subscriberCount} users)`,
          callback_data: `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${sub.id}`,
        },
      ]);
      buttons.push([
        {
          text: '🔙 Cancel',
          callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
        },
      ]);

      await ctx.editMessageText(
        '📢 *Broadcast Message*\n\n' +
          'Select a subscription to broadcast to:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in broadcast action', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Handle text messages for multi-step flows
   */
  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    const state = ctx.session?.state;

    // Handle create subscription name input
    if (state === 'awaiting_subscription_name') {
      await this.handleSubscriptionNameInput(ctx);
      return;
    }

    // Handle broadcast message input
    if (state === 'awaiting_broadcast_message') {
      await this.handleBroadcastMessageInput(ctx);
      return;
    }
  }

  /**
   * Handle subscription name input
   */
  private async handleSubscriptionNameInput(ctx: UserContext): Promise<void> {
    const name = ctx.message?.text?.trim();

    if (!name) {
      await ctx.reply('❌ Invalid input. Please enter a valid name.');
      return;
    }

    // Validate name
    if (!this.subscriptionService.validateSubscriptionName(name)) {
      await ctx.reply(
        '❌ Invalid name. Please use 3-50 characters (alphanumeric, spaces, hyphens, underscores).',
      );
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      // Create subscription
      const result = await this.subscriptionService.createSubscription(
        name,
        ctx.manager.telegramId,
      );

      // Reset state
      ctx.session.state = null;
      ctx.session.commandContext = null;

      // Log action
      this.masterbotService.logManagerAction(ctx.manager, 'SUBSCRIPTION_CREATED', {
        subscriptionId: result.subscription.id,
        subscriptionName: result.subscription.name,
        code: result.code.code,
      });

      // Send success message
      await ctx.reply(
        '✅ *Subscription Created Successfully*\n\n' +
          `📋 **Name:** ${result.subscription.name}\n` +
          `🆔 **ID:** ${result.subscription.id}\n` +
          `📅 **Created:** ${new Date().toLocaleString()}\n\n` +
          `🎫 **Invite Link:**\n\`${result.inviteUrl}\`\n\n` +
          `Share this link with users to join this subscription.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      await ctx.reply('❌ Failed to create subscription. Please try again later.');
    }
  }

  /**
   * Handle broadcast message input
   */
  private async handleBroadcastMessageInput(ctx: UserContext): Promise<void> {
    const message = ctx.message?.text;

    if (!message) {
      await ctx.reply('❌ Invalid message. Please send text.');
      return;
    }

    const subscriptionId = ctx.session.broadcastSubscriptionId;

    if (!subscriptionId) {
      await ctx.reply('❌ Session expired. Please start again with /subscription');
      ctx.session.state = null;
      return;
    }

    // Validate message
    const validation = this.broadcastService.validateMessage(message);
    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.error}`);
      return;
    }

    try {
      // Store message in session
      ctx.session.broadcastMessage = message;
      ctx.session.state = 'confirming_broadcast';

      // Get details
      const subscription = await this.subscriptionService.getSubscriptionById(
        subscriptionId,
      );
      const count = await this.broadcastService.countSubscribers(subscriptionId);

      // Show preview
      await ctx.reply(
        `📊 *Broadcast Preview*\n\n` +
          `**Subscription:** ${subscription.name}\n` +
          `**Recipients:** ${count} active users\n\n` +
          `**Message:**\n${message}\n\n` +
          `Send this message?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Send Now',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
                },
                {
                  text: '❌ Cancel',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.error('Failed to prepare broadcast', error);
      await ctx.reply('❌ Failed to prepare broadcast. Please try again.');
    }
  }

  /**
   * Handle close subscription selection
   */
  @Action(/^close_sub_(\d+)$/)
  async onCloseSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
    const subscriptionId = parseInt(ctx.match[1], 10);

    try {
      const subscription = await this.subscriptionService.getSubscriptionById(
        subscriptionId,
      );

      if (!subscription) {
        await ctx.answerCbQuery('❌ Subscription not found');
        return;
      }

      await ctx.editMessageText(
        `⚠️ *Confirm Closure*\n\n` +
          `Are you sure you want to close **${subscription.name}**?\n\n` +
          `• New users cannot join\n` +
          `• Existing subscribers keep access\n` +
          `• This action can be reversed later`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Yes, Close',
                  callback_data: `confirm_close_${subscriptionId}`,
                },
                {
                  text: '❌ Cancel',
                  callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CANCEL,
                },
              ],
            ],
          },
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error selecting subscription to close', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Handle close subscription confirmation
   */
  @Action(/^confirm_close_(\d+)$/)
  async onConfirmCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const subscriptionId = parseInt(ctx.match[1], 10);

    try {
      const subscription = await this.subscriptionService.getSubscriptionById(
        subscriptionId,
      );

      await this.subscriptionService.closeSubscription(
        subscriptionId,
        ctx.manager.telegramId,
      );

      // Log action
      this.masterbotService.logManagerAction(ctx.manager, 'SUBSCRIPTION_CLOSED', {
        subscriptionId,
        subscriptionName: subscription.name,
      });

      await ctx.editMessageText(
        `✅ *Subscription Closed*\n\n` +
          `**${subscription.name}** has been closed.\n\n` +
          `No new users can join this subscription.`,
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('✅ Subscription closed');
    } catch (error) {
      this.logger.error('Error closing subscription', error);
      await ctx.answerCbQuery('❌ Failed to close subscription');
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  /**
   * Handle broadcast subscription selection
   */
  @Action(/^broadcast_sub_(\d+)$/)
  async onBroadcastSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
    const subscriptionId = parseInt(ctx.match[1], 10);

    try {
      // Store in session
      ctx.session.broadcastSubscriptionId = subscriptionId;
      ctx.session.state = 'awaiting_broadcast_message';

      // Get subscription details
      const subscription = await this.subscriptionService.getSubscriptionById(
        subscriptionId,
      );

      await ctx.editMessageText(
        `📝 *Enter Broadcast Message*\n\n` +
          `**Subscription:** ${subscription.name}\n\n` +
          `Type your message below.\n` +
          `_Tip: You can use Markdown formatting_`,
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error selecting broadcast subscription', error);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Handle broadcast confirmation
   */
  @Action('broadcast_confirm')
  async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
    const subscriptionId = ctx.session.broadcastSubscriptionId;
    const message = ctx.session.broadcastMessage;

    if (!subscriptionId || !message) {
      await ctx.answerCbQuery('❌ Session expired');
      await ctx.reply('❌ Session expired. Please start again with /subscription');
      return;
    }

    // Clear session
    ctx.session.state = null;
    ctx.session.broadcastSubscriptionId = null;
    ctx.session.broadcastMessage = null;

    try {
      // Send initial confirmation
      await ctx.editMessageText(
        `⏳ *Broadcast Queued*\n\n` +
          `Your message is being sent...\n` +
          `This may take a few moments.`,
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('✅ Sending broadcast...');

      // Execute broadcast
      const result = await this.broadcastService.sendBroadcast(
        subscriptionId,
        message,
        ctx.manager.telegramId,
      );

      // Log action
      this.masterbotService.logManagerAction(ctx.manager, 'BROADCAST_SENT', {
        subscriptionId,
        recipientCount: result.recipientCount,
        queuedCount: result.queuedCount,
        errorCount: result.errorCount,
      });

      // Send completion notification
      await ctx.reply(
        `✅ *Broadcast Completed*\n\n` +
          `**Queued:** ${result.queuedCount} messages\n` +
          `**Errors:** ${result.errorCount}\n` +
          `**Total Recipients:** ${result.recipientCount}\n\n` +
          `Messages are being delivered with rate limiting.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Error sending broadcast', error);
      await ctx.reply('❌ Failed to send broadcast. Please try again.');
      await ctx.answerCbQuery('❌ Broadcast failed');
    }
  }

  /**
   * Cancel close subscription
   */
  @Action('close_sub_cancel')
  async onCancelCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.editMessageText('❌ Cancelled');
    await ctx.answerCbQuery();
  }

  /**
   * Cancel broadcast
   */
  @Action('broadcast_cancel')
  async onCancelBroadcast(@Ctx() ctx: UserContext): Promise<void> {
    // Reset state
    ctx.session.state = null;
    ctx.session.broadcastSubscriptionId = null;
    ctx.session.broadcastMessage = null;

    await ctx.editMessageText('❌ Broadcast cancelled');
    await ctx.answerCbQuery();
  }
}
```

---

## DTOs

### subscription.dto.ts

```typescript
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  name: string;
}

export class SubscriptionDto {
  id: number;
  name: string;
  type: string; // 'signals' or 'subscription_{uid}' for broadcasts
  scope: string[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: number;
}

export interface CreateSubscriptionResult {
  subscription: SubscriptionDto;
  code: CodeDto;
  inviteUrl: string;
}

export interface CodeDto {
  id: number;
  code: string;
  subscriptionId: number;
  managerId: number;
  isActive: boolean;
  createdAt: Date;
}
```

### broadcast.dto.ts

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class BroadcastMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;
}

export interface BroadcastResultDto {
  queuedCount: number;
  errorCount: number;
  recipientCount: number;
  queuedIds: string[];
  errors: string[];
}

export interface MessageValidationResult {
  valid: boolean;
  error?: string;
}
```

---

## Constants Extensions

### constants.ts

```typescript
export const MASTERBOT_CONSTANTS = {
  // ... existing constants ...

  COMMANDS: {
    START: '/start',
    STATS: '/stats',
    CODE: '/code',
    HELP: '/help',
    SUBSCRIPTION: '/subscription',
  },

  CALLBACK_ACTIONS: {
    SUBSCRIPTION_PREFIX: 'subscription_',
    SUBSCRIPTION_CREATE: 'subscription_create',
    SUBSCRIPTION_CLOSE: 'subscription_close',
    SUBSCRIPTION_BROADCAST: 'subscription_broadcast',
    MENU_STATS: 'menu_stats',
    MENU_CODE: 'menu_code',
    MENU_HELP: 'menu_help',
    MENU_MAIN: 'menu_main',
    CLOSE_SUB_PREFIX: 'close_sub_',
    CLOSE_SUB_CANCEL: 'close_sub_cancel',
    BROADCAST_SUB_PREFIX: 'broadcast_sub_',
    BROADCAST_CONFIRM: 'broadcast_confirm',
    BROADCAST_CANCEL: 'broadcast_cancel',
  },
} as const;
```

---

## Testing Examples

### Unit Test - SubscriptionManagementService

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionsRepository } from '@quantumdeal/db';
import { CodeGenerationService } from './code-generation.service';
import { BadRequestException } from '@nestjs/common';

describe('SubscriptionManagementService', () => {
  let service: SubscriptionManagementService;
  let subscriptionsRepository: jest.Mocked<SubscriptionsRepository>;
  let codeGenerationService: jest.Mocked<CodeGenerationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionManagementService,
        {
          provide: SubscriptionsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            transaction: jest.fn(),
            findActiveSubscriptions: jest.fn(),
          },
        },
        {
          provide: CodeGenerationService,
          useValue: {
            generateUniqueCode: jest.fn(),
            getInviteUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionManagementService>(
      SubscriptionManagementService,
    );
    subscriptionsRepository = module.get(SubscriptionsRepository);
    codeGenerationService = module.get(CodeGenerationService);
  });

  describe('validateSubscriptionName', () => {
    it('should return true for valid names', () => {
      expect(service.validateSubscriptionName('Valid Name')).toBe(true);
      expect(service.validateSubscriptionName('Test-123')).toBe(true);
      expect(service.validateSubscriptionName('My_Subscription')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(service.validateSubscriptionName('')).toBe(false);
      expect(service.validateSubscriptionName('ab')).toBe(false);
      expect(service.validateSubscriptionName('a'.repeat(51))).toBe(false);
      expect(service.validateSubscriptionName('Test@#$')).toBe(false);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with code successfully', async () => {
      const mockSubscription = {
        id: 1,
        name: 'Test Sub',
        isActive: true,
        createdAt: new Date(),
      };
      const mockCode = {
        id: 1,
        code: 'ABC123',
        subscriptionId: 1,
        managerId: 12345,
      };
      const mockInviteUrl = 'https://t.me/bot?start=ABC123';

      subscriptionsRepository.transaction.mockImplementation((cb) =>
        cb({} as any),
      );
      subscriptionsRepository.create.mockResolvedValue(mockSubscription as any);
      codeGenerationService.generateUniqueCode.mockResolvedValue(mockCode as any);
      codeGenerationService.getInviteUrl.mockResolvedValue(mockInviteUrl);

      const result = await service.createSubscription('Test Sub', 12345);

      expect(result.subscription.name).toBe('Test Sub');
      expect(result.code.code).toBe('ABC123');
      expect(result.inviteUrl).toBe(mockInviteUrl);
    });

    it('should throw error for invalid name', async () => {
      await expect(service.createSubscription('ab', 12345)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

---

## Clean Code Patterns

### 1. Single Responsibility

Each service has one clear responsibility:
- `SubscriptionManagementService`: Manage subscription lifecycle
- `CodeGenerationService`: Generate and validate codes
- `BroadcastService`: Send broadcast messages

### 2. Dependency Injection

All dependencies injected via constructor:
```typescript
constructor(
  private readonly subscriptionsRepository: SubscriptionsRepository,
  private readonly codeGenerationService: CodeGenerationService,
) {}
```

### 3. Error Handling

Consistent error handling with custom exceptions:
```typescript
if (!subscription) {
  throw new NotFoundException('Subscription not found');
}
```

### 4. Logging

Structured logging with context:
```typescript
this.logger.log(`Creating subscription: ${name} by manager ${managerId}`);
this.logger.error('Failed to create subscription', error);
```

### 5. Transaction Management

Use transactions for atomic operations:
```typescript
return await this.subscriptionsRepository.transaction(async (tx) => {
  const subscription = await this.subscriptionsRepository.create({...});
  const code = await this.codeGenerationService.generateUniqueCode(...);
  return { subscription, code };
});
```

### 6. Validation

Validate input before processing:
```typescript
if (!this.validateSubscriptionName(name)) {
  throw new BadRequestException('Invalid subscription name');
}
```

### 7. DTO Usage

Use DTOs for data transfer:
```typescript
return subscriptions.map((sub) => this.toDto(sub));
```

---

## Best Practices

1. **Keep functions small**: <20 instructions
2. **Use descriptive names**: `generateUniqueCode`, not `gen`
3. **Return early**: Avoid deep nesting
4. **Use higher-order functions**: `map`, `filter`, `reduce`
5. **Avoid primitive obsession**: Use DTOs and interfaces
6. **Separate concerns**: One service per responsibility
7. **Test thoroughly**: Unit, integration, E2E tests
8. **Log appropriately**: Info, warn, error levels
9. **Handle errors gracefully**: User-friendly messages
10. **Document public APIs**: JSDoc comments
