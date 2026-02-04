/**
 * Batch Message Formatter Service
 *
 * Formats batch messages for delivery with template selection and message splitting.
 * Per Design Doc v1.4: Template selection based on batch size.
 *
 * Key features:
 * - 1 signal = existing single-signal template
 * - 2+ signals = batch_signals template with {{#each}} loop
 * - Auto-split at 4096 chars (Telegram limit) - FR-006
 * - Signal order preservation - FR-006-b
 *
 * @module batch-message-formatter.service
 * @see docs/design/signal-batching-design.md v1.4
 */

import { Injectable, Logger } from '@nestjs/common';
import type { BufferedSignal } from './signal-batching.interface';
import {
  TemplateEngine,
  type SignalTemplateData,
  type BatchTemplateData,
} from './template-engine';
import { LocalizationService } from '../../localization';

/**
 * Telegram message length limit.
 * Messages exceeding this will be split into multiple messages.
 */
const MAX_MESSAGE_LENGTH = 4096;

/**
 * Emoji mapping for signal event types.
 * Per Design Doc v1.4 template specification.
 */
const EVENT_TYPE_EMOJI: Record<string, string> = {
  open: '\uD83D\uDFE2', // Green circle
  close_plus: '\uD83D\uDD35', // Blue circle
  close_minus: '\uD83D\uDD34', // Red circle
  close_zero: '\u26AA', // White circle
  tp: '\uD83D\uDFE1', // Yellow circle
  sl: '\uD83D\uDFE0', // Orange circle
  position_sltp_update: '\uD83D\uDFE3', // Purple circle
};

/**
 * Display text for event types.
 * Per Design Doc v1.4 template specification.
 */
const EVENT_TYPE_DISPLAY: Record<string, string> = {
  open: 'OPEN',
  close_plus: 'CLOSE +',
  close_minus: 'CLOSE -',
  close_zero: 'CLOSE 0',
  tp: 'TP',
  sl: 'SL',
  position_sltp_update: 'SL/TP UPDATE',
};

/**
 * Default emoji for unknown event types.
 */
const DEFAULT_EMOJI = '\u26AB'; // Black circle

/**
 * BatchMessageFormatter - Formats batch messages for delivery.
 *
 * Template Selection Strategy:
 * - 1 signal: Use existing single-signal template (eventType key)
 * - 2+ signals: Use batch_signals template with {{#each}} iteration
 *
 * @implements Injectable for NestJS DI
 */
