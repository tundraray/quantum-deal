INSERT INTO public.messages (lang, message, "type") VALUES
	('hi', '🚀 {symbol} पर {order_type} खोला, {lots} lots, प्रवेश {open_price} ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
देखते हैं इसका क्या परिणाम होगा।', 'open'),
	('hi', '📈 {order_type} {symbol} में प्रवेश किया — {lots} lots {open_price} पर ({created_at})
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
मुझे लगता है चाल दिलचस्प होगी।', 'open'),
	('hi', '✅ {symbol} पर {order_type} लिया, वॉल्यूम {lots} lots, प्रवेश {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
इसे नजर में रखेंगे।', 'open'),
	('hi', '💹 ट्रेड शुरू किया: {order_type} {symbol}, {lots} lots, कीमत {open_price}, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
चार्ट को शांति से देख रहा हूँ।', 'open'),
	('hi', '🔔 {symbol} पर {order_type} पोज़िशन खुली, {lots} lots {open_price} पर, {created_at}
🎯 Take Profit: {take_profit} | 🛑 Stop Loss: {stop_loss}
देखते हैं बाज़ार कहाँ जाएगा।', 'open'),
	('hi', '🎉 {symbol} पर {order_type} ({lots} lots) बंद किया, लाभ **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
बहुत बढ़िया काम किया!', 'close_plus'),
	('hi', '🚀 {order_type} {symbol} ({lots} lots) सौदा लाभ में समाप्त — **{profit}$**
🕒 {created_at} → {close_time} | 💰 {open_price} → {close_price}
वाह, क्या परिणाम है!', 'close_plus'),
	('hi', '✅ {order_type} {symbol} ({lots} lots) पर प्रॉफिट — **{profit}$**
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
परिणाम से खुश हूँ।', 'close_plus'),
	('hi', '💹 {order_type} {symbol} ({lots} lots) लाभ में बंद: **{profit}$**
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
अच्छी मूव पकड़ी।', 'close_plus'),
	('hi', '🔥 {symbol} पर {order_type} ({lots} lots) ने **+{profit}$** लाभ दिया 
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
इसी तरह जारी रखें।', 'close_plus'),
	('hi', '😕 {symbol} पर {order_type} ({lots} lots) बंद किया, नुकसान {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
ऐसा भी होता है।', 'close_minus'),
	('hi', '📉 {order_type} {symbol} ({lots} lots) घाटे में गया: {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
मुख्य बात — जोखिम पर नियंत्रण।', 'close_minus'),
	('hi', '🛑 {symbol} पर {order_type} ({lots} lots) घाटे में बंद हुआ {profit}$
📊 {created_at} → {close_time} | 💵 {open_price} → {close_price}
कोई बात नहीं, आगे बढ़ते हैं।', 'close_minus'),
	('hi', '🙄 {order_type} {symbol} ({lots} lots) पर काम नहीं बना — {profit}$
📅 {created_at} → {close_time} | 💵 {open_price} → {close_price}
हम संभलेंगे और रणनीति सुधारेंगे।', 'close_minus'),
	('hi', '❗ {symbol} पर {order_type} ({lots} lots) ने नुकसान दिया {profit}$
🕒 {created_at} → {close_time} | 💵 {open_price} → {close_price}
अगली बार हम अपना लेंगे।', 'close_minus'),
	('hi', '👋 नमस्ते! आइए इस हफ्ते का सार देखें:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
✅ शुद्ध परिणाम: {net_result} USD
शानदार काम, ऐसे ही जारी रखें! 💪', 'weekly_report'),
	('hi', '🗓️ हफ्ता खत्म:
फ़ायदे में: {positive_trades} | नुकसान में: {negative_trades}
💰 परिणाम: {net_result} USD
अच्छे से टिके हैं!', 'weekly_report'),
	('hi', '📅 हफ्ता बंद किया:
+{positive_trades} सौदे | −{negative_trades} सौदे
📊 बैलेंस: {net_result} USD
आगे बढ़ते हैं।', 'weekly_report'),
	('hi', '🤝 हफ्ते का सारांश:
📈 फ़ायदा: {profit} USD
📉 नुकसान: {loss} USD
💹 परिणाम: {net_result} USD
सबसे ज़रूरी है स्थिरता।', 'weekly_report'),
	('hi', '💬 इस हफ्ते:
फ़ायदे वाले सौदे: {positive_trades}
नुकसान वाले सौदे: {negative_trades}
💰 शुद्ध परिणाम: {net_result} USD
नई डील्स की ओर बढ़ते हैं!', 'weekly_report'),
	('hi', '👋 नमस्ते! महीने का सारांश देखते हैं:
कुल ट्रेड: {TotalOrders}
लाभ: {TotalProfit} USD
सर्वश्रेष्ठ उपकरण: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
धन्यवाद, अगले महीने नए अवसरों के साथ मिलते हैं! 🚀', 'monthly_report'),
	('hi', '✨ महीना समाप्त हुआ, परिणाम देखें:
🔹 खुले हुए ट्रेड: {TotalOrders}
🔹 कुल परिणाम: {TotalProfit} USD
🔹 सबसे सफल ट्रेड: {BestTradeSymbol} ({BestTradeProfit} USD)
आगे बढ़ते रहें! 💪', 'monthly_report'),
	('hi', '📈 मासिक समीक्षा तैयार!
ट्रेडों की संख्या: {TotalOrders}
अंतिम बैलेंस: {TotalProfit} USD
एक ट्रेड से अधिकतम लाभ: {MaxProfitTrade} USD
नया महीना — नए लक्ष्य! 🔥', 'monthly_report'),
	('hi', '📅 इस महीने हमने हासिल किया:
✔️ ट्रेड: {TotalOrders}
✔️ लाभ/हानि: {TotalProfit} USD
✔️ सर्वश्रेष्ठ एसेट: {BestSymbol_1} {BestSymbol_2} {BestSymbol_3}
धन्यवाद, हम साथ में आगे बढ़ रहे हैं। नई जीतों की ओर! 🌟', 'monthly_report'),
	('hi', '📝 महीने का सारांश:
कुल ऑपरेशन्स: {TotalOrders}
कुल परिणाम: {TotalProfit} USD
सबसे लाभदायक उपकरण: {BestSymbol} ({BestTradeProfit} USD)
अगले महीने और भी बेहतर करेंगे! 🚀', 'monthly_report'),
	('hi', '📊 {symbol} ({order_type}, {lots} lots) को समायोजित किया
TP: {old_take_profit} → {take_profit} | SL: {old_stop_loss} → {stop_loss}
नई रणनीति पर नज़र रख रहे हैं।', 'position_sltp_update'),
	('hi', '🔄 {symbol} ({order_type}, {lots} lots) के स्तर अपडेट किए
Take Profit: {old_take_profit} → {take_profit}
Stop Loss: {old_stop_loss} → {stop_loss}
बाज़ार के अनुसार ढल रहे हैं।', 'position_sltp_update'),
	('hi', '⚙️ {symbol} ({order_type}, {lots} lots) की सेटिंग बदली गई
🎯 TP {old_take_profit} → {take_profit}
🛑 SL {old_stop_loss} → {stop_loss}
नए डाटा के साथ काम कर रहे हैं।', 'position_sltp_update'),
	('hi', '🛠 {symbol} ({order_type}, {lots} lots) सौदे में बदलाव किए
TP: {old_take_profit} → {take_profit}
SL: {old_stop_loss} → {stop_loss}
देखते हैं इसका असर।', 'position_sltp_update'),
	('hi', '📈 {symbol} ({order_type}, {lots} lots) ऑर्डर को रीसेट किया
🎯 Take Profit: {old_take_profit} → {take_profit}
🛑 Stop Loss: {old_stop_loss} → {stop_loss}
बाज़ार की प्रतिक्रिया का इंतज़ार।', 'position_sltp_update'),
	('hi', '👋 नमस्ते! आइए इस हफ्ते का सार देखें:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
✅ शुद्ध परिणाम: {net_result} USD
शानदार काम, ऐसे ही जारी रखें! 💪

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('hi', '🗓️ हफ्ता खत्म:
फ़ायदे में: {positive_trades} | नुकसान में: {negative_trades}
💰 परिणाम: {net_result} USD
अच्छे से टिके हैं!

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('hi', '📅 हफ्ता बंद किया:
+{positive_trades} सौदे | −{negative_trades} सौदे
📊 बैलेंस: {net_result} USD
आगे बढ़ते हैं।

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('hi', '🤝 हफ्ते का सारांश:
📈 फ़ायदा: {profit} USD
📉 नुकसान: {loss} USD
💹 परिणाम: {net_result} USD
सबसे ज़रूरी है स्थिरता।

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('hi', '💬 इस हफ्ते:
फ़ायदे वाले सौदे: {positive_trades}
नुकसान वाले सौदे: {negative_trades}
💰 शुद्ध परिणाम: {net_result} USD
नई डील्स की ओर बढ़ते हैं!

— — —

🟣 VIP reference for the same week
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('hi', '💬 इस हफ्ते:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 शुद्ध परिणाम: {net_result} USD
✅ फायदे वाली डील्स: {positive_trades}
❌ नुकसान वाली डील्स: {negative_trades}

— — —

🟣 बिना फ़िल्टरिंग का मानक (यही हफ्ता)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे वाली डील्स: {vip_positive_trades}
❌ नुकसान वाली डील्स: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.', 'weekly_report_3'),
	('hi', '🗓️ साप्ताहिक सारांश:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 नेट: {net_result} USD
✅ फायदे: {positive_trades}
❌ नुकसान: {negative_trades}

— — —

🟣 नो-फ़िल्टर बेंचमार्क
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे: {vip_positive_trades}
❌ नुकसान: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.', 'weekly_report_3'),
	('hi', '📅 हफ्ता बंद:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 नेट: {net_result} USD
✅ फायदे वाली डील्स: {positive_trades}
❌ नुकसान वाली डील्स: {negative_trades}

— — —

🟣 संदर्भ (बिना फ़िल्टरिंग)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे वाली डील्स: {vip_positive_trades}
❌ नुकसान वाली डील्स: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.', 'weekly_report_3'),
	('hi', '🤝 साप्ताहिक नतीजे:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 शुद्ध परिणाम: {net_result} USD
✅ फायदे: {positive_trades}
❌ नुकसान: {negative_trades}

— — —

🟣 बेंचमार्क (नो-फ़िल्टर)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे: {vip_positive_trades}
❌ नुकसान: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.', 'weekly_report_3'),
	('hi', '📊 *ट्रेडिंग सिग्नल बैच*

आपको {count} सिग्नल प्राप्त हुए:

{{#each signals}}
{emoji} *सिग्नल #{index}*
📈 प्रतीक: {symbol}
📍 घटना: {eventType}
💰 लाभ: {profit}
📅 समय: {time}
---
{{/each}}

कुल सिग्नल: {count}
बॉट: {botName}', 'batch_signals');
