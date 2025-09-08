import { Module } from '@nestjs/common';
import { MasterbotService } from './masterbot.service';
import { MasterbotUpdate } from './masterbot.update';
import { ManagersMiddleware } from './middleware/managers.middleware';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

@Module({
  imports: [DbModule, FrameworkModule],
  providers: [MasterbotService, MasterbotUpdate, ManagersMiddleware],
  exports: [MasterbotService, MasterbotUpdate, ManagersMiddleware],
})
export class MasterbotModule {}
