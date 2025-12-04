import { Module } from '@nestjs/common';
import { DbModule } from '@quantumdeal/db';
import { BotModule } from '@quantumdeal/bot';

// Services
import { ChannelVerifierService } from './services/channel-verifier.service';
import { PartnerFlowService } from './services/partner-flow.service';
import { UserDynamicManagementMiddleware } from './middleware/user-management.middleware';

// Actions
import { ChannelVerificationAction } from './actions/channel-verification.action';
import { TrialUIAction } from './actions/trial-ui.action';

// Commands
import { StartCommandUpdate } from './commands/start/start.update';
import { LangUpdate } from './commands/lang/lang.update';

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
  imports: [DbModule, BotModule],
  providers: [
    // Services
    ChannelVerifierService,
    PartnerFlowService,

    // Actions
    ChannelVerificationAction,
    TrialUIAction,

    // Middlewares
    UserDynamicManagementMiddleware,

    // Commands
    StartCommandUpdate,
    LangUpdate,
  ],
  exports: [
    // Export PartnerFlowService for potential external usage
    PartnerFlowService,
    UserDynamicManagementMiddleware,
  ],
})
export class PartnerBotModule {}
