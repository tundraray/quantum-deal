import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { Instrument } from '@quantumdeal/db';
import { GroupCount } from '../services/instrument-filter.service';
import { FilterI18nHelper } from '../commands/filter/filter.i18n.helper';

export interface CallbackData {
  action: string;
  [key: string]: any;
}

/**
 * FilterKeyboardBuilder
 *
 * Builds inline keyboards for the instrument filter UI.
 * All callback data is JSON-serialized for type safety.
 */
@Injectable()
export class FilterKeyboardBuilder {
  private readonly ITEMS_PER_PAGE = 10;

  constructor(private readonly i18n: FilterI18nHelper) {}

  /**
   * Build main menu keyboard
   *
   * Shows 4 group buttons with counts, plus action buttons.
   *
   * @param lang - Language code
   * @param groupCounts - Map of group to selected/total counts
   * @returns Inline keyboard markup
   */
  buildMainMenuKeyboard(lang: string, groupCounts: Map<string, GroupCount>) {
    const buttons: InlineKeyboardButton[][] = [];

    // Group buttons
    const forex = groupCounts.get('forex') || { selected: 0, total: 0 };
    buttons.push([
      Markup.button.callback(
        this.i18n.formatGroupButton(lang, 'forex', forex.selected, forex.total),
        this.serializeCallback({ action: 'select_group', group: 'forex' }),
      ),
    ]);

    const commodities = groupCounts.get('commodities') || {
      selected: 0,
      total: 0,
    };
    buttons.push([
      Markup.button.callback(
        this.i18n.formatGroupButton(
          lang,
          'commodities',
          commodities.selected,
          commodities.total,
        ),
        this.serializeCallback({
          action: 'select_group',
          group: 'commodities',
        }),
      ),
    ]);

    const crypto = groupCounts.get('crypto') || { selected: 0, total: 0 };
    buttons.push([
      Markup.button.callback(
        this.i18n.formatGroupButton(
          lang,
          'crypto',
          crypto.selected,
          crypto.total,
        ),
        this.serializeCallback({ action: 'select_group', group: 'crypto' }),
      ),
    ]);

    const stocks = groupCounts.get('stocks') || { selected: 0, total: 0 };
    buttons.push([
      Markup.button.callback(
        this.i18n.formatGroupButton(
          lang,
          'stocks',
          stocks.selected,
          stocks.total,
        ),
        this.serializeCallback({ action: 'select_group', group: 'stocks' }),
      ),
    ]);

    // Action buttons
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.select_all'),
        this.serializeCallback({ action: 'select_all' }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.clear_filters'),
        this.serializeCallback({ action: 'clear_filters' }),
      ),
    ]);

    // Close button
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.close'),
        this.serializeCallback({ action: 'close' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build group list keyboard (Forex, Commodities, Crypto)
   *
   * Shows instruments with checkboxes, pagination, and controls.
   *
   * @param lang - Language code
   * @param group - Group name
   * @param instruments - All instruments in group
   * @param selectedSymbols - Set of selected symbols
   * @param currentPage - Current page number
   * @returns Inline keyboard markup
   */
  buildGroupListKeyboard(
    lang: string,
    group: string,
    instruments: Instrument[],
    selectedSymbols: Set<string>,
    currentPage: number,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all buttons
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.select_all_group'),
        this.serializeCallback({ action: 'select_all_group', group }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.deselect_all'),
        this.serializeCallback({ action: 'deselect_all_group', group }),
      ),
    ]);

    // Paginated instrument list
    const startIdx = currentPage * this.ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + this.ITEMS_PER_PAGE, instruments.length);
    const pageInstruments = instruments.slice(startIdx, endIdx);

    // Display instruments in 2 columns
    for (let i = 0; i < pageInstruments.length; i += 2) {
      const row: InlineKeyboardButton[] = [];

      // First column
      const instrument1 = pageInstruments[i];
      const isSelected1 = selectedSymbols.has(instrument1.symbol);
      const checkbox1 = isSelected1 ? '☑️' : '☐';
      row.push(
        Markup.button.callback(
          `${checkbox1} ${instrument1.symbol}`,
          this.serializeCallback({
            action: 'toggle_instrument',
            symbol: instrument1.symbol,
          }),
        ),
      );

      // Second column (if exists)
      if (i + 1 < pageInstruments.length) {
        const instrument2 = pageInstruments[i + 1];
        const isSelected2 = selectedSymbols.has(instrument2.symbol);
        const checkbox2 = isSelected2 ? '☑️' : '☐';
        row.push(
          Markup.button.callback(
            `${checkbox2} ${instrument2.symbol}`,
            this.serializeCallback({
              action: 'toggle_instrument',
              symbol: instrument2.symbol,
            }),
          ),
        );
      }

      buttons.push(row);
    }

    // Pagination and save buttons
    const totalPages = Math.ceil(instruments.length / this.ITEMS_PER_PAGE);
    if (totalPages > 1) {
      const paginationRow: InlineKeyboardButton[] = [];

      if (currentPage > 0) {
        paginationRow.push(
          Markup.button.callback(
            this.i18n.t(lang, 'buttons.prev_page'),
            this.serializeCallback({
              action: 'page',
              group,
              page: currentPage - 1,
            }),
          ),
        );
      }

      paginationRow.push(
        Markup.button.callback(
          this.i18n.t(lang, 'buttons.save'),
          this.serializeCallback({ action: 'save', group }),
        ),
      );

      if (currentPage < totalPages - 1) {
        paginationRow.push(
          Markup.button.callback(
            this.i18n.t(lang, 'buttons.next_page'),
            this.serializeCallback({
              action: 'page',
              group,
              page: currentPage + 1,
            }),
          ),
        );
      }

      buttons.push(paginationRow);
    } else {
      // No pagination, just save button
      buttons.push([
        Markup.button.callback(
          this.i18n.t(lang, 'buttons.save'),
          this.serializeCallback({ action: 'save', group }),
        ),
      ]);
    }

    // Back button
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.back_to_menu'),
        this.serializeCallback({ action: 'back_to_main' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build stocks subgroup menu keyboard
   *
   * Shows European and US stock subgroups with counts.
   *
   * @param lang - Language code
   * @param europeanCount - Selected/total for European stocks
   * @param usCount - Selected/total for US stocks
   * @returns Inline keyboard markup
   */
  buildStocksSubgroupKeyboard(
    lang: string,
    europeanCount: GroupCount,
    usCount: GroupCount,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all stocks
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.select_all_stocks'),
        this.serializeCallback({ action: 'select_all_stocks' }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.deselect_all'),
        this.serializeCallback({ action: 'deselect_all_stocks' }),
      ),
    ]);

    // European stocks button
    buttons.push([
      Markup.button.callback(
        `🇪🇺 ${this.i18n.t(lang, 'groups.european')} (${europeanCount.selected}/${europeanCount.total})`,
        this.serializeCallback({
          action: 'select_subgroup',
          subgroup: 'european',
        }),
      ),
    ]);

    // US stocks button
    buttons.push([
      Markup.button.callback(
        `🇺🇸 ${this.i18n.t(lang, 'groups.us')} (${usCount.selected}/${usCount.total})`,
        this.serializeCallback({ action: 'select_subgroup', subgroup: 'us' }),
      ),
    ]);

    // Back button
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.back_to_menu'),
        this.serializeCallback({ action: 'back_to_main' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build subgroup list keyboard (European/US stocks)
   *
   * Similar to group list but with "Back to stocks" button.
   *
   * @param lang - Language code
   * @param subgroup - Subgroup name ('european' or 'us')
   * @param instruments - All instruments in subgroup
   * @param selectedSymbols - Set of selected symbols
   * @param currentPage - Current page number
   * @returns Inline keyboard markup
   */
  buildSubgroupListKeyboard(
    lang: string,
    subgroup: string,
    instruments: Instrument[],
    selectedSymbols: Set<string>,
    currentPage: number,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all in subgroup
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.select_all_subgroup'),
        this.serializeCallback({ action: 'select_all_subgroup', subgroup }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.deselect_all'),
        this.serializeCallback({ action: 'deselect_all_subgroup', subgroup }),
      ),
    ]);

    // Paginated instrument list
    const startIdx = currentPage * this.ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + this.ITEMS_PER_PAGE, instruments.length);
    const pageInstruments = instruments.slice(startIdx, endIdx);

    // Display instruments in 2 columns
    for (let i = 0; i < pageInstruments.length; i += 2) {
      const row: InlineKeyboardButton[] = [];

      // First column
      const instrument1 = pageInstruments[i];
      const isSelected1 = selectedSymbols.has(instrument1.symbol);
      const checkbox1 = isSelected1 ? '☑️' : '☐';
      row.push(
        Markup.button.callback(
          `${checkbox1} ${instrument1.symbol}`,
          this.serializeCallback({
            action: 'toggle_instrument',
            symbol: instrument1.symbol,
          }),
        ),
      );

      // Second column (if exists)
      if (i + 1 < pageInstruments.length) {
        const instrument2 = pageInstruments[i + 1];
        const isSelected2 = selectedSymbols.has(instrument2.symbol);
        const checkbox2 = isSelected2 ? '☑️' : '☐';
        row.push(
          Markup.button.callback(
            `${checkbox2} ${instrument2.symbol}`,
            this.serializeCallback({
              action: 'toggle_instrument',
              symbol: instrument2.symbol,
            }),
          ),
        );
      }

      buttons.push(row);
    }

    // Pagination and save buttons
    const totalPages = Math.ceil(instruments.length / this.ITEMS_PER_PAGE);
    if (totalPages > 1) {
      const paginationRow: InlineKeyboardButton[] = [];

      if (currentPage > 0) {
        paginationRow.push(
          Markup.button.callback(
            this.i18n.t(lang, 'buttons.prev_page'),
            this.serializeCallback({
              action: 'page',
              subgroup,
              page: currentPage - 1,
            }),
          ),
        );
      }

      paginationRow.push(
        Markup.button.callback(
          this.i18n.t(lang, 'buttons.save'),
          this.serializeCallback({ action: 'save', subgroup }),
        ),
      );

      if (currentPage < totalPages - 1) {
        paginationRow.push(
          Markup.button.callback(
            this.i18n.t(lang, 'buttons.next_page'),
            this.serializeCallback({
              action: 'page',
              subgroup,
              page: currentPage + 1,
            }),
          ),
        );
      }

      buttons.push(paginationRow);
    } else {
      // No pagination, just save button
      buttons.push([
        Markup.button.callback(
          this.i18n.t(lang, 'buttons.save'),
          this.serializeCallback({ action: 'save', subgroup }),
        ),
      ]);
    }

    // Back to stocks button
    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.back_to_stocks'),
        this.serializeCallback({ action: 'back_to_stocks' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build confirmation screen keyboard
   *
   * @param lang - Language code
   * @returns Inline keyboard markup
   */
  buildConfirmationKeyboard(lang: string) {
    const buttons: InlineKeyboardButton[][] = [];

    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.edit_filter'),
        this.serializeCallback({ action: 'edit_filters' }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.clear_filters'),
        this.serializeCallback({ action: 'clear_filters_confirm' }),
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.close'),
        this.serializeCallback({ action: 'close' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build clear confirmation keyboard
   *
   * @param lang - Language code
   * @returns Inline keyboard markup
   */
  buildClearConfirmationKeyboard(lang: string) {
    const buttons: InlineKeyboardButton[][] = [];

    buttons.push([
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.yes_clear'),
        this.serializeCallback({ action: 'confirm_clear_filters' }),
      ),
      Markup.button.callback(
        this.i18n.t(lang, 'buttons.cancel'),
        this.serializeCallback({ action: 'cancel_clear' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Serialize callback data to JSON string
   */
  private serializeCallback(data: CallbackData): string {
    return JSON.stringify(data);
  }
}
