# Task 2: Template Engine Implementation

**Phase**: 2 - Template Engine
**Verification Level**: L2 (Unit tests pass)
**Estimated Effort**: Medium (2 files: implementation + tests)
**Dependencies**: Task 1 (Interface Definitions)

## Task Overview

Implement a mustache-like template processing engine with `{{#each signals}}...{{/each}}` loop support and simple placeholder replacement. This engine will be used by BatchMessageFormatter to render batch message templates.

## Target Files

### Files to Create (2)
1. `libs/framework/src/webhook/batching/template-engine.ts` - TemplateEngine class
2. `libs/framework/src/webhook/batching/__tests__/template-engine.spec.ts` - Unit tests

## TDD Implementation Steps

### RED: Write Failing Tests First

Create `template-engine.spec.ts` with test cases:

```typescript
import { TemplateEngine } from '../template-engine';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('{{#each}} loop iteration', () => {
    it('should iterate over signals array with {{#each signals}}', () => {
      const template = '{{#each signals}}Symbol: {symbol}\n{{/each}}';
      const data = {
        signals: [
          { symbol: 'EURUSD', profit: 100 },
          { symbol: 'GBPUSD', profit: 50 },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toBe('Symbol: EURUSD\nSymbol: GBPUSD\n');
    });

    it('should handle empty signals array', () => {
      const template = 'Start\n{{#each signals}}{symbol}\n{{/each}}End';
      const data = { signals: [] };

      const result = engine.render(template, data);

      expect(result).toBe('Start\nEnd');
    });

    it('should support nested placeholders in {{#each}} block', () => {
      const template = '{{#each signals}}{index}. {symbol} {eventType}\n{{/each}}';
      const data = {
        signals: [
          { index: 1, symbol: 'EURUSD', eventType: 'open' },
          { index: 2, symbol: 'GBPUSD', eventType: 'close_plus' },
        ],
      };

      const result = engine.render(template, data);

      expect(result).toContain('1. EURUSD open');
      expect(result).toContain('2. GBPUSD close_plus');
    });
  });

  describe('Simple placeholder replacement', () => {
    it('should replace {placeholder} with data values', () => {
      const template = 'Hello {name}, your total is {total}';
      const data = { name: 'John', total: '150' };

      const result = engine.render(template, data);

      expect(result).toBe('Hello John, your total is 150');
    });

    it('should handle multiple placeholders of same key', () => {
      const template = '{symbol} - Price: {price}, Symbol: {symbol}';
      const data = { symbol: 'EURUSD', price: '1.0950' };

      const result = engine.render(template, data);

      expect(result).toBe('EURUSD - Price: 1.0950, Symbol: EURUSD');
    });
  });

  describe('Unknown placeholder fallback', () => {
    it('should replace unknown placeholders with "N/A"', () => {
      const template = 'Name: {name}, Age: {age}, City: {city}';
      const data = { name: 'John' };

      const result = engine.render(template, data);

      expect(result).toBe('Name: John, Age: N/A, City: N/A');
    });
  });

  describe('Edge cases', () => {
    it('should handle template with no placeholders', () => {
      const template = 'Static text only';
      const data = {};

      const result = engine.render(template, data);

      expect(result).toBe('Static text only');
    });

    it('should handle empty template', () => {
      const template = '';
      const data = { key: 'value' };

      const result = engine.render(template, data);

      expect(result).toBe('');
    });
  });
});
```

**Run tests**: `npm run test -- template-engine`
**Expected**: All tests fail (engine not implemented yet)

### GREEN: Minimal Implementation

Create `template-engine.ts` with minimal implementation to pass tests:

