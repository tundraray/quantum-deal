import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import type { UserContext } from './interfaces';
import { MASTERBOT_BOT_NAME } from './constants';

@Injectable()
export class MasterbotInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasterbotInitService.name);

  constructor(
    @InjectBot(MASTERBOT_BOT_NAME)
    private readonly bot: Telegraf<UserContext>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      this.logger.log('Setting up masterbot commands...');

      // Set up menu button commands (next to text input)
      const commands = await this.bot.telegram.setMyCommands([
        { command: 'start', description: '🏠 Main menu' },
        { command: 'stats', description: '📊 Statistics' },
        { command: 'code', description: '🎫 Generate Code' },
        { command: 'help', description: '💡 Help' },
      ]);

      this.logger.log('Masterbot commands set up successfully', commands);
    } catch (error) {
      this.logger.error('Failed to set up masterbot commands', error);
      // Don't throw the error to prevent application startup failure
      // The bot will still work without commands being set
    }
  }
}
