import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

// Command handlers
import { StartUpdate } from './commands/start/start.update';
import { LangUpdate } from './commands/lang/lang.update';
import { FilterUpdate } from './commands/filter/filter.update';
import { RenewUpdate } from './commands/renew/renew.update';

// Scenes
import { FilterScene } from './commands/filter/filter.scene';
import { RenewalScene } from './commands/renew/renewal.scene';

// Middleware
import { UserManagementMiddleware } from './middleware';

// Services
import { WebhookProcessorService } from './services/webhook.service';
import { WeekReportService } from './services/week-report.service';
import { MonthReportService } from './services/month-report.service';
import { NotificationService } from './services/notification.service';
import { SubscriptionExpirationService } from './services/subscription-expiration.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { UserSettingsService } from './services/user-settings.service';
import { InstrumentFilterService } from './services/instrument-filter.service';
import { FilterSessionService } from './services/filter-session.service';
import { PaymentService } from './services/payment.service';
import { BotCommandsService } from './services/bot-commands.service';
import { BotInitService } from './services/bot-init.service';
import { TrialService } from './services/trial.service';
import { StatisticsRefreshService } from './services/statistics-refresh.service';
import { OnboardingService } from './services/onboarding.service';

// Helpers
import { FilterKeyboardBuilder } from './helpers/filter-keyboard.builder';
import { FilterI18nHelper } from './commands/filter/filter.i18n.helper';

// Guards
import { FeatureGuard } from './guards/feature.guard';

// Actions
import { TrialAction } from './actions/trial/trial.action';
import { RenewalAction } from './actions/renewal/renewal.action';

@Module({
  imports: [
    DbModule,
    FrameworkModule,
    ScheduleModule.forRoot(), // Enable cron jobs for statistics refresh
  ],
  providers: [
    // Command handlers (Update classes)
    StartUpdate,
    LangUpdate,
    FilterUpdate,
    RenewUpdate,

    // Scenes
    FilterScene,
    RenewalScene,

    // Middleware
    UserManagementMiddleware,

    // Services
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

    // Bot commands & init
    BotCommandsService,
    BotInitService,

    // Trial services
    TrialService,

    // Statistics & Onboarding services (Week 3)
    StatisticsRefreshService,
    OnboardingService,

    // Helpers
    FilterKeyboardBuilder,
    FilterI18nHelper,

    // Guards
    FeatureGuard,

    // Actions
    TrialAction,
    RenewalAction,
  ],
  exports: [
    // Command handlers
    StartUpdate,
    LangUpdate,
    FilterUpdate,
    RenewUpdate,

    // Scenes
    FilterScene,
    RenewalScene,

    // Middleware
    UserManagementMiddleware,

    // Services
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

    // Bot commands & init
    BotCommandsService,
    BotInitService,

    // Trial services
    TrialService,

    // Statistics & Onboarding services (Week 3)
    StatisticsRefreshService,
    OnboardingService,

    // Helpers
    FilterKeyboardBuilder,
    FilterI18nHelper,

    // Guards
    FeatureGuard,

    // Actions
    TrialAction,
    RenewalAction,
  ],
})
export class BotModule {}
