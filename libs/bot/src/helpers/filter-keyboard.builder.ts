import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { Instrument } from '@quantumdeal/db';
import { GroupCount } from '../services/instrument-filter.service';

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

  /**
   * Build main menu keyboard
   *
   * Shows 4 group buttons with counts, plus action buttons.
   *
   * @param groupCounts - Map of group to selected/total counts
   * @param isAllSelected - Whether all instruments are selected
   * @returns Inline keyboard markup
   */
  buildMainMenuKeyboard(
    groupCounts: Map<string, GroupCount>,
    isAllSelected: boolean,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Group buttons
    buttons.push([
      Markup.button.callback(
        this.formatGroupButton(
          '💱 Валюты',
          groupCounts.get('forex') || { selected: 0, total: 0 },
        ),
        this.serializeCallback({ action: 'select_group', group: 'forex' }),
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        this.formatGroupButton(
          '🛢️ Товары',
          groupCounts.get('commodities') || { selected: 0, total: 0 },
        ),
        this.serializeCallback({
          action: 'select_group',
          group: 'commodities',
        }),
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        this.formatGroupButton(
          '💰 Криптовалюты',
          groupCounts.get('crypto') || { selected: 0, total: 0 },
        ),
        this.serializeCallback({ action: 'select_group', group: 'crypto' }),
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        this.formatGroupButton(
          '📈 Акции',
          groupCounts.get('stocks') || { selected: 0, total: 0 },
        ),
        this.serializeCallback({ action: 'select_group', group: 'stocks' }),
      ),
    ]);

    // Action buttons
    buttons.push([
      Markup.button.callback(
        '✅ Выбрать все',
        this.serializeCallback({ action: 'select_all' }),
      ),
      Markup.button.callback(
        '🗑️ Очистить фильтры',
        this.serializeCallback({ action: 'clear_filters' }),
      ),
    ]);

    // Close button
    buttons.push([
      Markup.button.callback(
        '❌ Закрыть',
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
   * @param group - Group name
   * @param instruments - All instruments in group
   * @param selectedSymbols - Set of selected symbols
   * @param currentPage - Current page number
   * @returns Inline keyboard markup
   */
  buildGroupListKeyboard(
    group: string,
    instruments: Instrument[],
    selectedSymbols: Set<string>,
    currentPage: number,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all buttons
    buttons.push([
      Markup.button.callback(
        '✅ Выбрать всю группу',
        this.serializeCallback({ action: 'select_all_group', group }),
      ),
      Markup.button.callback(
        '🗑️ Отменить выбор',
        this.serializeCallback({ action: 'deselect_all_group', group }),
      ),
    ]);

    // Paginated instrument list
    const startIdx = currentPage * this.ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + this.ITEMS_PER_PAGE, instruments.length);
    const pageInstruments = instruments.slice(startIdx, endIdx);

    for (const instrument of pageInstruments) {
      const isSelected = selectedSymbols.has(instrument.symbol);
      const checkbox = isSelected ? '☑️' : '☐';
      const displayName = instrument.displayName
        ? ` (${instrument.displayName})`
        : '';

      buttons.push([
        Markup.button.callback(
          `${checkbox} ${instrument.symbol}${displayName}`,
          this.serializeCallback({
            action: 'toggle_instrument',
            symbol: instrument.symbol,
          }),
        ),
      ]);
    }

    // Pagination and save buttons
    const totalPages = Math.ceil(instruments.length / this.ITEMS_PER_PAGE);
    if (totalPages > 1) {
      const paginationRow: InlineKeyboardButton[] = [];

      if (currentPage > 0) {
        paginationRow.push(
          Markup.button.callback(
            '◀️ Пред',
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
          '💾 Сохранить',
          this.serializeCallback({ action: 'save', group }),
        ),
      );

      if (currentPage < totalPages - 1) {
        paginationRow.push(
          Markup.button.callback(
            'След ▶️',
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
          '💾 Сохранить',
          this.serializeCallback({ action: 'save', group }),
        ),
      ]);
    }

    // Back button
    buttons.push([
      Markup.button.callback(
        '◀️ Назад в меню',
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
   * @param europeanCount - Selected/total for European stocks
   * @param usCount - Selected/total for US stocks
   * @returns Inline keyboard markup
   */
  buildStocksSubgroupKeyboard(europeanCount: GroupCount, usCount: GroupCount) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all stocks
    buttons.push([
      Markup.button.callback(
        '✅ Выбрать все акции',
        this.serializeCallback({ action: 'select_all_stocks' }),
      ),
      Markup.button.callback(
        '🗑️ Отменить выбор',
        this.serializeCallback({ action: 'deselect_all_stocks' }),
      ),
    ]);

    // European stocks button
    buttons.push([
      Markup.button.callback(
        `🇪🇺 Европейские (${europeanCount.selected}/${europeanCount.total})`,
        this.serializeCallback({
          action: 'select_subgroup',
          subgroup: 'european',
        }),
      ),
    ]);

    // US stocks button
    buttons.push([
      Markup.button.callback(
        `🇺🇸 Американские (${usCount.selected}/${usCount.total})`,
        this.serializeCallback({ action: 'select_subgroup', subgroup: 'us' }),
      ),
    ]);

    // Back button
    buttons.push([
      Markup.button.callback(
        '◀️ Назад в меню',
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
   * @param subgroup - Subgroup name ('european' or 'us')
   * @param instruments - All instruments in subgroup
   * @param selectedSymbols - Set of selected symbols
   * @param currentPage - Current page number
   * @returns Inline keyboard markup
   */
  buildSubgroupListKeyboard(
    subgroup: string,
    instruments: Instrument[],
    selectedSymbols: Set<string>,
    currentPage: number,
  ) {
    const buttons: InlineKeyboardButton[][] = [];

    // Select/Deselect all in subgroup
    buttons.push([
      Markup.button.callback(
        '✅ Выбрать всю подгруппу',
        this.serializeCallback({ action: 'select_all_subgroup', subgroup }),
      ),
      Markup.button.callback(
        '🗑️ Отменить выбор',
        this.serializeCallback({ action: 'deselect_all_subgroup', subgroup }),
      ),
    ]);

    // Paginated instrument list
    const startIdx = currentPage * this.ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + this.ITEMS_PER_PAGE, instruments.length);
    const pageInstruments = instruments.slice(startIdx, endIdx);

    for (const instrument of pageInstruments) {
      const isSelected = selectedSymbols.has(instrument.symbol);
      const checkbox = isSelected ? '☑️' : '☐';
      const displayName = instrument.displayName
        ? ` (${instrument.displayName})`
        : '';

      buttons.push([
        Markup.button.callback(
          `${checkbox} ${instrument.symbol}${displayName}`,
          this.serializeCallback({
            action: 'toggle_instrument',
            symbol: instrument.symbol,
          }),
        ),
      ]);
    }

    // Pagination and save buttons
    const totalPages = Math.ceil(instruments.length / this.ITEMS_PER_PAGE);
    if (totalPages > 1) {
      const paginationRow: InlineKeyboardButton[] = [];

      if (currentPage > 0) {
        paginationRow.push(
          Markup.button.callback(
            '◀️ Пред',
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
          '💾 Сохранить',
          this.serializeCallback({ action: 'save', subgroup }),
        ),
      );

      if (currentPage < totalPages - 1) {
        paginationRow.push(
          Markup.button.callback(
            'След ▶️',
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
          '💾 Сохранить',
          this.serializeCallback({ action: 'save', subgroup }),
        ),
      ]);
    }

    // Back to stocks button
    buttons.push([
      Markup.button.callback(
        '◀️ Назад к акциям',
        this.serializeCallback({ action: 'back_to_stocks' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build confirmation screen keyboard
   *
   * @returns Inline keyboard markup
   */
  buildConfirmationKeyboard() {
    const buttons: InlineKeyboardButton[][] = [];

    buttons.push([
      Markup.button.callback(
        '✏️ Изменить фильтр',
        this.serializeCallback({ action: 'edit_filters' }),
      ),
      Markup.button.callback(
        '🗑️ Очистить фильтр',
        this.serializeCallback({ action: 'clear_filters_confirm' }),
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        '❌ Закрыть',
        this.serializeCallback({ action: 'close' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Build clear confirmation keyboard
   *
   * @param totalInstruments - Total number of instruments
   * @returns Inline keyboard markup
   */
  buildClearConfirmationKeyboard(_totalInstruments: number) {
    const buttons: InlineKeyboardButton[][] = [];

    buttons.push([
      Markup.button.callback(
        '✅ Да, очистить',
        this.serializeCallback({ action: 'confirm_clear_filters' }),
      ),
      Markup.button.callback(
        '❌ Отмена',
        this.serializeCallback({ action: 'cancel_clear' }),
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Format group button text with counts
   */
  private formatGroupButton(name: string, count: GroupCount): string {
    if (count.selected === 0 && count.total > 0) {
      return `${name} (${count.total})`;
    }
    if (count.selected === count.total && count.total > 0) {
      return `${name} ✅ (${count.total})`;
    }
    return `${name} (${count.selected}/${count.total})`;
  }

  /**
   * Serialize callback data to JSON string
   */
  private serializeCallback(data: CallbackData): string {
    return JSON.stringify(data);
  }
}
