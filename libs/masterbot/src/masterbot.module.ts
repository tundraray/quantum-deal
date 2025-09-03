import { Module } from '@nestjs/common';
import { MasterbotService } from './masterbot.service';

@Module({
  providers: [MasterbotService],
  exports: [MasterbotService],
})
export class MasterbotModule {}
