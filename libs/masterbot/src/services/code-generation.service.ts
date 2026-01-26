import { Injectable } from '@nestjs/common';
import { CodesRepository } from '@quantumdeal/db';
import { codes, Code } from '@quantumdeal/db/schema/codes';
import { eq, and } from 'drizzle-orm';
import { CodeDto } from '../dto/code.dto';
import * as crypto from 'crypto';

/**
 * Service responsible for generating unique invitation codes for subscriptions
 *
 * Generates 15-character alphanumeric codes with collision detection
 * and retry logic. Codes are used to create invite URLs for subscriptions.
 */
@Injectable()
export class CodeGenerationService {
  constructor(private readonly codesRepository: CodesRepository) {}

  /**
   * Generate unique 15-character alphanumeric code
   * Retries up to 10 times on collision
   *
   * @param subscriptionId - The subscription ID this code belongs to
   * @param managerId - The manager's Telegram ID who created the code
   * @returns The created code DTO
   * @throws Error if unable to generate unique code after 10 attempts
   */
  async generateUniqueCode(
    subscriptionId: number,
    managerId: number,
  ): Promise<CodeDto> {
    const maxRetries = 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = this.generateRandomCode(15);

      // Check if code already exists
      const existing = await this.codesRepository.findOneBy(
        eq(codes.code, code),
      );

      if (!existing) {
        // Create and return the code
        const created = await this.codesRepository.create({
          code,
          subscriptionId,
          managerId,
          isActive: true,
        });

        return this.mapToDto(created);
      }
    }

    throw new Error('Failed to generate unique code after 10 attempts');
  }

  /**
   * Validate if code exists and is active
   *
   * @param code - The code string to validate
   * @returns true if the code exists and is active
   */
  async validateCode(code: string): Promise<boolean> {
    const found = await this.codesRepository.findOneBy(
      and(eq(codes.code, code), eq(codes.isActive, true)),
    );
    return !!found;
  }

  /**
   * Get invite URL for a code
   * Format: https://t.me/{botUsername}?start={code}
   *
   * @param code - The invitation code
   * @param botUsername - The bot's username (without @)
   * @returns The formatted invite URL
   */
  getInviteUrl(code: string, botUsername: string): string {
    return `https://t.me/${botUsername}?start=${code}`;
  }

  /**
   * Generate random alphanumeric code using crypto.randomBytes
   *
   * @param length - Length of the code to generate
   * @returns Random alphanumeric string
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  /**
   * Map database entity to DTO
   *
   * @param code - The database code entity
   * @returns The code DTO
   */
  private mapToDto(code: Code): CodeDto {
    return {
      id: code.id,
      code: code.code,
      subscriptionId: code.subscriptionId,
      managerId: code.managerId ?? 0, // Should never be null for created codes
      isActive: code.isActive,
      createdAt: code.createdAt,
    };
  }
}
