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
    BROADCAST: '/broadcast',
  },
  COMMAND_DESCRIPTIONS: {
    START: '🚀 /start — Панель управления',
    STATS: '📊 /stats — Статистика пользователей и подписок',
    CODE: '🎫 /code — Генерация кодов подписки',
    SUBSCRIPTION: '📋 /subscription — Управление подписками',
    BROADCAST: '📢 /broadcast — Рассылка сообщений подписчикам',
    HELP: '💡 /help — Справка по командам',
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
    // Broadcast filter callback actions
    BROADCAST_FILTER_ACTIVE: 'broadcast_filter_active',
    BROADCAST_FILTER_EXPIRED: 'broadcast_filter_expired',
    BROADCAST_BOT_ALL: 'broadcast_bot_all',
    BROADCAST_BOT_PREFIX: 'broadcast_bot_', // Usage: `broadcast_bot_${botId}`
    // Subscription toggle actions for multi-select UI
    BROADCAST_SUB_TOGGLE_PREFIX: 'broadcast_sub_toggle_', // Usage: `broadcast_sub_toggle_${subscriptionId}`
    BROADCAST_SUB_SELECT_ALL: 'broadcast_sub_select_all',
    BROADCAST_SUB_DONE: 'broadcast_sub_done',
    // No-subscription filter (users who never activated any subscription)
    BROADCAST_FILTER_NO_SUBSCRIPTION: 'broadcast_filter_no_subscription',
    MENU_STATS: 'menu_stats',
    MENU_CODE: 'menu_code',
    MENU_HELP: 'menu_help',
    MENU_MAIN: 'menu_main',
  },
} as const;
