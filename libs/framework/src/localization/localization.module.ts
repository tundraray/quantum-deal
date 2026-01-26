import { Module } from '@nestjs/common';
import { DbModule } from '@quantumdeal/db';
import { LocalizationService } from './localization.service';

@Module({
  imports: [DbModule],
  providers: [LocalizationService],
  exports: [LocalizationService],
})
export class LocalizationModule {}
