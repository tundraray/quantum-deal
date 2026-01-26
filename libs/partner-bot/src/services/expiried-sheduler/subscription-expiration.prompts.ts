/**
 * Create system prompt for generating subscription expiration notifications
 * Used with LLM generateObject to create personalized, multilingual messages
 *
 * @param botName - Name of the bot (e.g., "Quantum Deal AI", "Trading Bot")
 * @returns System prompt string
 */
export function createExpirationSystemPrompt(botName: string): string {
  return `You are an expert notification writer for ${botName} - a trading signals Telegram bot.

Your task is to generate subscription expiration notifications that convey the following key information:

1. Greeting (formal, polite)
2. Reminder about expiration timing with appropriate emoji
3. Mention key features: AI trading signals, comments, and statistics
4. Call to action: renew subscription or upgrade to higher tier (VIP)
5. Instructions: click the "Extend Trial" or "Buy Subscription" button below

Note: The structure above is a guideline. You don't need to follow it strictly - the main goal is to convey the message naturally and effectively. Feel free to reorganize, combine, or rephrase elements as needed for better flow.

Tone and style:
- Professional and polite
- Clear and direct
- Appropriate urgency based on days remaining
- For day 0 (expiration today): emphasize immediate action (use 🚨)
- For 3 days: moderate urgency (use ⚠️)
- For 7 days: gentle reminder (use 📅 or ⚠️)
- For negative days (already expired): reactivation message with empathetic tone (use 🔄 or 💫)
  - Acknowledge that access has ended
  - Emphasize what they're missing (AI signals, statistics, comments)
  - Invite to reactivate subscription
  - For -1 to -3 days: recent expiration, easy to return
  - For -7 days or more: "We miss you" / "Come back" tone
- IMPORTANT: Vary the message structure and wording to avoid repetitive notifications
- Use different sentence structures, synonyms, and phrasing while maintaining the core message

Format requirements:
- Format messages for Telegram messenger
- Use appropriate emoji for visual emphasis (⚠️, 🚨, 📅, ⏰, 🔔, etc.)
- IMPORTANT: Vary emoji selection between messages to avoid repetition
- Use line breaks (\\n) strategically for readability and visual structure
- You can use paragraph breaks to separate logical blocks
- Natural, human-like text
- 3-4 sentences or more if needed for clarity

Telegram Markdown formatting (use sparingly for emphasis):
- *bold text* - for important information
- _italic text_ - for emphasis
- __underlined text__ - for highlighting
- ~strikethrough~ - for crossed out text
- ||spoiler|| - for hidden text
- [link text](http://example.com/) - for links

Example with formatting:
"Здравствуйте! 📅 Напоминаем: через *7 дней* истекает срок вашего доступа к ${botName}.

Чтобы не терять доступ к _сделкам ИИ, комментариям и статистике_, продлите подписку или оформите *VIP*.

Нажмите кнопку *Продлить триал* или *Купить подписку* ниже 👇"

Reference example (Russian, 7 days):
"Здравствуйте! 📅 Напоминаем: через 7 дней истекает срок вашего доступа к ${botName}. Чтобы не терять доступ к сделкам ИИ, комментариям и статистике, продлите подписку или оформите более высокий уровень доступа (VIP). Нажмите кнопку ниже 👇"

Reference example (Russian, -3 days - expired 3 days ago):
"Здравствуйте! 🔄 Ваш доступ к ${botName} истёк 3 дня назад. За это время вы могли пропустить важные торговые сигналы ИИ и аналитику. Восстановите подписку, чтобы снова получать сделки, комментарии и статистику! Нажмите кнопку ниже 👇"

Output schema example:
{
  "en": "Hello! 📅 This is a reminder: your access to ${botName} expires in *7 days*.\\n\\nTo continue receiving _AI trading signals, comments, and statistics_, please renew your subscription or upgrade to *VIP*.\\n\\nClick the *Extend Trial* or *Buy Subscription* button below 👇",
  "ru": "Здравствуйте! 📅 Напоминаем: через *7 дней* истекает срок вашего доступа к ${botName}.\\n\\nЧтобы не терять доступ к _сделкам ИИ, комментариям и статистике_, продлите подписку или оформите *VIP*.\\n\\nНажмите кнопку *Продлить триал* или *Купить подписку* ниже 👇",
  "uk": "Вітаємо! 📅 Нагадуємо: через *7 днів* закінчується ваш доступ до ${botName}.\\n\\nЩоб не втратити доступ до _угод ШІ, коментарів та статистики_, продовжіть підписку або оформіть *VIP*.\\n\\nНатисніть кнопку нижче 👇"
}

The output must be a JSON object with language codes as keys and complete notification messages as string values.
Each language code must map to a fully formatted notification message with appropriate line breaks.`;
}

/**
 * Create user prompt for generating expiration messages
 * Combines notification data with language requirements
 *
 * @param data - Notification data (subscription name, days remaining, expiration date)
 * @param languages - Array of language codes to generate messages for
 * @param botName - Name of the bot (e.g., "Quantum Deal AI", "Trading Bot")
 * @returns Formatted prompt string
 */
export function createExpirationPrompt(
  data: {
    subscriptionName: string;
    daysRemaining: number;
    expirationDate: string;
  },
  languages: string[],
  botName: string,
): string {
  const daysAgo = Math.abs(data.daysRemaining);

  const timingPhrase =
    data.daysRemaining < 0
      ? daysAgo === 1
        ? 'expired 1 day ago'
        : `expired ${daysAgo} days ago`
      : data.daysRemaining === 0
        ? 'expires TODAY'
        : data.daysRemaining === 1
          ? 'expires in 1 day'
          : `expires in ${data.daysRemaining} days`;

  const reminderPhrase =
    data.daysRemaining < 0
      ? daysAgo === 1
        ? '1 day ago'
        : `${daysAgo} days ago`
      : data.daysRemaining === 0
        ? 'today'
        : data.daysRemaining === 1
          ? 'in 1 day'
          : `in ${data.daysRemaining} days`;

  const isReactivation = data.daysRemaining < 0;

  const keyElements = isReactivation
    ? `Key elements to include (in any natural order):
1. Greeting
2. Acknowledge that access has ended ("${reminderPhrase}")
3. Mention what they're missing: AI trading signals, comments, and statistics
4. Call to action: reactivate subscription or upgrade to VIP
5. Instructions: click the "Extend Trial" or "Buy Subscription" button below`
    : `Key elements to include (in any natural order):
1. Greeting
2. Reminder about expiration ("${reminderPhrase}")
3. Mention: AI trading signals, comments, and statistics
4. Call to action: renew or upgrade to VIP
5. Instructions: click the "Extend Trial" or "Buy Subscription" button below`;

  const messageType = isReactivation
    ? 'subscription REACTIVATION notifications (subscription already expired)'
    : 'subscription expiration notifications';

  return `Generate ${messageType} for ${botName}:

Subscription tier: ${data.subscriptionName}
Days ${isReactivation ? 'since expiration' : 'until expiration'}: ${isReactivation ? daysAgo : data.daysRemaining}
Timing: ${timingPhrase}
Expiration date: ${data.expirationDate}

${keyElements}

Feel free to be creative with structure and wording while conveying all key information.

Generate messages in these languages: ${languages.join(', ')}

Return a JSON object with language codes as keys (e.g., "en", "ru", "uk") and the notification message as the value for each language.`;
}
