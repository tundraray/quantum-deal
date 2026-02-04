/**
 * Signals Internationalization - Fallback templates
 *
 * Provides fallback templates for signal messages when DB templates are not available.
 * Used by BatchMessageFormatter for batch signal delivery.
 *
 * ## Conditional blocks (inside {{#each signals}}):
 * - {{#open}}...{{/open}} - renders only for OPEN signals
 * - {{#close_plus}}...{{/close_plus}} - renders only for profitable closes
 * - {{#close_minus}}...{{/close_minus}} - renders only for losing closes
 * - {{#close_zero}}...{{/close_zero}} - renders only for break-even closes
 * - {{#position_sltp_update}}...{{/position_sltp_update}} - renders only for SL/TP changes
 *
 * ## Available placeholders inside {{#each signals}}:
 * - {index} - signal number (1, 2, 3...)
 * - {event_type} - raw event type (open, close_plus, close_minus, position_sltp_update)
 * - {emoji} - event emoji (🟢, 🔵, 🔴, 🟣)
 * - {type} - formatted event type (OPEN, CLOSE +, CLOSE -, SL/TP UPDATE)
 * - {symbol} - trading symbol
 * - {order_type} - order type (#BUY, #SELL)
 * - {price} - entry/close price
 * - {tp} - take profit (new value)
 * - {sl} - stop loss (new value)
 * - {old_tp} - old take profit (for SL/TP update)
 * - {old_sl} - old stop loss (for SL/TP update)
 * - {profit} - profit with sign (+$123.45 or -$50.00)
 *
 * ## Available outside {{#each}}:
 * - {count} - number of signals
 * - {timestamp} - batch timestamp
 */

import type { I18nMessages } from '../localization/interfaces';

/**
 * Signals i18n namespace identifier
 */
export const SIGNALS_I18N_NAMESPACE = 'signals';

/**
 * Signals messages with batch_signals template
 */
export const signalsMessages: I18nMessages = {
  en: {
    batch_signals: `📦 **BATCH** x{count} signals

{{#each signals}}
{{#open}}🟢 **OPEN** {symbol} {order_type}
💵 Entry: \`{price}\`
🎯 TP: \`{tp}\` | 🛑 SL: \`{sl}\`
{{/open}}{{#close_plus}}🔵 **WIN** {symbol} {order_type}
💰 Profit: **{profit}**
💵 \`{price}\`
{{/close_plus}}{{#close_minus}}🔴 **LOSS** {symbol} {order_type}
📉 Result: **{profit}**
💵 \`{price}\`
{{/close_minus}}{{#close_zero}}⚪ **CLOSED** {symbol} {order_type}
💵 \`{price}\`
{{/close_zero}}{{#position_sltp_update}}🟣 **SL/TP** {symbol} {order_type}
🎯 TP: \`{old_tp}\` ➔ **{tp}**
🛑 SL: \`{old_sl}\` ➔ **{sl}**
{{/position_sltp_update}}———
{{/each}}
⏱ {timestamp}`,
  },

  ru: {
    batch_signals: `📦 **ПАКЕТ** x{count} сигналов

{{#each signals}}
{{#open}}🟢 **ОТКРЫТИЕ** {symbol} {order_type}
💵 Вход: \`{price}\`
🎯 TP: \`{tp}\` | 🛑 SL: \`{sl}\`
{{/open}}{{#close_plus}}🔵 **ПРОФИТ** {symbol} {order_type}
💰 Прибыль: **{profit}**
💵 \`{price}\`
{{/close_plus}}{{#close_minus}}🔴 **УБЫТОК** {symbol} {order_type}
📉 Результат: **{profit}**
💵 \`{price}\`
{{/close_minus}}{{#close_zero}}⚪ **ЗАКРЫТО** {symbol} {order_type}
💵 \`{price}\`
{{/close_zero}}{{#position_sltp_update}}🟣 **SL/TP** {symbol} {order_type}
🎯 TP: \`{old_tp}\` ➔ **{tp}**
🛑 SL: \`{old_sl}\` ➔ **{sl}**
{{/position_sltp_update}}———
{{/each}}
⏱ {timestamp}`,
  },

  uk: {
    batch_signals: `📦 **ПАКЕТ** x{count} сигналів

{{#each signals}}
{{#open}}🟢 **ВІДКРИТТЯ** {symbol} {order_type}
💵 Вхід: \`{price}\`
🎯 TP: \`{tp}\` | 🛑 SL: \`{sl}\`
{{/open}}{{#close_plus}}🔵 **ПРОФІТ** {symbol} {order_type}
💰 Прибуток: **{profit}**
💵 \`{price}\`
{{/close_plus}}{{#close_minus}}🔴 **ЗБИТОК** {symbol} {order_type}
📉 Результат: **{profit}**
💵 \`{price}\`
{{/close_minus}}{{#close_zero}}⚪ **ЗАКРИТО** {symbol} {order_type}
💵 \`{price}\`
{{/close_zero}}{{#position_sltp_update}}🟣 **SL/TP** {symbol} {order_type}
🎯 TP: \`{old_tp}\` ➔ **{tp}**
🛑 SL: \`{old_sl}\` ➔ **{sl}**
{{/position_sltp_update}}———
{{/each}}
⏱ {timestamp}`,
  },
};
