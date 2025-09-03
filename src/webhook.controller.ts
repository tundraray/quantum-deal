import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Main endpoint to receive MT5 trading events
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async receiveMT5Event(@Body() eventData: unknown) {
    try {
      const data = eventData as { event?: string; ticket?: string };
      this.logger.debug(
        `Received MT5 event: ${data.event || 'unknown'} for ticket ${data.ticket || 'unknown'}`,
      );

      const result = await this.webhookService.processTradeEvent(eventData);

      return {
        status: 'success',
        message: result.message,
        eventId: result.eventId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Error processing MT5 event: ${err.message}`,
        err.stack,
      );

      if (err instanceof BadRequestException) {
        return {
          status: 'error',
          message: err.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test endpoint for development
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testEndpoint(@Body() testData: unknown) {
    await Promise.resolve(); // Add await expression for ESLint
    this.logger.log(
      `Test endpoint called with data: ${JSON.stringify(testData)}`,
    );

    return {
      status: 'success',
      message: 'Test endpoint working',
      receivedData: testData,
      timestamp: new Date().toISOString(),
    };
  }
}
