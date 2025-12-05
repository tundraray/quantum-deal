import { BotSettings } from '@quantumdeal/db';

// Re-export scene data types for unified import path
export * from './scene-data.types';

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

  /**
   * Trial expiration date (only present when trial is activated successfully)
   */
  trialExpiresAt?: Date;
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

export interface PartnerSettings extends BotSettings {
  channelId?: string;
  channelName?: string;
  referralUrl?: string;
}
