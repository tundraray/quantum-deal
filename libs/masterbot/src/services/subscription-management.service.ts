import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from '@quantumdeal/db';
import {
  generateBroadcastSubscriptionType,
  isBroadcastSubscription,
  Subscription,
} from '@quantumdeal/db/schema/subscriptions';
import { CodeGenerationService } from './code-generation.service';
import { CreateSubscriptionResult, SubscriptionDto } from '../dto';

/**
 * Service for managing broadcast subscriptions with type filtering
 *
 * CRITICAL: All broadcast operations must filter by type LIKE 'subscription_%'
 * This service ensures that broadcast subscriptions are never confused with
 * the signals subscription type.
 */
@Injectable()
export class SubscriptionManagementService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly codeGenerationService: CodeGenerationService,
  ) {}

  /**
   * Create new broadcast subscription with unique invite code
   *
   * CRITICAL: Always generates dynamic type 'subscription_{uid}' using
   * generateBroadcastSubscriptionType() helper
   *
   * @param name - The subscription name (3-50 characters)
   * @param managerId - The manager's Telegram ID who created the subscription
   * @returns Complete subscription creation result
   * @throws Error if name is invalid
   */
  async createSubscription(
    name: string,
    managerId: number,
  ): Promise<CreateSubscriptionResult> {
    // Validate name
    if (!this.validateSubscriptionName(name)) {
      throw new Error('Invalid subscription name. Must be 3-50 characters.');
    }

    // Generate dynamic broadcast type
    const type = generateBroadcastSubscriptionType();

    // Create subscription
    const subscription = await this.subscriptionsRepository.create({
      name,
      type,
      isActive: true,
    });

    // Generate invite code
    const code = await this.codeGenerationService.generateUniqueCode(
      subscription.id,
      managerId,
    );

    return {
      subscription: this.mapToDto(subscription),
      code,
    };
  }

  /**
   * Close broadcast subscription
   *
   * CRITICAL: Validates subscription is broadcast type before closing
   * Prevents accidental closure of signals subscription
   *
   * @param subscriptionId - The subscription ID to close
   * @param managerId - The manager's Telegram ID who is closing
   * @throws Error if subscription not found or is not broadcast type
   */
  async closeSubscription(
    subscriptionId: number,
    managerId: number,
  ): Promise<void> {
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Validate it's a broadcast subscription
    if (!isBroadcastSubscription(subscription.type)) {
      throw new Error('Cannot close signals subscription through this command');
    }

    await this.subscriptionsRepository.closeSubscription(
      subscriptionId,
      managerId,
    );
  }

  /**
   * Get all active broadcast subscriptions
   *
   * CRITICAL: Returns ONLY broadcast subscriptions (type LIKE 'subscription_%')
   * Uses repository method that filters by broadcast type
   *
   * @returns Array of active broadcast subscriptions
   */
  async getActiveBroadcastSubscriptions(): Promise<SubscriptionDto[]> {
    const subscriptions =
      await this.subscriptionsRepository.findActiveBroadcastSubscriptions();
    return subscriptions.map((sub) => this.mapToDto(sub));
  }

  /**
   * Get all broadcast subscriptions (active and inactive)
   *
   * CRITICAL: Returns ONLY broadcast subscriptions
   *
   * @returns Array of all broadcast subscriptions
   */
  async getAllBroadcastSubscriptions(): Promise<SubscriptionDto[]> {
    const subscriptions =
      await this.subscriptionsRepository.findAllBroadcastSubscriptions();
    return subscriptions.map((sub) => this.mapToDto(sub));
  }

  /**
   * Get subscription by ID
   *
   * @param id - The subscription ID
   * @returns The subscription DTO or null if not found
   */
  async getSubscriptionById(id: number): Promise<SubscriptionDto | null> {
    const subscription = await this.subscriptionsRepository.findById(id);
    return subscription ? this.mapToDto(subscription) : null;
  }

  /**
   * Validate subscription name
   *
   * Rules:
   * - 3-50 characters length
   * - Alphanumeric characters and spaces only
   *
   * @param name - The name to validate
   * @returns true if valid
   */
  validateSubscriptionName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) {
      return false;
    }
    // Allow alphanumeric + spaces
    return /^[a-zA-Z0-9\s]+$/.test(name);
  }

  /**
   * Map database entity to DTO
   *
   * @param subscription - The database subscription entity
   * @returns The subscription DTO
   */
  private mapToDto(subscription: Subscription): SubscriptionDto {
    return {
      id: subscription.id,
      name: subscription.name,
      type: subscription.type,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      closedAt: subscription.closedAt ?? undefined,
      closedBy: subscription.closedBy ?? undefined,
    };
  }
}
