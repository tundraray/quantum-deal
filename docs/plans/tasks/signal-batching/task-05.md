# Task 5: Batch Message Formatter Service

**Phase**: 4 - Message Formatting
**Verification Level**: L2 (Unit tests pass)
**Estimated Effort**: Medium (2 files: implementation + tests)
**Dependencies**: Task 1 (Interfaces), Task 2 (Template Engine), Task 4 (Templates SQL)

## Task Overview

Implement BatchMessageFormatter service that handles template selection logic (single vs batch), message formatting with TemplateEngine, and 4096-character message splitting.

## Target Files

### Files to Create (2)
1. `libs/framework/src/webhook/batching/batch-message-formatter.service.ts`
2. `libs/framework/src/webhook/batching/__tests__/batch-message-formatter.spec.ts`

## TDD Implementation Steps

### RED: Write Failing Tests First

Create `batch-message-formatter.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { BatchMessageFormatter } from '../batch-message-formatter.service';
import { TemplateEngine } from '../template-engine';
import { LocalizationService } from '@framework/localization';
import { BufferedSignal } from '../signal-batching.interface';

describe('BatchMessageFormatter', () => {
  let formatter: BatchMessageFormatter;
  let mockLocalizationService: jest.Mocked<LocalizationService>;
  let templateEngine: TemplateEngine;

  beforeEach(async () => {
    mockLocalizationService = {
      getMessage: jest.fn(),
    } as any;

    templateEngine = new TemplateEngine();

    const module = await Test.createTestingModule({
      providers: [
        BatchMessageFormatter,
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: TemplateEngine, useValue: templateEngine },
      ],
    }).compile();

    formatter = module.get<BatchMessageFormatter>(BatchMessageFormatter);
  });

  describe('Template selection logic', () => {
    it('should use existing single-signal template when batch has 1 signal', async () => {
      const signals: BufferedSignal[] = [
        {
          order: { symbol: 'EURUSD', profit: 100 },
          eventType: 'open',
          timestamp: new Date(),
          symbol: 'EURUSD',
        },
      ];

      mockLocalizationService.getMessage.mockResolvedValue(
        '🟢 Open signal for {symbol}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should use 'open' template key (existing)
      expect(mockLocalizationService.getMessage).toHaveBeenCalledWith(
        1,
        'open',
        'en',
      );
      expect(result).toHaveLength(1);
    });

    it('should use batch_signals template when batch has 2+ signals', async () => {
      const signals: BufferedSignal[] = [
        {
          order: { symbol: 'EURUSD', profit: 100 },
          eventType: 'open',
          timestamp: new Date(),
          symbol: 'EURUSD',
        },
        {
          order: { symbol: 'GBPUSD', profit: 50 },
          eventType: 'close_plus',
          timestamp: new Date(),
          symbol: 'GBPUSD',
        },
      ];

      mockLocalizationService.getMessage.mockResolvedValue(
        '{{#each signals}}{symbol}\n{{/each}}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should use 'batch_signals' template key
      expect(mockLocalizationService.getMessage).toHaveBeenCalledWith(
        1,
        'batch_signals',
        'en',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('Message splitting - FR-006', () => {
    it('should split message when exceeds 4096 characters', async () => {
      // Create signals that result in >4096 char message
      const signals: BufferedSignal[] = Array.from({ length: 50 }, (_, i) => ({
        order: { symbol: `SYMBOL${i}`, profit: 100 },
        eventType: 'open',
        timestamp: new Date(),
        symbol: `SYMBOL${i}`,
      }));

      const longTemplate = '{{#each signals}}{symbol} ' + 'X'.repeat(100) + '\n{{/each}}';
      mockLocalizationService.getMessage.mockResolvedValue(longTemplate);

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should split into multiple messages
      expect(result.length).toBeGreaterThan(1);

      // Each message should be <= 4096 chars
      for (const msg of result) {
        expect(msg.length).toBeLessThanOrEqual(4096);
      }
    });

    it('should preserve signal order across split messages - FR-006-b', async () => {
      const signals: BufferedSignal[] = Array.from({ length: 50 }, (_, i) => ({
        order: { symbol: `SYM${i}`, profit: 100 },
        eventType: 'open',
        timestamp: new Date(),
        symbol: `SYM${i}`,
      }));

      const template = '{{#each signals}}{index}. {symbol}\n{{/each}}';
      mockLocalizationService.getMessage.mockResolvedValue(template);

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Concatenate all messages and verify order
      const fullText = result.join('');
      for (let i = 0; i < 50; i++) {
        const expectedPattern = `${i + 1}. SYM${i}`;
        expect(fullText).toContain(expectedPattern);
      }
    });
  });

  describe('Signal data transformation', () => {
    it('should format profit correctly', () => {
      const result = formatter['formatProfit'](123.45);
      expect(result).toBe('+$123.45');
    });

    it('should format negative profit correctly', () => {
      const result = formatter['formatProfit'](-50.5);
      expect(result).toBe('-$50.50');
    });

    it('should return correct emoji for each eventType', () => {
      expect(formatter['getSignalEmoji']('open')).toBe('🟢');
      expect(formatter['getSignalEmoji']('close_plus')).toBe('🔵');
      expect(formatter['getSignalEmoji']('close_minus')).toBe('🔴');
      expect(formatter['getSignalEmoji']('close_zero')).toBe('⚪');
      expect(formatter['getSignalEmoji']('tp')).toBe('🟡');
      expect(formatter['getSignalEmoji']('sl')).toBe('🟠');
    });

    it('should return correct display text for eventType', () => {
      expect(formatter['getEventTypeDisplay']('open', 'en')).toBe('Open');
      expect(formatter['getEventTypeDisplay']('close_plus', 'en')).toBe('Close Profit');
      expect(formatter['getEventTypeDisplay']('tp', 'en')).toBe('Take Profit');
    });
  });

  describe('Template data creation', () => {
    it('should create correct template data for signal', () => {
      const signal: BufferedSignal = {
        order: {
          symbol: 'EURUSD',
          profit: 100.5,
          openTime: new Date('2026-01-27T10:30:00Z'),
        },
        eventType: 'open',
        timestamp: new Date('2026-01-27T10:30:00Z'),
        symbol: 'EURUSD',
      };

      const data = formatter['createSignalTemplateData'](signal, 1);

      expect(data.emoji).toBe('🟢');
      expect(data.index).toBe(1);
      expect(data.symbol).toBe('EURUSD');
      expect(data.eventType).toBe('Open');
      expect(data.profit).toBe('+$100.50');
      expect(data.time).toBeDefined();
    });
  });
});
```

