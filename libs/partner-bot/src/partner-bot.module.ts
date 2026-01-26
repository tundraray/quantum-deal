import { Module, OnModuleInit } from '@nestjs/common';
import { DbModule } from '@quantumdeal/db';
import { BotModule } from '@quantumdeal/bot';

// Services
import { ChannelVerifierService } from './services/channel-verifier.service';
import { PartnerFlowService } from './services/partner-flow.service';
import { UserDynamicManagementMiddleware } from './middleware/user-management.middleware';
import { DailyReportService } from './services/daily-report.service';

// Actions
import { ChannelVerificationAction } from './actions/channel-verification.action';
import { TrialUIAction } from './actions/trial-ui.action';

// Commands
import { StartCommandUpdate } from './commands/start/start.update';
import { LangUpdate } from './commands/lang/lang.update';
import { SubscriptionExpirationService } from './services/expiried-sheduler/subscription-expiration.service';
import { FrameworkModule, LocalizationService } from '@quantumdeal/framework';
import { RenewUpdate } from './commands/renew/renew.update';
import { RenewalScene } from './commands/renew/renewal.scene';
import { RenewalAction } from './actions/renewal/renewal.action';

// i18n
import { renewalMessages, RENEWAL_I18N_NAMESPACE } from './i18n/renewal.i18n';
import { startMessages, START_I18N_NAMESPACE } from './i18n/start.i18n';
import { trialMessages, TRIAL_I18N_NAMESPACE } from './i18n/trial.i18n';
import { channelMessages, CHANNEL_I18N_NAMESPACE } from './i18n/channel.i18n';
import { langMessages, LANG_I18N_NAMESPACE } from './i18n/lang.i18n';
import { commonMessages, COMMON_I18N_NAMESPACE } from './i18n/common.i18n';

/**
 * PartnerBotModule
 *
 * Provides partner bot flow functionality including:
 * - Channel subscription verification
 * - Trial activation flow
 * - Partner-specific commands and actions
 *
 * This module is compatible with the multi-bot architecture (ADR-006)
 * and supports dynamic bot loading via DynamicTelegrafModule.
 */
@Module({
  imports: [DbModule, FrameworkModule, BotModule],
  providers: [
    // Services
    ChannelVerifierService,
    PartnerFlowService,
    DailyReportService,
    SubscriptionExpirationService,
    // Actions
    ChannelVerificationAction,
    TrialUIAction,

    // Middlewares
    UserDynamicManagementMiddleware,

    // Actions
    RenewalAction,

    // Commands
    StartCommandUpdate,
    LangUpdate,
    RenewUpdate,
    RenewalScene,
  ],
  exports: [
    // Export PartnerFlowService for potential external usage
    PartnerFlowService,
    UserDynamicManagementMiddleware,
    SubscriptionExpirationService,
  ],
})
export class PartnerBotModule implements OnModuleInit {
  constructor(private readonly localizationService: LocalizationService) {}

  /**
   * Register i18n namespaces when module initializes
   */
  onModuleInit(): void {
    // Register all i18n namespaces
    this.localizationService.registerI18n(
      RENEWAL_I18N_NAMESPACE,
      renewalMessages,
    );
    this.localizationService.registerI18n(START_I18N_NAMESPACE, startMessages);
    this.localizationService.registerI18n(TRIAL_I18N_NAMESPACE, trialMessages);
    this.localizationService.registerI18n(
      CHANNEL_I18N_NAMESPACE,
      channelMessages,
    );
    this.localizationService.registerI18n(LANG_I18N_NAMESPACE, langMessages);
    this.localizationService.registerI18n(
      COMMON_I18N_NAMESPACE,
      commonMessages,
    );
  }
}
