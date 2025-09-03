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
  PARTIAL_CLOSE = 'PARTIAL_CLOSE',
  PENDING = 'PENDING',
  ACTIVATED = 'ACTIVATED',
  DELETE = 'DELETE',
  CANCELED = 'CANCELED',
  PARTIAL = 'PARTIAL',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ORDER_SLTP_UPDATE = 'ORDER_SLTP_UPDATE',
  POSITION_SLTP_UPDATE = 'POSITION_SLTP_UPDATE',
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

export enum MT5DealType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export class BaseMT5EventDto {
  @IsEnum(MT5EventType)
  event: MT5EventType;

  @IsString()
  ticket: string;

  @Transform(({ value }) => new Date(value * 1000).toISOString())
  @IsDateString()
  timestamp: string;

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
  @IsString()
  position_id?: string;

  // Position fields (for OPEN, CLOSE, PARTIAL_CLOSE, POSITION_SLTP_UPDATE)
  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.CLOSE,
      MT5EventType.PARTIAL_CLOSE,
      MT5EventType.POSITION_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @IsEnum(MT5OrderType)
  type?: MT5OrderType;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.CLOSE,
      MT5EventType.PARTIAL_CLOSE,
      MT5EventType.POSITION_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  volume?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.CLOSE,
      MT5EventType.PARTIAL_CLOSE,
      MT5EventType.POSITION_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  price?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  profit?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  swap?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.CLOSE,
      MT5EventType.PARTIAL_CLOSE,
      MT5EventType.POSITION_SLTP_UPDATE,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  @IsNumber()
  sl?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.OPEN,
      MT5EventType.CLOSE,
      MT5EventType.PARTIAL_CLOSE,
      MT5EventType.POSITION_SLTP_UPDATE,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  @IsNumber()
  tp?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  // Deal fields (for CLOSE, PARTIAL_CLOSE)
  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @IsEnum(MT5DealType)
  deal_type?: MT5DealType;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  deal_volume?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  deal_price?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  deal_profit?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  deal_swap?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  commission?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.CLOSE, MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  total_profit?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [MT5EventType.PARTIAL_CLOSE].includes(obj.event),
  )
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  partial_close?: number;

  // Order fields (for PENDING, ACTIVATED, DELETE, CANCELED, etc.)
  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.PENDING,
      MT5EventType.ACTIVATED,
      MT5EventType.DELETE,
      MT5EventType.CANCELED,
      MT5EventType.REJECTED,
      MT5EventType.EXPIRED,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @IsEnum(MT5OrderType)
  order_type?: MT5OrderType;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.PENDING,
      MT5EventType.ACTIVATED,
      MT5EventType.DELETE,
      MT5EventType.CANCELED,
      MT5EventType.REJECTED,
      MT5EventType.EXPIRED,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  order_volume?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.PENDING,
      MT5EventType.ACTIVATED,
      MT5EventType.DELETE,
      MT5EventType.CANCELED,
      MT5EventType.REJECTED,
      MT5EventType.EXPIRED,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  order_price?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.PENDING,
      MT5EventType.ACTIVATED,
      MT5EventType.DELETE,
      MT5EventType.CANCELED,
      MT5EventType.REJECTED,
      MT5EventType.EXPIRED,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  @IsNumber()
  order_sl?: number;

  @ValidateIf((obj: BaseMT5EventDto) =>
    [
      MT5EventType.PENDING,
      MT5EventType.ACTIVATED,
      MT5EventType.DELETE,
      MT5EventType.CANCELED,
      MT5EventType.REJECTED,
      MT5EventType.EXPIRED,
      MT5EventType.ORDER_SLTP_UPDATE,
    ].includes(obj.event),
  )
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  @IsNumber()
  order_tp?: number;
}
