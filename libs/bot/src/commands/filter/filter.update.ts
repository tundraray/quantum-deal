import { Logger, UseFilters } from '@nestjs/common';
import { Command, Update, Ctx } from '@quantumdeal/telegraf';
import { TelegrafExceptionFilter } from '@quantumdeal/framework';
import type { UserContext } from '../../interfaces';
import { FILTER_SCENE_ID } from '../../constants';

/**
 * FilterUpdate
 *
 * Handles /filter command routing.
 * Enters the filter scene for multi-step UI navigation.
 */
@Update()
@UseFilters(TelegrafExceptionFilter)
export class FilterUpdate {
  private readonly logger = new Logger(FilterUpdate.name);

  /**
   * Handle /filter command
   *
   * Enters the filter scene where user can:
   * - View current filter settings
   * - Select/deselect instruments by category
   * - Save or clear filters
   *
   * @param ctx - Telegram context
   */
  @Command('filter')
  async onFilter(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Сначала нужно зарегистрироваться. Используйте /start');
      return;
    }

    try {
      // Enter filter scene
      await ctx.scene.enter(FILTER_SCENE_ID);
    } catch (error) {
      this.logger.error('Error entering filter scene', error);
      await ctx.reply(
        'An error occurred while opening filters. Please try again later.',
      );
    }
  }
}
