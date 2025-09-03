import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { eq, and } from 'drizzle-orm';
import {
  OrdersRepository,
  DRIZZLE_CLIENT,
  type DrizzleClient,
  orders,
} from '@quantumdeal/db';
import { BaseMT5EventDto, MT5EventType, MT5EventDto } from './dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
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

      // Check for duplicate events
      const eventTimestamp = new Date(validatedEvent.timestamp);
      const isDuplicate = await this.checkEventExists(
        validatedEvent.ticket,
        validatedEvent.event,
        eventTimestamp,
      );

      if (isDuplicate) {
        this.logger.warn(
          `Duplicate event detected: ${validatedEvent.event} for ticket ${validatedEvent.ticket}`,
        );
        return {
          success: true,
          message: 'Duplicate event ignored',
        };
      }

      // Store the event in the database
      const savedEvent = await this.storeEvent(validatedEvent);

      // Process event-specific business logic
      await this.processEventSpecificLogic(validatedEvent);

      this.logger.log(
        `Successfully processed ${validatedEvent.event} event for ticket ${validatedEvent.ticket}`,
      );

      return {
        success: true,
        eventId: savedEvent.id,
        message: 'Event processed successfully',
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
   * Store event in the database
   */
  private async storeEvent(validatedEvent: MT5EventDto) {
    const eventTimestamp = new Date(validatedEvent.timestamp);

    const newOrder = {
      // Core order identification - Map MT5 fields to orders table
      ticketId: validatedEvent.ticket,
      symbol: validatedEvent.symbol,
      orderType: validatedEvent.type || validatedEvent.order_type || 'UNKNOWN',

      // Volume and pricing
      lots: validatedEvent.volume || validatedEvent.order_volume || 0,
      openPrice: validatedEvent.price || validatedEvent.order_price || 0,
      closePrice: validatedEvent.deal_price || null,
      stopLoss: validatedEvent.sl || validatedEvent.order_sl || null,
      takeProfit: validatedEvent.tp || validatedEvent.order_tp || null,
      profit:
        validatedEvent.total_profit ||
        validatedEvent.deal_profit ||
        validatedEvent.profit ||
        null,
      closeTime: ['CLOSE', 'PARTIAL_CLOSE'].includes(validatedEvent.event)
        ? eventTimestamp
        : null,

      // MT5 Event specific fields
      eventType: validatedEvent.event,
      account: validatedEvent.account,
      broker: validatedEvent.broker,
      schemaVersion: validatedEvent.schema_version,
      eaVersion: validatedEvent.ea_version,
      sector: validatedEvent.sector || null,
      positionId: validatedEvent.position_id || null,
      eventTimestamp,

      // Additional financial fields
      swap: validatedEvent.swap || validatedEvent.deal_swap || null,
      commission: validatedEvent.commission || null,
      dealType: validatedEvent.deal_type || null,
      dealVolume: validatedEvent.deal_volume || null,
      dealProfit: validatedEvent.deal_profit || null,
      dealSwap: validatedEvent.deal_swap || null,
      partialClose: validatedEvent.partial_close || null,
      comment: validatedEvent.comment || null,
    };

    return await this.ordersRepository.create(newOrder);
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
      case MT5EventType.PARTIAL_CLOSE:
        await this.handlePartialClose(event);
        break;
      case MT5EventType.PENDING:
        await this.handlePendingOrder(event);
        break;
      case MT5EventType.ACTIVATED:
        await this.handleOrderActivation(event);
        break;
      default:
        // For other event types, just log for now
        this.logger.debug(
          `Event ${event.event} processed without specific logic`,
        );
    }
  }

  /**
   * Handle position opening
   */
  private async handlePositionOpen(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Position opened: ${event.symbol} ${event.type || 'unknown'} ${event.volume || 0} lots at ${event.price || 0}`,
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
      `Position closed: ${event.symbol} with profit ${event.total_profit || 0}`,
    );

    // TODO: Implement specific logic for position closing:
    // - Update portfolio statistics
    // - Calculate performance metrics
    // - Send profit/loss notifications
    // - Update risk management metrics
  }

  /**
   * Handle partial position closing
   */
  private async handlePartialClose(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Position partially closed: ${event.symbol} ${event.partial_close || 0} lots`,
    );

    // TODO: Implement specific logic for partial closing:
    // - Update position size tracking
    // - Partial profit calculations
  }

  /**
   * Handle pending order placement
   */
  private async handlePendingOrder(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Pending order placed: ${event.symbol} ${event.order_type || 'unknown'} at ${event.order_price || 0}`,
    );

    // TODO: Implement specific logic for pending orders:
    // - Track pending orders
    // - Risk management checks
  }

  /**
   * Handle order activation
   */
  private async handleOrderActivation(event: BaseMT5EventDto): Promise<void> {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.debug(
      `Order activated: ${event.symbol} ${event.order_type || 'unknown'}`,
    );

    // TODO: Implement specific logic for order activation:
    // - Update order status tracking
    // - Notifications
  }

  /**
   * Check if order event already exists (to prevent duplicates)
   */
  private async checkEventExists(
    ticketId: string,
    eventType: string,
    timestamp: Date,
  ): Promise<boolean> {
    const result = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.ticketId, ticketId),
          eq(orders.eventType, eventType),
          eq(orders.eventTimestamp, timestamp),
        ),
      )
      .limit(1);

    return result.length > 0;
  }
}
