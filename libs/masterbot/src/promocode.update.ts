import { Injectable, Logger, UseFilters } from '@nestjs/common';
import {
  Action,
  Command,
  Ctx,
  On,
  Update,
  InjectBot,
  Next,
} from '@quantumdeal/telegraf';
import { Telegraf, Markup } from 'telegraf';
import { randomBytes } from 'crypto';

import { TelegrafExceptionFilter } from '@quantumdeal/framework';
import {
  PromocodesRepository,
  SubscriptionsRepository,
  BotsRepository,
  PromocodeType,
  DiscountType,
} from '@quantumdeal/db';

import { MASTERBOT_BOT_NAME, MASTERBOT_CONSTANTS } from './constants';
import type { UserContext } from './interfaces';
import { MasterbotService } from './masterbot.service';

/**
 * MasterBot update handler for promocode management
 *
 * Provides commands for managers to create, list, and deactivate promocodes.
 * Manager isolation: managers can ONLY see and manage their own promocodes.
 *
 * Commands:
 * - /promocode - Shows menu with create/list options
 * - Create flow: guided conversation to collect parameters
 * - List: shows only manager's own promocodes
 * - Deactivate: only own promocodes
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 */
@Update()
@UseFilters(TelegrafExceptionFilter)
@Injectable()
export class PromocodeUpdate {
  private readonly logger = new Logger(PromocodeUpdate.name);

  constructor(
    @InjectBot(MASTERBOT_BOT_NAME)
    private readonly bot: Telegraf<UserContext>,
    private readonly promocodesRepository: PromocodesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botsRepository: BotsRepository,
    private readonly masterbotService: MasterbotService,
  ) {}

  // ==================== Session Helpers ====================

  /**
   * Ensures session is initialized with default values
   */
  private ensureSession(ctx: UserContext): void {
    if (!ctx.session) {
      ctx.session = {
        flowState: null,
        commandContext: null,
        broadcastSubscriptionIds: null,
        broadcastMessage: null,
        broadcastMessageEntities: null,
        broadcastFilterStatus: null,
        broadcastFilterBotId: null,
        promocodeType: null,
        promocodeDiscountType: null,
        promocodeDiscountValue: null,
        promocodeBotId: null,
        promocodeCode: null,
        promocodeMaxActivations: null,
      } as UserContext['session'];
    }
  }

  /**
   * Clears all promocode-related session state
   */
  private clearPromocodeSession(ctx: UserContext): void {
    this.ensureSession(ctx);
    ctx.session.flowState = null;
    ctx.session.promocodeType = null;
    ctx.session.promocodeDiscountType = null;
    ctx.session.promocodeDiscountValue = null;
    ctx.session.promocodeBotId = null;
    ctx.session.promocodeCode = null;
    ctx.session.promocodeMaxActivations = null;
  }

  // ==================== Code Generation ====================

