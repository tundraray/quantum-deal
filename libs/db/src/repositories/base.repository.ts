import { Injectable, Inject } from '@nestjs/common';
import { eq, SQL } from 'drizzle-orm';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';

export interface BaseRepositoryInterface<
  TSelect = any,
  TInsert = any,
  TKey = any,
> {
  findById(id: TKey): Promise<TSelect | null>;
  findAll(): Promise<TSelect[]>;
  create(data: TInsert): Promise<TSelect>;
  update(id: TKey, data: Partial<TInsert>): Promise<TSelect | null>;
  delete(id: TKey): Promise<boolean>;
  findBy(condition: SQL): Promise<TSelect[]>;
  findOneBy(condition: SQL): Promise<TSelect | null>;
}

@Injectable()
export abstract class BaseRepository<TSelect = any, TInsert = any, TKey = any>
  implements BaseRepositoryInterface<TSelect, TInsert, TKey>
{
  protected abstract table: any;
  protected abstract idColumn: any;

  constructor(@Inject(DRIZZLE_CLIENT) protected readonly db: DrizzleClient) {}

  async findById(id: TKey): Promise<TSelect | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.idColumn, id))
      .limit(1);

    return (result[0] as TSelect) || null;
  }

  async findAll(): Promise<TSelect[]> {
    return this.db.select().from(this.table) as Promise<TSelect[]>;
  }

  async create(data: TInsert): Promise<TSelect> {
    const result = await this.db
      .insert(this.table)
      .values(data as any)
      .returning();

    return result[0] as TSelect;
  }

  async update(id: TKey, data: Partial<TInsert>): Promise<TSelect | null> {
    const result = await this.db
      .update(this.table)
      .set(data as any)
      .where(eq(this.idColumn, id))
      .returning();

    return (result[0] as TSelect) || null;
  }

  async delete(id: TKey): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.idColumn, id));

    return (result.rowCount ?? 0) > 0;
  }

  async findBy(condition: SQL): Promise<TSelect[]> {
    return this.db.select().from(this.table).where(condition) as Promise<
      TSelect[]
    >;
  }

  async findOneBy(condition: SQL): Promise<TSelect | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(condition)
      .limit(1);

    return (result[0] as TSelect) || null;
  }

  /**
   * Execute queries within a transaction
   */
  async transaction<R>(
    callback: (tx: DrizzleClient) => Promise<R>,
  ): Promise<R> {
    return this.db.transaction(callback);
  }
}
