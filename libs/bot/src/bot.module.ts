import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { RandomNumberScene } from './scenes/random-number.scene';
import { FilterScene } from './scenes/filter/filter.scene';
import { RenewalScene } from './scenes/renewal.scene';
import { UserManagementMiddleware } from './middleware';
import { WebhookProcessorService } from './services/webhook.service';
import { WeekReportService } from './services/week-report.service';
import { MonthReportService } from './services/month-report.service';
import { NotificationService } from './services/notification.service';
import { SubscriptionExpirationService } from './services/subscription-expiration.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { UserSettingsService } from './services/user-settings.service';
import { InstrumentFilterService } from './services/instrument-filter.service';
import { FilterSessionService } from './services/filter-session.service';
import { FilterKeyboardBuilder } from './helpers/filter-keyboard.builder';
import { FilterI18nHelper } from './scenes/filter/filter.i18n.helper';
import { FeatureGuard } from './guards/feature.guard';
import { BotCommandsService } from './services/bot-commands.service';
import { PaymentService } from './services/payment.service';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

@Module({
  imports: [DbModule, FrameworkModule],
  providers: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    FilterScene,
    RenewalScene,
    UserManagementMiddleware,
    WebhookProcessorService,
    WeekReportService,
    MonthReportService,
    NotificationService,
    SubscriptionExpirationService,
    // Feature flags services
    FeatureFlagService,
    UserSettingsService,
    InstrumentFilterService,
    FilterSessionService,
    // Payment services
    PaymentService,
    // Bot commands
    BotCommandsService,
    // Helpers
    FilterKeyboardBuilder,
    FilterI18nHelper,
    // Guards
    FeatureGuard,
  ],
  exports: [
    BotService,
    BotUpdate,
    RandomNumberScene,
    FilterScene,
    RenewalScene,
    UserManagementMiddleware,
    WebhookProcessorService,
    WeekReportService,
    MonthReportService,
    NotificationService,
    SubscriptionExpirationService,
    // Feature flags services
    FeatureFlagService,
    UserSettingsService,
    InstrumentFilterService,
    FilterSessionService,
    // Payment services
    PaymentService,
    // Bot commands
    BotCommandsService,
    // Helpers
    FilterKeyboardBuilder,
    FilterI18nHelper,
    // Guards
    FeatureGuard,
  ],
})
export class BotModule {}
