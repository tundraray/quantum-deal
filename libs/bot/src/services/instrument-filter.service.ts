import { Injectable, Logger } from '@nestjs/common';
import {
  InstrumentsRepository,
  UserSubscriptionFeaturesRepository,
  Instrument,
} from '@quantumdeal/db';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { FilterI18nHelper } from '../commands/filter/filter.i18n.helper';

export interface GroupCount {
  selected: number;
  total: number;
}

export interface FilterSummary {
  totalInstruments: number;
  selectedCount: number;
  isAllSelected: boolean;
  groupCounts: Map<string, GroupCount>;
  selectedByGroup: Map<string, Instrument[]>;
}

/**
 * InstrumentFilterService
 *
 * Manages user instrument filtering preferences.
 * Handles loading, saving, and calculating filter statistics.
 */
@Injectable()
export class InstrumentFilterService {
  private readonly logger = new Logger(InstrumentFilterService.name);

  constructor(
    private readonly instrumentsRepository: InstrumentsRepository,
    private readonly userFeaturesRepository: UserSubscriptionFeaturesRepository,
    private readonly i18n: FilterI18nHelper,
  ) {}

  /**
   * Get user's current filter settings
   *
   * Returns an array of symbol strings the user has selected.
   * If no filters are configured, returns empty array (meaning all instruments).
   *
   * @param userId - Telegram user ID
   * @returns Array of selected symbol strings (e.g., ['EURUSD.a', 'BTCUSD.a'])
   */
  async getUserFilterSymbols(userId: number): Promise<string[]> {
    try {
      const settings = await this.userFeaturesRepository.getUserFeatureSettings(
        userId,
        FeatureFlag.CUSTOM_USER_FILTERING,
      );

      if (!settings || !settings.settings) {
        return []; // No filters = all instruments
      }

      // Extract symbols array from settings JSONB
      if (
        typeof settings.settings === 'object' &&
        settings.settings !== null &&
        'symbols' in settings.settings
      ) {
        const symbols = settings.settings.symbols;
        if (Array.isArray(symbols)) {
          return symbols.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }

      return [];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error loading user filters: ${err.message}`,
        err.stack,
      );
      return [];
    }
  }

  /**
   * Save user's filter selections
   *
   * Stores selected symbols in user_subscription_features.settings.symbols
   *
   * @param userId - Telegram user ID
   * @param symbols - Array of selected symbols (e.g., ['EURUSD.a', 'BTCUSD.a'])
   */
  async saveUserFilters(userId: number, symbols: string[]): Promise<void> {
    try {
      const settings = {
        symbols: symbols.length > 0 ? symbols : [], // Empty array = all instruments
      };

      await this.userFeaturesRepository.upsertUserSettings(
        userId,
        FeatureFlag.CUSTOM_USER_FILTERING,
        settings,
      );

      this.logger.log(
        `Saved filters for user ${userId}: ${symbols.length} instruments`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error saving user filters: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Clear all user filters (reset to default)
   *
   * Deletes the user's custom filter settings.
   *
   * @param userId - Telegram user ID
   */
  async clearUserFilters(userId: number): Promise<void> {
    try {
      await this.userFeaturesRepository.deleteUserSettings(
        userId,
        FeatureFlag.CUSTOM_USER_FILTERING,
      );
      this.logger.log(`Cleared filters for user ${userId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error clearing user filters: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get all instruments grouped by category
   *
   * @returns Map of group name to instruments array
   */
  async getAllInstrumentsGrouped(): Promise<Map<string, Instrument[]>> {
    const allInstruments = await this.instrumentsRepository.findAll();
    const grouped = new Map<string, Instrument[]>();

    for (const instrument of allInstruments) {
      const group = instrument.group;
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(instrument);
    }

    // Sort instruments within each group by symbol
    for (const instruments of grouped.values()) {
      instruments.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return grouped;
  }

  /**
   * Calculate filter summary statistics
   *
   * Returns comprehensive statistics about user's current selections.
   *
   * @param userSymbols - Array of user's selected symbols
   * @returns Filter summary with counts per group
   */
  async calculateFilterSummary(userSymbols: string[]): Promise<FilterSummary> {
    const allInstruments = await this.instrumentsRepository.findAll();
    const totalInstruments = allInstruments.length;

    // Empty array means all instruments selected
    const isAllSelected = userSymbols.length === 0;
    const selectedSymbolsSet = new Set(userSymbols);

    const groupCounts = new Map<string, GroupCount>();
    const selectedByGroup = new Map<string, Instrument[]>();

    // Group instruments
    const grouped = new Map<string, Instrument[]>();
    for (const instrument of allInstruments) {
      const group = instrument.group;
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(instrument);
    }

    // Calculate counts per group
    for (const [group, instruments] of grouped) {
      const selected = isAllSelected
        ? instruments
        : instruments.filter((i) => selectedSymbolsSet.has(i.symbol));

      groupCounts.set(group, {
        total: instruments.length,
        selected: selected.length,
      });

      selectedByGroup.set(group, selected);
    }

    return {
      totalInstruments,
      selectedCount: isAllSelected ? totalInstruments : userSymbols.length,
      isAllSelected,
      groupCounts,
      selectedByGroup,
    };
  }

  /**
   * Get instruments by group
   *
   * @param group - Group name (forex, commodities, crypto, stocks)
   * @returns Array of instruments in that group
   */
  async getInstrumentsByGroup(group: string): Promise<Instrument[]> {
    const instruments = await this.instrumentsRepository.findByGroup(group);
    return instruments.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Get instruments by sector (for stock subgroups)
   *
   * @param sector - Sector name (european, us)
   * @returns Array of instruments in that sector
   */
  async getInstrumentsBySector(sector: string): Promise<Instrument[]> {
    const instruments = await this.instrumentsRepository.findBySector(sector);
    return instruments.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Format confirmation summary text
   *
   * Creates a user-friendly summary of selected instruments.
   *
   * @param summary - Filter summary
   * @param lang - Language code
   * @returns Formatted text for confirmation screen
   */
  formatConfirmationSummary(summary: FilterSummary, lang: string): string {
    if (summary.isAllSelected) {
      return this.i18n.t(lang, 'ui.all_instruments', {
        count: summary.totalInstruments,
      });
    }

    const lines: string[] = [];
    lines.push(this.i18n.t(lang, 'ui.you_will_receive'));
    lines.push('');

    const groupEmojis: Record<string, string> = {
      forex: '💱',
      commodities: '🛢️',
      crypto: '💰',
      stocks: '📈',
    };

    for (const [groupKey, instruments] of summary.selectedByGroup) {
      if (instruments.length > 0) {
        const emoji = groupEmojis[groupKey] || '📊';
        const groupName = this.i18n.t(lang, `groups.${groupKey}`);
        const plural = this.i18n.plural(
          lang,
          'instruments',
          instruments.length,
        );
        lines.push(`${emoji} ${groupName}: ${instruments.length} ${plural}`);

        // Show first 5 instruments
        const toShow = instruments.slice(0, 5);
        for (const instrument of toShow) {
          const displayName = instrument.displayName
            ? ` (${instrument.displayName})`
            : '';
          lines.push(`  • ${instrument.symbol}${displayName}`);
        }

        // If more than 5, show "and X more"
        if (instruments.length > 5) {
          const remaining = instruments.length - 5;
          const remainingPlural = this.i18n.plural(
            lang,
            'instruments',
            remaining,
          );
          lines.push(
            `  ${this.i18n.t(lang, 'ui.and_more', { count: remaining, plural: remainingPlural })}`,
          );
        }

        lines.push('');
      }
    }

    const totalPlural = this.i18n.plural(
      lang,
      'instruments',
      summary.selectedCount,
    );
    lines.push(
      this.i18n.t(lang, 'ui.total_selected', {
        count: summary.selectedCount,
        total: summary.totalInstruments,
        plural: totalPlural,
      }),
    );
    return lines.join('\n');
  }
}
