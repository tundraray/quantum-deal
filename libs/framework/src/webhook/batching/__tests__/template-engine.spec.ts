import { TemplateEngine } from '../template-engine';

/**
 * Unit tests for TemplateEngine
 * Tests mustache-like template processing with {{#each}} loop support
 * and {placeholder} replacement per Design Doc v1.4.
 */
describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('{{#each}} loop iteration', () => {
    it('should iterate over signals array with {{#each signals}}', () => {
      const template = '{{#each signals}}Symbol: {symbol}\n{{/each}}';
      const data = {
        count: 2,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
          {
            index: 2,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'GBPUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Symbol: EURUSD\nSymbol: GBPUSD\n');
    });

    it('should handle empty signals array', () => {
      const template = 'Start\n{{#each signals}}{symbol}\n{{/each}}End';
      const data = {
        count: 0,
        timestamp: '2026.01.27 15:30',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Start\nEnd');
    });

    it('should support nested placeholders in {{#each}} block', () => {
      const template = '{{#each signals}}{index}. {symbol} {type}\n{{/each}}';
      const data = {
        count: 2,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '',
            type: 'OPEN',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
          {
            index: 2,
            event_type: 'close_plus',
            emoji: '',
            type: 'CLOSE +',
            symbol: 'GBPUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('1. EURUSD OPEN');
      expect(result).toContain('2. GBPUSD CLOSE +');
    });

    it('should render all signal properties', () => {
      const template =
        '{{#each signals}}{index}. {emoji} {type} | {symbol}\n   {order_type} @ {price} | TP: {tp} | SL: {sl}\n{{/each}}';
      const data = {
        count: 1,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '🟡',
            type: 'OPEN',
            symbol: '**`EURUSD`**',
            order_type: '#BUY',
            price: '1.085',
            tp: '1.095',
            sl: '1.075',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('1. 🟡 OPEN | **`EURUSD`**');
      expect(result).toContain('#BUY @ 1.085 | TP: 1.095 | SL: 1.075');
    });
  });

  describe('Simple placeholder replacement', () => {
    it('should replace {placeholder} with data values', () => {
      const template = 'Count: {count}, Time: {timestamp}';
      const data = {
        count: 3,
        timestamp: '2026.01.27 15:30',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Count: 3, Time: 2026.01.27 15:30');
    });

    it('should handle multiple placeholders of same key', () => {
      const template = '{count} signals at {timestamp}, total: {count}';
      const data = {
        count: 5,
        timestamp: '2026.01.27 15:30',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('5 signals at 2026.01.27 15:30, total: 5');
    });

    it('should replace top-level placeholders after processing loops', () => {
      const template =
        'Signals ({count}):\n{{#each signals}}{symbol}\n{{/each}}Time: {timestamp}';
      const data = {
        count: 2,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
          {
            index: 2,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'GBPUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('Signals (2):');
      expect(result).toContain('EURUSD');
      expect(result).toContain('GBPUSD');
      expect(result).toContain('Time: 2026.01.27 15:30');
    });
  });

  describe('Unknown placeholder fallback', () => {
    it('should replace unknown placeholders with "N/A"', () => {
      const template = 'Name: {name}, Age: {age}';
      const data = {
        count: 0,
        timestamp: '2026.01.27 15:30',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Name: N/A, Age: N/A');
    });

    it('should replace unknown placeholders in loop with "N/A"', () => {
      const template = '{{#each signals}}{index}. {unknown_field}\n{{/each}}';
      const data = {
        count: 1,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('1. N/A');
    });
  });

  describe('Edge cases', () => {
    it('should handle template with no placeholders', () => {
      const template = 'Static text only';
      const data = {
        count: 0,
        timestamp: '',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Static text only');
    });

    it('should handle empty template', () => {
      const template = '';
      const data = {
        count: 5,
        timestamp: '2026.01.27 15:30',
        signals: [],
      };

      const result = engine.render(template, data);

      expect(result).toBe('');
    });

    it('should handle optional profit field', () => {
      const template =
        '{{#each signals}}{symbol} - Profit: {profit}\n{{/each}}';
      const data = {
        count: 2,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'close_plus',
            emoji: '',
            type: '',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
            profit: '+100',
          },
          {
            index: 2,
            event_type: 'open',
            emoji: '',
            type: '',
            symbol: 'GBPUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('EURUSD - Profit: +100');
      expect(result).toContain('GBPUSD - Profit: N/A');
    });

    it('should handle multiline templates correctly', () => {
      const template = `📊 Signals ({count}):

{{#each signals}}
{index}. {emoji} {type} | {symbol}
{{/each}}

⏱️ {timestamp}`;

      const data = {
        count: 2,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '🟡',
            type: 'OPEN',
            symbol: 'EURUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
          {
            index: 2,
            event_type: 'close_plus',
            emoji: '🟢',
            type: 'CLOSE +',
            symbol: 'GBPUSD',
            order_type: '',
            price: '',
            tp: '',
            sl: '',
          },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('📊 Signals (2):');
      expect(result).toContain('1. 🟡 OPEN | EURUSD');
      expect(result).toContain('2. 🟢 CLOSE + | GBPUSD');
      expect(result).toContain('⏱️ 2026.01.27 15:30');
    });
  });

  describe('Full template rendering (integration)', () => {
    it('should render complete batch template per Design Doc', () => {
      const template = `📊 Signal Batch ({count}):

{{#each signals}}
{index}. {emoji} {type} | {symbol}
   {order_type} @ {price} | TP: {tp} | SL: {sl}
{{/each}}

⏱️ {timestamp}`;

      const data = {
        count: 3,
        timestamp: '2026.01.27 15:30',
        signals: [
          {
            index: 1,
            event_type: 'open',
            emoji: '🟡',
            type: 'OPEN',
            symbol: '**`EURUSD.a`**',
            order_type: '#BUY',
            price: '1.085',
            tp: '1.095',
            sl: '1.075',
          },
          {
            index: 2,
            event_type: 'close_plus',
            emoji: '🟢',
            type: 'CLOSE +',
            symbol: '**`BTCUSD.a`**',
            order_type: '#BUY',
            price: '58000',
            tp: '59000',
            sl: '57000',
          },
          {
            index: 3,
            event_type: 'close_minus',
            emoji: '🔴',
            type: 'CLOSE -',
            symbol: '**`GBPUSD.a`**',
            order_type: '#SELL',
            price: '1.265',
            tp: '1.255',
            sl: '1.275',
          },
        ],
      };

      const result = engine.render(template, data);

      // Verify header
      expect(result).toContain('📊 Signal Batch (3):');

      // Verify all signals rendered
      expect(result).toContain('1. 🟡 OPEN | **`EURUSD.a`**');
      expect(result).toContain('#BUY @ 1.085 | TP: 1.095 | SL: 1.075');
      expect(result).toContain('2. 🟢 CLOSE + | **`BTCUSD.a`**');
      expect(result).toContain('3. 🔴 CLOSE - | **`GBPUSD.a`**');

      // Verify timestamp
      expect(result).toContain('⏱️ 2026.01.27 15:30');
    });
  });
});
