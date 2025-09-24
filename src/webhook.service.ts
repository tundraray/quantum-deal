import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrdersRepository } from '@quantumdeal/db';
import { WebhookProcessorService } from '@quantumdeal/bot';
import { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import { BaseMT5EventDto, MT5EventType, MT5EventDto } from './dto';
import { SentryService } from '@quantumdeal/framework';

@Injectable()
export class WebhookService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookService.name);

  // Debounce configuration
  private static readonly DEBOUNCE_DELAY_MS = 5 * 1000; // 5 seconds debounce delay
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly notificationService: WebhookProcessorService,
    private readonly sentryService: SentryService,
  ) {}

  /**
   * Generate debounce key for event
   */
  private generateDebounceKey(ticket: string, eventType: string): string {
    return `${ticket}-${eventType}`;
  }

  /**
   * Clear debounce timer for specific key
   */
  private clearDebounceTimer(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  /**
   * Clear all active debounce timers (cleanup method)
   */
  private clearAllDebounceTimers(): void {
    for (const [, timer] of this.debounceTimers.entries()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.logger.debug('All debounce timers cleared');
  }

  /**
   * Cleanup method for graceful shutdown
   */
  onModuleDestroy(): void {
    this.clearAllDebounceTimers();
  }

  /**
   * Process MT5 trading event with debouncing
   */
  processTradeEvent(rawData: unknown): {
    success: boolean;
    eventId?: number;
    message: string;
  } {
    const data = rawData as { event?: string; ticket?: string };
    const ticket = data.ticket || 'unknown';
    const eventType = data.event || 'unknown';

    // Generate debounce key
    const debounceKey = this.generateDebounceKey(ticket, eventType);

    // Clear existing timer if any
    this.clearDebounceTimer(debounceKey);

    // Set new timer for debounced processing
    const timer = setTimeout(() => {
      this.debounceTimers.delete(debounceKey);
      // Process asynchronously without blocking the response
      this.processTradeEventDebounced(rawData).catch((error: unknown) => {
        const err = error as Error;
        this.logger.error(
          `Error in debounced processing: ${err.message}`,
          err.stack,
        );
      });
    }, WebhookService.DEBOUNCE_DELAY_MS);

    this.debounceTimers.set(debounceKey, timer);

    // Return immediate response
    return {
      success: true,
      message: `Event queued for processing with ${WebhookService.DEBOUNCE_DELAY_MS}ms debounce`,
    };
  }

  /**
   * Process MT5 trading event (actual implementation without debouncing)
   */
  private async processTradeEventDebounced(rawData: unknown): Promise<{
    success: boolean;
    eventId?: number;
    message: string;
  }> {
    const startTime = Date.now();

    try {
      const data = rawData as { event?: string; ticket?: string };
      this.logger.debug(
        `Processing MT5 event: ${data.event || 'unknown'} for ticket ${data.ticket || 'unknown'}`,
      );

      // Add Sentry breadcrumb for tracking
      this.sentryService.addBreadcrumb({
        message: `Processing MT5 event: ${data.event}`,
        category: 'webhook',
        level: 'info',
        data: {
          event_type: data.event,
          ticket: data.ticket,
        },
      });

      // Track webhook event
      this.sentryService.trackWebhookEvent(data.event || 'unknown', {
        ticket: data.ticket,
        timestamp: new Date().toISOString(),
      });

      // Validate and transform the incoming data
      const validatedEvent = await this.validateAndTransformEvent(rawData);

      // Handle order creation/update (skip for TEST events)
      let savedEvent: MergedOrder | null | undefined = null;
      if (validatedEvent.event !== MT5EventType.TEST) {
        savedEvent = await this.handleOrderEvent(validatedEvent);

        // Process event-specific business logic
        if (savedEvent)
          await this.processEventSpecificLogic(
            validatedEvent.event,
            savedEvent,
          );
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed ${validatedEvent.event} event for ticket ${validatedEvent.ticket} in ${processingTime}ms`,
      );

      // Track successful processing
      this.sentryService.addBreadcrumb({
        message: `Successfully processed ${validatedEvent.event} event`,
        category: 'webhook',
        level: 'info',
        data: {
          event_type: validatedEvent.event,
          ticket: validatedEvent.ticket,
          processing_time_ms: processingTime,
          order_id: savedEvent?.id,
        },
      });

      return {
        success: true,
        eventId: savedEvent?.id,
        message: 'Event processed and order updated successfully',
      };
    } catch (error: unknown) {
      const err = error as Error;
      const processingTime = Date.now() - startTime;

      // Capture error with context in Sentry
      this.sentryService.captureException(err, {
        webhook_data: rawData,
        processing_time_ms: processingTime,
        service: 'WebhookService',
        method: 'processTradeEventDebounced',
      });

      this.logger.error(
        `Error processing MT5 event: ${err.message}`,
        err.stack,
      );

      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new BadRequestException('Failed to process trading event');
    }
  }

  /**
   * Validate and transform incoming event data based on event type
   */
  private async validateAndTransformEvent(
    rawData: unknown,
  ): Promise<MT5EventDto> {
    const data = rawData as Record<string, unknown>;
    if (!data.event) {
      throw new BadRequestException('Event type is required');
    }

    // Validate the event type is supported
    if (!Object.values(MT5EventType).includes(data.event as MT5EventType)) {
      throw new BadRequestException(
        `Unsupported event type: ${data.event as string}`,
      );
    }

    // Transform and validate using BaseMT5EventDto which handles all event types
    const dto = plainToInstance(BaseMT5EventDto, data);
    const validationErrors = await validate(dto);

    if (validationErrors.length > 0) {
      const errorMessages = validationErrors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return dto;
  }

  /**
   * Handle order creation or update based on event type
   */
  private async handleOrderEvent(
    validatedEvent: MT5EventDto,
  ): Promise<MergedOrder | undefined> {
    const existingOrder = (await this.ordersRepository.findOneByTicket(
      validatedEvent.position_id || validatedEvent.ticket,
    )) as MergedOrder | null;

    if (existingOrder && !existingOrder.closePrice) {
      // Update existing order
      if (
        !(
          validatedEvent.event === MT5EventType.POSITION_SLTP_UPDATE &&
          validatedEvent.sl == existingOrder.stopLoss &&
          validatedEvent.tp == existingOrder.takeProfit
        )
      )
        return this.updateExistingOrder(existingOrder, validatedEvent);
    } else {
      // Create new order
      return this.createNewOrder(validatedEvent);
    }
  }

  /**
   * Create a new order from event data
   */
  private async createNewOrder(validatedEvent: MT5EventDto) {
    const eventTimestamp = new Date(validatedEvent.timestamp);

    const newOrder = {
      // Core order identification - Map MT5 fields to orders table
      ticketId: validatedEvent.ticket,
      symbol: validatedEvent.symbol,
      orderType: validatedEvent.type || 'UNKNOWN',

      // Volume and pricing
      lots: validatedEvent.volume || 0,
      openPrice: validatedEvent.price || 0, // For OPEN events, this is the open price
      closePrice:
        validatedEvent.event === MT5EventType.CLOSE
          ? validatedEvent.price
          : null,
      stopLoss: validatedEvent.sl || 0,
      takeProfit: validatedEvent.tp || 0,
      profit: validatedEvent.total_profit || validatedEvent.profit,
      closeTime:
        validatedEvent.event === MT5EventType.CLOSE ? eventTimestamp : null,

      // MT5 Event specific fields
      account: validatedEvent.account,
      broker: validatedEvent.broker,
      schemaVersion: validatedEvent.schema_version,
      eaVersion: validatedEvent.ea_version,
      sector: validatedEvent.sector,
      positionId: validatedEvent.position_id,
      eventTimestamp,

      // Additional financial fields
      swap: validatedEvent.swap,
      commission: validatedEvent.commission,
      comment: validatedEvent.comment,
    };

    return this.ordersRepository.create(newOrder) as Promise<MergedOrder>;
  }

  /**
   * Update existing order with new event data
   */
  private async updateExistingOrder(
    existingOrder: MergedOrder,
    validatedEvent: MT5EventDto,
  ) {
    const eventTimestamp = new Date(validatedEvent.timestamp);
    const updates = this.buildOrderUpdates(
      existingOrder,
      validatedEvent,
      eventTimestamp,
    );

    this.logger.debug(`Updating existing order: ${JSON.stringify(updates)}`);

    const updatedOrders = await this.ordersRepository.updateByTicketId(
      validatedEvent.position_id || validatedEvent.ticket,
      updates,
    );

    return updatedOrders || existingOrder;
  }

  /**
   * Build update object based on event type
   */
  private buildOrderUpdates(
    existingOrder: MergedOrder,
    validatedEvent: MT5EventDto,
    eventTimestamp: Date,
  ): Partial<MergedOrder> {
    const baseUpdates: Partial<MergedOrder> = {
      eventTimestamp,
      updatedAt: new Date(),
    };

    switch (validatedEvent.event) {
      case MT5EventType.CLOSE:
        return {
          ...baseUpdates,
          closePrice: validatedEvent.price || existingOrder.closePrice,
          profit:
            validatedEvent.total_profit ||
            validatedEvent.profit ||
            existingOrder.profit,
          closeTime: eventTimestamp,
          sector: validatedEvent.sector || existingOrder.sector,
          swap: validatedEvent.swap || existingOrder.swap,
          commission: validatedEvent.commission || existingOrder.commission,
          comment: validatedEvent.comment || existingOrder.comment,
        };

      case MT5EventType.POSITION_SLTP_UPDATE:
      case MT5EventType.ORDER_SLTP_UPDATE:
        return {
          ...baseUpdates,
          oldStopLoss: existingOrder.stopLoss || 0,
          oldTakeProfit: existingOrder.takeProfit || 0,
          stopLoss:
            validatedEvent.sl != null
              ? validatedEvent.sl
              : existingOrder.stopLoss,
          takeProfit:
            validatedEvent.tp != null
              ? validatedEvent.tp
              : existingOrder.takeProfit,
          comment: validatedEvent.comment || existingOrder.comment,
        };

      case MT5EventType.OPEN:
        // OPEN events should create new orders, but if updating existing:
        return {
          ...baseUpdates,
          sector: validatedEvent.sector || existingOrder.sector,
          orderType: validatedEvent.type || existingOrder.orderType,
          lots: validatedEvent.volume || existingOrder.lots,
          openPrice: validatedEvent.price || existingOrder.openPrice,
          stopLoss: validatedEvent.sl || existingOrder.stopLoss,
          takeProfit: validatedEvent.tp || existingOrder.takeProfit,
          comment: validatedEvent.comment || existingOrder.comment,
        };

      default:
        // For other events, just update the event info and timestamp
        return {
          ...baseUpdates,
          comment: validatedEvent.comment || existingOrder.comment,
        };
    }
  }

  /**
   * Process event-specific business logic
   */
  private async processEventSpecificLogic(
    eventType: MT5EventType,
    order: MergedOrder,
  ): Promise<void> {
    switch (eventType) {
      case MT5EventType.OPEN:
        await this.handlePositionOpen(order);
        break;
      case MT5EventType.CLOSE:
        await this.handlePositionClose(order);
        break;
      case MT5EventType.ORDER_SLTP_UPDATE:
      case MT5EventType.POSITION_SLTP_UPDATE:
        await this.handleSLTPUpdate(order);
        break;
      default:
        // For other event types, just log for now
        this.logger.debug(
          `Event ${eventType} processed and order updated with basic info`,
        );
    }
  }

  /**
   * Handle position opening
   */
  private async handlePositionOpen(order: MergedOrder): Promise<void> {
    this.logger.debug(
      `Position opened/updated: ${order.symbol} ${order.lots || 0} lots at ${order.openPrice || 0}`,
    );

    // Send notifications for position opening
    try {
      const notificationResult =
        await this.notificationService.sendOrderNotifications(
          order,
          'open' as MessageType,
        );

      this.logger.log(
        `OPEN notifications sent: ${notificationResult.sentCount} successful, ${notificationResult.failedCount} failed`,
      );

      if (notificationResult.errors.length > 0) {
        this.logger.warn(
          `OPEN notification errors: ${JSON.stringify(notificationResult.errors)}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send OPEN notifications: ${err.message}`,
        err.stack,
      );
    }

    // TODO: Implement additional logic for position opening:
    // - Update portfolio statistics
    // - Update risk management metrics
  }

  /**
   * Handle position closing
   */
  private async handlePositionClose(order: MergedOrder): Promise<void> {
    this.logger.debug(
      `Position closed/updated: ${order.symbol} with profit ${order.profit || 0}`,
    );

    // Send notifications for position closing
    try {
      const notificationResult =
        await this.notificationService.sendOrderNotifications(
          order,
          order.profit && order.profit > 0
            ? ('close_plus' as MessageType)
            : ('close_minus' as MessageType),
        );

      this.logger.log(
        `CLOSE notifications sent: ${notificationResult.sentCount} successful, ${notificationResult.failedCount} failed`,
      );

      if (notificationResult.errors.length > 0) {
        this.logger.warn(
          `CLOSE notification errors: ${JSON.stringify(notificationResult.errors)}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send CLOSE notifications: ${err.message}`,
        err.stack,
      );
    }

    // TODO: Implement additional logic for position closing:
    // - Update portfolio statistics
    // - Calculate performance metrics
    // - Update risk management metrics
  }

  /**
   * Handle SL/TP update event
   */
  private async handleSLTPUpdate(order: MergedOrder): Promise<void> {
    this.logger.log(
      `SLTP update event received: ticket=${order.ticketId}, symbol=${order.symbol}, account=${order.account}, broker=${order.broker}`,
    );

    // Send notifications for SL/TP update
    try {
      const notificationResult =
        await this.notificationService.sendOrderNotifications(
          order,
          'position_sltp_update' as MessageType,
        );

      this.logger.log(
        `SLTP_UPDATE notifications sent: ${notificationResult.sentCount} successful, ${notificationResult.failedCount} failed`,
      );

      if (notificationResult.errors.length > 0) {
        this.logger.warn(
          `SLTP_UPDATE notification errors: ${JSON.stringify(notificationResult.errors)}`,
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send SLTP_UPDATE notifications: ${err.message}`,
        err.stack,
      );
    }

    // Log the SL/TP update for verification purposes
  }
}
