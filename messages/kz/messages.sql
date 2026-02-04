INSERT INTO public.messages (lang, message, "type") VALUES
	('kz', '🚀 {symbol} бойынша {order_type} аштым, {lots} lots, кіру {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Нәтижесін көреміз.', 'open'),
	('kz', '📈 {order_type} {symbol} кірдім — {lots} lots {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Қозғалыс қызық болады деп ойлаймын.', 'open'),
	('kz', '✅ {symbol} бойынша {order_type} алдым, көлемі {lots} lots, кіру {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Бақылауда ұстаймыз.', 'open'),
	('kz', '💹 Мәмілені бастадым: {order_type} {symbol}, {lots} lots, баға {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Графикті сабырмен бақылап отырмын.', 'open'),
	('kz', '🔔 {symbol} бойынша {order_type} позиция ашылды, {lots} lots {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Нарық қайда баратынын көреміз.', 'open'),
	('kz', '🎉 {symbol} бойынша {order_type} жаптым ({lots} lots), пайда **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Тамаша шықты!', 'close_plus'),
	('kz', '🚀 {order_type} {symbol} ({lots} lots) мәміле пайдамен аяқталды — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Міне, нәтиже!', 'close_plus'),
	('kz', '✅ {order_type} {symbol} ({lots} lots) бойынша пайда — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Нәтижеге ризамын.', 'close_plus'),
	('kz', '💹 {order_type} {symbol} ({lots} lots) жабылды, пайда: **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Жақсы қозғалысты ұстадық.', 'close_plus'),
	('kz', '🔥 {symbol} бойынша {order_type} ордері **+{profit}$** пайда берді 
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Осы қарқында жалғастырамыз.', 'close_plus'),
	('kz', '😕 {symbol} бойынша {order_type} жаптым ({lots} lots), шығын {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ондай да болады.', 'close_minus'),
	('kz', '📉 {order_type} {symbol} ({lots} lots) минусқа кетті: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Ең бастысы — тәуекелді бақылау.', 'close_minus'),
	('kz', '🛑 {symbol} бойынша {order_type} жабылды, минус {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Қорқынышты емес, әрі қарай жүреміз.', 'close_minus'),
	('kz', '🙄 {order_type} {symbol} ({lots} lots) бойынша шықпады — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Бәрін түзетеміз, стратегияны жақсартамыз.', 'close_minus'),
	('kz', '❗ {symbol} бойынша {order_type} ордері шығын берді {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Келесі жолы өзіміздікі болады.', 'close_minus'),
	('kz', '👋 Сәлем! Апталық қорытындыны жасайық:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
✅ Таза нәтиже: {net_result} USD
Тамаша жұмыс, осылай жалғастыр! 💪', 'weekly_report'),
	('kz', '🗓️ Апта аяқталды:
Плюсте: {positive_trades} | Минусе: {negative_trades}
💰 Нәтиже: {net_result} USD
Жақсы ұстап тұрмыз!', 'weekly_report'),
	('kz', '📅 Аптаны жаптым:
+{positive_trades} мәміле | −{negative_trades} мәміле
📊 Баланс: {net_result} USD
Әрі қарай жүреміз.', 'weekly_report'),
	('kz', '🤝 Апталық қорытынды:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Нәтиже: {net_result} USD
Ең бастысы — тұрақтылық.', 'weekly_report'),
	('kz', '💬 Осы аптада:
Плюстік мәмілелер: {positive_trades}
Минустік мәмілелер: {negative_trades}
💰 Таза нәтиже: {net_result} USD
Жаңа мәмілелерге алға!', 'weekly_report'),
	('kz', '👋 Сәлем! Айды қорытындылайық:
Жалпы мәмілелер: {TotalOrders}
Пайда: {TotalProfit} USD
Ең жақсы құралдар: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Бізбен бірге болғаныңызға рахмет — алда жаңа ай және жаңа мүмкіндіктер! 🚀', 'monthly_report'),
	('kz', '✨ Ай аяқталды, нәтижелерді қарайық:
🔹 Ашылған мәмілелер: {TotalOrders}
🔹 Жалпы нәтиже: {TotalProfit} USD
🔹 Ең табысты мәміле: {BestTradeSymbol} ({BestTradeProfit} USD)
Алға жылжи берейік! 💪', 'monthly_report'),
	('kz', '📈 Айлық шолу дайын!
Мәмілелер саны: {TotalOrders}
Қорытынды баланс: {TotalProfit} USD
Бір мәміледен ең үлкен пайда: {MaxProfitTrade} USD
Жаңа ай — жаңа мақсаттар! 🔥', 'monthly_report'),
	('kz', '📅 Осы айдың қорытындысы:
✔️ Мәмілелер: {TotalOrders}
✔️ Пайда/зиян: {TotalProfit} USD
✔️ Ең үздік актив: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Бізбен бірге жүргеніңізге рахмет. Жаңа жеңістерге! 🌟', 'monthly_report'),
	('kz', '📝 Айдың қорытындысы:
Барлық операциялар: {TotalOrders}
Жалпы нәтиже: {TotalProfit} USD
Ең табысты құрал: {BestSymbol} ({BestTradeProfit} USD)
Келесі айда бұдан да жақсы жасаймыз! 🚀', 'monthly_report'),
	('kz', '📊 {symbol} ({order_type}, {lots} lots) түзетілді
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Жаңартылған стратегияны бақылаймыз.', 'position_sltp_update'),
	('kz', '🔄 {symbol} ({order_type}, {lots} lots) деңгейлері жаңартылды
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Нарыққа бейімделудеміз.', 'position_sltp_update'),
	('kz', '⚙️ {symbol} ({order_type}, {lots} lots) параметрлері өзгертілді
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Жаңа деректермен жұмыс істейміз.', 'position_sltp_update'),
	('kz', '🛠 {symbol} ({order_type}, {lots} lots) келісімінде өзгерістер жасалды
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Әсерін көреміз.', 'position_sltp_update'),
	('kz', '📈 {symbol} ({order_type}, {lots} lots) ордері қайта бапталды
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Нарық реакциясын күтеміз.', 'position_sltp_update'),
	('kz', '👋 Сәлем! Апталық қорытындыны жасайық:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
✅ Таза нәтиже: {net_result} USD
Тамаша жұмыс, осылай жалғастыр! 💪

— — —

🟣 Сол апта үшін VIP-үлгі
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Плюстік мәмілелер: {vip_positive_trades}
❌ Минустік мәмілелер: {vip_negative_trades}
Солай болғың келе ме? VIP қосыңыз.', 'weekly_report_2'),
	('kz', '🗓️ Апта аяқталды:
Плюсте: {positive_trades} | Минусе: {negative_trades}
💰 Нәтиже: {net_result} USD
Жақсы ұстап тұрмыз!

— — —

🟣 Сол апта үшін VIP-үлгі
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Плюстік мәмілелер: {vip_positive_trades}
❌ Минустік мәмілелер: {vip_negative_trades}
Солай болғың келе ме? VIP қосыңыз.', 'weekly_report_2'),
	('kz', '📅 Аптаны жаптым:
+{positive_trades} мәміле | −{negative_trades} мәміле
📊 Баланс: {net_result} USD
Әрі қарай жүреміз.

— — —

🟣 Сол апта үшін VIP-үлгі
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Плюстік мәмілелер: {vip_positive_trades}
❌ Минустік мәмілелер: {vip_negative_trades}
Солай болғың келе ме? VIP қосыңыз.', 'weekly_report_2'),
	('kz', '🤝 Апталық қорытынды:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Нәтиже: {net_result} USD
Ең бастысы — тұрақтылық.

— — —

🟣 Сол апта үшін VIP-үлгі
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Плюстік мәмілелер: {vip_positive_trades}
❌ Минустік мәмілелер: {vip_negative_trades}
Солай болғың келе ме? VIP қосыңыз.', 'weekly_report_2'),
	('kz', '💬 Осы аптада:
Плюстік мәмілелер: {positive_trades}
Минустік мәмілелер: {negative_trades}
💰 Таза нәтиже: {net_result} USD
Жаңа мәмілелерге алға!

— — —

🟣 Сол апта үшін VIP-үлгі
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Плюстік мәмілелер: {vip_positive_trades}
❌ Минустік мәмілелер: {vip_negative_trades}
Солай болғың келе ме? VIP қосыңыз.', 'weekly_report_2'),
	('kz', '💬 Осы аптада:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Таза нәтиже: {net_result} USD
✅ Жеңісті мәмілелер: {positive_trades}
❌ Зиянды мәмілелер: {negative_trades}

— — —

🟣 Сүзгілері жоқ эталон (осы апта)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңісті мәмілелер: {vip_positive_trades}
❌ Зиянды мәмілелер: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.', 'weekly_report_3'),
	('kz', '🗓️ Апталық қорытынды:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Нетто: {net_result} USD
✅ Жеңістер: {positive_trades}
❌ Жогалтулар: {negative_trades}

— — —

🟣 Сүзгісіз бенчмарк
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңістер: {vip_positive_trades}
❌ Жогалтулар: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.', 'weekly_report_3'),
	('kz', '📅 Апта жабылды:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Нетто: {net_result} USD
✅ Жеңісті мәмілелер: {positive_trades}
❌ Зиянды мәмілелер: {negative_trades}

— — —

🟣 Анықтама (сүзгісіз)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңісті мәмілелер: {vip_positive_trades}
❌ Зиянды мәмілелер: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.', 'weekly_report_3'),
	('kz', '🤝 Апталық нәтиже:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Таза нәтиже: {net_result} USD
✅ Жеңістер: {positive_trades}
❌ Жогалтулар: {negative_trades}

— — —

🟣 Бенчмарк (сүзгісіз)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңістер: {vip_positive_trades}
❌ Жогалтулар: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.', 'weekly_report_3'),
	('kz', '📊 *Сауда сигналдарының жинағы*

Сіз {count} сигнал алдыңыз:

{{#each signals}}
{emoji} *Сигнал №{index}*
📈 Символ: {symbol}
📍 Оқиға: {eventType}
💰 Пайда: {profit}
📅 Уақыт: {time}
---
{{/each}}

Барлық сигналдар: {count}
Бот: {botName}', 'batch_signals');
