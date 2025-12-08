import { Scenes } from 'telegraf';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Context extends Scenes.SceneContext {}

import { UserWithSubscriptions } from './user.dto';

/**
 * Extended Telegraf context interface that includes the authenticated user
 *
 * Migration Note:
 * - Changed user type from User (raw database entity) to UserWithSubscriptions (DTO)
 * - UserWithSubscriptions includes active subscriptions array instead of deprecated subscribeId
 * - This supports the new many-to-many subscription architecture
 */
export interface UserContext extends Context {
  /**
   * The user object attached to the context after authentication middleware
   * Includes all active subscriptions for the user
   */
  user?: UserWithSubscriptions;
}
