INSERT INTO public.messages (lang, message, "type") VALUES
	('ru', '🚀 Открыл {order_type} по {symbol}, {lots} lots, вход {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Посмотрим, что из этого выйдет.', 'open'),
	('ru', '📈 Зашёл в {order_type} {symbol} — {lots} lots по {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Думаю, движение будет интересным.', 'open'),
	('ru', '✅ Взял {order_type} по {symbol}, объём {lots} lots, вход {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Будем держать в поле зрения.', 'open'),
	('ru', '💹 Начал сделку: {order_type} {symbol}, {lots} lots, цена {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Спокойно наблюдаю за графиком.', 'open'),
	('ru', '🔔 Позиция {order_type} по {symbol} открыта, {lots} lots по {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Поглядим, куда пойдёт рынок.', 'open'),
	('ru', '🎉 Закрыл {order_type} по {symbol} ({lots} lots) с **прибылью {profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Отлично сработало!', 'close_plus'),
	('ru', '🚀 Сделка {order_type} {symbol} ({lots} lots) **завершена в плюс — {profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Вот это результат!', 'close_plus'),
	('ru', '✅ Профит по {order_type} {symbol} ({lots} lots) — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Доволен итогом.', 'close_plus'),
	('ru', '💹 {order_type} {symbol} ({lots} lots) **закрыл в плюс: {profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Хорошее движение поймали.', 'close_plus'),
	('ru', '🔥 Ордер {order_type} по {symbol} ({lots} lots) дал **+{profit}$**
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Продолжаем в том же духе.', 'close_plus'),
	('ru', '😕 Закрыл {order_type} по {symbol} ({lots} lots) с убытком {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Бывает и такое.', 'close_minus'),
	('ru', '📉 Сделка {order_type} {symbol} ({lots} lots) ушла в минус: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Главное — контролируем риск.', 'close_minus'),
	('ru', '🛑 {order_type} {symbol} ({lots} lots) закрыта в минус на {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Не страшно, идём дальше.', 'close_minus'),
	('ru', '🙄 Не получилось по {order_type} {symbol} ({lots} lots) — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Переживём и поправим стратегию.', 'close_minus'),
	('ru', '❗ Ордер {order_type} по {symbol} ({lots} lots) дал минус {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
В следующий раз возьмём своё.', 'close_minus'),
	('ru', '👋 Привет! Подведём итоги за неделю:
📈 Прибыль: {profit} USD
📉 Убытки: {loss} USD
✅ Чистый результат: {net_result} USD
Отличная работа, так держать! 💪', 'weekly_report'),
	('ru', '🗓️ Неделя позади:
В плюс: {positive_trades} | В минус: {negative_trades}
💰 Итог: {net_result} USD
Хорошо держимся!', 'weekly_report'),
	('ru', '📅 Закрыл неделю:
+{positive_trades} сделок | −{negative_trades} сделок
📊 Баланс: {net_result} USD
Двигаемся дальше.', 'weekly_report'),
	('ru', '🤝 Подвел итоги недели:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Результат: {net_result} USD
Главное — стабильность.', 'weekly_report'),
	('ru', '💬 На этой неделе:
Плюсовых сделок: {positive_trades}
Минусовых: {negative_trades}
💰 Чистый итог: {net_result} USD
Вперед к новым сделкам!', 'weekly_report'),
	('ru', '👋 Привет! Подведём итоги месяца:
Всего сделок: {TotalOrders}
Профит: {TotalProfit} USD
Лучший инструмент: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Спасибо, что был(а) с нами — впереди новый месяц и новые возможности! 🚀', 'monthly_report'),
	('ru', '✨ Месяц завершён, давай посмотрим на результаты:
🔹 Сделок открыто: {TotalOrders}
🔹 Общий результат: {TotalProfit} USD
🔹 Самая удачная сделка: {BestTradeSymbol} ({BestTradeProfit} USD)
Продолжаем движение вперёд! 💪', 'monthly_report'),
	('ru', '📈 Ежемесячный обзор готов!
Количество сделок: {TotalOrders}
Финальный баланс: {TotalProfit} USD
Максимальная прибыль с одной сделки: {MaxProfitTrade} USD
Новый месяц — новые цели! 🔥', 'monthly_report'),
	('ru', '📅 За этот месяц у нас вышло:
✔️ Сделок: {TotalOrders}
✔️ Прибыль/убыток: {TotalProfit} USD
✔️ Лучший актив: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Спасибо, что двигаемся вместе. До новых побед! 🌟', 'monthly_report'),
	('ru', 'Вариант 5:
📝 Подытожим месяц:
Всего операций: {TotalOrders}
Общий результат: {TotalProfit} USD
Самый прибыльный инструмент: {BestSymbol} ({BestTradeProfit} USD)
В следующем месяце сделаем ещё лучше! 🚀', 'monthly_report'),
	('ru', '🛠 Сделал изменения в сделке {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Посмотрим, как это повлияет.', 'position_sltp_update'),
	('ru', '📊 Подкорректировал {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Следим за обновлённой стратегией.', 'position_sltp_update'),
	('ru', '🔄 Обновил уровни по {symbol} ({order_type}, {lots} lots)
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Адаптируемся под рынок.', 'position_sltp_update'),
	('ru', '⚙️ Настройки {symbol} ({order_type}, {lots} lots) изменены
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Работаем по новым данным.', 'position_sltp_update'),
	('ru', '📈 Перенастроил ордер {symbol} ({order_type}, {lots} lots)
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Ждём реакции рынка.', 'position_sltp_update'),
	('ru', '👋 Привет! Подведём итоги за неделю:
📈 Прибыль: {profit} USD
📉 Убытки: {loss} USD
✅ Чистый результат: {net_result} USD
Отличная работа, так держать! 💪

— — —

🟣 VIP-эталон за ту же неделю
📈 Прибыль: {vip_profit} USD
📉 Убыток: {vip_loss} USD
💹 Чистый результат: {vip_net_result} USD
✅ Прибыльных сделок: {vip_positive_trades}
❌ Убыточных сделок: {vip_negative_trades}
Хочешь так же? Подключай VIP.', 'weekly_report_2'),
	('ru', '🗓️ Неделя позади:
Прибыльных: {positive_trades} | Убыточных: {negative_trades}
💰 Итог: {net_result} USD
Хорошо держимся!

— — —

🟣 VIP-эталон за ту же неделю
📈 Прибыль: {vip_profit} USD
📉 Убыток: {vip_loss} USD
💹 Чистый результат: {vip_net_result} USD
✅ Прибыльных сделок: {vip_positive_trades}
❌ Убыточных сделок: {vip_negative_trades}
Хочешь так же? Подключай VIP.', 'weekly_report_2'),
	('ru', '📅 Закрыл неделю:
+{positive_trades} сделок | −{negative_trades} сделок
📊 Баланс: {net_result} USD
Двигаемся дальше.

— — —

🟣 VIP-эталон за ту же неделю
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых сделок: {vip_positive_trades}
❌ Минусовых сделок: {vip_negative_trades}
Хочешь так же? Подключай VIP.', 'weekly_report_2'),
	('ru', '🤝 Подвел итоги недели:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Результат: {net_result} USD
Главное — стабильность.

— — —

🟣 VIP-эталон за ту же неделю
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых сделок: {vip_positive_trades}
❌ Минусовых сделок: {vip_negative_trades}
Хочешь так же? Подключай VIP.', 'weekly_report_2'),
	('ru', '💬 На этой неделе:
Плюсовых сделок: {positive_trades}
Минусовых: {negative_trades}
💰 Чистый итог: {net_result} USD
Вперед к новым сделкам!

— — —

🟣 VIP-эталон за ту же неделю
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых сделок: {vip_positive_trades}
❌ Минусовых сделок: {vip_negative_trades}
Хочешь так же? Подключай VIP.', 'weekly_report_2'),
	('ru', '💬 На этой неделе:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых сделок: {positive_trades}
❌ Минусовых сделок: {negative_trades}

— — —

🟣 Эталон без фильтрации за ту же неделю
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых сделок: {vip_positive_trades}
❌ Минусовых сделок: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.', 'weekly_report_3'),
	('ru', '🗓️ Итоги недели:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый результат: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Без фильтрации (эталон)
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.', 'weekly_report_3'),
	('ru', '📅 Неделя закрыта:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Сравнение без фильтрации
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.', 'weekly_report_3'),
	('ru', '🤝 Сводка за неделю:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Эталон (без фильтрации)
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.', 'weekly_report_3'),
	('ru', '📊 *Пакет торговых сигналов*

Вы получили {count} сигналов:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Символ: {symbol}
📍 Событие: {eventType}
💰 Прибыль: {profit}
📅 Время: {time}
---
{{/each}}

Всего сигналов: {count}
Бот: {botName}', 'batch_signals');
