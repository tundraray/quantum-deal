/**
 * Unit tests for BatchMessageFormatter
 *
 * Tests batch message formatting per Design Doc v1.4:
 * - Template selection: 1 signal = existing template, 2+ = batch_signals
 * - Message splitting at 4096 chars (FR-006)
 * - Signal order preservation (FR-006-b)
 * - Signal data transformation (emoji, profit, event type)
 *
 * @see docs/design/signal-batching-design.md v1.4
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BatchMessageFormatter } from '../batch-message-formatter.service';
import { TemplateEngine } from '../template-engine';
import { LocalizationService } from '../../../localization';
import type { BufferedSignal } from '../signal-batching.interface';
import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * Creates a mock MergedOrder for testing.
 */
function createMockOrder(overrides: Partial<MergedOrder> = {}): MergedOrder {
  return {
    ticketId: 123456,
    symbol: 'EURUSD',
    orderType: 'BUY',
    lots: 0.1,
    openPrice: 1.1234,
    closePrice: 1.1345,
    profit: 100.5,
    takeProfit: 1.14,
    stopLoss: 1.11,
    account: 'test-account',
    broker: 'test-broker',
    schemaVersion: '1.0',
    eaVersion: '1.0',
    eventTimestamp: new Date('2026-01-27T10:30:00Z'),
    oldTakeProfit: 0,
    oldStopLoss: 0,
    ...overrides,
  } as MergedOrder;
}

/**
 * Creates a mock BufferedSignal for testing.
 * Accepts order overrides as Partial<MergedOrder> for convenience.
 */
function createMockSignal(
  eventType: MessageType,
  overrides: { order?: Partial<MergedOrder>; bufferedAt?: number } = {},
): BufferedSignal {
  return {
    order: createMockOrder(overrides.order),
    eventType,
    bufferedAt: overrides.bufferedAt ?? Date.now(),
  };
}

