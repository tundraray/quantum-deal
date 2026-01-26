import { IsString, IsNumber, MaxLength, MinLength } from 'class-validator';

export class BroadcastMessageDto {
  @IsNumber()
  subscriptionId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4096) // Telegram message limit
  message: string;

  @IsNumber()
  managerId: number;
}

export class BroadcastResultDto {
  @IsNumber()
  queuedCount: number;

  @IsNumber()
  errorCount: number;

  @IsNumber()
  recipientCount: number;

  queuedIds: string[];
  errors: string[];
}

export class MessageValidationResult {
  valid: boolean;
  error?: string;
}
