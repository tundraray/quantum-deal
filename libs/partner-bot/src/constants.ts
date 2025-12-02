// Partner Bot Constants

/**
 * Partner Bot Name
 * Used for bot registration and identification in multi-bot setup
 */
export const PARTNER_BOT_NAME = 'PartnerBot';

/**
 * Feature flag key for partner flow.
 * Handlers decorated with @RequiresFeature('partnerFlowEnabled') will only be
 * registered on bots where bot_settings.settings.features.partnerFlowEnabled = true.
 */
export const PARTNER_FLOW_FEATURE_KEY = 'partnerFlowEnabled';
