import { Module } from '@nestjs/common';
import { BroadcastUpdate } from './broadcast.update';
import { MasterbotService } from './masterbot.service';
import { MasterbotUpdate } from './masterbot.update';
import { MasterbotInitService } from './masterbot-init.service';
import { ManagersMiddleware } from './middleware/managers.middleware';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';
import { CodeGenerationService } from './services/code-generation.service';
import { SubscriptionManagementService } from './services/subscription-management.service';
import { BroadcastService } from './services/broadcast.service';

@Module({
  imports: [DbModule, FrameworkModule],
  providers: [
    BroadcastUpdate,
    MasterbotService,
    MasterbotUpdate,
    MasterbotInitService,
    ManagersMiddleware,
    CodeGenerationService,
    SubscriptionManagementService,
    BroadcastService,
  ],
  exports: [
    MasterbotService,
    MasterbotUpdate,
    MasterbotInitService,
    ManagersMiddleware,
    CodeGenerationService,
    SubscriptionManagementService,
    BroadcastService,
  ],
})
export class MasterbotModule {}
