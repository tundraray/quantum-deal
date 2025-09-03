import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class OrderResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  ticketId: string;

  @IsString()
  symbol: string;

  @IsString()
  orderType: string;

  @IsNumber()
  lots: number;

  @IsNumber()
  openPrice: number;

  @IsOptional()
  @IsNumber()
  closePrice?: number;

  @IsOptional()
  @IsNumber()
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  takeProfit?: number;

  @IsOptional()
  @IsNumber()
  profit?: number;

  @IsOptional()
  @IsDateString()
  closeTime?: string;

  @IsString()
  eventType: string;

  @IsString()
  account: string;

  @IsString()
  broker: string;

  @IsString()
  schemaVersion: string;

  @IsString()
  eaVersion: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  @IsDateString()
  eventTimestamp: string;

  @IsOptional()
  @IsNumber()
  swap?: number;

  @IsOptional()
  @IsNumber()
  commission?: number;

  @IsOptional()
  @IsString()
  dealType?: string;

  @IsOptional()
  @IsNumber()
  dealVolume?: number;

  @IsOptional()
  @IsNumber()
  dealProfit?: number;

  @IsOptional()
  @IsNumber()
  dealSwap?: number;

  @IsOptional()
  @IsNumber()
  partialClose?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}

export class AccountStatsDto {
  @IsNumber()
  totalEvents: number;

  eventsByType: { event: string; count: number }[];

  @IsNumber()
  totalProfit: number;

  @IsNumber()
  totalSwap: number;

  @IsNumber()
  totalCommission: number;
}

export class DailyTradingSummaryDto {
  @IsString()
  date: string;

  @IsNumber()
  openedPositions: number;

  @IsNumber()
  closedPositions: number;

  @IsNumber()
  totalProfit: number;

  @IsNumber()
  totalSwap: number;

  @IsNumber()
  totalCommission: number;

  symbols: string[];
}