  /**
   * Generate random alphanumeric code (8 uppercase characters)
   * Uses crypto.randomBytes for cryptographic randomness
   */
  private generatePromocodeString(length: number = 8): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomBytesArray = randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomBytesArray[i] % characters.length);
    }

    return result;
  }

  // ==================== Command Handler ====================

  /**
   * /promocode command - shows main menu with create/list options
   */
  @Command('promocode')
  async onPromocodeCommand(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);
      this.clearPromocodeSession(ctx);

      // Log manager action
      this.masterbotService.logManagerAction(manager, 'PROMOCODE_COMMAND');

      await ctx.reply(
        '🎁 *Управление промокодами*\n\n' + 'Выберите действие:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '➕ Создать промокод',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CREATE,
              ),
            ],
            [
              Markup.button.callback(
                '📋 Мои промокоды',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_LIST,
              ),
            ],
            [
              Markup.button.callback(
                '🔙 Назад',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_MAIN,
              ),
            ],
          ]),
        },
      );
    } catch (error) {
      this.logger.error('Error in promocode command', error);
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.ERROR_GENERIC);
    }
  }

  // ==================== Create Flow Handlers ====================

  /**
   * Start promocode creation - select type (single/multi)
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CREATE)
  async onCreatePromocode(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);
      this.clearPromocodeSession(ctx);

      ctx.session.flowState = 'promocode_selecting_type';

      await ctx.editMessageText(
        '📝 *Создание промокода*\n\n' +
          '🔹 Шаг 1/5: Выберите тип промокода:\n\n' +
          '*Одноразовый* — деактивируется после первого использования любым пользователем\n' +
          '*Многоразовый* — каждый пользователь может использовать один раз',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '🔒 Одноразовый',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_TYPE_SINGLE,
              ),
            ],
            [
              Markup.button.callback(
                '♻️ Многоразовый',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_TYPE_MULTI,
              ),
            ],
            [
              Markup.button.callback(
                '❌ Отмена',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CANCEL,
              ),
            ],
          ]),
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error starting promocode creation', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle type selection - single_use
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_TYPE_SINGLE)
  async onSelectTypeSingle(@Ctx() ctx: UserContext): Promise<void> {
    await this.handleTypeSelection(ctx, 'single_use');
  }

  /**
   * Handle type selection - multi_use
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_TYPE_MULTI)
  async onSelectTypeMulti(@Ctx() ctx: UserContext): Promise<void> {
    await this.handleTypeSelection(ctx, 'multi_use');
  }

  /**
   * Common handler for type selection
   */
  private async handleTypeSelection(
    ctx: UserContext,
    type: PromocodeType,
  ): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);
      ctx.session.promocodeType = type;
      ctx.session.flowState = 'promocode_selecting_discount_type';

      await ctx.editMessageText(
        '📝 *Создание промокода*\n\n' +
          '🔹 Шаг 2/5: Выберите тип скидки:\n\n' +
          '*Процент* — скидка в процентах (1-100%)\n' +
          '*Фиксированная* — фиксированная сумма в Stars',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '📊 Процент (%)',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS
                  .PROMOCODE_DISCOUNT_PERCENTAGE,
              ),
            ],
            [
              Markup.button.callback(
                '⭐ Фиксированная (Stars)',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DISCOUNT_FIXED,
              ),
            ],
            [
              Markup.button.callback(
                '❌ Отмена',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CANCEL,
              ),
            ],
          ]),
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in type selection', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle discount type selection - percentage
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DISCOUNT_PERCENTAGE)
  async onSelectDiscountPercentage(@Ctx() ctx: UserContext): Promise<void> {
    await this.handleDiscountTypeSelection(ctx, 'percentage');
  }

  /**
   * Handle discount type selection - fixed
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DISCOUNT_FIXED)
  async onSelectDiscountFixed(@Ctx() ctx: UserContext): Promise<void> {
    await this.handleDiscountTypeSelection(ctx, 'fixed');
  }

  /**
   * Common handler for discount type selection
   */
  private async handleDiscountTypeSelection(
    ctx: UserContext,
    discountType: DiscountType,
  ): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);
      ctx.session.promocodeDiscountType = discountType;
      ctx.session.flowState = 'promocode_awaiting_discount_value';

      const valueHint =
        discountType === 'percentage'
          ? 'Введите число от 1 до 100 (процент скидки)'
          : 'Введите число (сумма скидки в Stars)';

      await ctx.editMessageText(
        '📝 *Создание промокода*\n\n' +
          `🔹 Шаг 3/5: Введите размер скидки\n\n` +
          `_${valueHint}_`,
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in discount type selection', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Show bot scope selection keyboard
   */
  private async showScopeSelectionKeyboard(ctx: UserContext): Promise<void> {
    const activeBots = await this.botsRepository.findAllActive();

    const botButtons = activeBots.map((bot) => [
      Markup.button.callback(
        `🤖 ${bot.name}`,
        `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_SCOPE_BOT_PREFIX}${bot.id}`,
      ),
    ]);

    await ctx.reply(
      '📝 *Создание промокода*\n\n' +
        '🔹 Шаг 4/5: Выберите область действия:\n\n' +
        '*Глобальный* — работает во всех ботах\n' +
        '*Для конкретного бота* — работает только в выбранном боте',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '🌐 Глобальный (все боты)',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_SCOPE_GLOBAL,
            ),
          ],
          ...botButtons,
          [
            Markup.button.callback(
              '❌ Отмена',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CANCEL,
            ),
          ],
        ]),
      },
    );
  }

  /**
   * Handle scope selection - global
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_SCOPE_GLOBAL)
  async onSelectScopeGlobal(@Ctx() ctx: UserContext): Promise<void> {
    await this.handleScopeSelection(ctx, null);
  }

  /**
   * Handle scope selection - specific bot
   */
  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_SCOPE_BOT_PREFIX}(\\d+)$`,
    ),
  )
  async onSelectScopeBot(@Ctx() ctx: UserContext): Promise<void> {
    const botId = this.extractCallbackId(
      ctx,
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_SCOPE_BOT_PREFIX,
    );

    if (botId === null) {
      await ctx.answerCbQuery('Неверный формат');
      return;
    }

    await this.handleScopeSelection(ctx, botId);
  }

  /**
   * Common handler for scope selection
   */
  private async handleScopeSelection(
    ctx: UserContext,
    botId: number | null,
  ): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);
      ctx.session.promocodeBotId = botId;
      ctx.session.flowState = 'promocode_confirming_create';

      // Show confirmation with generated code
      await this.showConfirmation(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in scope selection', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Show creation confirmation with summary
   */
  private async showConfirmation(ctx: UserContext): Promise<void> {
    this.ensureSession(ctx);

    const typeLabel =
      ctx.session.promocodeType === 'single_use'
        ? 'Одноразовый'
        : 'Многоразовый';
    const discountLabel =
      ctx.session.promocodeDiscountType === 'percentage'
        ? `${ctx.session.promocodeDiscountValue}%`
        : `${ctx.session.promocodeDiscountValue} Stars`;
    const botId = ctx.session.promocodeBotId;
    const scopeLabel =
      botId == null ? 'Глобальный (все боты)' : await this.getBotName(botId);

    // Generate code preview
    const codePreview = this.generatePromocodeString(8);
    ctx.session.promocodeCode = codePreview;

    await ctx.editMessageText(
      '📝 *Подтверждение создания промокода*\n\n' +
        `🎫 *Код:* \`${codePreview}\`\n` +
        `📋 *Тип:* ${typeLabel}\n` +
        `💰 *Скидка:* ${discountLabel}\n` +
        `🌐 *Область:* ${scopeLabel}\n\n` +
        '_Подтвердите создание промокода_',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '✅ Создать',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CONFIRM_CREATE,
            ),
          ],
          [
            Markup.button.callback(
              '❌ Отмена',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CANCEL,
            ),
          ],
        ]),
      },
    );
  }

  /**
   * Confirm and create promocode
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CONFIRM_CREATE)
  async onConfirmCreate(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);

      // Validate all required fields
      const {
        promocodeType,
        promocodeDiscountType,
        promocodeDiscountValue,
        promocodeBotId,
        promocodeCode,
      } = ctx.session;

      if (
        !promocodeType ||
        !promocodeDiscountType ||
        !promocodeDiscountValue ||
        !promocodeCode
      ) {
        await ctx.editMessageText('❌ Ошибка: данные сессии потеряны');
        await ctx.answerCbQuery('Ошибка');
        this.clearPromocodeSession(ctx);
        return;
      }

      // Get signals subscription (default for MVP)
      const signalsSubscription =
        await this.subscriptionsRepository.findSignalsSubscription();
      if (!signalsSubscription) {
        await ctx.editMessageText(
          '❌ Ошибка: подписка "signals" не найдена в системе',
        );
        await ctx.answerCbQuery('Ошибка');
        this.clearPromocodeSession(ctx);
        return;
      }

      // Ensure code uniqueness (retry if collision)
      let finalCode = promocodeCode;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        const existingCode =
          await this.promocodesRepository.findByCode(finalCode);
        if (!existingCode) {
          isUnique = true;
        } else {
          finalCode = this.generatePromocodeString(8);
          attempts++;
        }
      }

      if (!isUnique) {
        await ctx.editMessageText(
          '❌ Ошибка: не удалось сгенерировать уникальный код. Попробуйте снова.',
        );
        await ctx.answerCbQuery('Ошибка');
        this.clearPromocodeSession(ctx);
        return;
      }

      // Create promocode
      const promocode = await this.promocodesRepository.create({
        code: finalCode,
        type: promocodeType,
        discountType: promocodeDiscountType,
        discountValue: promocodeDiscountValue,
        subscriptionId: signalsSubscription.id,
        botId: promocodeBotId ?? undefined,
        createdBy: manager.telegramId,
        isActive: true,
        maxActivations: ctx.session.promocodeMaxActivations ?? undefined,
      });

      // Log the action
      this.masterbotService.logManagerAction(manager, 'PROMOCODE_CREATED', {
        promocodeId: promocode.id,
        code: promocode.code,
        type: promocode.type,
        discountType: promocode.discountType,
        discountValue: promocode.discountValue,
        botId: promocode.botId,
      });

      this.logger.log(
        `Promocode created: ${promocode.code} by manager ${manager.telegramId}`,
      );

      // Show success message
      const typeLabel =
        promocode.type === 'single_use' ? 'Одноразовый' : 'Многоразовый';
      const discountLabel =
        promocode.discountType === 'percentage'
          ? `${promocode.discountValue}%`
          : `${promocode.discountValue} Stars`;
      const scopeLabel =
        promocode.botId === null
          ? 'Глобальный'
          : await this.getBotName(promocode.botId);

      await ctx.editMessageText(
        '✅ *Промокод создан!*\n\n' +
          `🎫 *Код:* \`${promocode.code}\`\n` +
          `📋 *Тип:* ${typeLabel}\n` +
          `💰 *Скидка:* ${discountLabel}\n` +
          `🌐 *Область:* ${scopeLabel}\n` +
          `📅 *Создан:* ${promocode.createdAt.toLocaleString('ru-RU')}\n\n` +
          '_Скопируйте код и поделитесь с пользователями_',
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('Промокод создан!');
      this.clearPromocodeSession(ctx);
    } catch (error) {
      this.logger.error('Error creating promocode', error);
      const errorMessage = this.getErrorMessage(error);
      await ctx.editMessageText(`❌ Ошибка при создании: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
      this.clearPromocodeSession(ctx);
    }
  }

  // ==================== List Handler ====================

  /**
   * List manager's own promocodes
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_LIST)
  async onListPromocodes(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Get only manager's own promocodes (manager isolation)
      const promocodes = await this.promocodesRepository.findByManagerId(
        manager.telegramId,
      );

      if (promocodes.length === 0) {
        await ctx.editMessageText(
          '📋 *Мои промокоды*\n\n' +
            '_У вас пока нет промокодов._\n\n' +
            'Используйте /promocode для создания.',
          { parse_mode: 'Markdown' },
        );
        await ctx.answerCbQuery();
        return;
      }

      // Build promocode list with deactivate buttons for active codes
      const promocodeLines = await Promise.all(
        promocodes.map(async (p) => {
          const statusIcon = p.isActive ? '✅' : '❌';
          const typeIcon = p.type === 'single_use' ? '🔒' : '♻️';
          const discountText =
            p.discountType === 'percentage'
              ? `${p.discountValue}%`
              : `${p.discountValue}⭐`;
          const scopeText =
            p.botId === null ? '🌐' : `🤖 ${await this.getBotName(p.botId)}`;

          return `${statusIcon} ${typeIcon} \`${p.code}\` — ${discountText} ${scopeText}`;
        }),
      );

      // Build deactivation buttons for active promocodes
      const activePromocodes = promocodes.filter((p) => p.isActive);
      const deactivateButtons = activePromocodes
        .slice(0, 5)
        .map((p) => [
          Markup.button.callback(
            `🗑 Деактивировать ${p.code}`,
            `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DEACTIVATE_PREFIX}${p.id}`,
          ),
        ]);

      await ctx.editMessageText(
        '📋 *Мои промокоды*\n\n' +
          promocodeLines.join('\n') +
          '\n\n_Нажмите для деактивации активных промокодов_',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            ...deactivateButtons,
            [
              Markup.button.callback(
                '➕ Создать новый',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CREATE,
              ),
            ],
            [
              Markup.button.callback(
                '🔙 Назад',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_MAIN,
              ),
            ],
          ]),
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error listing promocodes', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  // ==================== Deactivate Handler ====================

  /**
   * Deactivate a promocode (own promocodes only)
   */
  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DEACTIVATE_PREFIX}(\\d+)$`,
    ),
  )
  async onDeactivatePromocode(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      const promocodeId = this.extractCallbackId(
        ctx,
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_DEACTIVATE_PREFIX,
      );

      if (promocodeId === null) {
        await ctx.answerCbQuery('Неверный формат');
        return;
      }

      // Find promocode
      const promocode = await this.promocodesRepository.findById(promocodeId);

      if (!promocode) {
        await ctx.answerCbQuery('Промокод не найден', { show_alert: true });
        return;
      }

      // Manager isolation check - only own promocodes
      if (promocode.createdBy !== manager.telegramId) {
        this.logger.warn(
          `Manager ${manager.telegramId} attempted to deactivate promocode ${promocodeId} owned by ${promocode.createdBy}`,
        );
        await ctx.answerCbQuery('Нет доступа к этому промокоду', {
          show_alert: true,
        });
        return;
      }

      if (!promocode.isActive) {
        await ctx.answerCbQuery('Промокод уже деактивирован', {
          show_alert: true,
        });
        return;
      }

      // Deactivate
      await this.promocodesRepository.deactivate(promocodeId);

      // Log the action
      this.masterbotService.logManagerAction(manager, 'PROMOCODE_DEACTIVATED', {
        promocodeId,
        code: promocode.code,
      });

      this.logger.log(
        `Promocode deactivated: ${promocode.code} by manager ${manager.telegramId}`,
      );

      await ctx.answerCbQuery('Промокод деактивирован');

      // Refresh the list
      await this.onListPromocodes(ctx);
    } catch (error) {
      this.logger.error('Error deactivating promocode', error);
      await ctx.answerCbQuery('Ошибка при деактивации');
    }
  }

  // ==================== Cancel Handler ====================

  /**
   * Cancel promocode creation flow
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.PROMOCODE_CANCEL)
  async onCancelPromocode(@Ctx() ctx: UserContext): Promise<void> {
    this.clearPromocodeSession(ctx);

    await ctx.editMessageText('❌ Создание промокода отменено.');
    await ctx.answerCbQuery('Отменено');
  }

  // ==================== Text Handler for Discount Value ====================

  /**
   * Handle text input for discount value
   */
  @On('text')
  async onText(
    @Ctx() ctx: UserContext,
    @Next() next: () => Promise<void>,
  ): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return next();
    }

    this.ensureSession(ctx);

    const flowState = ctx.session.flowState;

    // Only handle discount value input in promocode flow
    if (flowState === 'promocode_awaiting_discount_value') {
      await this.handleDiscountValueInput(ctx);
      return;
    }

    // Pass to next handler
    return next();
  }

  /**
   * Process discount value input from user
   */
  private async handleDiscountValueInput(ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return;
    }

    this.ensureSession(ctx);

    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : null;
    if (!text) {
      return;
    }

    const value = parseInt(text.trim(), 10);
    const discountType = ctx.session.promocodeDiscountType;

    // Validate value
    if (isNaN(value) || value <= 0) {
      await ctx.reply(
        '❌ Введите положительное число.\n\n' + '_Попробуйте снова:_',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Validate percentage range
    if (discountType === 'percentage' && value > 100) {
      await ctx.reply(
        '❌ Процент скидки не может быть больше 100.\n\n' +
          '_Введите число от 1 до 100:_',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Save value and proceed to scope selection
    ctx.session.promocodeDiscountValue = value;
    ctx.session.flowState = 'promocode_selecting_scope';

    await this.showScopeSelectionKeyboard(ctx);
  }

  // ==================== Helper Methods ====================

  /**
   * Extract numeric ID from callback data after a known prefix
   */
  private extractCallbackId(ctx: UserContext, prefix: string): number | null {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      return null;
    }

    const data = callbackQuery.data;
    if (!data.startsWith(prefix)) {
      return null;
    }

    const idStr = data.slice(prefix.length);
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  }

  /**
   * Get bot name by ID
   */
  private async getBotName(botId: number): Promise<string> {
    const bot = await this.botsRepository.findById(botId);
    return bot?.name || 'Неизвестный бот';
  }

  /**
   * Extract error message from unknown error
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Неизвестная ошибка';
  }
}
