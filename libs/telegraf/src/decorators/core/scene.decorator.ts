import { SetMetadata } from '@nestjs/common';
import { SceneMetadata, SceneOptions } from '../../interfaces';
import { SCENE_METADATA } from '../../telegraf.constants';

export const Scene = (
  sceneId: string,
  options?: SceneOptions<any>,
): ClassDecorator =>
  SetMetadata<string, SceneMetadata>(SCENE_METADATA, {
    sceneId,
    type: 'base',
    options,
  });
