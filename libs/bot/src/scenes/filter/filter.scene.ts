import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, Action, Ctx } from 'nestjs-telegraf';
import { FILTER_SCENE_ID } from '../../constants';
import type { UserContext } from '../../interfaces';
import { InstrumentFilterService } from '../../services/instrument-filter.service';
import { FilterSessionService } from '../../services/filter-session.service';
import { FilterKeyboardBuilder } from '../../helpers/filter-keyboard.builder';
import { InstrumentsRepository } from '@quantumdeal/db';
import {
  checkFeatureAccess,
  sendFeatureNotAvailable,
} from '../../helpers/feature-access.helper';
import { FeatureFlag } from '@quantumdeal/db/schema';

interface CallbackData {
  action: string;
  [key: string]: any;
}

/**
 * FilterScene
 *
 * Handles the instrument filtering UI flow.
 * Uses scene-based architecture for multi-step navigation.
 */
@Scene(FILTER_SCENE_ID)
@Injectable()
export class FilterScene {
  private readonly logger = new Logger(FilterScene.name);

  constructor(
    private readonly filterService: InstrumentFilterService,
    private readonly sessionService: FilterSessionService,
    private readonly keyboardBuilder: FilterKeyboardBuilder,
    private readonly instrumentsRepository: InstrumentsRepository,
  ) {}

