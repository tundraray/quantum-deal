import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { codes } from '../schema/codes';

@Injectable()
export class CodesRepository extends BaseRepository {
  protected table = codes;
  protected idColumn = codes.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }
}