describe('BatchMessageFormatter', () => {
  let formatter: BatchMessageFormatter;
  let mockLocalizationService: jest.Mocked<LocalizationService>;
  let mockLocalizationContext: {
    lang: jest.Mock;
    t: jest.Mock;
    use: jest.Mock;
  };
  let module: TestingModule;

  beforeEach(async () => {
    // Create mock localization context with fluent API
    mockLocalizationContext = {
      lang: jest.fn().mockReturnThis(),
      t: jest.fn(),
      use: jest.fn().mockReturnThis(),
    };

    // Create mock LocalizationService
    mockLocalizationService = {
      forBot: jest.fn().mockReturnValue(mockLocalizationContext),
      registerI18n: jest.fn(),
    } as unknown as jest.Mocked<LocalizationService>;

    module = await Test.createTestingModule({
      providers: [
        BatchMessageFormatter,
        { provide: LocalizationService, useValue: mockLocalizationService },
        TemplateEngine,
      ],
    }).compile();

    formatter = module.get<BatchMessageFormatter>(BatchMessageFormatter);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Template selection logic', () => {
    it('should use existing single-signal template when batch has 1 signal', async () => {
      const signals: BufferedSignal[] = [
        createMockSignal('open', { order: { symbol: 'EURUSD', profit: 100 } }),
      ];

      // Mock localization to return single-signal template with placeholders
      mockLocalizationContext.t.mockResolvedValue(
        'Open signal: {symbol} at {open_price}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should use 'open' template key (existing single-signal template)
      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(1);
      expect(mockLocalizationContext.lang).toHaveBeenCalledWith('en');
      // Template is retrieved without interpolation params - replacePlaceholders handles substitution
      expect(mockLocalizationContext.t).toHaveBeenCalledWith('open');
      expect(result).toHaveLength(1);
      // Verify placeholders were replaced
      expect(result[0]).toContain('**`EURUSD`**'); // Symbol formatted with markdown
    });

    it('should use batch_signals template when batch has 2+ signals', async () => {
      const signals: BufferedSignal[] = [
        createMockSignal('open', { order: { symbol: 'EURUSD', profit: 100 } }),
        createMockSignal('close_plus', {
          order: { symbol: 'GBPUSD', profit: 50 },
        }),
      ];

      // Mock localization to return batch template
      mockLocalizationContext.t.mockResolvedValue(
        '{{#each signals}}{emoji} {symbol}\n{{/each}}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should use 'batch_signals' template key
      expect(mockLocalizationContext.t).toHaveBeenCalledWith('batch_signals');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no signals provided', async () => {
      const result = await formatter.formatForDelivery([], 'en', 1);

      expect(result).toEqual([]);
      expect(mockLocalizationService.forBot).not.toHaveBeenCalled();
    });
  });

  describe('Message splitting - FR-006', () => {
    it('should split message when exceeds 4096 characters', async () => {
      // Create many signals that result in >4096 char message
      const signals: BufferedSignal[] = Array.from({ length: 50 }, (_, i) =>
        createMockSignal('open', {
          order: { symbol: `SYMBOL${i.toString().padStart(2, '0')}` },
          bufferedAt: Date.now() + i,
        }),
      );

      // Mock template that generates long output per signal
      const longSignalTemplate =
        '{{#each signals}}{index}. {emoji} {symbol} - ' +
        'X'.repeat(100) +
        '\n{{/each}}';
      mockLocalizationContext.t.mockResolvedValue(longSignalTemplate);

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should split into multiple messages
      expect(result.length).toBeGreaterThan(1);

      // Each message should be <= 4096 chars
      for (const msg of result) {
        expect(msg.length).toBeLessThanOrEqual(4096);
      }
    });

    it('should preserve signal order across split messages - FR-006-b', async () => {
      const signals: BufferedSignal[] = Array.from({ length: 30 }, (_, i) =>
        createMockSignal('open', {
          order: { symbol: `SYM${i.toString().padStart(2, '0')}` },
          bufferedAt: Date.now() + i,
        }),
      );

      // Mock template with numbered signals
      const template = '{{#each signals}}{index}. {symbol}\n{{/each}}';
      mockLocalizationContext.t.mockResolvedValue(template);

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Concatenate all messages and verify order
      const fullText = result.join('\n');
      for (let i = 0; i < 30; i++) {
        // Symbol is wrapped in markdown backticks by createSignalTemplateData
        const expectedPattern = `${i + 1}. \`SYM${i.toString().padStart(2, '0')}\``;
        expect(fullText).toContain(expectedPattern);
      }
    });

    it('should not split message when under 4096 characters', async () => {
      const signals: BufferedSignal[] = [
        createMockSignal('open', { order: { symbol: 'EURUSD' } }),
        createMockSignal('close_plus', { order: { symbol: 'GBPUSD' } }),
      ];

      // Short template
      mockLocalizationContext.t.mockResolvedValue(
        '{{#each signals}}{symbol}\n{{/each}}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      expect(result).toHaveLength(1);
      expect(result[0].length).toBeLessThan(4096);
    });
  });

  describe('Signal data transformation', () => {
    describe('formatProfit', () => {
      it('should format positive profit with + sign', () => {
        const result = formatter['formatProfit'](123.45);
        expect(result).toBe('+$123.45');
      });

      it('should format negative profit with - sign', () => {
        const result = formatter['formatProfit'](-50.5);
        expect(result).toBe('-$50.50');
      });

      it('should format zero profit with + sign', () => {
        const result = formatter['formatProfit'](0);
        expect(result).toBe('+$0.00');
      });

      it('should format profit with proper decimal places', () => {
        const result = formatter['formatProfit'](100);
        expect(result).toBe('+$100.00');
      });
    });

    describe('getSignalEmoji', () => {
      it('should return green circle for open', () => {
        expect(formatter['getSignalEmoji']('open')).toBe('\uD83D\uDFE2');
      });

      it('should return blue circle for close_plus', () => {
        expect(formatter['getSignalEmoji']('close_plus')).toBe('\uD83D\uDD35');
      });

      it('should return red circle for close_minus', () => {
        expect(formatter['getSignalEmoji']('close_minus')).toBe('\uD83D\uDD34');
      });

      it('should return purple circle for position_sltp_update', () => {
        expect(formatter['getSignalEmoji']('position_sltp_update')).toBe(
          '\uD83D\uDFE3',
        );
      });

      it('should return white circle for close_zero (legacy)', () => {
        // close_zero is a legacy type, handled as string
        expect(formatter['getSignalEmoji']('close_zero' as string)).toBe(
          '\u26AA',
        );
      });

      it('should return yellow circle for tp (legacy)', () => {
        // tp is a legacy type, handled as string
        expect(formatter['getSignalEmoji']('tp' as string)).toBe(
          '\uD83D\uDFE1',
        );
      });

      it('should return orange circle for sl (legacy)', () => {
        // sl is a legacy type, handled as string
        expect(formatter['getSignalEmoji']('sl' as string)).toBe(
          '\uD83D\uDFE0',
        );
      });

      it('should return black circle for unknown event type', () => {
        expect(formatter['getSignalEmoji']('unknown' as string)).toBe('\u26AB');
      });
    });

    describe('getEventTypeDisplay', () => {
      it('should return "OPEN" for open event', () => {
        expect(formatter['getEventTypeDisplay']('open')).toBe('OPEN');
      });

      it('should return "CLOSE +" for close_plus event', () => {
        expect(formatter['getEventTypeDisplay']('close_plus')).toBe('CLOSE +');
      });

      it('should return "CLOSE -" for close_minus event', () => {
        expect(formatter['getEventTypeDisplay']('close_minus')).toBe('CLOSE -');
      });

      it('should return "SL/TP UPDATE" for position_sltp_update event', () => {
        expect(formatter['getEventTypeDisplay']('position_sltp_update')).toBe(
          'SL/TP UPDATE',
        );
      });

      it('should return "CLOSE 0" for close_zero event (legacy)', () => {
        expect(formatter['getEventTypeDisplay']('close_zero' as string)).toBe(
          'CLOSE 0',
        );
      });

      it('should return "TP" for tp event (legacy)', () => {
        expect(formatter['getEventTypeDisplay']('tp' as string)).toBe('TP');
      });

      it('should return "SL" for sl event (legacy)', () => {
        expect(formatter['getEventTypeDisplay']('sl' as string)).toBe('SL');
      });
    });
  });

  describe('Template data creation', () => {
    it('should create correct template data for signal', () => {
      const signal: BufferedSignal = {
        order: createMockOrder({
          symbol: 'EURUSD',
          profit: 100.5,
          openPrice: 1.1234,
          orderType: 'BUY',
          takeProfit: 1.14,
          stopLoss: 1.11,
        }),
        eventType: 'open',
        bufferedAt: Date.now(),
      };

      const data = formatter['createSignalTemplateData'](signal, 1);

      expect(data.emoji).toBe('\uD83D\uDFE2'); // Green circle
      expect(data.index).toBe(1);
      expect(data.symbol).toBe('`EURUSD`');
      expect(data.type).toBe('OPEN');
      expect(data.order_type).toBe('#BUY');
      expect(data.price).toBeDefined();
      expect(data.tp).toBeDefined();
      expect(data.sl).toBeDefined();
    });

    it('should include profit for close events', () => {
      const signal: BufferedSignal = {
        order: createMockOrder({
          symbol: 'EURUSD',
          profit: 150.75,
        }),
        eventType: 'close_plus',
        bufferedAt: Date.now(),
      };

      const data = formatter['createSignalTemplateData'](signal, 1);

      expect(data.profit).toBe('+$150.75');
    });

    it('should preserve chronological index across signals', () => {
      const signals: BufferedSignal[] = [
        createMockSignal('open', { bufferedAt: 1000 }),
        createMockSignal('close_plus', { bufferedAt: 2000 }),
        createMockSignal('position_sltp_update', { bufferedAt: 3000 }),
      ];

      const data1 = formatter['createSignalTemplateData'](signals[0], 1);
      const data2 = formatter['createSignalTemplateData'](signals[1], 2);
      const data3 = formatter['createSignalTemplateData'](signals[2], 3);

      expect(data1.index).toBe(1);
      expect(data2.index).toBe(2);
      expect(data3.index).toBe(3);
    });
  });

  describe('Full formatting flow', () => {
    it('should correctly format batch with TemplateEngine', async () => {
      const signals: BufferedSignal[] = [
        createMockSignal('open', { order: { symbol: 'EURUSD' } }),
        createMockSignal('close_plus', { order: { symbol: 'GBPUSD' } }),
      ];

      // Mock batch template
      mockLocalizationContext.t.mockResolvedValue(
        'Signals ({count}):\n{{#each signals}}{index}. {emoji} {symbol}\n{{/each}}',
      );

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Signals (2):');
      expect(result[0]).toContain('1.');
      expect(result[0]).toContain('2.');
      expect(result[0]).toContain('`EURUSD`');
      expect(result[0]).toContain('`GBPUSD`');
    });

    it('should pass correct user language to localization service', async () => {
      const signals: BufferedSignal[] = [createMockSignal('open')];
      mockLocalizationContext.t.mockResolvedValue('Template {symbol}');

      await formatter.formatForDelivery(signals, 'ru', 1);

      expect(mockLocalizationContext.lang).toHaveBeenCalledWith('ru');
    });

    it('should pass correct bot ID to localization service', async () => {
      const signals: BufferedSignal[] = [createMockSignal('open')];
      mockLocalizationContext.t.mockResolvedValue('Template {symbol}');

      await formatter.formatForDelivery(signals, 'en', 42);

      expect(mockLocalizationService.forBot).toHaveBeenCalledWith(42);
    });
  });

  describe('Edge cases', () => {
    it('should handle signals with missing optional order fields', async () => {
      const signal: BufferedSignal = {
        order: createMockOrder({
          takeProfit: undefined,
          stopLoss: undefined,
          profit: undefined,
        }),
        eventType: 'open',
        bufferedAt: Date.now(),
      };

      const data = formatter['createSignalTemplateData'](signal, 1);

      // Should have fallback values
      expect(data.tp).toBeDefined();
      expect(data.sl).toBeDefined();
    });

    it('should handle localization service returning key on error', async () => {
      const signals: BufferedSignal[] = [createMockSignal('open')];

      // LocalizationService returns key when translation not found
      mockLocalizationContext.t.mockResolvedValue('open');

      const result = await formatter.formatForDelivery(signals, 'en', 1);

      // Should still return a result (graceful degradation)
      expect(result).toHaveLength(1);
    });
  });
});