@Injectable()
export class BatchMessageFormatter {
  private readonly logger = new Logger(BatchMessageFormatter.name);

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly templateEngine: TemplateEngine,
  ) {}

  /**
   * Format signals for delivery.
   * Template selection: 1 signal = existing template, 2+ = batch template.
   *
   * @param signals - Buffered signals to format
   * @param lang - User language code
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

    // Use batch template for 2+ signals
    return this.formatBatch(signals, lang, botId);
  }

  /**
   * Format single signal using existing eventType template.
   * Maintains backward compatibility with existing message templates.
   *
   * @param signal - Single buffered signal
   * @param lang - User language code
   * @param botId - Bot ID for template resolution
   * @returns Formatted message string
   */
  private async formatSingleSignal(
    signal: BufferedSignal,
    lang: string,
    botId: number,
  ): Promise<string> {
    // Get template without interpolation - we do our own placeholder replacement
    const template = await this.localizationService
      .forBot(botId)
      .lang(lang)
      .t(signal.eventType);

    // Use same placeholder replacement as original deliverToBotImmediate
    return this.replacePlaceholders(
      template,
      this.createPlaceholders(signal.order),
    );
  }

  /**
   * Format multiple signals using batch_signals template.
   * Uses TemplateEngine for {{#each}} loop processing.
   *
   * @param signals - Multiple buffered signals
   * @param lang - User language code
   * @param botId - Bot ID for template resolution
   * @returns Array of formatted messages (split if necessary)
   */
  private async formatBatch(
    signals: BufferedSignal[],
    lang: string,
    botId: number,
  ): Promise<string[]> {
    // Get batch template
    const template = await this.localizationService
      .forBot(botId)
      .lang(lang)
      .t('batch_signals');

    // Transform signals to template data
    const signalData: SignalTemplateData[] = signals.map((signal, idx) =>
      this.createSignalTemplateData(signal, idx + 1),
    );

    // Create batch template data
    const batchData: BatchTemplateData = {
      count: signals.length,
      timestamp: this.formatTimestamp(new Date()),
      signals: signalData,
    };

    // Render template
    const rendered = this.templateEngine.render(template, batchData);

    // Split if exceeds message limit
    if (rendered.length <= MAX_MESSAGE_LENGTH) {
      return [rendered];
    }

    return this.splitBatchMessage(rendered, signals.length);
  }

  /**
   * Split message at 4096 char boundary preserving line structure.
   * Per FR-006: Auto-split at Telegram limit.
   * Per FR-006-b: Preserve signal order.
   *
   * @param message - Full rendered message
   * @param signalCount - Number of signals (for logging)
   * @returns Array of message chunks, each <= 4096 chars
   */
  private splitBatchMessage(message: string, signalCount: number): string[] {
    const messages: string[] = [];
    const lines = message.split('\n');
    let currentMessage = '';

    for (const line of lines) {
      const testMessage = currentMessage + (currentMessage ? '\n' : '') + line;

      if (testMessage.length > MAX_MESSAGE_LENGTH) {
        // Save current message and start new one
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = line;
      } else {
        currentMessage = testMessage;
      }
    }

    // Don't forget the last chunk
    if (currentMessage) {
      messages.push(currentMessage);
    }

    this.logger.debug(
      `Split batch of ${signalCount} signals into ${messages.length} messages`,
    );

    return messages;
  }

  /**
   * Create template data for a signal item.
   * Used inside {{#each signals}} block.
   *
   * @param signal - Buffered signal
   * @param index - 1-based index in batch
   * @returns SignalTemplateData for template rendering
   */
  private createSignalTemplateData(
    signal: BufferedSignal,
    index: number,
  ): SignalTemplateData {
    const order = signal.order;

    return {
      index,
      event_type: signal.eventType, // Raw type for conditionals
      emoji: this.getSignalEmoji(signal.eventType),
      type: this.getEventTypeDisplay(signal.eventType),
      symbol: `\`${order.symbol}\``, // Markdown monospace
      order_type: `#${order.orderType}`,
      price: this.formatPrice(order.openPrice ?? order.closePrice ?? 0),
      tp: this.formatPrice(order.takeProfit ?? 0),
      sl: this.formatPrice(order.stopLoss ?? 0),
      old_tp: this.formatPrice(order.oldTakeProfit ?? 0),
      old_sl: this.formatPrice(order.oldStopLoss ?? 0),
      profit: this.formatProfit(order.profit ?? 0),
    };
  }

  /**
   * Get emoji for signal event type.
   * Handles both MessageType values and legacy string values.
   *
   * @param eventType - Signal event type
   * @returns Emoji character
   */
  private getSignalEmoji(eventType: string): string {
    return EVENT_TYPE_EMOJI[eventType] ?? DEFAULT_EMOJI;
  }

  /**
   * Get display text for event type.
   * Handles both MessageType values and legacy string values.
   *
   * @param eventType - Signal event type
   * @returns Human-readable event type string
   */
  private getEventTypeDisplay(eventType: string): string {
    return EVENT_TYPE_DISPLAY[eventType] ?? eventType.toUpperCase();
  }

  /**
   * Format profit with currency symbol.
   * Positive values get + prefix, negative get - prefix.
   *
   * @param profit - Profit amount
   * @returns Formatted profit string (e.g., "+$123.45" or "-$50.00")
   */
  private formatProfit(profit: number): string {
    if (profit >= 0) {
      return `+$${profit.toFixed(2)}`;
    }
    // For negative values, use absolute value and put - before $
    return `-$${Math.abs(profit).toFixed(2)}`;
  }

  /**
   * Format price for display.
   *
   * @param price - Price value
   * @returns Formatted price string
   */
  private formatPrice(price: number): string {
    // Use appropriate precision based on price magnitude
    if (price === 0) {
      return '-';
    }
    // Forex pairs typically need 4-5 decimal places
    return price.toFixed(price < 10 ? 5 : 2);
  }

  /**
   * Format timestamp for display in batch header.
   *
   * @param date - Date to format
   * @returns Formatted timestamp string (YYYY.MM.DD HH:MM)
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  /**
   * Create placeholder values from order data.
   * Mirrors SignalService.createPlaceholders() for consistency.
   *
   * @param order - The order data
   * @returns Record of placeholder key-value pairs
   */
  private createPlaceholders(
    order: BufferedSignal['order'],
  ): Record<string, string> {
    return {
      symbol: `**\`${order.symbol}\`**`,
      order_type: `#${order.orderType}`,
      lots: order.lots?.toString() || '0',
      close_price: this.formatDecimal(order.closePrice),
      open_price: this.formatDecimal(order.openPrice),
      profit: this.formatDecimal(order.profit),
      old_take_profit: this.formatDecimal(order.oldTakeProfit),
      old_stop_loss: this.formatDecimal(order.oldStopLoss),
      stop_loss: this.formatDecimal(order.stopLoss),
      take_profit: this.formatDecimal(order.takeProfit),
      ticketId: order.ticketId.toString(),
      sector: order.sector || '',
      account: order.account,
      broker: order.broker,
      created_at: this.formatDateTime(order.createdAt),
      close_time: this.formatDateTime(order.closeTime),
    };
  }

  /**
   * Replace placeholders in message template.
   * Mirrors SignalService.replacePlaceholders() for consistency.
   *
   * @param template - The message template with {placeholder} syntax
   * @param placeholders - The placeholder values
   * @returns Message with all placeholders replaced
   */
  private replacePlaceholders(
    template: string,
    placeholders: Record<string, string>,
  ): string {
    let message = template;
    for (const [key, value] of Object.entries(placeholders)) {
      if (value !== undefined && value !== null) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }
    // Replace any remaining unmatched placeholders with N/A
    return message.replace(/\{[^}]+\}/g, 'N/A');
  }

  /**
   * Format decimal with up to 3 decimal places, removing trailing zeros.
   *
   * @param input - The numeric value to format
   * @returns Formatted string
   */
  private formatDecimal(input: number | string | null | undefined): string {
    if (input === null || input === undefined) return '0';
    const num = typeof input === 'string' ? Number(input) : input;
    if (Number.isNaN(num)) return '0';
    return num.toFixed(3).replace(/\.?0+$/, '');
  }

  /**
   * Format date/time to YYYY.MM.DD HH:mm format.
   *
   * @param input - The date value to format
   * @returns Formatted date string
   */
  private formatDateTime(
    input: Date | string | number | null | undefined,
  ): string {
    if (!input) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (v: number) => v.toString().padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
