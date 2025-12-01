import { Module } from '@nestjs/common';

@Module({
  providers: [PartnerBotService],
  exports: [PartnerBotService],
})
export class PartnerBotModule {}
