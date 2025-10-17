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
import { FilterI18nHelper } from './filter.i18n.helper';

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
    private readonly i18n: FilterI18nHelper,
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
      const lang = userCtx.user?.lang || 'en';
      await userCtx.reply(this.i18n.t(lang, 'errors.user_not_found'));
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
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error entering filter scene: ${err.message}`,
        err.stack,
      );
      const lang = userCtx.user?.lang || 'en';
      await userCtx.reply(this.i18n.t(lang, 'errors.loading_failed'));
      await userCtx.scene.leave();
    }
  }

  /**
   * Main menu display
   */
  private async showMainMenu(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const session = this.sessionService.getSession(userId);
    const lang = ctx.user?.lang || 'en';
    if (!session) {
      await ctx.reply(this.i18n.t(lang, 'errors.session_expired'));
      await ctx.scene.leave();
      return;
    }

    const summary = await this.filterService.calculateFilterSummary(
      Array.from(session.sessionFilters),
    );

    const statusText =
      summary.selectedCount === 0
        ? this.i18n.t(lang, 'ui.all_instruments', {
            count: summary.totalInstruments,
          })
        : this.i18n.t(lang, 'ui.selected_count', {
            count: summary.selectedCount,
            total: summary.totalInstruments,
          });

    const messageText = `${this.i18n.t(lang, 'ui.filter_title')}\n\n${this.i18n.t(lang, 'ui.current_status')}\n${statusText}\n\n${this.i18n.t(lang, 'ui.select_category')}`;

    const keyboard = this.keyboardBuilder.buildMainMenuKeyboard(
      lang,
      summary.groupCounts,
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

    const callbackData = userCtx.callbackQuery?.['data'] as unknown;
    if (typeof callbackData !== 'string') return;

    // Only handle JSON callback data (filter actions)
    // Ignore non-JSON callbacks like "/lang fr" from other parts of the bot
    if (!callbackData.startsWith('{')) return;

    try {
      const data = JSON.parse(callbackData) as CallbackData;

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
        default: {
          this.logger.warn(`Unknown action: ${data.action}`);
          const lang = userCtx.user?.lang || 'en';
          await userCtx.answerCbQuery(
            this.i18n.t(lang, 'errors.unknown_action'),
          );
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error handling action: ${err.message}`, err.stack);
      const lang = userCtx.user?.lang || 'en';
      await userCtx.answerCbQuery(this.i18n.t(lang, 'errors.action_failed'));
    }
  }

  private async handleSelectGroup(
    ctx: UserContext,
    group: string,
  ): Promise<void> {
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

    const lang = ctx.user?.lang || 'en';
    const instruments = await this.filterService.getInstrumentsByGroup(group);
    const selectedSymbols = session.sessionFilters;

    const groupName = this.i18n.t(lang, `groups.${group}`);
    const emoji = this.getGroupEmoji(group);

    const selectedCount = instruments.filter((i) =>
      selectedSymbols.has(i.symbol),
    ).length;

    const plural = this.i18n.plural(lang, 'instruments', instruments.length);
    let messageText = `${emoji} *${groupName}* (${instruments.length} ${plural})\n\n${this.i18n.t(lang, 'ui.selected_instruments', { count: selectedCount, total: instruments.length })}`;

    const currentPage = session.currentPage;
    const totalPages = Math.ceil(instruments.length / 10);

    if (totalPages > 1) {
      messageText += `\n\n${this.i18n.t(lang, 'ui.page_indicator', { current: currentPage + 1, total: totalPages })}`;
    }

    const keyboard = this.keyboardBuilder.buildGroupListKeyboard(
      lang,
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

    const lang = ctx.user?.lang || 'en';

    // Get European stocks
    const europeanStocks =
      await this.instrumentsRepository.findBySubgroup('european');
    const europeanSelected = europeanStocks.filter((i) =>
      session.sessionFilters.has(i.symbol),
    ).length;

    // Get US stocks
    const usStocks = await this.instrumentsRepository.findBySubgroup('us');
    const usSelected = usStocks.filter((i) =>
      session.sessionFilters.has(i.symbol),
    ).length;

    const totalStocks = europeanStocks.length + usStocks.length;
    const totalSelected = europeanSelected + usSelected;

    const plural = this.i18n.plural(lang, 'instruments', totalStocks);
    const messageText = `📈 *${this.i18n.t(lang, 'groups.stocks')}* (${totalStocks} ${plural})\n\n${this.i18n.t(lang, 'ui.selected_instruments', { count: totalSelected, total: totalStocks })}\n\n${this.i18n.t(lang, 'ui.select_category')}`;

    const keyboard = this.keyboardBuilder.buildStocksSubgroupKeyboard(
      lang,
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

    const lang = ctx.user?.lang || 'en';
    const instruments =
      await this.instrumentsRepository.findBySubgroup(subgroup);
    const selectedSymbols = session.sessionFilters;

    const subgroupName =
      subgroup === 'european'
        ? this.i18n.t(lang, 'groups.european')
        : this.i18n.t(lang, 'groups.us');
    const emoji = subgroup === 'european' ? '🇪🇺' : '🇺🇸';

    const selectedCount = instruments.filter((i) =>
      selectedSymbols.has(i.symbol),
    ).length;

    const plural = this.i18n.plural(lang, 'instruments', instruments.length);
    let messageText = `${emoji} *${subgroupName}* (${instruments.length} ${plural})\n\n${this.i18n.t(lang, 'ui.selected_instruments', { count: selectedCount, total: instruments.length })}`;

    const currentPage = session.currentPage;
    const totalPages = Math.ceil(instruments.length / 10);

    if (totalPages > 1) {
      messageText += `\n\n${this.i18n.t(lang, 'ui.page_indicator', { current: currentPage + 1, total: totalPages })}`;
    }

    const keyboard = this.keyboardBuilder.buildSubgroupListKeyboard(
      lang,
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
    const lang = ctx.user?.lang || 'en';
    const summary = await this.filterService.calculateFilterSummary([]);

    const messageText = `${this.i18n.t(lang, 'confirmation.title')}\n\n${this.i18n.t(lang, 'confirmation.clear_warning', { count: summary.totalInstruments })}`;

    const keyboard = this.keyboardBuilder.buildClearConfirmationKeyboard(lang);

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    await ctx.answerCbQuery();
  }

  private async handleConfirmClearFilters(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const lang = ctx.user?.lang || 'en';

    try {
      await this.filterService.clearUserFilters(userId);
      this.sessionService.clearAllSelections(userId);
      this.sessionService.commitChanges(userId);

      const summary = await this.filterService.calculateFilterSummary([]);

      const messageText = `${this.i18n.t(lang, 'messages.filter_cleared')}\n\n${this.i18n.t(lang, 'confirmation.after_clear', { count: summary.totalInstruments })}`;

      const keyboard = this.keyboardBuilder.buildConfirmationKeyboard(lang);

      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await ctx.answerCbQuery(this.i18n.t(lang, 'messages.filter_cleared'));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error clearing filters: ${err.message}`, err.stack);
      await ctx.answerCbQuery(this.i18n.t(lang, 'errors.clearing_failed'));
    }
  }

  private async handleCancelClear(ctx: UserContext): Promise<void> {
    await this.showMainMenu(ctx);
  }

  private async handleClose(ctx: UserContext): Promise<void> {
    const userId = ctx.from!.id;
    const lang = ctx.user?.lang || 'en';
    this.sessionService.clearSession(userId);

    await ctx.deleteMessage();
    await ctx.answerCbQuery(this.i18n.t(lang, 'messages.menu_closed'));
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
    const lang = ctx.user?.lang || 'en';
    if (!session) return;

    try {
      const symbols = Array.from(session.sessionFilters);
      await this.filterService.saveUserFilters(userId, symbols);
      this.sessionService.commitChanges(userId);

      const summary = await this.filterService.calculateFilterSummary(symbols);

      const confirmationText = this.filterService.formatConfirmationSummary(
        summary,
        lang,
      );
      const messageText = `${this.i18n.t(lang, 'messages.filter_saved')}\n\n${confirmationText}`;

      const keyboard = this.keyboardBuilder.buildConfirmationKeyboard(lang);

      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await ctx.answerCbQuery(this.i18n.t(lang, 'messages.settings_saved'));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error saving filters: ${err.message}`, err.stack);
      await ctx.answerCbQuery(this.i18n.t(lang, 'errors.saving_failed'));
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

  private getGroupEmoji(group: string): string {
    const emojis: Record<string, string> = {
      forex: '💱',
      commodities: '🛢️',
      crypto: '💰',
      stocks: '📈',
    };
    return emojis[group] || '📊';
  }
}
