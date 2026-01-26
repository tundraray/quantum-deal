import { Context, MiddlewareFn } from 'telegraf';

/**
 * Scene options - mirrors telegraf's internal SceneOptions
 * Since telegraf doesn't export SceneOptions directly, we define it here
 */
export interface SceneOptions<C extends Context = Context> {
  ttl?: number;
  handlers?: ReadonlyArray<MiddlewareFn<C>>;
  enterHandlers?: ReadonlyArray<MiddlewareFn<C>>;
  leaveHandlers?: ReadonlyArray<MiddlewareFn<C>>;
}

export interface SceneMetadata {
  sceneId: string;
  type: 'base' | 'wizard';
  options?: SceneOptions<any>;
}

export interface WizardStepMetadata {
  step: number;
}
