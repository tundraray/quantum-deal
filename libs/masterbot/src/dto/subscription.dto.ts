import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;
}

export class SubscriptionDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[] | null;

  @IsBoolean()
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  @IsOptional()
  closedAt?: Date;

  @IsOptional()
  @IsNumber()
  closedBy?: number;
}

export class CloseSubscriptionDto {
  @IsNumber()
  subscriptionId: number;

  @IsNumber()
  managerId: number;
}
