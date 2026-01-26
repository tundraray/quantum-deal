import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectBot } from '@quantumdeal/telegraf';
import { Telegraf } from 'telegraf';
import type { UserContext } from '../interfaces';
import { BotName } from '../constants';

/**
 * Bot Initialization Service
 *
 * Handles bot initialization tasks that run once at application startup:
 * - Retrieves and logs bot information
 * - Sets up default command menu for all users
 *
 * Note: User-specific command menus based on feature flags are handled
 * by BotCommandsService.setUserCommands() during user interactions.
 */
@Injectable()
export class BotInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotInitService.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Telegraf<UserContext>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const botInfo = await this.bot.telegram.getMe();
      const botUsername = botInfo.username;
      this.logger.log(`Setting up bot commands for @${botUsername}...`);

      // Set up default menu button commands (visible to all users)
      // User-specific commands with feature flags are set via BotCommandsService
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'lang', description: 'Change language' },
      ]);

      this.logger.log(`Bot @${botUsername} commands set up successfully`);
    } catch (error) {
      this.logger.error('Failed to set up bot commands', error);
      // Don't throw - command menu is not critical for bot functionality
    }
  }
}
