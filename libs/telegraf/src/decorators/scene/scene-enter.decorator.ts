import { createListenerDecorator } from '../../utils';
import { Scenes } from 'telegraf';

export const SceneEnter =
  createListenerDecorator<Scenes.BaseScene<any>>('enter');
