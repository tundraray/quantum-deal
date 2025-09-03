import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { RandomNumberScene } from './scenes/random-number.scene';

@Module({
  providers: [BotService, BotUpdate, RandomNumberScene],
  exports: [BotService, BotUpdate, RandomNumberScene],
})
export class BotModule {}
