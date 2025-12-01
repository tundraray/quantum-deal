import { Test, TestingModule } from '@nestjs/testing';
import Bottleneck from 'bottleneck';
import { Telegraf, Context } from 'telegraf';
import { NotificationService } from '../notification.service';
import { UsersRepository } from '@quantumdeal/db';
import { getBotToken } from '@quantumdeal/telegraf';
import {
  QueuedMessageType,
  MessagePriority,
} from '../../interfaces/notification.interface';
import type { UserContext } from '../../interfaces';

// Mock uuid to avoid ESM import issues
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(
    () =>
      `00000000-0000-0000-0000-${String(++mockUuidCounter).padStart(12, '0')}`,
  ),
}));

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock telegramify-markdown
jest.mock('telegramify-markdown', () => ({
  __esModule: true,
  default: jest.fn((text: string) => text),
}));

// Import Sentry after mocking
import * as Sentry from '@sentry/nestjs';

// Get the correct token used by @InjectBot('QuantumDealBot')
const INJECT_BOT_TOKEN = getBotToken('QuantumDealBot');

/**
 * Create a mock Telegraf bot instance for testing.
 * Returns a mock that satisfies TelegrafInstance type (Telegraf<UserContext> | Telegraf<Context>)
 */
function createMockBot() {
  return {
    telegram: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 12345 }),
    },
  } as unknown as Telegraf<Context>;
}

/**
 * Create a mock Bottleneck limiter for testing.
 */
function createMockLimiter() {
  const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 0,
  });
  return limiter;
}

/**
 * Helper to wait for all pending promises to resolve
 */
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockBot: Telegraf<UserContext>;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockUuidCounter = 0;

    // Create mock bot for static injection
    mockBot = {
      telegram: {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 12345 }),
      },
    } as unknown as Telegraf<UserContext>;

    // Create mock users repository
    mockUsersRepository = {
      deactivateUser: jest.fn().mockResolvedValue(undefined),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: INJECT_BOT_TOKEN,
          useValue: mockBot,
        },
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Initialize the service (triggers onModuleInit)
    service.onModuleInit();
  });

  afterEach(async () => {
    // Clean up the service
    await service.onModuleDestroy();
  });

  describe('sendWithBot', () => {
    it('AC-009: should schedule message with provided limiter', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const scheduleSpy = jest.spyOn(mockLimiter, 'schedule');

      // Act
      service.sendWithBot(mockExternalBot, mockLimiter, 123456, 'Test message');

      // Assert
      expect(scheduleSpy).toHaveBeenCalled();
      expect(scheduleSpy).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ priority: expect.any(Number) }),
        expect.any(Function),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('AC-009: should send via provided bot instance', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockExternalBot, mockLimiter, 123456, 'Test message');
      await flushPromises();

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        'Test message',
        expect.any(Object),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('AC-009: should return unique message ID string', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();

      // Act
      const messageId = service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Test message',
      );

      // Assert
      expect(typeof messageId).toBe('string');
      expect(messageId).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      // Act again to verify uniqueness
      const messageId2 = service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Another message',
      );

      expect(messageId).not.toBe(messageId2);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('AC-009: should log to Sentry on send failure', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      mockExternalBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Test message',
        { maxRetries: 0 },
      );
      await flushPromises();

      // Assert
      expect(Sentry.captureException).toHaveBeenCalled();

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.totalScheduled on message schedule', () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();
      const initialScheduled = service.getQueueStatus().totalMessages;

      // Act
      service.sendWithBot(mockExternalBot, mockLimiter, 123456, 'Test message');

      // Assert
      expect(service.getQueueStatus().totalMessages).toBe(initialScheduled + 1);

      // Cleanup (async, no await needed for test)
      void mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.successCount on successful send', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();
      const initialSuccess = service.getQueueStatus().sentMessages;

      // Act
      service.sendWithBot(mockExternalBot, mockLimiter, 123456, 'Test message');
      await flushPromises();

      // Assert
      expect(service.getQueueStatus().sentMessages).toBe(initialSuccess + 1);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.failureCount on permanent error', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      mockExternalBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('bot was blocked by the user'));
      const mockLimiter = createMockLimiter();
      const initialFailures = service.getQueueStatus().failedMessages;

      // Act
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Test message',
        { maxRetries: 0 },
      );
      await flushPromises();

      // Assert
      expect(service.getQueueStatus().failedMessages).toBe(initialFailures + 1);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should deactivate user on permanent error', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      mockExternalBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('bot was blocked by the user'));
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Test message',
        { maxRetries: 0 },
      );
      await flushPromises();

      // Assert
      expect(mockUsersRepository.deactivateUser).toHaveBeenCalledWith(123456);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should use provided message options', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        '**Bold text**',
        {
          messageType: QueuedMessageType.MARKDOWN,
          priority: MessagePriority.HIGH,
          maxRetries: 5,
        },
      );
      await flushPromises();

      // Assert - Verify the message was sent with MarkdownV2 parse mode
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        '**Bold text**', // telegramify-markdown mock returns text as-is
        expect.objectContaining({
          parse_mode: 'MarkdownV2',
        }),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should use HTML parse mode for HTML message type', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        '<b>Bold text</b>',
        {
          messageType: QueuedMessageType.HTML,
        },
      );
      await flushPromises();

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        '<b>Bold text</b>',
        expect.objectContaining({
          parse_mode: 'HTML',
        }),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should NOT use internal limiter (uses provided limiter instead)', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();

      // Spy on internal limiter by getting queue status before/after
      const internalQueueBefore = service.getQueueStatus().pendingMessages;

      // Act
      service.sendWithBot(mockExternalBot, mockLimiter, 123456, 'Test message');

      // The internal queue should NOT have increased
      // (message was scheduled via external limiter)
      const internalQueueAfter = service.getQueueStatus().pendingMessages;

      // Assert - internal limiter queue unchanged
      // Note: totalScheduled increases (for stats) but pendingMessages reflects internal limiter
      expect(internalQueueAfter).toBe(internalQueueBefore);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should convert MessagePriority to Bottleneck priority correctly', async () => {
      // Arrange
      const mockExternalBot = createMockBot();
      const mockLimiter = createMockLimiter();
      const scheduleSpy = jest.spyOn(mockLimiter, 'schedule');

      // Act - send CRITICAL priority message
      service.sendWithBot(
        mockExternalBot,
        mockLimiter,
        123456,
        'Critical message',
        { priority: MessagePriority.CRITICAL },
      );

      // Assert - Bottleneck priority 5 for CRITICAL
      expect(scheduleSpy).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 5 }),
        expect.any(Function),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });
  });

  describe('addMessage (existing method - backward compatibility)', () => {
    it('should continue to work independently of sendWithBot', async () => {
      // Arrange - use the injected static bot

      // Act
      const messageId = service.addMessage(
        123456,
        'Test message via addMessage',
      );

      // Assert
      expect(typeof messageId).toBe('string');
      expect(messageId).toMatch(/^[0-9a-f-]{36}$/);

      // Give time for message to be processed
      await flushPromises();

      // Verify it uses the internal (static) bot
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        'Test message via addMessage',
        expect.any(Object),
      );
    });
  });
});
