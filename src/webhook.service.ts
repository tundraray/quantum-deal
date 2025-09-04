import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrdersRepository } from '@quantumdeal/db';
import { NotificationService, BotName } from '@quantumdeal/bot';
import { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import { BaseMT5EventDto, MT5EventType, MT5EventDto } from './dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly notificationService: NotificationService,
    @InjectBot(BotName) private readonly bot: Telegraf<Context>,
  ) {}

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
      let savedEvent: MergedOrder | null = null;
      if (validatedEvent.event !== MT5EventType.TEST) {
        savedEvent = await this.handleOrderEvent(validatedEvent);

        // Process event-specific business logic
        await this.processEventSpecificLogic(validatedEvent.event, savedEvent);
      }

      this.logger.log(
        `Successfully processed ${validatedEvent.event} event for ticket ${validatedEvent.ticket}`,
      );

      return {
        success: true,
        eventId: savedEvent?.id,
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
  private async handleOrderEvent(
    validatedEvent: MT5EventDto,
  ): Promise<MergedOrder> {
    const existingOrder = (await this.ordersRepository.findOneByTicket(
      validatedEvent.position_id || validatedEvent.ticket,
    )) as MergedOrder | null;

    if (existingOrder) {
      // Update existing order
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
          stopLoss: validatedEvent.sl || existingOrder.stopLoss || 0,
          takeProfit: validatedEvent.tp || existingOrder.takeProfit || 0,
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
          this.bot,
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
          this.bot,
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
          this.bot,
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
