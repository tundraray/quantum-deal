import { Context } from '@quantumdeal/framework';
import { User } from '@quantumdeal/db';

/**
 * Extended Telegraf context interface that includes the authenticated user
 */
export interface UserContext extends Context {
  /**
   * The user object attached to the context after authentication middleware
   */
  user?: User;
}
