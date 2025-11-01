import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_CLIENT, type DrizzleClient } from '@quantumdeal/db';
import { sql } from 'drizzle-orm';

/**
 * Monthly statistics data structure
 *
 * Used for displaying bot performance to new users during onboarding.
 */
export interface MonthlyStats {
  totalDeals: number;
  totalProfit: number;
  winRate: number; // as percentage (0-100)
  activeTraders: number;
}

/**
 * OnboardingService
 *
 * Responsible for fetching and formatting monthly bot statistics
 * for display in welcome messages.
 *
 * Features:
 * - Queries monthly_bot_statistics materialized view (fast, <10ms)
 * - Formats statistics for multi-language display
 * - Graceful fallback if no data available
 * - Supports 8 languages (RU, EN, UK, HI, FR, KK, UZ, TG)
 *
 * Architecture:
 * - Part of Week 3: Statistics & Onboarding implementation
 * - Integrates with StartUpdate for /start command flow
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: DrizzleClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get monthly statistics for onboarding display
   *
   * Returns null if statistics are unavailable or disabled.
   * This allows graceful fallback in the UI layer.
   *
   * @returns Monthly statistics or null
   */
  async getMonthlyStatistics(): Promise<MonthlyStats | null> {
    const enabled = this.configService.get<boolean>(
      'STATISTICS_SHOW_ON_ONBOARDING',
      true,
    );

    if (!enabled) {
      this.logger.debug('Statistics display disabled via config');
      return null;
    }

    try {
      // Query the materialized view directly with SQL
      const result = await this.db.execute<{
        total_deals: number;
        total_profit: string;
        win_rate: number;
        active_traders: number;
      }>(sql`
        SELECT
          total_deals,
          total_profit,
          win_rate,
          active_traders
        FROM monthly_bot_statistics
        LIMIT 1
      `);

      const stats = result.rows[0];

      if (!stats) {
        this.logger.debug('No statistics data available');
        return null;
      }

      // Check if we have actual data (total_deals > 0)
      if (!stats.total_deals || stats.total_deals === 0) {
        this.logger.debug('Statistics exist but no deals yet');
        return null;
      }

      // Convert database values to TypeScript types
      return {
        totalDeals: Number(stats.total_deals),
        totalProfit: Number(stats.total_profit),
        winRate: Number(stats.win_rate) * 100, // Convert to percentage (0-100)
        activeTraders: Number(stats.active_traders),
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to fetch statistics',
        error instanceof Error ? error.message : String(error),
      );
      return null; // Graceful fallback
    }
  }

  /**
   * Format statistics for display in welcome message
   *
   * Returns formatted string with emojis and proper number formatting.
   * Returns null if no stats to display (for graceful fallback).
   *
   * @param stats - Monthly statistics object or null
   * @param language - User's preferred language (default: 'en')
   * @returns Formatted statistics string or null
   */
  formatStatistics(
    stats: MonthlyStats | null,
    language: string = 'en',
  ): string | null {
    if (!stats) return null;

    // Format numbers with thousands separators
    const formatNumber = (num: number) => num.toLocaleString('en-US');
    const formatMoney = (num: number) => `$${formatNumber(Math.round(num))}`;
    const formatPercent = (num: number) => `${num.toFixed(1)}%`;

    // Multi-language templates
    const templates: Record<string, string> = {
      en: `📊 Our Community This Month:\n💰 Total Profit: ${formatMoney(stats.totalProfit)}\n📈 Successful Deals: ${formatNumber(stats.totalDeals)}\n🎯 Win Rate: ${formatPercent(stats.winRate)}\n👥 Active Traders: ${formatNumber(stats.activeTraders)}`,
      ru: `📊 Наше сообщество за месяц:\n💰 Общая прибыль: ${formatMoney(stats.totalProfit)}\n📈 Успешных сделок: ${formatNumber(stats.totalDeals)}\n🎯 Винрейт: ${formatPercent(stats.winRate)}\n👥 Активных трейдеров: ${formatNumber(stats.activeTraders)}`,
      uk: `📊 Наша спільнота за місяць:\n💰 Загальний прибуток: ${formatMoney(stats.totalProfit)}\n📈 Успішних угод: ${formatNumber(stats.totalDeals)}\n🎯 Вінрейт: ${formatPercent(stats.winRate)}\n👥 Активних трейдерів: ${formatNumber(stats.activeTraders)}`,
      hi: `📊 इस महीने हमारा समुदाय:\n💰 कुल लाभ: ${formatMoney(stats.totalProfit)}\n📈 सफल सौदे: ${formatNumber(stats.totalDeals)}\n🎯 जीत दर: ${formatPercent(stats.winRate)}\n👥 सक्रिय व्यापारी: ${formatNumber(stats.activeTraders)}`,
      fr: `📊 Notre communauté ce mois:\n💰 Profit total: ${formatMoney(stats.totalProfit)}\n📈 Transactions réussies: ${formatNumber(stats.totalDeals)}\n🎯 Taux de réussite: ${formatPercent(stats.winRate)}\n👥 Traders actifs: ${formatNumber(stats.activeTraders)}`,
      kk: `📊 Біздің қауымдастық осы айда:\n💰 Жалпы пайда: ${formatMoney(stats.totalProfit)}\n📈 Сәтті мәмілелер: ${formatNumber(stats.totalDeals)}\n🎯 Жеңіс деңгейі: ${formatPercent(stats.winRate)}\n👥 Белсенді трейдерлер: ${formatNumber(stats.activeTraders)}`,
      uz: `📊 Bizning jamiyat bu oyda:\n💰 Umumiy foyda: ${formatMoney(stats.totalProfit)}\n📈 Muvaffaqiyatli bitimlar: ${formatNumber(stats.totalDeals)}\n🎯 G'alabalar nisbati: ${formatPercent(stats.winRate)}\n👥 Faol treyderlar: ${formatNumber(stats.activeTraders)}`,
      tg: `📊 Ҷомеаи мо дар ин моҳ:\n💰 Фоидаи умумӣ: ${formatMoney(stats.totalProfit)}\n📈 Созишҳои муваффақ: ${formatNumber(stats.totalDeals)}\n🎯 Нисбати ғалаба: ${formatPercent(stats.winRate)}\n👥 Тредерҳои фаъол: ${formatNumber(stats.activeTraders)}`,
    };

    return templates[language] || templates['en'];
  }
}
