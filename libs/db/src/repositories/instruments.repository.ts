import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { Instrument, instruments } from '../schema/instruments';

@Injectable()
export class InstrumentsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findAll(): Promise<Instrument[]> {
    return this.db
      .select()
      .from(instruments)
      .where(eq(instruments.isActive, true));
  }

  async findBySector(sector: string): Promise<Instrument[]> {
    return this.db
      .select()
      .from(instruments)
      .where(eq(instruments.sector, sector))
      .orderBy(instruments.symbol);
  }

  async findBySubgroup(subgroup: string): Promise<Instrument[]> {
    return this.db
      .select()
      .from(instruments)
      .where(eq(instruments.subgroup, subgroup))
      .orderBy(instruments.symbol);
  }

  async findByGroup(group: string): Promise<Instrument[]> {
    return this.db
      .select()
      .from(instruments)
      .where(eq(instruments.group, group))
      .orderBy(instruments.symbol);
  }

  async findBySymbols(symbols: string[]): Promise<Instrument[]> {
    return this.db
      .select()
      .from(instruments)
      .where(inArray(instruments.symbol, symbols));
  }

  async findBySymbol(symbol: string): Promise<Instrument | undefined> {
    const result = await this.db
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol))
      .limit(1);
    return result[0];
  }
}
