import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { RandomNumberScene } from './scenes/random-number.scene';
import { UserManagementMiddleware } from './middleware';
import { WebhookProcessorService } from './services/webhook.service';
import { WeekReportService } from './services/week-report.service';
import { NotificationService } from './services/notification.service';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

@Module({
  imports: [DbModule, FrameworkModule],
  providers: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware,
    WebhookProcessorService,
    WeekReportService,
    NotificationService,
  ],
  exports: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware,
    WebhookProcessorService,
    WeekReportService,
    NotificationService,
  ],
})
export class BotModule {}