  /**
   * Scene entry point
   *
   * Triggered when user types /filter command or enters scene programmatically.
   */
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: any): Promise<void> {
    const userCtx = ctx as UserContext;
    const userId = userCtx.from?.id;
    if (!userId) {
      await userCtx.reply('Ошибка: не удалось определить пользователя');
      await userCtx.scene.leave();
      return;
    }

    // Check feature access
    if (!checkFeatureAccess(userCtx, FeatureFlag.CUSTOM_USER_FILTERING)) {
      await sendFeatureNotAvailable(userCtx, FeatureFlag.CUSTOM_USER_FILTERING);
      await userCtx.scene.leave();
      return;
    }

    try {
      // Initialize session
      const currentFilters =
        await this.filterService.getUserFilterSymbols(userId);
      this.sessionService.initializeSession(userId, currentFilters);

      // Show main menu
      await this.showMainMenu(userCtx);
    } catch (error) {
      this.logger.error(`Error entering filter scene: ${error.message}`, error);
      await userCtx.reply(
        'Произошла ошибка при загрузке фильтров. Попробуйте позже.',
      );
      await userCtx.scene.leave();
    }
  }

  /**
   * Main menu display
   */
  private async showMainMenu(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) {
      await ctx.reply(
        'Сессия истекла. Используйте /filter для повторного входа.',
      );
      await ctx.scene.leave();
      return;
    }

    const summary = await this.filterService.calculateFilterSummary(
      Array.from(session.sessionFilters),
    );

    let statusText: string;
    if (summary.isAllSelected) {
      statusText = `✅ Все инструменты (${summary.totalInstruments})`;
    } else {
      statusText = `📊 Выбрано: ${summary.selectedCount} из ${summary.totalInstruments}`;
    }

    const messageText = `🎯 *Фильтр инструментов*

Текущий статус:
${statusText}

Выберите категорию:`;

    const keyboard = this.keyboardBuilder.buildMainMenuKeyboard(
      summary.groupCounts,
      summary.isAllSelected,
    );

    this.sessionService.updateNavigation(userId, 'main');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
    }
  }

  /**
   * Handle group selection (Forex, Commodities, Crypto, Stocks)
   */
  @Action(/^.+$/)
  async onAction(@Ctx() ctx: any): Promise<void> {
    const userCtx = ctx as UserContext;
    const userId = userCtx.from?.id;
    if (!userId) return;

    const callbackData = userCtx.callbackQuery?.['data'];
    if (!callbackData) return;

    try {
      const data: CallbackData = JSON.parse(callbackData);

      switch (data.action) {
        case 'select_group':
          await this.handleSelectGroup(userCtx, data.group);
          break;
        case 'select_all':
          await this.handleSelectAll(userCtx);
          break;
        case 'clear_filters':
          await this.handleClearFilters(userCtx);
          break;
        case 'close':
          await this.handleClose(userCtx);
          break;
        case 'toggle_instrument':
          await this.handleToggleInstrument(userCtx, data.symbol);
          break;
        case 'select_all_group':
          await this.handleSelectAllGroup(userCtx, data.group);
          break;
        case 'deselect_all_group':
          await this.handleDeselectAllGroup(userCtx, data.group);
          break;
        case 'page':
          await this.handlePage(userCtx, data.group, data.subgroup, data.page);
          break;
        case 'save':
          await this.handleSave(userCtx);
          break;
        case 'back_to_main':
          await this.handleBackToMain(userCtx);
          break;
        case 'select_subgroup':
          await this.handleSelectSubgroup(userCtx, data.subgroup);
          break;
        case 'select_all_stocks':
          await this.handleSelectAllStocks(userCtx);
          break;
        case 'deselect_all_stocks':
          await this.handleDeselectAllStocks(userCtx);
          break;
        case 'select_all_subgroup':
          await this.handleSelectAllSubgroup(userCtx, data.subgroup);
          break;
        case 'deselect_all_subgroup':
          await this.handleDeselectAllSubgroup(userCtx, data.subgroup);
          break;
        case 'back_to_stocks':
          await this.handleBackToStocks(userCtx);
          break;
        case 'edit_filters':
          await this.showMainMenu(userCtx);
          break;
        case 'clear_filters_confirm':
          await this.handleClearFiltersConfirm(userCtx);
          break;
        case 'confirm_clear_filters':
          await this.handleConfirmClearFilters(userCtx);
          break;
        case 'cancel_clear':
          await this.handleCancelClear(userCtx);
          break;
        default:
          this.logger.warn(`Unknown action: ${data.action}`);
          await userCtx.answerCbQuery('Неизвестное действие');
      }
    } catch (error) {
      this.logger.error(`Error handling action: ${error.message}`, error);
      await userCtx.answerCbQuery('Произошла ошибка');
    }
  }

  private async handleSelectGroup(
    ctx: UserContext,
    group: string,
  ): Promise<void> {
    const userId = ctx.from!.id;

    if (group === 'stocks') {
      await this.showStocksSubgroups(ctx);
    } else {
      await this.showGroupList(ctx, group);
    }
  }

  private async showGroupList(ctx: UserContext, group: string): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const instruments = await this.filterService.getInstrumentsByGroup(group);
    const selectedSymbols = session.sessionFilters;

    const groupEmojis = {
      forex: '💱',
      commodities: '🛢️',
      crypto: '💰',
    };

    const groupNames = {
      forex: 'Валюты',
      commodities: 'Товары',
      crypto: 'Криптовалюты',
    };

    const emoji = groupEmojis[group] || '📊';
    const name = groupNames[group] || group;

    const selectedCount = instruments.filter((i) =>
      selectedSymbols.has(i.symbol),
    ).length;

    let messageText = `${emoji} *${name}* (${instruments.length} ${this.pluralizeInstruments(instruments.length)})

Выбрано: ${selectedCount} из ${instruments.length}`;

    const currentPage = session.currentPage;
    const totalPages = Math.ceil(instruments.length / 10);

    if (totalPages > 1) {
      messageText += `\n\n« Страница ${currentPage + 1} из ${totalPages} »`;
    }

    const keyboard = this.keyboardBuilder.buildGroupListKeyboard(
      group,
      instruments,
      selectedSymbols,
      currentPage,
    );

    this.sessionService.updateNavigation(userId, `${group}_list` as any);

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    await ctx.answerCbQuery();
  }

  private async showStocksSubgroups(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    // Get European stocks
    const europeanStocks =
      await this.instrumentsRepository.findBySector('european');
    const europeanSelected = europeanStocks.filter((i) =>
      session.sessionFilters.has(i.symbol),
    ).length;

    // Get US stocks
    const usStocks = await this.instrumentsRepository.findBySector('us');
    const usSelected = usStocks.filter((i) =>
      session.sessionFilters.has(i.symbol),
    ).length;

    const totalStocks = europeanStocks.length + usStocks.length;
    const totalSelected = europeanSelected + usSelected;

    const messageText = `📈 *Акции* (${totalStocks} ${this.pluralizeInstruments(totalStocks)})

Выбрано: ${totalSelected} из ${totalStocks}

Выберите подгруппу:`;

    const keyboard = this.keyboardBuilder.buildStocksSubgroupKeyboard(
      { selected: europeanSelected, total: europeanStocks.length },
      { selected: usSelected, total: usStocks.length },
    );

    this.sessionService.updateNavigation(userId, 'stocks_subgroups');

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    await ctx.answerCbQuery();
  }

  private async handleSelectSubgroup(
    ctx: UserContext,
    subgroup: string,
  ): Promise<void> {
    await this.showSubgroupList(ctx, subgroup);
  }

  private async showSubgroupList(
    ctx: UserContext,
    subgroup: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const instruments = await this.instrumentsRepository.findBySector(subgroup);
    const selectedSymbols = session.sessionFilters;

    const subgroupEmojis = {
      european: '🇪🇺',
      us: '🇺🇸',
    };

    const subgroupNames = {
      european: 'Европейские акции',
      us: 'Американские акции',
    };

    const emoji = subgroupEmojis[subgroup] || '📈';
    const name = subgroupNames[subgroup] || subgroup;

    const selectedCount = instruments.filter((i) =>
      selectedSymbols.has(i.symbol),
    ).length;

    let messageText = `${emoji} *${name}* (${instruments.length} ${this.pluralizeInstruments(instruments.length)})

Выбрано: ${selectedCount} из ${instruments.length}`;

    const currentPage = session.currentPage;
    const totalPages = Math.ceil(instruments.length / 10);

    if (totalPages > 1) {
      messageText += `\n\n« Страница ${currentPage + 1} из ${totalPages} »`;
    }

    const keyboard = this.keyboardBuilder.buildSubgroupListKeyboard(
      subgroup,
      instruments,
      selectedSymbols,
      currentPage,
    );

    this.sessionService.updateNavigation(
      userId,
      `${subgroup}_stocks` as any,
      0,
    );

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    await ctx.answerCbQuery();
  }

  private async handleSelectAll(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    this.sessionService.clearAllSelections(userId);
    await this.showMainMenu(ctx);
  }

  private async handleClearFilters(ctx: UserContext): Promise<void> {
    await this.handleClearFiltersConfirm(ctx);
  }

  private async handleClearFiltersConfirm(ctx: UserContext): Promise<void> {
    const summary = await this.filterService.calculateFilterSummary([]);

    const messageText = `⚠️ *Подтверждение*

Вы уверены, что хотите очистить все фильтры?

После очистки вы снова будете получать сигналы по всем ${summary.totalInstruments} инструментам.`;

    const keyboard = this.keyboardBuilder.buildClearConfirmationKeyboard(
      summary.totalInstruments,
    );

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    await ctx.answerCbQuery();
  }

  private async handleConfirmClearFilters(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;

    try {
      await this.filterService.clearUserFilters(userId);
      this.sessionService.clearAllSelections(userId);
      this.sessionService.commitChanges(userId);

      const summary = await this.filterService.calculateFilterSummary([]);

      const messageText = `✅ *Фильтр очищен!*

Вы будете получать сигналы по всем ${summary.totalInstruments} инструментам.`;

      const keyboard = this.keyboardBuilder.buildConfirmationKeyboard();

      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await ctx.answerCbQuery('Фильтр очищен');
    } catch (error) {
      this.logger.error(`Error clearing filters: ${error.message}`, error);
      await ctx.answerCbQuery('Ошибка при очистке фильтров');
    }
  }

  private async handleCancelClear(ctx: UserContext): Promise<void> {
    await this.showMainMenu(ctx);
  }

  private async handleClose(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    this.sessionService.clearSession(userId);

    await ctx.deleteMessage();
    await ctx.answerCbQuery('Меню закрыто');
    await ctx.scene.leave();
  }

  private async handleToggleInstrument(
    ctx: UserContext,
    symbol: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    this.sessionService.toggleInstrument(userId, symbol);

    // Refresh current screen
    await this.refreshCurrentScreen(ctx);
  }

  private async handleSelectAllGroup(
    ctx: UserContext,
    group: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const instruments = await this.filterService.getInstrumentsByGroup(group);
    const symbols = instruments.map((i) => i.symbol);

    this.sessionService.selectAll(userId, symbols);
    await this.showGroupList(ctx, group);
  }

  private async handleDeselectAllGroup(
    ctx: UserContext,
    group: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const instruments = await this.filterService.getInstrumentsByGroup(group);
    const symbols = instruments.map((i) => i.symbol);

    this.sessionService.deselectAll(userId, symbols);
    await this.showGroupList(ctx, group);
  }

  private async handleSelectAllStocks(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const stocks = await this.filterService.getInstrumentsByGroup('stocks');
    const symbols = stocks.map((i) => i.symbol);

    this.sessionService.selectAll(userId, symbols);
    await this.showStocksSubgroups(ctx);
  }

  private async handleDeselectAllStocks(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const stocks = await this.filterService.getInstrumentsByGroup('stocks');
    const symbols = stocks.map((i) => i.symbol);

    this.sessionService.deselectAll(userId, symbols);
    await this.showStocksSubgroups(ctx);
  }

  private async handleSelectAllSubgroup(
    ctx: UserContext,
    subgroup: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const instruments = await this.instrumentsRepository.findBySector(subgroup);
    const symbols = instruments.map((i) => i.symbol);

    this.sessionService.selectAll(userId, symbols);
    await this.showSubgroupList(ctx, subgroup);
  }

  private async handleDeselectAllSubgroup(
    ctx: UserContext,
    subgroup: string,
  ): Promise<void> {
    const userId = ctx.from!.id;
    const instruments = await this.instrumentsRepository.findBySector(subgroup);
    const symbols = instruments.map((i) => i.symbol);

    this.sessionService.deselectAll(userId, symbols);
    await this.showSubgroupList(ctx, subgroup);
  }

  private async handlePage(
    ctx: UserContext,
    group: string | undefined,
    subgroup: string | undefined,
    page: number,
  ): Promise<void> {
    const userId = ctx.from!.id;
    this.sessionService.updateNavigation(userId, undefined as any, page);

    if (subgroup) {
      await this.showSubgroupList(ctx, subgroup);
    } else if (group) {
      await this.showGroupList(ctx, group);
    }
  }

  private async handleSave(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    try {
      const symbols = Array.from(session.sessionFilters);
      await this.filterService.saveUserFilters(userId, symbols);
      this.sessionService.commitChanges(userId);

      const summary = await this.filterService.calculateFilterSummary(symbols);

      let messageText = `✅ *Фильтр сохранён!*\n\n`;
      messageText += this.filterService.formatConfirmationSummary(summary);

      const keyboard = this.keyboardBuilder.buildConfirmationKeyboard();

      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await ctx.answerCbQuery('Настройки сохранены');
    } catch (error) {
      this.logger.error(`Error saving filters: ${error.message}`, error);
      await ctx.answerCbQuery('Ошибка при сохранении');
    }
  }

  private async handleBackToMain(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    this.sessionService.discardChanges(userId);
    this.sessionService.updateNavigation(userId, 'main', 0);
    await this.showMainMenu(ctx);
  }

  private async handleBackToStocks(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    this.sessionService.updateNavigation(userId, 'stocks_subgroups', 0);
    await this.showStocksSubgroups(ctx);
  }

  private async refreshCurrentScreen(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const screen = session.currentScreen;

    if (screen === 'main') {
      await this.showMainMenu(ctx);
    } else if (screen.endsWith('_list')) {
      const group = screen.replace('_list', '');
      await this.showGroupList(ctx, group);
    } else if (screen === 'stocks_subgroups') {
      await this.showStocksSubgroups(ctx);
    } else if (screen.includes('_stocks')) {
      const subgroup = screen.replace('_stocks', '');
      await this.showSubgroupList(ctx, subgroup);
    }
  }

  private pluralizeInstruments(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return 'инструмент';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return 'инструмента';
    }
    return 'инструментов';
  }
}
