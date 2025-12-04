INSERT INTO public.messages (lang, message, "type") VALUES
	('uk', '🚀 Відкрив {order_type} по {symbol}, {lots} lots, вхід {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Подивимось, що з цього вийде.', 'open'),
	('uk', '📈 Зайшов у {order_type} {symbol} — {lots} lots по {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Думаю, рух буде цікавим.', 'open'),
	('uk', '✅ Взяв {order_type} по {symbol}, обсяг {lots} lots, вхід {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Триматимемо в полі зору.', 'open'),
	('uk', '💹 Почав угоду: {order_type} {symbol}, {lots} lots, ціна {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Спокійно спостерігаю за графіком.', 'open'),
	('uk', '🔔 Позиція {order_type} по {symbol} відкрита, {lots} lots по {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Побачимо, куди піде ринок.', 'open'),
	('uk', '🎉 Закрив {order_type} по {symbol} ({lots} lots) з **прибутком {profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Чудово спрацювало!', 'close_plus'),
	('uk', '🚀 Угода {order_type} {symbol} ({lots} lots) завершена в плюс — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Ось це результат!', 'close_plus'),
	('uk', '✅ Профіт по {order_type} {symbol} ({lots} lots) — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Задоволений результатом.', 'close_plus'),
	('uk', '💹 {order_type} {symbol} ({lots} lots) **закрив у плюс: {profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Добре рух спіймали.', 'close_plus'),
	('uk', '🔥 Ордер {order_type} по {symbol} ({lots} lots) дав **+{profit}$**
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Продовжуємо в тому ж дусі.', 'close_plus'),
	('uk', '😕 Закрив {order_type} по {symbol} ({lots} lots) зі збитком {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Буває і таке.', 'close_minus'),
	('uk', '📉 Угода {order_type} {symbol} ({lots} lots) пішла в мінус: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Головне — контролюємо ризик.', 'close_minus'),
	('uk', '🛑 {order_type} {symbol} ({lots} lots) закрита в мінус на {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Не страшно, йдемо далі.', 'close_minus'),
	('uk', '🙄 Не вийшло по {order_type} {symbol} ({lots} lots) — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Переживемо і підправимо стратегію.', 'close_minus'),
	('uk', '❗ Ордер {order_type} по {symbol} ({lots} lots) дав мінус {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Наступного разу візьмемо своє.', 'close_minus'),
	('uk', '👋 Привіт! Підсумуємо тиждень:
📈 Прибуток: {profit} USD
📉 Збитки: {loss} USD
✅ Чистий результат: {net_result} USD
Чудова робота, так тримати! 💪', 'weekly_report'),
	('uk', '🗓️ Тиждень позаду:
У плюс: {positive_trades} | У мінус: {negative_trades}
💰 Підсумок: {net_result} USD
Тримаємось добре!', 'weekly_report'),
	('uk', '📅 Закрив тиждень:
+{positive_trades} угод | −{negative_trades} угод
📊 Баланс: {net_result} USD
Рухаємось далі.', 'weekly_report'),
	('uk', '🤝 Підбив підсумки тижня:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Результат: {net_result} USD
Головне — стабільність.', 'weekly_report'),
	('uk', '💬 На цьому тижні:
Плюсових угод: {positive_trades}
Мінусових: {negative_trades}
💰 Чистий підсумок: {net_result} USD
Вперед до нових угод!', 'weekly_report'),
	('uk', '👋 Привіт! Підбиваємо підсумки місяця:
Усього угод: {TotalOrders}
Прибуток: {TotalProfit} USD
Найкращий інструмент: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Дякуємо, що були з нами — попереду новий місяць і нові можливості! 🚀', 'monthly_report'),
	('uk', '✨ Місяць завершено, подивимось на результати:
🔹 Угод відкрито: {TotalOrders}
🔹 Загальний результат: {TotalProfit} USD
🔹 Найуспішніша угода: {BestTradeSymbol} ({BestTradeProfit} USD)
Рухаємось далі! 💪', 'monthly_report'),
	('uk', '📈 Щомісячний огляд готовий!
Кількість угод: {TotalOrders}
Фінальний баланс: {TotalProfit} USD
Максимальний прибуток з однієї угоди: {MaxProfitTrade} USD
Новий місяць — нові цілі! 🔥', 'monthly_report'),
	('uk', '📅 За цей місяць маємо:
✔️ Угод: {TotalOrders}
✔️ Прибуток/збиток: {TotalProfit} USD
✔️ Найкращий актив: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Дякуємо, що рухаємось разом. До нових перемог! 🌟', 'monthly_report'),
	('uk', '📝 Підсумуємо місяць:
Всього операцій: {TotalOrders}
Загальний результат: {TotalProfit} USD
Найприбутковіший інструмент: {BestSymbol} ({BestTradeProfit} USD)
У наступному місяці зробимо ще краще! 🚀', 'monthly_report'),
	('uk', '📊 Підкоригував {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Слідкуємо за оновленою стратегією.', 'position_sltp_update'),
	('uk', '🔄 Оновив рівні по {symbol} ({order_type}, {lots} lots)
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Адаптуємось до ринку.', 'position_sltp_update'),
	('uk', '⚙️ Налаштування {symbol} ({order_type}, {lots} lots) змінені
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Працюємо за новими даними.', 'position_sltp_update'),
	('uk', '🛠 Зробив зміни в угоді {symbol} ({order_type}, {lots} lots)
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Подивимось, як це вплине.', 'position_sltp_update'),
	('uk', '📈 Переналаштував ордер {symbol} ({order_type}, {lots} lots)
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Чекаємо реакцію ринку.', 'position_sltp_update'),
	('uk', '👋 Привіт! Підсумуємо тиждень:
📈 Прибуток: {profit} USD
📉 Збитки: {loss} USD
✅ Чистий результат: {net_result} USD
Чудова робота, так тримати! 💪

— — —

🟣 VIP-еталон за той же тиждень
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Прибуткових угод: {vip_positive_trades}
❌ Збиткових угод: {vip_negative_trades}
Хочеш так само? Підключай VIP.', 'weekly_report_2'),
	('uk', '🗓️ Тиждень позаду:
У плюс: {positive_trades} | У мінус: {negative_trades}
💰 Підсумок: {net_result} USD
Тримаємось добре!

— — —

🟣 VIP-еталон за той же тиждень
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Прибуткових угод: {vip_positive_trades}
❌ Збиткових угод: {vip_negative_trades}
Хочеш так само? Підключай VIP.', 'weekly_report_2'),
	('uk', '📅 Закрив тиждень:
+{positive_trades} угод | −{negative_trades} угод
📊 Баланс: {net_result} USD
Рухаємось далі.

— — —

🟣 VIP-еталон за той же тиждень
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Прибуткових угод: {vip_positive_trades}
❌ Збиткових угод: {vip_negative_trades}
Хочеш так само? Підключай VIP.', 'weekly_report_2'),
	('uk', '🤝 Підбив підсумки тижня:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Результат: {net_result} USD
Головне — стабільність.

— — —

🟣 VIP-еталон за той же тиждень
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Прибуткових угод: {vip_positive_trades}
❌ Збиткових угод: {vip_negative_trades}
Хочеш так само? Підключай VIP.', 'weekly_report_2'),
	('uk', '💬 На цьому тижні:
Плюсових угод: {positive_trades}
Мінусових: {negative_trades}
💰 Чистий підсумок: {net_result} USD
Вперед до нових угод!

— — —

🟣 VIP-еталон за той же тиждень
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Прибуткових угод: {vip_positive_trades}
❌ Збиткових угод: {vip_negative_trades}
Хочеш так само? Підключай VIP.', 'weekly_report_2'),
	('uk', '💬 За цей тиждень:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових угод: {positive_trades}
❌ Мінусових угод: {negative_trades}

— — —

🟣 Еталон без фільтрації (за той самий тиждень)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових угод: {vip_positive_trades}
❌ Мінусових угод: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.', 'weekly_report_3'),
	('uk', '🗓️ Підсумки тижня:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий результат: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Без фільтрації (еталон)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.', 'weekly_report_3'),
	('uk', '📅 Тиждень закрито:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Порівняння без фільтрації
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.', 'weekly_report_3'),
	('uk', '🤝 Зведення за тиждень:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Еталон (без фільтрації)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.', 'weekly_report_3');
