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
    SUBSCRIPTION: '/subscription',
  },
  MESSAGES: {
    UNAUTHORIZED: '❌ Access denied. This bot is for administrators only.',
    AUTH_REQUIRED: '❌ Authentication required. Please try again.',
    ERROR_GENERIC: '❌ An error occurred. Please try again later.',
    TYPING_ERROR: 'Error sending chat action',
  },
  ERRORS: {
    SUBSCRIPTION_NOT_FOUND: 'Подписка не найдена',
    INVALID_NAME: 'Неверное имя подписки. Используйте 3-50 символов.',
    MESSAGE_TOO_LONG: 'Сообщение слишком длинное (макс. 4096 символов)',
    NO_ACTIVE_SUBSCRIPTIONS: 'Нет активных подписок',
    PERMISSION_DENIED: 'У вас нет прав для этой операции',
  },
  CALLBACK_ACTIONS: {
    SUBSCRIPTION_PREFIX: 'subscription_',
    SUBSCRIPTION_CREATE: 'subscription_create',
    SUBSCRIPTION_CLOSE: 'subscription_close',
    SUBSCRIPTION_BROADCAST: 'subscription_broadcast',
    CLOSE_SUB_PREFIX: 'close_sub_',
    CLOSE_SUB_CONFIRM: 'close_sub_confirm_',
    CLOSE_SUB_CANCEL: 'close_sub_cancel',
    BROADCAST_SUB_PREFIX: 'broadcast_sub_',
    BROADCAST_CONFIRM: 'broadcast_confirm',
    BROADCAST_CANCEL: 'broadcast_cancel',
    MENU_STATS: 'menu_stats',
    MENU_CODE: 'menu_code',
    MENU_HELP: 'menu_help',
    MENU_MAIN: 'menu_main',
  },
} as const;