**Run tests**: `npm run test -- batch-message-formatter`
**Expected**: All tests fail

### GREEN: Minimal Implementation

Create `batch-message-formatter.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BufferedSignal } from './signal-batching.interface';
import { TemplateEngine } from './template-engine';
import { LocalizationService } from '@framework/localization';

/**
 * Formats batch messages for delivery.
 * Per Design Doc: Template selection based on batch size.
 */
@Injectable()
export class BatchMessageFormatter {
  private readonly logger = new Logger(BatchMessageFormatter.name);
  private readonly MAX_MESSAGE_LENGTH = 4096; // Telegram limit

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly templateEngine: TemplateEngine,
  ) {}

  /**
   * Format signals for delivery.
   * Template selection: 1 signal = existing template, 2+ = batch template.
   *
   * @param signals - Buffered signals to format
   * @param lang - User language
   * @param botId - Bot ID for template resolution
   * @returns Array of formatted messages (may be split if > 4096 chars)
   */
  async formatForDelivery(
    signals: BufferedSignal[],
    lang: string,
    botId: number,
  ): Promise<string[]> {
    if (signals.length === 0) {
      return [];
    }

    if (signals.length === 1) {
      // Use existing single-signal template
      return [await this.formatSingleSignal(signals[0], lang, botId)];
    }

    // Use batch template
    return this.formatBatch(signals, lang, botId);
  }

  /**
   * Format single signal using existing eventType template.
   */
  private async formatSingleSignal(
    signal: BufferedSignal,
    lang: string,
    botId: number,
  ): Promise<string> {
    const template = await this.localizationService.getMessage(
      botId,
      signal.eventType,
      lang,
    );

    // Create data for template
    const data = {
      symbol: signal.symbol,
      profit: this.formatProfit(signal.order.profit),
      // ... other fields from signal.order
    };

    return this.templateEngine.render(template, data);
  }

  /**
   * Format multiple signals using batch_signals template.
   */
  private async formatBatch(
    signals: BufferedSignal[],
    lang: string,
    botId: number,
  ): Promise<string[]> {
    const template = await this.localizationService.getMessage(
      botId,
      'batch_signals',
      lang,
    );

    // Transform signals to template data
    const signalData = signals.map((signal, idx) =>
      this.createSignalTemplateData(signal, idx + 1),
    );

    const data = {
      count: signals.length,
      botName: 'Bot Name', // TODO: Get from bot registry
      signals: signalData,
    };

    const rendered = this.templateEngine.render(template, data);

    // Check if needs splitting
    if (rendered.length <= this.MAX_MESSAGE_LENGTH) {
      return [rendered];
    }

    return this.splitBatchMessage(rendered, signals.length);
  }

  /**
   * Split message at 4096 char boundary preserving structure.
   */
  private splitBatchMessage(message: string, signalCount: number): string[] {
    const messages: string[] = [];
    const lines = message.split('\n');
    let currentMessage = '';

    for (const line of lines) {
      const testMessage = currentMessage + line + '\n';

      if (testMessage.length > this.MAX_MESSAGE_LENGTH) {
        // Save current message and start new one
        if (currentMessage) {
          messages.push(currentMessage.trim());
        }
        currentMessage = line + '\n';
      } else {
        currentMessage = testMessage;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage.trim());
    }

    this.logger.debug(
      `Split batch of ${signalCount} signals into ${messages.length} messages`,
    );

    return messages;
  }

  /**
   * Create template data for a signal.
   */
  private createSignalTemplateData(signal: BufferedSignal, index: number) {
    return {
      emoji: this.getSignalEmoji(signal.eventType),
      index,
      symbol: signal.symbol,
      eventType: this.getEventTypeDisplay(signal.eventType, 'en'),
      profit: this.formatProfit(signal.order.profit),
      time: this.formatTime(signal.timestamp),
    };
  }

  /**
   * Get emoji for signal event type.
   */
  private getSignalEmoji(eventType: string): string {
    const emojiMap: Record<string, string> = {
      open: '🟢',
      close_plus: '🔵',
      close_minus: '🔴',
      close_zero: '⚪',
      tp: '🟡',
      sl: '🟠',
    };
    return emojiMap[eventType] || '⚫';
  }

  /**
   * Get display text for event type.
   */
  private getEventTypeDisplay(eventType: string, lang: string): string {
    // TODO: Localize these
    const displayMap: Record<string, string> = {
      open: 'Open',
      close_plus: 'Close Profit',
      close_minus: 'Close Loss',
      close_zero: 'Close Zero',
      tp: 'Take Profit',
      sl: 'Stop Loss',
    };
    return displayMap[eventType] || eventType;
  }

  /**
   * Format profit with currency.
   */
  private formatProfit(profit: number): string {
    const sign = profit >= 0 ? '+' : '';
    return `${sign}$${profit.toFixed(2)}`;
  }

  /**
   * Format timestamp for display.
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
```

**Run tests**: `npm run test -- batch-message-formatter`
**Expected**: All tests pass

### REFACTOR: Improve Code Quality

- Extract constants for emoji/display maps
- Add error handling for template resolution
- Consider edge cases for splitting logic

## Completion Criteria

- [x] Template selection: 1 signal = existing, 2+ = batch template
- [x] TemplateEngine correctly renders batch_signals template
- [x] Messages exceeding 4096 chars split correctly (FR-006)
- [x] Signal order preserved in split messages (FR-006-b)
- [x] Correct emoji for each eventType
- [x] Unit test coverage >= 80% (33 tests)
- [x] All tests pass

## Test Information

**Test Category**: `@category: core-functionality`
**Test Complexity**: `@complexity: high` (message splitting)
**ROI Scores**: 82 (template selection), 65 (message splitting)

## Dependencies

**Depends on**: Task 1, Task 2, Task 4
**Required by**: Task 7 (SignalService Integration)

## Related Documents

- [Design Doc](../../design/signal-batching-design.md)
- [Overall Design](./_overview.md)
