import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { managers, Manager, NewManager } from '../schema/managers';

@Injectable()
export class ManagersRepository extends BaseRepository<
  Manager,
  NewManager,
  number
> {
  protected table = managers;
  protected idColumn = managers.telegramId;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }
}
