/**
 * Verification states for partner bot flow.
 * Tracks user progression through channel subscription verification and trial activation.
 */
export type VerificationState =
  | 'awaiting_channel_subscription'
  | 'channel_verified'
  | 'trial_activated'
  | 'trial_expired';

/**
 * Partner bot settings.
 * Extends base bot settings with partner channel identifier.
 */
export interface PartnerBotSettings {
  /**
   * Partner channel identifier (e.g., '@channelname' or channel ID)
   * Used for verifying user subscription before trial activation
   */
  partner: string;
}

/**
 * User state for partner bot flow.
 * Tracks verification progress and trial status per user.
 */
export interface PartnerBotUserState {
  /**
   * Current verification state in the partner bot flow
   */
  verificationState: VerificationState;

  /**
   * Number of verification attempts made by the user
   */
  verificationAttempts: number;

  /**
   * Timestamp of the last verification attempt
   */
  lastVerificationAttempt?: Date;

  /**
   * Timestamp when trial was activated
   */
  trialActivatedAt?: Date;

  /**
   * Timestamp when trial expires
   */
  trialExpiresAt?: Date;
}

/**
 * Result of channel subscription verification.
 */
export interface VerificationResult {
  /**
   * Whether the user is verified as subscribed to the partner channel
   */
  verified: boolean;

  /**
   * Error message if verification failed
   */
  error?: string;
}

/**
 * Statistics for reminder operations.
 * Tracks success and failure counts for reminder messages.
 */
export interface ReminderStats {
  /**
   * Number of reminders successfully sent
   */
  sent: number;

  /**
   * Number of reminders skipped (e.g., user already verified)
   */
  skipped: number;

  /**
   * Number of reminders that failed to send
   */
  failed: number;
}
