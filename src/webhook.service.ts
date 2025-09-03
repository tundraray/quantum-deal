import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrdersRepository, Order, NewOrder } from '@quantumdeal/db';
import { BaseMT5EventDto, MT5EventType, MT5EventDto } from './dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly ordersRepository: OrdersRepository) {}

  /**
   * Process MT5 trading event
   */
  async processTradeEvent(rawData: unknown): Promise<{
    success: boolean;
    eventId?: number;
    message: string;
  }> {
    try {
      const data = rawData as { event?: string; ticket?: string };
      this.logger.debug(
        `Processing MT5 event: ${data.event || 'unknown'} for ticket ${data.ticket || 'unknown'}`,
      );

      // Validate and transform the incoming data
      const validatedEvent = await this.validateAndTransformEvent(rawData);

      // Handle order creation/update (skip for TEST events)
      let savedEvent: { id?: number } = { id: undefined };
      if (validatedEvent.event !== MT5EventType.TEST) {
        savedEvent = await this.handleOrderEvent(validatedEvent);
      }

      // Process event-specific business logic
      await this.processEventSpecificLogic(validatedEvent);

      this.logger.log(
        `Successfully processed ${validatedEvent.event} event for ticket ${validatedEvent.ticket}`,
      );

      return {
        success: true,
        eventId: savedEvent.id,
        message: 'Event processed and order updated successfully',
      };
    } catch (error: unknown) {
      const err = error as Error;
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
  private async handleOrderEvent(validatedEvent: MT5EventDto) {
    const existingOrder = await this.ordersRepository.findOneByTicket(
      validatedEvent.ticket,
    );

    if (existingOrder) {
      // Update existing order
      return await this.updateExistingOrder(existingOrder, validatedEvent);
    } else {
      // Create new order
      return await this.createNewOrder(validatedEvent);
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
      stopLoss: validatedEvent.sl || null,
      takeProfit: validatedEvent.tp || null,
      profit: validatedEvent.total_profit || validatedEvent.profit || null,
      closeTime:
        validatedEvent.event === MT5EventType.CLOSE ? eventTimestamp : null,

      // MT5 Event specific fields
      account: validatedEvent.account,
      broker: validatedEvent.broker,
      schemaVersion: validatedEvent.schema_version,
      eaVersion: validatedEvent.ea_version,
      sector: validatedEvent.sector || null,
      positionId: validatedEvent.position_id || null,
      eventTimestamp,

      // Additional financial fields
      swap: validatedEvent.swap || null,
      commission: validatedEvent.commission || null,
      comment: validatedEvent.comment || null,
    };

    return await this.ordersRepository.create(newOrder);
  }

  /**
   * Update existing order with new event data
   */
  private async updateExistingOrder(
    existingOrder: Order,
    validatedEvent: MT5EventDto,
  ) {
    const eventTimestamp = new Date(validatedEvent.timestamp);
    const updates = this.buildOrderUpdates(
      existingOrder,
      validatedEvent,
      eventTimestamp,
    );

    const updatedOrders = await this.ordersRepository.updateByTicketId(
      validatedEvent.ticket,
      updates,
    );

    return updatedOrders[0] || existingOrder;
  }

  /**
   * Build update object based on event type
   */
  private buildOrderUpdates(
    existingOrder: Order,
    validatedEvent: MT5EventDto,
    eventTimestamp: Date,
  ): Partial<NewOrder> {
    const baseUpdates: Partial<NewOrder> = {
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
          swap: validatedEvent.swap || existingOrder.swap,
          commission: validatedEvent.commission || existingOrder.commission,
          comment: validatedEvent.comment || existingOrder.comment,
        };

      case MT5EventType.POSITION_SLTP_UPDATE:
      case MT5EventType.ORDER_SLTP_UPDATE:
        return {
          ...baseUpdates,
          stopLoss: validatedEvent.sl || existingOrder.stopLoss,
          takeProfit: validatedEvent.tp || existingOrder.takeProfit,
          comment: validatedEvent.comment || existingOrder.comment,
        };

      case MT5EventType.OPEN:
        // OPEN events should create new orders, but if updating existing:
        return {
          ...baseUpdates,
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
  private async processEventSpecificLogic(event: MT5EventDto): Promise<void> {
    switch (event.event) {
      case MT5EventType.OPEN:
        await this.handlePositionOpen(event);
        break;
      case MT5EventType.CLOSE:
        await this.handlePositionClose(event);
        break;
      case MT5EventType.TEST:
        await this.handleTestEvent(event);
        break;
      default:
        // For other event types, just log for now
        this.logger.debug(
          `Event ${event.event} processed and order updated with basic info`,
        );
    }
  }

  /**
   * Handle position opening
   */
  private async handlePositionOpen(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Position opened/updated: ${event.symbol} ${event.type || 'unknown'} ${event.volume || 0} lots at ${event.price || 0}`,
    );

    // TODO: Implement specific logic for position opening:
    // - Update portfolio statistics
    // - Send notifications if configured
    // - Update risk management metrics
  }

  /**
   * Handle position closing
   */
  private async handlePositionClose(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Position closed/updated: ${event.symbol} with profit ${event.total_profit || 0}`,
    );

    // TODO: Implement specific logic for position closing:
    // - Update portfolio statistics
    // - Calculate performance metrics
    // - Send profit/loss notifications
    // - Update risk management metrics
  }

  /**
   * Handle test event
   */
  private async handleTestEvent(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.log(
      `TEST event received: ticket=${event.ticket}, symbol=${event.symbol}, account=${event.account}, broker=${event.broker}`,
    );

    // TEST events are used for webhook endpoint testing - no business logic needed
    // Just log the event for verification purposes
  }
}
