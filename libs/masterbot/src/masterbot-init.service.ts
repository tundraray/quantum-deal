import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectBot } from '@quantumdeal/telegraf';
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
      const botInfo = await this.bot.telegram.getMe();
      const botUsername = botInfo.username;
      this.logger.log(`Setting up masterbot commands for ${botUsername}...`);

      // Set up menu button commands (next to text input)
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: '🏠 Main menu' },
        { command: 'stats', description: '📊 Statistics' },
        { command: 'code', description: '🎫 Generate Code' },
        { command: 'help', description: '💡 Help' },
        { command: 'subscription', description: '🔗 Subscription' },
      ]);

      this.logger.log('Masterbot commands set up successfully');
    } catch (error) {
      this.logger.error('Failed to set up masterbot commands', error);
      // Don't throw the error to prevent application startup failure
      // The bot will still work without commands being set
    }
  }
}
