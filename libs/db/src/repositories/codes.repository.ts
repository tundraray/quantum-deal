import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { Code, codes, NewCode } from '../schema/codes';
import { eq, and, isNull } from 'drizzle-orm';

@Injectable()
export class CodesRepository extends BaseRepository<Code, NewCode, number> {
  protected table = codes;
  protected idColumn = codes.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  public async findByCode(code: string) {
    const condition = and(eq(this.table.code, code), isNull(this.table.userId));

    return this.findOneBy(condition!);
  }
}
