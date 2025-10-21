import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';

import {
  InjectBot,
  On,
  Message,
  Start,
  Update,
  Ctx,
  Command,
} from 'nestjs-telegraf';
import { deunionize, Telegraf } from 'telegraf';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  CallbackQueryData,
  SplitCommandPipe,
} from '@quantumdeal/framework';
import { BotService } from './bot.service';
import { BotCommandsService } from './services/bot-commands.service';
import {
  PaymentService,
  RenewalInvoicePayload,
} from './services/payment.service';
import { langKeyboard } from './lang';
import type { UserContext } from './interfaces';
import { FILTER_SCENE_ID, RENEWAL_SCENE_ID } from './constants';
import { getRenewalMessage } from './scenes/renewal/renewal.i18n';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
    private readonly botService: BotService,
    private readonly botCommandsService: BotCommandsService,
    private readonly paymentService: PaymentService,
  ) {}

  @Start()
  async onStart(
    @Ctx() ctx: UserContext,
    @Message('text', new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined] | undefined,
  ): Promise<void> {
    const user = ctx.user;
    if (user) {
      await this.bot.telegram
        .sendChatAction(user.telegramId, 'typing')
        .catch((e) => this.logger.error('Error sending chat action', e));

      const [, code] = args ?? [];

      const welcomeMessage = await this.botService.onStart(user, code);

      // Set personalized commands menu based on user's features and language
      // NOTE: This must be called AFTER onStart because onStart may activate
      // a subscription code and update the user's feature flags
      if (!code) {
        // Only set commands here if no code was provided
        // If code was provided, onStart will handle command menu update
        await this.botCommandsService.setUserCommands(
          user.telegramId,
          user.enabledFeatures,
          user.lang ?? 'en',
        );
      }

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...langKeyboard(2),
      });
    } else {
      this.logger.debug('User not found');
    }
  }

  @Command('lang')
  async onLang(@Ctx() ctx: UserContext): Promise<void> {
    if (ctx.user) {
      const welcomeMessage = await this.botService.onStart(ctx.user);

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...langKeyboard(2),
      });
    }
  }

  @Command('filter')
  async onFilter(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Сначала нужно зарегистрироваться. Используйте /start');
      return;
    }

    // Enter filter scene
    await ctx.scene.enter(FILTER_SCENE_ID);
  }

  /**
   * Handle /renew command
   * Opens subscription renewal scene
   */
  @Command('renew')
  async onRenew(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Сначала нужно зарегистрироваться. Используйте /start');
      return;
    }

    // Enter renewal scene
    await ctx.scene.enter(RENEWAL_SCENE_ID);
  }

  @On('callback_query')
  async onLangAction(
    @Ctx() ctx: UserContext,
    @CallbackQueryData(new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined],
  ): Promise<void> {
    const cbq = deunionize(ctx.callbackQuery);
    const [command, code] = args ?? [];

    if (ctx.user && cbq?.data) {
      switch (command) {
        case '/lang':
          await this.botService.onLang(ctx, code);

          // Refresh commands menu with new language
          if (code) {
            await this.botCommandsService.setUserCommands(
              ctx.user.telegramId,
              ctx.user.enabledFeatures,
              code,
            );
          }
          break;

        case 'open_renewal_scene':
          // Handle renewal button click from expiration notification
          await ctx.scene.enter(RENEWAL_SCENE_ID);
          break;
      }
    }
  }

  /**
   * Handle pre-checkout query for payment validation
   * Called before Stars are deducted from user's account
   */
  @On('pre_checkout_query')
  async onPreCheckoutQuery(@Ctx() ctx: UserContext): Promise<void> {
    const query = ctx.preCheckoutQuery;

    if (!query) {
      return;
    }

    try {
      // Parse invoice payload
      const payload = JSON.parse(
        query.invoice_payload,
      ) as RenewalInvoicePayload;

      // Validate payment
      const isValid = await this.paymentService.validatePreCheckout(
        payload,
        query.total_amount,
        ctx.from!.id,
      );

      if (isValid) {
        // Allow payment to proceed
        await ctx.answerPreCheckoutQuery(true);
        this.logger.log(
          `Pre-checkout approved for transaction ${payload.transactionId}`,
        );
      } else {
        // Reject payment
        await ctx.answerPreCheckoutQuery(
          false,
          'Payment validation failed. Please try again or contact support.',
        );
        this.logger.warn(`Pre-checkout rejected for user ${ctx.from!.id}`);
      }
    } catch (error) {
      this.logger.error('Pre-checkout query error:', error);
      await ctx.answerPreCheckoutQuery(
        false,
        'An error occurred. Please try again or contact support.',
      );
    }
  }

  /**
   * Handle successful payment
   * Called after payment is confirmed by Telegram
   */
  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: UserContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const payment = (ctx.message as any)?.successful_payment;

    if (!payment) {
      return;
    }

    try {
      // Parse payload
      const payload = JSON.parse(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.invoice_payload,
      ) as RenewalInvoicePayload;

      this.logger.log(
        `Processing successful payment for user ${ctx.from!.id}, transaction ${payload.transactionId}`,
      );

      // Process payment via service
      await this.paymentService.handleSuccessfulPayment(
        payload,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.telegram_payment_charge_id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.provider_payment_charge_id,
      );

      // Send confirmation to user
      const lang = ctx.user?.lang || 'en';
      await ctx.reply(getRenewalMessage(lang, 'paymentSuccess'));

      this.logger.log(
        `Payment ${payload.transactionId} completed successfully for user ${ctx.from!.id}`,
      );
    } catch (error) {
      this.logger.error('Payment processing error:', error);

      const lang = ctx.user?.lang || 'en';
      await ctx.reply(getRenewalMessage(lang, 'paymentError'));
    }
  }
}
