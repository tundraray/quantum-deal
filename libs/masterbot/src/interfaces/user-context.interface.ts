import { Context } from '@quantumdeal/framework';
import { Manager } from '@quantumdeal/db';

/**
 * Extended Telegraf context interface for master bot that includes the authenticated user and manager
 */
export interface UserContext extends Context {
  /**
   * The manager object attached to the context after ManagersMiddleware authentication
   * This replaces the user field for master bot operations
   */
  manager?: Manager;
}
