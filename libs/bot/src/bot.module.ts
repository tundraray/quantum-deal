import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { RandomNumberScene } from './scenes/random-number.scene';
import { UserManagementMiddleware } from './middleware';
import { NotificationService } from './services/notification.service';
import { WeekReportService } from './scheduling/week-report.service';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

@Module({
  imports: [DbModule, FrameworkModule],
  providers: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware,
    NotificationService,
    WeekReportService,
  ],
  exports: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    UserManagementMiddleware,
    NotificationService,
    WeekReportService,
  ],
})
export class BotModule {}
