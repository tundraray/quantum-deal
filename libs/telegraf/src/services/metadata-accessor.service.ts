import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SCENE_METADATA,
  LISTENERS_METADATA,
  UPDATE_METADATA,
  WIZARD_STEP_METADATA,
  COMPOSER_METADATA,
  BOT_TARGET_METADATA,
  FEATURE_FLAG_METADATA,
} from '../telegraf.constants';
import {
  ListenerMetadata,
  SceneMetadata,
  WizardStepMetadata,
} from '../interfaces';

/**
 * Type for class constructor or function targets.
 * Uses Function type for compatibility with @nestjs/core which uses Function in its types.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type MetadataTarget = Function;

@Injectable()
export class MetadataAccessorService {
  constructor(private readonly reflector: Reflector) {}

  isComposer(target: MetadataTarget): boolean {
    if (!target) return false;
    return !!this.reflector.get(COMPOSER_METADATA, target);
  }

  isUpdate(target: MetadataTarget): boolean {
    if (!target) return false;
    return !!this.reflector.get(UPDATE_METADATA, target);
  }

  isScene(target: MetadataTarget): boolean {
    if (!target) return false;
    return !!this.reflector.get(SCENE_METADATA, target);
  }

  getListenerMetadata(target: MetadataTarget): ListenerMetadata[] | undefined {
    return this.reflector.get(LISTENERS_METADATA, target);
  }

  getSceneMetadata(target: MetadataTarget): SceneMetadata | undefined {
    return this.reflector.get(SCENE_METADATA, target);
  }

  getWizardStepMetadata(
    target: MetadataTarget,
  ): WizardStepMetadata | undefined {
    return this.reflector.get(WIZARD_STEP_METADATA, target);
  }

  /**
   * Get bot target metadata (for per-bot handler filtering)
   * Returns undefined if handler should apply to all bots
   */
  getBotTargetMetadata(target: MetadataTarget): number | undefined {
    if (!target) return undefined;
    return this.reflector.get(BOT_TARGET_METADATA, target);
  }

  /**
   * Get feature flag metadata (for conditional handler registration)
   * Returns undefined if handler has no feature flag requirement
   */
  getFeatureFlagMetadata(target: MetadataTarget): string | undefined {
    if (!target) return undefined;
    return this.reflector.get(FEATURE_FLAG_METADATA, target);
  }
}
