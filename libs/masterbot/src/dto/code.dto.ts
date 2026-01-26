import { IsString, IsNumber, IsBoolean } from 'class-validator';
import { SubscriptionDto } from './subscription.dto';

export class CodeDto {
  @IsNumber()
  id: number;

  @IsString()
  code: string;

  @IsNumber()
  subscriptionId: number;

  @IsNumber()
  managerId: number;

  @IsBoolean()
  isActive: boolean;

  createdAt: Date;
}

export class CreateSubscriptionResult {
  subscription: SubscriptionDto;
  code: CodeDto;
}
