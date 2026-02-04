INSERT INTO public.messages (lang, message, "type") VALUES
	('uz', '🚀 {symbol} bo‘yicha {order_type} ochdim, {lots} lots, kirish {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Qanday natija chiqishini ko‘ramiz.', 'open'),
	('uz', '📈 {order_type} {symbol} ga kirdim — {lots} lots {open_price} da ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Harakat qiziqarli bo‘ladi deb o‘ylayman.', 'open'),
	('uz', '✅ {symbol} bo‘yicha {order_type} oldim, hajmi {lots} lots, kirish {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
E’tiborda saqlab boramiz.', 'open'),
	('uz', '💹 Bitimni boshladim: {order_type} {symbol}, {lots} lots, narx {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Grafikni tinchgina kuzatyapman.', 'open'),
	('uz', '🔔 {symbol} bo‘yicha {order_type} pozitsiya ochildi, {lots} lots {open_price} da, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
Bozor qayerga ketishini ko‘ramiz.', 'open'),
	('uz', '🎉 {symbol} bo‘yicha {order_type} yopildi ({lots} lots), foyda **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Zo‘r ishladi!', 'close_plus'),
	('uz', '🚀 {order_type} {symbol} ({lots} lots) bitimi foyda bilan yakunlandi — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
Mana bu natija!', 'close_plus'),
	('uz', '✅ {order_type} {symbol} ({lots} lots) foyda berdi — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Natijadan mamnunman.', 'close_plus'),
	('uz', '💹 {order_type} {symbol} ({lots} lots) yopildi, foyda: **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Yaxshi harakatni ushladik.', 'close_plus'),
	('uz', '🔥 {symbol} bo‘yicha {order_type} buyurtmasi **+{profit}$** foyda berdi 
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Xuddi shunday davom etamiz.', 'close_plus'),
	('uz', '📅 Haftani yopdim:
+{positive_trades} savdo | −{negative_trades} savdo
📊 Balans: {net_result} USD
Oldinga davom etamiz.', 'weekly_report'),
	('uz', '😕 {symbol} bo‘yicha {order_type} yopildi, {lots} lots, zarar {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Shunday ham bo‘ladi.', 'close_minus'),
	('uz', '📉 {order_type} {symbol} ({lots} lots) minusga ketdi: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Asosiysi — xavfni nazorat qilamiz.', 'close_minus'),
	('uz', '🛑 {symbol} bo‘yicha {order_type} yopildi, zarar {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Hech narsa emas, davom etamiz.', 'close_minus'),
	('uz', '🙄 {order_type} {symbol} ({lots} lots) bo‘yicha chiqmay qoldi — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Buni yengamiz va strategiyani to‘g‘irlaymiz.', 'close_minus'),
	('uz', '❗ {symbol} bo‘yicha {order_type} buyurtmasi zarar berdi {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
Keyingi safar o‘zimiznikini olamiz.', 'close_minus'),
	('uz', '🤝 Haftalik yakun:
📈 Foyda: {profit} USD
📉 Zararga: {loss} USD
💹 Natija: {net_result} USD
Asosiysi — barqarorlik.', 'weekly_report'),
	('uz', '👋 Salom! Haftalik natijalarni ko‘rib chiqamiz:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
✅ Sof natija: {net_result} USD
A’lo ish, shu ruhda davom eting! 💪', 'weekly_report'),
	('uz', '🗓️ Hafta yakunlandi:
Foyda: {positive_trades} | Zararda: {negative_trades}
💰 Natija: {net_result} USD
Yaxshi turibmiz!', 'weekly_report'),
	('uz', '💬 Bu haftada:
Foydali savdolar: {positive_trades}
Zarardagi savdolar: {negative_trades}
💰 Sof natija: {net_result} USD
Yangi savdolarga oldinga!', 'weekly_report'),
	('uz', '👋 Salom! Oy yakunini ko‘rib chiqamiz:
Jami bitimlar: {TotalOrders}
Foyda: {TotalProfit} USD
Eng yaxshi asboblar: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Biz bilan bo‘lganingiz uchun rahmat — oldinda yangi oy va yangi imkoniyatlar! 🚀', 'monthly_report'),
	('uz', '✨ Oy tugadi, natijalarni ko‘raylik:
🔹 Ochildi: {TotalOrders} bitimlar
🔹 Umumiy natija: {TotalProfit} USD
🔹 Eng muvaffaqiyatli bitim: {BestTradeSymbol} ({BestTradeProfit} USD)
Oldinga intilamiz! 💪', 'monthly_report'),
	('uz', '📈 Oylik hisobot tayyor!
Bitimlar soni: {TotalOrders}
Yakuniy balans: {TotalProfit} USD
Bitta bitimdan maksimal foyda: {MaxProfitTrade} USD
Yangi oy — yangi maqsadlar! 🔥', 'monthly_report'),
	('uz', '📅 Bu oyda natijalarimiz:
✔️ Bitimlar: {TotalOrders}
✔️ Foyda/zarar: {TotalProfit} USD
✔️ Eng yaxshi aktiv: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
Biz bilan birga yurganingiz uchun rahmat. Yangi g‘alabalarga! 🌟', 'monthly_report'),
	('uz', '📝 Oyni yakunlaymiz:
Jami operatsiyalar: {TotalOrders}
Umumiy natija: {TotalProfit} USD
Eng foydali asbob: {BestSymbol} ({BestTradeProfit} USD)
Kelasi oy bundan ham yaxshiroq qilamiz! 🚀', 'monthly_report'),
	('uz', '📊 {symbol} ({order_type}, {lots} lots) ni sozladim
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
Yangi strategiyani kuzatyapmiz.', 'position_sltp_update'),
	('uz', '🔄 {symbol} ({order_type}, {lots} lots) bo‘yicha darajalar yangilandi
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
Bozorga moslashmoqdamiz.', 'position_sltp_update'),
	('uz', '⚙️ {symbol} ({order_type}, {lots} lots) sozlamalari o‘zgartirildi
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
Yangi ma’lumotlar bilan ishlaymiz.', 'position_sltp_update'),
	('uz', '🛠 {symbol} ({order_type}, {lots} lots) savdosida o‘zgarishlar qilindi
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
Natijani ko‘ramiz.', 'position_sltp_update'),
	('uz', '📈 {symbol} ({order_type}, {lots} lots) buyurtmasi qayta sozlandi
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
Bozor reaksiyasini kutamiz.', 'position_sltp_update'),
	('uz', '🤝 Haftalik natijalar:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Sof natija: {net_result} USD
✅ Yutuqlar: {positive_trades}
❌ Yo‘qotishlar: {negative_trades}

— — —

🟣 Benchmark (filtrlashsiz)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqlar: {vip_positive_trades}
❌ Yo‘qotishlar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o‘chirib qo‘ying.', 'weekly_report_3'),
	('uz', '👋 Salom! Haftalik natijalarni ko‘rib chiqamiz:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
✅ Sof natija: {net_result} USD
A’lo ish, shu ruhda davom eting! 💪

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('uz', '🗓️ Hafta yakunlandi:
Foyda: {positive_trades} | Zararda: {negative_trades}
💰 Natija: {net_result} USD
Yaxshi turibmiz!

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('uz', '📅 Haftani yopdim:
+{positive_trades} savdo | −{negative_trades} savdo
📊 Balans: {net_result} USD
Oldinga davom etamiz.

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('uz', '🤝 Haftalik yakun:
📈 Foyda: {profit} USD
📉 Zararga: {loss} USD
💹 Natija: {net_result} USD
Asosiysi — barqarorlik.

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('uz', '💬 Bu haftada:
Foydali savdolar: {positive_trades}
Zarardagi savdolar: {negative_trades}
💰 Sof natija: {net_result} USD
Yangi savdolarga oldinga!

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('uz', '💬 Bu haftada:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Sof natija: {net_result} USD
✅ Yutuqli savdolar: {positive_trades}
❌ Zararli savdolar: {negative_trades}

— — —

🟣 Filtrlashsiz etalon (shu hafta)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqli savdolar: {vip_positive_trades}
❌ Zararli savdolar: {vip_negative_trades}
Xuddi shunday bo‘lishini xohlaysizmi? /filter da filtrlashni o‘chirib qo‘ying.', 'weekly_report_3'),
	('uz', '🗓️ Haftalik yakun:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Netta: {net_result} USD
✅ Yutuqlar: {positive_trades}
❌ Yo‘qotishlar: {negative_trades}

— — —

🟣 No-filter benchmark
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqlar: {vip_positive_trades}
❌ Yo‘qotishlar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o‘chirib qo‘ying.', 'weekly_report_3'),
	('uz', '📅 Hafta yopildi:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Netta: {net_result} USD
✅ Yutuqli savdolar: {positive_trades}
❌ Zararli savdolar: {negative_trades}

— — —

🟣 Ma’lumot uchun (filtrlashsiz)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqli savdolar: {vip_positive_trades}
❌ Zararli savdolar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o''chirib qo''ying.', 'weekly_report_3'),
	('uz', '📊 *Savdo signallari to''plami*

Siz {count} ta signal oldingiz:

{{#each signals}}
{emoji} *Signal #{index}*
📈 Belgi: {symbol}
📍 Hodisa: {eventType}
💰 Foyda: {profit}
📅 Vaqt: {time}
---
{{/each}}

Jami signallar: {count}
Bot: {botName}', 'batch_signals');
