import { Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly appService: AppService) {}

  @Post()
  getHello(): string {
    return this.appService.getHello();
  }
}
