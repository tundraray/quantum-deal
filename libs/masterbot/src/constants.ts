/**
 * Master bot constants and configuration
 */

export const MASTERBOT_BOT_NAME = 'QuantumDealMasterBot';

export const MASTERBOT_CONSTANTS = {
  BOT_NAME: MASTERBOT_BOT_NAME,
  COMMANDS: {
    START: '/start',
    STATS: '/stats',
    CODE: '/code',
    HELP: '/help',
  },
  MESSAGES: {
    UNAUTHORIZED: '❌ Access denied. This bot is for administrators only.',
    AUTH_REQUIRED: '❌ Authentication required. Please try again.',
    ERROR_GENERIC: '❌ An error occurred. Please try again later.',
    TYPING_ERROR: 'Error sending chat action',
  },
  CALLBACK_ACTIONS: {
    SUBSCRIPTION_PREFIX: 'subscription_',
    MENU_STATS: 'menu_stats',
    MENU_CODE: 'menu_code',
    MENU_HELP: 'menu_help',
    MENU_MAIN: 'menu_main',
  },
} as const;

/**
 * Statistics refresh intervals (in milliseconds)
 */
export const STATS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
