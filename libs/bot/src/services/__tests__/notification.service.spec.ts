import { Test, TestingModule } from '@nestjs/testing';
import Bottleneck from 'bottleneck';
import { Telegraf } from 'telegraf';
import { NotificationService } from '../notification.service';
import { BotsRepository, BotUsersRepository } from '@quantumdeal/db';
import { getBotToken, DynamicTelegrafService } from '@quantumdeal/telegraf';
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
  let mockBotsRepository: Partial<BotsRepository>;
  let mockBotUsersRepository: Partial<BotUsersRepository>;
  let mockDynamicTelegrafService: Partial<DynamicTelegrafService>;

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

    // Create mock repositories
    mockBotsRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1, isDynamic: false }),
    };

    mockBotUsersRepository = {
      deactivate: jest.fn().mockResolvedValue(undefined),
    };

    mockDynamicTelegrafService = {
      getBot: jest.fn().mockReturnValue(null),
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
          provide: BotsRepository,
          useValue: mockBotsRepository,
        },
        {
          provide: BotUsersRepository,
          useValue: mockBotUsersRepository,
        },
        {
          provide: DynamicTelegrafService,
          useValue: mockDynamicTelegrafService,
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
      const mockLimiter = createMockLimiter();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const scheduleSpy = jest.spyOn(mockLimiter, 'schedule');

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message');

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

    it('AC-009: should send via static bot for non-dynamic bot', async () => {
      // Arrange
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message');
      await flushPromises();

      // Assert - should use static bot (mockBot) since isDynamic is false
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        123456,
        'Test message',
        expect.any(Object),
      );

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('AC-009: should return unique message ID string', async () => {
      // Arrange
      const mockLimiter = createMockLimiter();

      // Act
      const messageId = service.sendWithBot(
        mockLimiter,
        123456,
        1,
        'Test message',
      );

      // Assert
      expect(typeof messageId).toBe('string');
      expect(messageId).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      // Act again to verify uniqueness
      const messageId2 = service.sendWithBot(
        mockLimiter,
        123456,
        1,
        'Another message',
      );

      expect(messageId).not.toBe(messageId2);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('AC-009: should log to Sentry on send failure', async () => {
      // Arrange
      mockBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message', {
        maxRetries: 0,
      });
      await flushPromises();

      // Assert
      expect(Sentry.captureException).toHaveBeenCalled();

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.totalScheduled on message schedule', () => {
      // Arrange
      const mockLimiter = createMockLimiter();
      const initialScheduled = service.getQueueStatus().totalMessages;

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message');

      // Assert
      expect(service.getQueueStatus().totalMessages).toBe(initialScheduled + 1);

      // Cleanup (async, no await needed for test)
      void mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.successCount on successful send', async () => {
      // Arrange
      const mockLimiter = createMockLimiter();
      const initialSuccess = service.getQueueStatus().sentMessages;

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message');
      await flushPromises();

      // Assert
      expect(service.getQueueStatus().sentMessages).toBe(initialSuccess + 1);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should update messageStats.failureCount on permanent error', async () => {
      // Arrange
      mockBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('bot was blocked by the user'));
      const mockLimiter = createMockLimiter();
      const initialFailures = service.getQueueStatus().failedMessages;

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message', {
        maxRetries: 0,
      });
      await flushPromises();

      // Assert
      expect(service.getQueueStatus().failedMessages).toBe(initialFailures + 1);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should deactivate user on permanent error', async () => {
      // Arrange
      mockBot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('bot was blocked by the user'));
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message', {
        maxRetries: 0,
      });
      await flushPromises();

      // Assert
      expect(mockBotUsersRepository.deactivate).toHaveBeenCalledWith(123456, 1);

      // Cleanup
      await mockLimiter.stop({ dropWaitingJobs: true });
    });

    it('should use provided message options', async () => {
      // Arrange
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, '**Bold text**', {
        messageType: QueuedMessageType.MARKDOWN,
        priority: MessagePriority.HIGH,
        maxRetries: 5,
      });
      await flushPromises();

      // Assert - Verify the message was sent with MarkdownV2 parse mode
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
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
      const mockLimiter = createMockLimiter();

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, '<b>Bold text</b>', {
        messageType: QueuedMessageType.HTML,
      });
      await flushPromises();

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
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
      const mockLimiter = createMockLimiter();

      // Spy on internal limiter by getting queue status before/after
      const internalQueueBefore = service.getQueueStatus().pendingMessages;

      // Act
      service.sendWithBot(mockLimiter, 123456, 1, 'Test message');

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
      const mockLimiter = createMockLimiter();
      const scheduleSpy = jest.spyOn(mockLimiter, 'schedule');

      // Act - send CRITICAL priority message
      service.sendWithBot(mockLimiter, 123456, 1, 'Critical message', {
        priority: MessagePriority.CRITICAL,
      });

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
        1,
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
