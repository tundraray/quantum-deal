import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { summary, Summary, NewSummary } from '../schema/summary';

@Injectable()
export class SummaryRepository extends BaseRepository<
  Summary,
  NewSummary,
  number
> {
  protected table = summary;
  protected idColumn = summary.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }
}
