/**
 * Upgrade Button Helper
 *
 * Helper functions for creating "Upgrade to VIP" buttons in multi-language format.
 * Used in reports and notifications to encourage non-VIP users to upgrade.
 */

/**
 * Translations for "Upgrade to VIP" button
 */
const upgradeToVipTranslations: Record<string, string> = {
  ru: '⭐ Обновить до VIP',
  en: '⭐ Upgrade to VIP',
  uk: '⭐ Оновити до VIP',
  hi: '⭐ VIP में अपग्रेड करें',
  fr: '⭐ Passer au VIP',
  kk: '⭐ VIP-ке жаңарту',
  uz: '⭐ VIP ga yangilash',
  tg: '⭐ Гузаштан ба VIP',
};

/**
 * Get "Upgrade to VIP" button text for a given language
 *
 * @param lang - User's language code (ru, en, uk, hi, fr, kk, uz, tg)
 * @returns Localized button text
 */
function getUpgradeToVipButtonText(lang: string): string {
  return upgradeToVipTranslations[lang] || upgradeToVipTranslations['en'];
}

/**
 * Create inline keyboard button for "Upgrade to VIP"
 *
 * Creates a button that opens the renewal scene to show all available plans.
 * Used in weekly/monthly reports for non-VIP users.
 *
 * @param lang - User's language code
 * @returns Inline keyboard button array in Telegram format
 */
export function createUpgradeToVipButton(
  lang: string,
): Array<Array<{ text: string; callback_data: string }>> {
  return [
    [
      {
        text: getUpgradeToVipButtonText(lang),
        callback_data: 'open_renewal_scene',
      },
    ],
  ];
}
