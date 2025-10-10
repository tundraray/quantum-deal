import { Injectable, Logger } from '@nestjs/common';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';
import { isBroadcastSubscription } from '@quantumdeal/db/schema/subscriptions';
import { BroadcastResultDto, MessageValidationResult } from '../dto';
import { NotificationService } from '@quantumdeal/bot';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/bot/interfaces/notification.interface';

/**
 * Service for broadcasting messages to subscription subscribers
 *
 * CRITICAL: All operations validate subscription is broadcast type INLINE
 * before performing any operations. This prevents accidental broadcasts
 * to the signals subscription.
 */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Count active subscribers for a subscription
   *
   * CRITICAL: Validates subscription is broadcast type INLINE before counting
   *
   * @param subscriptionId - The subscription ID
   * @returns Number of active subscribers
   * @throws Error if subscription not found or is not broadcast type
   */
  async countSubscribers(subscriptionId: number): Promise<number> {
    // Validate subscription type
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!isBroadcastSubscription(subscription.type)) {
      throw new Error('Cannot count subscribers for signals subscription');
    }

    // Count active subscribers
    const subscribers =
      await this.userSubscriptionsRepository.findActiveBySubscriptionId(
        subscriptionId,
      );
    return subscribers.length;
  }

  /**
   * Validate broadcast message
   *
   * Rules:
   * - Message cannot be empty
   * - Message cannot exceed 4096 characters (Telegram limit)
   *
   * @param message - The message to validate
   * @returns Validation result with error message if invalid
   */
  validateMessage(message: string): MessageValidationResult {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 4096) {
      return {
        valid: false,
        error: 'Message exceeds Telegram limit of 4096 characters',
      };
    }

    return { valid: true };
  }

  /**
   * Send broadcast message to all subscribers
   *
   * CRITICAL: Validates subscription is broadcast type INLINE before sending
   *
   * @param subscriptionId - The subscription ID to broadcast to
   * @param message - The message content
   * @param managerId - The manager's Telegram ID who is broadcasting
   * @returns Broadcast result with statistics
   * @throws Error if subscription not found, is not broadcast, or message invalid
   */
  async sendBroadcast(
    subscriptionId: number,
    message: string,
    managerId: number,
  ): Promise<BroadcastResultDto> {
    // Validate subscription type
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!isBroadcastSubscription(subscription.type)) {
      throw new Error('Cannot broadcast to signals subscription');
    }

    // Validate message
    const validation = this.validateMessage(message);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Get all active subscribers with user details
    const subscribers =
      await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
        subscriptionId,
      );

    this.logger.log(
      `Broadcasting message to ${subscribers.length} subscribers for subscription ${subscriptionId}`,
    );

    // Send broadcast via NotificationService
    try {
      const batchResult = this.notificationService.addMessages(
        subscribers.map((sub) => ({
          userId: sub.user.telegramId,
          message,
          options: {
            priority: MessagePriority.NORMAL,
            messageType: QueuedMessageType.MARKDOWN,
            metadata: {
              subscriptionId,
              managerId,
              broadcastType: 'subscription',
            },
          },
        })),
      );

      // Map BatchSendResult to BroadcastResultDto
      const result: BroadcastResultDto = {
        recipientCount: subscribers.length,
        queuedCount: batchResult.queuedCount,
        errorCount: batchResult.errorCount,
        queuedIds: batchResult.queuedIds,
        errors: batchResult.errors,
      };

      this.logger.log(
        `Broadcast queued: ${result.queuedCount} messages, ${result.errorCount} errors`,
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to queue broadcast messages:', err);
      throw new Error('Failed to queue broadcast messages');
    }
  }

  /**
   * Get list of subscribers for a subscription
   * Useful for preview before broadcasting
   *
   * @param subscriptionId - The subscription ID
   * @returns Array of subscriber user IDs
   * @throws Error if subscription not found or is not broadcast type
   */
  async getSubscriberList(subscriptionId: number): Promise<number[]> {
    // Validate subscription type
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!isBroadcastSubscription(subscription.type)) {
      throw new Error('Cannot get subscribers for signals subscription');
    }

    // Get all active subscribers
    const subscribers =
      await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
        subscriptionId,
      );

    return subscribers.map((s) => s.user.telegramId);
  }
}
