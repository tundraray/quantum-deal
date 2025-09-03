import { Markup } from 'telegraf';
import { langs } from './constants';

// функция генерации inline-клавиатуры
export function langKeyboard(cols = 2) {
  const rows: any[] = [];
  for (let i = 0; i < langs.length; i += cols) {
    rows.push(
      langs
        .slice(i, i + cols)
        .map((l) => Markup.button.callback(l.label, `/lang ${l.code}`)),
    );
  }
  return Markup.inlineKeyboard(rows);
}
