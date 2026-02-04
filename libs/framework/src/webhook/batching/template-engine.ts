/**
 * Template Engine for Batch Message Formatting
 *
 * Simple mustache-like template processor with {{#each}} loop and conditional blocks.
 * Used by BatchMessageFormatter to render batch signal messages.
 *
 * @module template-engine
 * @see docs/design/signal-batching-design.md v1.4 - TemplateEngine Specification
 */

/**
 * Template data for batch message rendering.
 * Top-level placeholders available outside {{#each}} blocks.
 */
export interface BatchTemplateData {
  /** Number of signals in the batch */
  count: number;
  /** Formatted timestamp string */
  timestamp: string;
  /** Array of signal data for iteration */
  signals: SignalTemplateData[];
}

/**
 * Template data for individual signal items.
 * Placeholders available inside {{#each signals}} blocks.
 */
export interface SignalTemplateData {
  /** 1-based index of signal in batch */
  index: number;
  /** Raw event type for conditionals (open, close_plus, close_minus, position_sltp_update) */
  event_type: string;
  /** Event-specific emoji (e.g., OPEN, CLOSE +, CLOSE -) */
  emoji: string;
  /** Formatted event type (e.g., "OPEN", "CLOSE +") */
  type: string;
  /** Trading symbol with markdown formatting */
  symbol: string;
  /** Order type indicator (e.g., "#BUY", "#SELL") */
  order_type: string;
  /** Entry or close price */
  price: string;
  /** Take profit price */
  tp: string;
  /** Stop loss price */
  sl: string;
  /** Old take profit (for SL/TP update events) */
  old_tp?: string;
  /** Old stop loss (for SL/TP update events) */
  old_sl?: string;
  /** Formatted profit with +/- sign (optional, for close events) */
  profit?: string;
}

/**
 * TemplateEngine - Simple mustache-like template processor.
 *
 * Supports:
 * - {{#each signals}}...{{/each}} for array iteration
 * - {{#open}}...{{/open}} conditional blocks (renders only for open events)
 * - {{#close_plus}}...{{/close_plus}} conditional blocks
 * - {{#close_minus}}...{{/close_minus}} conditional blocks
 * - {{#position_sltp_update}}...{{/position_sltp_update}} conditional blocks
 * - {placeholder} for simple value substitution
 * - Unknown placeholders become "N/A"
 *
 * @example
 * ```typescript
 * const engine = new TemplateEngine();
 * const template = `{{#each signals}}
 * {{#open}}🟢 OPEN {symbol}{{/open}}
 * {{#close_plus}}🔵 WIN {symbol} +{profit}{{/close_plus}}
 * {{/each}}`;
 * ```
 */
/**
 * Supported event types for conditional blocks.
 */
const CONDITIONAL_EVENT_TYPES = [
  'open',
  'close_plus',
  'close_minus',
  'close_zero',
  'position_sltp_update',
  'tp',
  'sl',
] as const;

export class TemplateEngine {
  /**
   * Render a template with data.
   *
   * Processing order:
   * 1. Process {{#each signals}}...{{/each}} blocks first
   * 2. Replace top-level {placeholder} values
   *
   * @param template - Template string with {{#each}} blocks and {placeholder} syntax
   * @param data - BatchTemplateData object with values to substitute
   * @returns Rendered string with all placeholders replaced
   */
  render(template: string, data: BatchTemplateData): string {
    if (!template) {
      return '';
    }

    // Step 1: Process {{#each signals}}...{{/each}} blocks
    let result = this.processEachBlocks(template, data);

    // Step 2: Replace top-level {placeholders} with data values
    result = this.replaceTopLevelPlaceholders(result, data);

    return result;
  }

  /**
   * Process {{#each signals}}...{{/each}} blocks.
   * Iterates over the signals array and renders the block content for each item.
   * Handles conditional blocks {{#event_type}}...{{/event_type}} inside each iteration.
   *
   * @param template - Template string with {{#each}} blocks
   * @param data - BatchTemplateData containing signals array
   * @returns Template with {{#each}} blocks replaced by rendered content
   */
  private processEachBlocks(template: string, data: BatchTemplateData): string {
    // Regex to match {{#each signals}}...{{/each}} blocks
    // Uses [\s\S] to match any character including newlines
    const eachRegex = /\{\{#each\s+signals\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (_, blockContent: string) => {
      const signals = data.signals;

      if (!Array.isArray(signals) || signals.length === 0) {
        return ''; // Empty array or not an array - remove block entirely
      }

      // Render block for each signal item
      return signals
        .map((signal) => {
          // First process conditional blocks for this signal's event type
          let processedBlock = this.processConditionalBlocks(
            blockContent,
            signal.event_type,
          );

          // Then replace placeholders
          return this.replacePlaceholders(
            processedBlock,
            signal as unknown as Record<string, string | number | undefined>,
          );
        })
        .join('');
    });
  }

  /**
   * Process conditional blocks {{#event_type}}...{{/event_type}}.
   * Only renders content if signal's event_type matches the block type.
   *
   * @param content - Block content with potential conditional blocks
   * @param eventType - Current signal's event type
   * @returns Content with conditionals processed
   */
  private processConditionalBlocks(content: string, eventType: string): string {
    let result = content;

    for (const condType of CONDITIONAL_EVENT_TYPES) {
      // Regex to match {{#type}}...{{/type}} blocks
      const condRegex = new RegExp(
        `\\{\\{#${condType}\\}\\}([\\s\\S]*?)\\{\\{\\/${condType}\\}\\}`,
        'g',
      );

      result = result.replace(condRegex, (_, blockContent: string) => {
        // Only render if event type matches
        if (eventType === condType) {
          return blockContent;
        }
        return ''; // Remove block if not matching
      });
    }

    return result;
  }

  /**
   * Replace top-level {placeholders} with values from data.
   * Only replaces count and timestamp from BatchTemplateData.
   *
   * @param template - Template string after {{#each}} processing
   * @param data - BatchTemplateData containing top-level values
   * @returns Template with top-level placeholders replaced
   */
  private replaceTopLevelPlaceholders(
    template: string,
    data: BatchTemplateData,
  ): string {
    // Create a map of top-level placeholder values
    const topLevelValues: Record<string, string | number> = {
      count: data.count,
      timestamp: data.timestamp,
    };

    return this.replacePlaceholders(template, topLevelValues);
  }

  /**
   * Replace {placeholder} with values from the provided object.
   * Unknown placeholders are replaced with "N/A".
   *
   * @param text - Text containing {placeholder} syntax
   * @param values - Object with placeholder values
   * @returns Text with all placeholders replaced
   */
  private replacePlaceholders(
    text: string,
    values: Record<string, string | number | undefined>,
  ): string {
    // Regex to match {placeholder} syntax (word characters only)
    const placeholderRegex = /\{(\w+)\}/g;

    let result = text.replace(placeholderRegex, (match, key: string) => {
      const value = values[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
      // Mark for N/A replacement - unknown placeholder
      return match; // Keep original for now
    });

    // Replace any remaining unmatched placeholders with N/A
    result = result.replace(/\{[^}]+\}/g, 'N/A');

    return result;
  }
}
