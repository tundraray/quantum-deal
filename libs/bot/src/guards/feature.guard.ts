import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';

/**
 * Feature Guard
 *
 * NestJS guard that enforces feature access control based on @RequireFeature decorator.
 * Works with REST API endpoints and HTTP requests.
 *
 * NOTE: This guard does NOT work with Telegraf decorators (@Command, @Action, etc.)
 * For Telegraf handlers, use checkFeatureAccess() helper in your handler instead.
 *
 * Usage with REST API:
 * ```typescript
 * @Controller('api')
 * @UseGuards(FeatureGuard)
 * export class ApiController {
 *   @Get('custom-filters')
 *   @RequireFeature(FeatureFlag.CUSTOM_USER_FILTERING)
 *   async getCustomFilters(@Req() req: Request) {
 *     // Only accessible if user has CUSTOM_USER_FILTERING
 *   }
 * }
 * ```
 *
 * Usage with Telegraf (manual check required):
 * ```typescript
 * @Command('filter')
 * async handleFilter(@Ctx() ctx: UserContext) {
 *   if (!ctx.user || !hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
 *     await ctx.reply('This feature is not available in your subscription.');
 *     return;
 *   }
 *   // Continue with handler logic
 * }
 * ```
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(private reflector: Reflector) {}

  /**
   * Determine if the current request can proceed
   *
   * @param context - Execution context
   * @returns true if access is granted, false otherwise
   * @throws ForbiddenException if access is denied
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required feature from decorator metadata
    const requiredFeature = this.reflector.get<FeatureFlag>(
      REQUIRE_FEATURE_KEY,
      context.getHandler(),
    );

    // No feature requirement = allow access
    if (!requiredFeature) {
      return true;
    }

    // Get request context
    const request = context.switchToHttp().getRequest<UserContext>();
    const ctx = request;

    // Check if user is authenticated
    if (!ctx.user) {
      this.logger.warn(
        `Feature check failed: No user in context for ${requiredFeature}`,
      );
      throw new ForbiddenException(
        'Authentication required to access this feature',
      );
    }

    // Check if user has the required feature
    const hasAccess = hasFeature(ctx.user, requiredFeature);

    if (!hasAccess) {
      this.logger.log(
        `User ${ctx.user.telegramId} denied access to feature ${requiredFeature}`,
      );
      throw new ForbiddenException(
        `Feature "${requiredFeature}" is not available in your subscription`,
      );
    }

    this.logger.debug(
      `User ${ctx.user.telegramId} granted access to feature ${requiredFeature}`,
    );

    return true;
  }
}
