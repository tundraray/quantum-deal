/**
 * Possible states during partner bot verification flow.
 *
 * State transition:
 * undefined -> 'awaiting_channel_subscription' -> 'channel_verified' -> 'trial_activated' -> 'trial_expired'
 *
 * @example
 * ```typescript
 * const state: VerificationStateValue = 'awaiting_channel_subscription'
 * ```
 */
export type VerificationStateValue =
  | 'awaiting_channel_subscription'
  | 'channel_verified'
  | 'trial_activated'
  | 'trial_expired';

/**
 * Scene data for partner bot flow.
 *
 * Stored in `BotUserState.sceneData` field to track user progress through
 * channel verification and trial activation flow.
 *
 * Extends `Record<string, unknown>` to satisfy Telegraf scene context requirements
 * and allow additional properties while maintaining type safety for known fields.
 *
 * @example
 * ```typescript
 * const sceneData: PartnerFlowSceneData = {
 *   verificationState: 'awaiting_channel_subscription',
 *   verificationAttempts: 0,
 *   lastVerificationAttempt: new Date().toISOString()
 * }
 * ```
 */
export interface PartnerFlowSceneData extends Record<string, unknown> {
  /**
   * Current verification state in the partner bot flow.
   * Tracks user progression through channel subscription verification.
   */
  verificationState?: VerificationStateValue;

  /**
   * Number of verification attempts made by the user.
   * Used for rate limiting and tracking failed attempts.
   */
  verificationAttempts?: number;

  /**
   * Timestamp of the last verification attempt.
   * Can be Date object or ISO string depending on serialization context.
   */
  lastVerificationAttempt?: Date | string;

  /**
   * Timestamp when trial was activated.
   * Set after successful channel verification and trial activation.
   */
  trialActivatedAt?: Date | string;

  /**
   * Timestamp when trial expires.
   * Used to display remaining trial time to users.
   */
  trialExpiresAt?: Date | string;
}
