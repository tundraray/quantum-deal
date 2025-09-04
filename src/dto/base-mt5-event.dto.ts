import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum MT5EventType {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
  ORDER_SLTP_UPDATE = 'ORDER_SLTP_UPDATE',
  POSITION_SLTP_UPDATE = 'POSITION_SLTP_UPDATE',
  TEST = 'TEST',
}

export enum MT5OrderType {
  BUY = 'BUY',
  SELL = 'SELL',
  BUY_LIMIT = 'BUY_LIMIT',
  SELL_LIMIT = 'SELL_LIMIT',
  BUY_STOP = 'BUY_STOP',
  SELL_STOP = 'SELL_STOP',
  BUY_STOP_LIMIT = 'BUY_STOP_LIMIT',
  SELL_STOP_LIMIT = 'SELL_STOP_LIMIT',
}

export class BaseMT5EventDto {
  @IsEnum(MT5EventType)
  event: MT5EventType;

  @Transform(({ value }): number => {
    const parsed = parseInt(String(value), 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid ticket ID: ${value}`);
    }
    return parsed;
  })
  @IsNumber()
  ticket: number;

  @Transform(({ value }): string => {
    // If it's already an ISO string (contains 'T' and 'Z'), return as is
    if (typeof value === 'string' && value.includes('T')) {
      return value;
    }
    // If it's a Unix timestamp (number), convert to ISO
    if (typeof value === 'number') {
      return new Date(value * 1000).toISOString();
    }
    // If it's a numeric string, convert to number then ISO
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return new Date(Number(value) * 1000).toISOString();
    }
    // Otherwise return as string and let validation handle it
    return String(value);
  })
  @IsDateString()
  timestamp: string;

  @Transform(({ value }) => String(value))
  @IsString()
  account: string;

  @IsString()
  broker: string;

  @IsString()
  schema_version: string;

  @IsString()
  ea_version: string;

  @IsString()
  symbol: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    if (typeof value === 'number') {
      return value;
    }
    return undefined;
  })
  @IsNumber()
  position_id?: number;

  // Fields for OPEN and CLOSE events
  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.OPEN, MT5EventType.CLOSE].includes(obj.event),
  )
  @IsEnum(MT5OrderType)
  type?: MT5OrderType;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.OPEN, MT5EventType.CLOSE].includes(obj.event),
  )
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  volume?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.OPEN, MT5EventType.CLOSE].includes(obj.event),
  )
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  price?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.OPEN, MT5EventType.CLOSE].includes(obj.event),
  )
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  profit?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.OPEN, MT5EventType.CLOSE].includes(obj.event),
  )
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  swap?: number;

  // sl/tp fields - only for OPEN events and SLTP update events (NOT for CLOSE events)
  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.ORDER_SLTP_UPDATE,
      MT5EventType.POSITION_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @IsOptional()
  @Transform(({ value }): number => {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  sl?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.ORDER_SLTP_UPDATE,
      MT5EventType.POSITION_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @IsOptional()
  @Transform(({ value }): number => {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  tp?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  // CLOSE events additional fields: commission, total_profit
  @ValidateIf((obj: BaseMT5EventDto) => obj.event === MT5EventType.CLOSE)
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  commission?: number;

  @ValidateIf((obj: BaseMT5EventDto) => obj.event === MT5EventType.CLOSE)
  @Transform(({ value }): number => {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  })
  @IsNumber()
  total_profit?: number;
}
