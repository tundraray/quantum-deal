import { Injectable } from '@nestjs/common';

@Injectable()
export class BotService {
  echo(text: string): string {
    return `Echo: ${text}`;
  }
}
