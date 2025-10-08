import { z } from 'zod';

/**
 * Notification data for generating expiration messages
 */
export interface ExpirationNotificationData {
  readonly subscriptionName: string;
  readonly daysRemaining: number;
  readonly expirationDate: string;
}

/**
 * Generated messages for multiple languages
 */

export const expirationMessagesSchema = z.object({}).catchall(z.string());
export type ExpirationMessages = z.infer<typeof expirationMessagesSchema>;
/**
 * Default fallback messages when LLM is unavailable
 */
export const FALLBACK_MESSAGES: Record<number, ExpirationMessages> = {
  7: {
    en: 'Hello! 📅 This is a reminder: your access to Quantum Deal AI expires in 7 days ({expiration_date}).\n\nTo continue receiving AI trading signals, comments, and statistics, please renew your subscription or upgrade to a higher tier (VIP).\n\nTo renew or upgrade, contact your brokerage company expert who provided your previous access link.',
    ru: 'Здравствуйте! 📅 Напоминаем: через 7 дней истекает срок вашего доступа к Quantum Deal AI ({expiration_date}).\n\nЧтобы не терять доступ к сделкам ИИ, комментариям и статистике, продлите подписку или оформите более высокий уровень доступа (VIP).\n\nДля продления или апгрейда свяжитесь с вашим курирующим экспертом той брокерской компании, которая выдала предыдущую ссылку.',
    uk: "Вітаємо! 📅 Нагадуємо: через 7 днів закінчується термін вашого доступу до Quantum Deal AI ({expiration_date}).\n\nЩоб не втратити доступ до угод ШІ, коментарів та статистики, продовжіть підписку або оформіть вищий рівень доступу (VIP).\n\nДля продовження або апгрейду зв'яжіться з вашим курирующим експертом тієї брокерської компанії, яка видала попереднє посилання.",
  },
  3: {
    en: 'Hello! ⚠️ Important reminder: your access to Quantum Deal AI expires in 3 days ({expiration_date}).\n\nTo continue receiving AI trading signals, comments, and statistics, please renew your subscription or upgrade to a higher tier (VIP).\n\nTo renew or upgrade, contact your brokerage company expert who provided your previous access link.',
    ru: 'Здравствуйте! ⚠️ Важное напоминание: через 3 дня истекает срок вашего доступа к Quantum Deal AI ({expiration_date}).\n\nЧтобы не терять доступ к сделкам ИИ, комментариям и статистике, продлите подписку или оформите более высокий уровень доступа (VIP).\n\nДля продления или апгрейда свяжитесь с вашим курирующим экспертом той брокерской компании, которая выдала предыдущую ссылку.',
    uk: "Вітаємо! ⚠️ Важливе нагадування: через 3 дні закінчується термін вашого доступу до Quantum Deal AI ({expiration_date}).\n\nЩоб не втратити доступ до угод ШІ, коментарів та статистики, продовжіть підписку або оформіть вищий рівень доступу (VIP).\n\nДля продовження або апгрейду зв'яжіться з вашим курирующим експертом тієї брокерської компанії, яка видала попереднє посилання.",
  },
  0: {
    en: 'Hello! 🚨 URGENT: your access to Quantum Deal AI expires TODAY ({expiration_date}).\n\nTo continue receiving AI trading signals, comments, and statistics, please renew your subscription or upgrade to a higher tier (VIP) immediately.\n\nTo renew or upgrade, contact your brokerage company expert who provided your previous access link.',
    ru: 'Здравствуйте! 🚨 СРОЧНО: сегодня истекает срок вашего доступа к Quantum Deal AI ({expiration_date}).\n\nЧтобы не терять доступ к сделкам ИИ, комментариям и статистике, продлите подписку или оформите более высокий уровень доступа (VIP) прямо сейчас.\n\nДля продления или апгрейда свяжитесь с вашим курирующим экспертом той брокерской компании, которая выдала предыдущую ссылку.',
    uk: "Вітаємо! 🚨 ТЕРМІНОВО: сьогодні закінчується термін вашого доступу до Quantum Deal AI ({expiration_date}).\n\nЩоб не втратити доступ до угод ШІ, коментарів та статистики, продовжіть підписку або оформіть вищий рівень доступу (VIP) прямо зараз.\n\nДля продовження або апгрейду зв'яжіться з вашим курирующим експертом тієї брокерської компанії, яка видала попереднє посилання.",
  },
};

/**
 * Format fallback message with actual data
 */
export function formatFallbackMessage(
  template: string,
  data: ExpirationNotificationData,
): string {
  return template
    .replace(/{subscription_name}/g, data.subscriptionName)
    .replace(/{expiration_date}/g, data.expirationDate);
}
