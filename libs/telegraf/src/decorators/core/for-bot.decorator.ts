import { SetMetadata } from '@nestjs/common';
import { BOT_TARGET_METADATA } from '../../telegraf.constants';

/**
 * Decorator to target a handler to a specific dynamic bot
 *
 * When applied to an @Update class, the handler will only be
 * registered on the bot with the matching database ID.
 *
 * @param botId - Database ID of the target bot
 *
 * @example
 * ```typescript
 * @Update()
 * @ForBot(5) // Only registered on bot with ID 5
 * export class BrandSpecificUpdate {
 *   @Start()
 *   async onStart(@Ctx() ctx) {
 *     await ctx.reply('Welcome to Brand 5!')
 *   }
 * }
 * ```
 */
export const ForBot = (botId: number): ClassDecorator =>
  SetMetadata(BOT_TARGET_METADATA, botId);
