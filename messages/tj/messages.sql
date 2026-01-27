INSERT INTO public.messages (lang, message, "type") VALUES
	('tj', '🚀 {symbol} бо regards order_type , {lots} lots, ворид {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Мебинем, чӣ мешавад.', 'open'),
	('tj', '📈 {order_type} {symbol} — {lots} lots дар {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Фикр мекунам ҳаракат ҷолиб мешавад.', 'open'),
	('tj', '✅ {order_type} дар {symbol}, ҳаҷм {lots} lots, ворид {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Дар назорат мегирем.', 'open'),
	('tj', '💹 Муомила сар шуд: {order_type} {symbol}, {lots} lots, нарх {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Бо оромӣ графикро мебинам.', 'open'),
	('tj', '🔔 Позиция {order_type} дар {symbol} кушода шуд, {lots} lots дар {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Бозор ба куҷо меравад, мебинем.', 'open'),
	('tj', '🎉 {order_type} дар {symbol} ({lots} lots) баста шуд бо фоидаи **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Аъло шуд!', 'close_plus'),
	('tj', '🚀 Муомилаи {order_type} {symbol} ({lots} lots) бо фоида анҷом ёфт — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Ин аст натиҷа!', 'close_plus'),
	('tj', '✅ Фоида аз {order_type} {symbol} ({lots} lots) — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Аз натиҷа қаноатмандам.', 'close_plus'),
	('tj', '💹 {order_type} {symbol} ({lots} lots) баста шуд бо фоида: **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ҳаракати хуб гирифтем.', 'close_plus'),
	('tj', '🔥 Ордери {order_type} барои {symbol} ({lots} lots) **+{profit}$** фоида дод 
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ҳамин тавр идома медиҳем.', 'close_plus'),
	('tj', '😕 {order_type} дар {symbol} ({lots} lots) бо зарари {profit}$ баста шуд
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ҳамин тавр ҳам мешавад.', 'close_minus'),
	('tj', '📉 Муомилаи {order_type} {symbol} ({lots} lots) ба зарар рафт: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Муҳим — хавфро идора мекунем.', 'close_minus'),
	('tj', '🛑 {order_type} {symbol} ({lots} lots) баста шуд бо зарари {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
На метарсем, идома медиҳем.', 'close_minus'),
	('tj', '🙄 Дар {order_type} {symbol} ({lots} lots) муваффақ нашудем — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Мепазирем ва стратегияи нав месозем.', 'close_minus'),
	('tj', '❗ Ордери {order_type} барои {symbol} ({lots} lots) зарар дод {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Бори дигар аз они мо мешавад.', 'close_minus'),
	('tj', '👋 Салом! Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зарар: {loss} USD
✅ Натиҷаи соф: {net_result} USD
Олиҷаноб! Давом диҳед! 💪', 'weekly_report'),
	('tj', '🗓️ Ҳафта ба поён расид:
Бо фоида: {positive_trades} | Бо зиён: {negative_trades}
💰 Натича: {net_result} USD
Хуб истодаем!', 'weekly_report'),
	('tj', '📅 Ҳафта баст шуд:
+{positive_trades} муомила | −{negative_trades} муомила
📊 Баланс: {net_result} USD
Ба пеш ҳаракат мекунем.', 'weekly_report'),
	('tj', '🤝 Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натича: {net_result} USD
Муҳимаш — устуворӣ.', 'weekly_report'),
	('tj', '💬 Дар ин ҳафта:
Муомилаҳои бо фоида: {positive_trades}
Муомилаҳои бо зиён: {negative_trades}
💰 Натиҷаи соф: {net_result} USD
Ба муомилаҳои нав пеш меравем!', 'weekly_report'),
	('tj', '👋 Салом! Хулосаи моҳро мебинем:
Ҳамагӣ муомилот: {TotalOrders}
Фоида: {TotalProfit} USD
Беҳтарин асбобҳо: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Ташаккур, ки бо мо будед — моҳи нав ва имкониятҳои нав дар пешанд! 🚀', 'monthly_report'),
	('tj', '✨ Моҳ ба поён расид, натиҷаҳоро мебинем:
🔹 Муомилоти кушода: {TotalOrders}
🔹 Натиҷаи умумӣ: {TotalProfit} USD
🔹 Беҳтарин муомила: {BestTradeSymbol} ({BestTradeProfit} USD)
Ба пеш ҳаракат мекунем! 💪', 'monthly_report'),
	('tj', '📈 Баррасии моҳона омода аст!
Шумораи муомилот: {TotalOrders}
Бақияи ниҳоӣ: {TotalProfit} USD
Бештарин фоида аз як муомила: {MaxProfitTrade} USD
Моҳи нав — ҳадафҳои нав! 🔥', 'monthly_report'),
	('tj', '📅 Хулосаи ин моҳ:
✔️ Муомилот: {TotalOrders}
✔️ Фоида/зарар: {TotalProfit} USD
✔️ Беҳтарин дороӣ: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Ташаккур, ки бо мо ҳаракат мекунед. Ба ғалабаҳои нав! 🌟', 'monthly_report'),
	('tj', '📝 Моҳи ҷориро ҷамъбаст мекунем:
Ҳамагӣ амалиёт: {TotalOrders}
Натиҷаи умумӣ: {TotalProfit} USD
Асбоби аз ҳама фоидаовар: {BestSymbol} ({BestTradeProfit} USD)
Моҳи оянда боз беҳтар хоҳем шуд! 🚀', 'monthly_report'),
	('tj', '📊 {symbol} ({order_type}, {lots} lots) танзим шуд
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Стратегияи навро пайгирӣ мекунем.', 'position_sltp_update'),
	('tj', '🔄 Сатҳҳои {symbol} ({order_type}, {lots} lots) нав карда шуданд
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Ба бозор мутобиқ мешавем.', 'position_sltp_update'),
	('tj', '⚙️ Танзимоти {symbol} ({order_type}, {lots} lots) тағйир ёфт
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Бо маълумоти нав кор мекунем.', 'position_sltp_update'),
	('tj', '🛠 Тағйирот дар муомилаи {symbol} ({order_type}, {lots} lots) ворид шуд
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Мебинем таъсири онро.', 'position_sltp_update'),
	('tj', '📈 Ордери {symbol} ({order_type}, {lots} lots) бозсозӣ шуд
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Интизори аксуламали бозорем.', 'position_sltp_update'),
	('tj', '👋 Салом! Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зарар: {loss} USD
✅ Натиҷаи соф: {net_result} USD
Олиҷаноб! Давом диҳед! 💪

— — —

🟣 VIP — намуна барои ҳамон ҳафта
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Муомилаҳои мусбат: {vip_positive_trades}
❌ Муомилаҳои манфӣ: {vip_negative_trades}
Ҳамин натиҷаҳоро мехоҳӣ? Ба VIP гузар.', 'weekly_report_2'),
	('tj', '🗓️ Ҳафта ба поён расид:
Бо фоида: {positive_trades} | Бо зиён: {negative_trades}
💰 Натича: {net_result} USD
Хуб истодаем!

— — —

🟣 VIP — намуна барои ҳамон ҳафта
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Муомилаҳои мусбат: {vip_positive_trades}
❌ Муомилаҳои манфӣ: {vip_negative_trades}
Ҳамин натиҷаҳоро мехоҳӣ? Ба VIP гузар.', 'weekly_report_2'),
	('tj', '📅 Ҳафта баст шуд:
+{positive_trades} муомила | −{negative_trades} муомила
📊 Баланс: {net_result} USD
Ба пеш ҳаракат мекунем.

— — —

🟣 VIP — намуна барои ҳамон ҳафта
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Муомилаҳои мусбат: {vip_positive_trades}
❌ Муомилаҳои манфӣ: {vip_negative_trades}
Ҳамин натиҷаҳоро мехоҳӣ? Ба VIP гузар.', 'weekly_report_2'),
	('tj', '🤝 Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натича: {net_result} USD
Муҳимаш — устуворӣ.

— — —

🟣 VIP — намуна барои ҳамон ҳафта
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Муомилаҳои мусбат: {vip_positive_trades}
❌ Муомилаҳои манфӣ: {vip_negative_trades}
Ҳамин натиҷаҳоро мехоҳӣ? Ба VIP гузар.', 'weekly_report_2'),
	('tj', '💬 Дар ин ҳафта:
Муомилаҳои бо фоида: {positive_trades}
Муомилаҳои бо зиён: {negative_trades}
💰 Натиҷаи соф: {net_result} USD
Ба муомилаҳои нав пеш меравем!

— — —

🟣 VIP — намуна барои ҳамон ҳафта
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Муомилаҳои мусбат: {vip_positive_trades}
❌ Муомилаҳои манфӣ: {vip_negative_trades}
Ҳамин натиҷаҳоро мехоҳӣ? Ба VIP гузар.', 'weekly_report_2'),
	('tj', '💬 Дар ин ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натиҷаи соф: {net_result} USD
✅ Муомилаҳои бо фоида: {positive_trades}
❌ Муомилаҳои бо зиён: {negative_trades}

— — —

🟣 Меъёр бе филтркунӣ (ҳамин ҳафта)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.', 'weekly_report_3'),
	('tj', '🗓️ Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Нетто: {net_result} USD
✅ Бо фоида: {positive_trades}
❌ Бо зиён: {negative_trades}

— — —

🟣 Бидуни филтр (меъёр)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.', 'weekly_report_3'),
	('tj', '📅 Ҳафта баста шуд:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Нетто: {net_result} USD
✅ Муомилаҳои бо фоида: {positive_trades}
❌ Муомилаҳои бо зиён: {negative_trades}

— — —

🟣 Маълумот барои қиёс (бе филтр)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.', 'weekly_report_3'),
	('tj', '🤝 Натиҷаҳои ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натиҷаи соф: {net_result} USD
✅ Бо фоида: {positive_trades}
❌ Бо зиён: {negative_trades}

— — —

🟣 Бенчмарк (бе филтркунӣ)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.', 'weekly_report_3'),
	('tj', '📊 *Маҷмӯи сигналҳои савдо*

Шумо {count} сигнал гирифтед:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Рамз: {symbol}
📍 Ҳодиса: {eventType}
💰 Фоида: {profit}
📅 Вақт: {time}
---
{{/each}}

Ҳамаи сигналҳо: {count}
Бот: {botName}', 'batch_signals');
