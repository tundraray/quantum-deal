# Task: Add sendWithBot method to NotificationService

Metadata:
- Phase: 5 (NotificationService Extension)
- Dependencies: Phase 2 completed
- Provides: Bot-parameterized message sending capability
- Size: Medium (1 file)
- Verification Level: L2 (Unit tests pass)

## Implementation Content

Add the `sendWithBot()` method to `NotificationService` that accepts a bot instance and limiter as parameters. This method allows `MultiBotSignalService` to send messages through any bot, not just the hardcoded static bot.

**AC Support**:
- AC-009 (sendWithBot uses provided bot and limiter)

**IMPORTANT**: This is a NEW method that coexists with `addMessage()`. Do NOT modify the existing `addMessage()` method.

## Target Files

- [x] `libs/bot/src/services/notification.service.ts` (modify)
- [x] `libs/bot/src/services/__tests__/notification.service.spec.ts` (add tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read current implementation of `notification.service.ts`
- [x] Understand existing `addMessage()` and `processMessage()` methods
- [x] Write failing tests for new `sendWithBot()` method

### 2. Green Phase
- [x] Add `Bottleneck` type import
- [x] Create `TelegrafInstance` type alias
- [x] Implement `sendWithBot()` method
- [x] Implement `processMessageWithBot()` private method
- [x] Implement `sendTelegramMessageWithBot()` private method

### 3. Refactor Phase
- [x] Add comprehensive JSDoc documentation
- [x] Ensure error handling matches existing patterns
- [x] Verify all tests pass

## Implementation Code

```typescript
// Add import at top (Context is already available via UserContext):
import type Bottleneck from 'bottleneck';
import type { Context } from 'telegraf';

// Type alias for bot instances that can send messages
// Works with both static bot (Telegraf<UserContext>) and dynamic bots (Telegraf<Context>)
type TelegrafInstance = Telegraf<UserContext> | Telegraf<Context>;

// Add new public method after addMessages (around line 168):

/**
 * Schedule a message using a specific bot instance and limiter.
 * Used by MultiBotSignalService for per-bot signal delivery (ADR-007).
 *
 * NOTE: This method coexists with addMessage() - it does NOT replace it.
 * addMessage() continues to use the injected static bot.
 * sendWithBot() uses the provided bot parameter.
 *
 * @param bot - Telegraf bot instance to send from (accepts both UserContext and Context types)
 * @param limiter - Per-bot Bottleneck rate limiter
 * @param userId - Telegram user ID
 * @param message - Message content
 * @param options - Message options (type, priority, retries)
 * @returns Message ID for tracking
 */
sendWithBot(
  bot: TelegrafInstance,
  limiter: Bottleneck,
  userId: number,
  message: string,
  options: MessageOptions = {},
): string {
  try {
    const messageId = uuidv4();
    const queuedMessage: QueuedMessage = {
      id: messageId,
      userId,
      message,
      messageType: options.messageType ?? QueuedMessageType.TEXT,
      priority: options.priority ?? MessagePriority.NORMAL,
      status: QueueMessageStatus.PENDING,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      createdAt: new Date(),
      scheduledAt: options.scheduledAt,
      metadata: options.metadata,
      buttons: options.buttons,
    };

    // Schedule with provided limiter (not internal limiter)
    const bottleneckPriority = this.convertToBotleneckPriority(
      queuedMessage.priority,
    );

    limiter
      .schedule({ priority: bottleneckPriority }, () =>
        this.processMessageWithBot(bot, queuedMessage),
      )
      .catch((error) => {
        this.logger.error(`Failed to schedule message ${messageId}:`, error);
        Sentry.captureException(error, {
          tags: {
            service: 'notification',
            messageId,
            userId: userId.toString(),
          },
        });
      });

    this.messageStats.totalScheduled++;

    this.logger.debug(
      `Message scheduled via external bot for user ${userId}`,
    );

    return messageId;
  } catch (error) {
    this.logger.error('Error scheduling message with bot', error);
    Sentry.captureException(error, {
      tags: { userId, service: 'notification' },
    });
    throw error;
  }
}

// Add new private methods:

/**
 * Process a message with a specific bot instance.
 * Includes retry logic for transient failures.
 */
private async processMessageWithBot(
  bot: TelegrafInstance,
  message: QueuedMessage,
): Promise<void> {
  try {
    message.status = QueueMessageStatus.PROCESSING;
    message.processedAt = new Date();

    await this.sendTelegramMessageWithBot(bot, message);

    message.status = QueueMessageStatus.SENT;
    this.messageStats.successCount++;
  } catch (error) {
    this.logger.error(
      `Error sending message ${message.id} to user ${message.userId}:`,
      error,
    );

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isPermanentError = this.isPermanentError(errorMessage);

    if (!isPermanentError && message.retryCount < message.maxRetries) {
      message.retryCount++;
      message.status = QueueMessageStatus.RETRY;
      this.messageStats.retryCount++;
      throw error; // Rethrow for Bottleneck retry handling
    } else {
      message.status = QueueMessageStatus.FAILED;
      message.error = errorMessage;
      this.messageStats.failureCount++;

      if (isPermanentError) {
        await this.usersRepository.deactivateUser(message.userId);
      }

      Sentry.captureException(error, {
        tags: {
          service: 'notification',
          userId: message.userId.toString(),
          messageId: message.id,
        },
      });

      throw error;
    }
  }
}

/**
 * Send message via specific Telegram bot instance.
 */
private async sendTelegramMessageWithBot(
  bot: TelegrafInstance,
  message: QueuedMessage,
): Promise<void> {
  let messageText = message.message;
  let parseMode: 'HTML' | 'MarkdownV2' | undefined;

  if (message.messageType === QueuedMessageType.HTML) {
    parseMode = 'HTML';
  } else if (message.messageType === QueuedMessageType.MARKDOWN) {
    parseMode = 'MarkdownV2';
    messageText = telegramifyMarkdown(messageText, 'remove');
  }

  await bot.telegram.sendMessage(message.userId, messageText, {
    parse_mode: parseMode,
    reply_markup:
      message.buttons && message.buttons.length > 0
        ? ({
            inline_keyboard: message.buttons,
          } as InlineKeyboardMarkup)
        : undefined,
  });
}
```

## Test Cases

```typescript
describe('NotificationService', () => {
  describe('sendWithBot', () => {
    it('AC-009: should schedule message with provided limiter', async () => {
      // Arrange
      const mockBot = createMockBot();
      const mockLimiter = new Bottleneck({ maxConcurrent: 1 });
      const scheduleSpy = vi.spyOn(mockLimiter, 'schedule');

      // Act
      service.sendWithBot(mockBot, mockLimiter, 123456, 'Test message');

      // Assert
      expect(scheduleSpy).toHaveBeenCalled();
    });

    it('AC-009: should send via provided bot instance', async () => {
      // Arrange
      const mockBot = createMockBot();
      const mockLimiter = new Bottleneck({ maxConcurrent: 1 });

      // Act
      service.sendWithBot(mockBot, mockLimiter, 123456, 'Test message');
      await flushPromises();

      // Assert
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        'Test message',
        expect.any(Object),
      );
    });

    it('AC-009: should return unique message ID string', () => {
      // Arrange
      const mockBot = createMockBot();
      const mockLimiter = new Bottleneck({ maxConcurrent: 1 });

      // Act
      const messageId = service.sendWithBot(
        mockBot,
        mockLimiter,
        123456,
        'Test message',
      );

      // Assert
      expect(typeof messageId).toBe('string');
      expect(messageId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('AC-009: should log to Sentry on send failure', async () => {
      // Arrange
      const mockBot = createMockBot();
      mockBot.telegram.sendMessage.mockRejectedValue(new Error('API Error'));
      const mockLimiter = new Bottleneck({ maxConcurrent: 1 });

      // Act
      service.sendWithBot(mockBot, mockLimiter, 123456, 'Test message');
      await flushPromises();

      // Assert
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should update messageStats on successful send', async () => {
      // Arrange
      const mockBot = createMockBot();
      const mockLimiter = new Bottleneck({ maxConcurrent: 1 });
      const initialScheduled = service.messageStats.totalScheduled;

      // Act
      service.sendWithBot(mockBot, mockLimiter, 123456, 'Test message');

      // Assert
      expect(service.messageStats.totalScheduled).toBe(initialScheduled + 1);
    });
  });
});
```

## Completion Criteria

- [x] `TelegrafInstance` type alias created
- [x] `sendWithBot()` method implemented
- [x] `processMessageWithBot()` private method implemented
- [x] `sendTelegramMessageWithBot()` private method implemented
- [x] Existing `addMessage()` method unchanged
- [x] Unit tests pass (13 tests)
- [x] Build succeeds

## Verification Commands

```bash
# Run unit tests
npm run test -- --filter="NotificationService"

# Build verification
npm run build
```

## Notes

- Impact scope: New methods only, existing code unchanged
- Constraints: Must not modify `addMessage()` behavior
- The `TelegrafInstance` type handles both static (UserContext) and dynamic (Context) bots
- Message stats are updated for monitoring purposes
