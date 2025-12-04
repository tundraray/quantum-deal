// Partner Bot Constants

/**
 * Feature flag key for partner flow.
 * Handlers decorated with @RequiresFeature('partnerFlowEnabled') will only be
 * registered on bots where bot_settings.settings.features.partnerFlowEnabled = true.
 */
export const PARTNER_FLOW_FEATURE_KEY = 'partnerFlowEnabled';

/**
 * Callback data constants for inline keyboard buttons
 */
export const CALLBACK_DATA = {
  /** Verify channel subscription button */
  VERIFY_SUBSCRIPTION: 'partner_verify_subscription',
  /** Extend trial button */
  EXTEND_TRIAL: 'partner_extend_trial',
  /** Buy subscription button */
  BUY_SUBSCRIPTION: 'partner_buy_subscription',
  /** Trial status button */
  TRIAL_STATUS: 'partner_trial_status',
} as const;

/**
 * Message key constants for bot messages
 */
export const MESSAGE_KEYS = {
  /** Channel subscription prompt message */
  CHANNEL_PROMPT: 'partner_channel_prompt',
  /** Welcome message */
  WELCOME: 'partner_welcome',
  /** Trial activated message */
  TRIAL_ACTIVATED: 'partner_trial_activated',
  /** Verification failed message */
  VERIFICATION_FAILED: 'partner_verification_failed',
  /** Rate limit message */
  RATE_LIMIT: 'partner_rate_limit',
} as const;

/**
 * Button text message key constants
 */
export const BUTTON_KEYS = {
  /** "I subscribed" button text */
  I_SUBSCRIBED: 'button_i_subscribed',
  /** "Try Again" button text */
  TRY_AGAIN: 'button_try_again',
  /** "Extend Trial" button text */
  EXTEND_TRIAL: 'button_extend_trial',
  /** "Buy Subscription" button text */
  BUY_SUBSCRIPTION: 'button_buy_subscription',
} as const;