```typescript
/**
 * Template engine for batch message formatting.
 * Supports {{#each}} loops and {placeholder} replacement.
 * Per Design Doc: Single template with {{#each signals}} iteration.
 */

export interface TemplateData {
  [key: string]: any;
}

export class TemplateEngine {
  /**
   * Render template with data.
   *
   * @param template - Template string with {{#each}} blocks and {placeholders}
   * @param data - Data object for placeholder replacement
   * @returns Rendered string
   */
  render(template: string, data: TemplateData): string {
    if (!template) {
      return '';
    }

    // Process {{#each}} blocks first
    let result = this.processEachBlocks(template, data);

    // Then process simple placeholders
    result = this.replacePlaceholders(result, data);

    return result;
  }

  /**
   * Process {{#each arrayName}}...{{/each}} blocks.
   */
  private processEachBlocks(template: string, data: TemplateData): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (match, arrayName, blockContent) => {
      const array = data[arrayName];

      if (!Array.isArray(array)) {
        return ''; // No array, remove block
      }

      if (array.length === 0) {
        return ''; // Empty array, remove block
      }

      // Render block for each item
      return array
        .map((item) => this.replacePlaceholders(blockContent, item))
        .join('');
    });
  }

  /**
   * Replace {placeholder} with values from data.
   * Unknown placeholders become "N/A".
   */
  private replacePlaceholders(text: string, data: TemplateData): string {
    const placeholderRegex = /\{(\w+)\}/g;

    return text.replace(placeholderRegex, (match, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : 'N/A';
    });
  }
}
```

**Run tests**: `npm run test -- template-engine`
**Expected**: All tests pass

### REFACTOR: Improve Code Quality

Review and refactor if needed:
- Extract constants if any magic values exist
- Add JSDoc comments for clarity
- Consider edge case handling
- Ensure single responsibility per method

**Run tests after refactoring**: All tests must still pass.

## Completion Criteria

- [x] TemplateEngine correctly processes `{{#each signals}}...{{/each}}` loops
- [x] All placeholders `{key}` replaced correctly with data values
- [x] Unknown placeholders become "N/A"
- [x] Empty signals array results in empty string (block removed)
- [x] Unit test coverage >= 80% for template-engine.ts (100% achieved)
- [x] All unit tests pass: `npm run test -- template-engine` (14 tests pass)
- [x] Code follows single responsibility principle
- [x] Clear JSDoc comments on public methods

## Verification Procedures

### Unit Test Execution
```bash
npm run test -- template-engine
```
**Expected**: All tests pass, coverage >= 80%

### Manual Template Test
```typescript
const engine = new TemplateEngine();
const template = '{{#each signals}}{index}. {symbol}\n{{/each}}';
const data = {
  signals: [
    { index: 1, symbol: 'EURUSD' },
    { index: 2, symbol: 'GBPUSD' },
  ],
};
console.log(engine.render(template, data));
// Expected output:
// 1. EURUSD
// 2. GBPUSD
```

### Coverage Report
```bash
npm run test:coverage -- template-engine
```
**Expected**: >= 80% coverage for template-engine.ts

## Test Information

**Test Category**: `@category: core-functionality`
**Test Complexity**: `@complexity: medium` (loop processing logic)
**Test Dependencies**: None (pure function)
**ROI**: N/A (new implementation, not in test skeleton)

**Acceptance Criteria Coverage**:
- Design Doc: "Supports {{#each signals}}...{{/each}} for iteration"
- Design Doc: "Unknown placeholders become N/A"

## Dependencies

**Depends on**: Task 1 (Interface Definitions) - uses TemplateData interface
**Required by**: Task 5 (Batch Message Formatter) - uses TemplateEngine.render()

## Notes

### Implementation Considerations
- **Simple regex-based processing**: Sufficient for our use case (no nested loops needed)
- **No HTML escaping**: We're rendering plain text for Telegram
- **No partials/helpers**: YAGNI - implement only what's needed

### Design Decisions
- **N/A fallback**: Prevents broken messages from missing data
- **Empty array handling**: Removes block entirely (cleaner output)
- **Order of processing**: {{#each}} first, then placeholders (correct for nested placeholders)

### Alternative Approaches Considered
- Use full mustache library (handlebars/mustache.js): Rejected - overkill for simple {{#each}} loop
- Custom AST parsing: Rejected - regex sufficient for our simple templates

## Related Documents

- [Design Doc](../../design/signal-batching-design.md) - Section "Template Engine Specification"
- [Overall Design](./_overview.md) - Common processing points
- [Task 5](./task-05.md) - Consumer of TemplateEngine
