INSERT INTO public.messages (lang, message, "type") VALUES
	('tl', '🚀 **BUKAS** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Pasok: `{open_price}`
🕒 Oras: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Tingnan natin kung ano ang mangyayari.', 'open'),
	('tl', '📈 **PASOK** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Presyo: `{open_price}`
🕒 Oras: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Sa tingin ko magiging interesante ang galaw.', 'open'),
	('tl', '✅ **KINUKUHA** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Pasok: `{open_price}`
🕒 Oras: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Babantayan natin ito.', 'open'),
	('tl', '💹 **TRADE** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Presyo: `{open_price}`
🕒 Oras: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Kalmadong pinapanood ang chart.', 'open'),
	('tl', '🔔 **POSISYON** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Pasok: `{open_price}`
🕒 Oras: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Tingnan natin kung saan pupunta ang merkado.', 'open'),
	('tl', '🎉 **PANALO** #{symbol} {order_type}
💰 Kita: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Gumana nang perpekto!', 'close_plus'),
	('tl', '🚀 **PROFIT** #{symbol} {order_type}
💰 Resulta: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Iyan ang resulta!', 'close_plus'),
	('tl', '✅ **TAGUMPAY** #{symbol} {order_type}
💰 Kita: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Masaya sa kinalabasan.', 'close_plus'),
	('tl', '💹 **SARADO** #{symbol} {order_type}
💰 Kita: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Nakakuha ng magandang galaw.', 'close_plus'),
	('tl', '🔥 **AYOS** #{symbol} {order_type}
💰 Kita: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Ipagpatuloy natin ito.', 'close_plus'),
	('tl', '😕 **TALO** #{symbol} {order_type}
📉 Resulta: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Nangyayari talaga yan.', 'close_minus'),
	('tl', '📉 **NEGATIBO** #{symbol} {order_type}
📉 Resulta: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Ang mahalaga ay kontrolado ang risk.', 'close_minus'),
	('tl', '🛑 **HUMINTO** #{symbol} {order_type}
📉 Resulta: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Hindi malaking bagay, tuloy lang.', 'close_minus'),
	('tl', '🙄 **ARAY** #{symbol} {order_type}
📉 Resulta: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Makakabawi tayo at aayusin ang diskarte.', 'close_minus'),
	('tl', '❗ **TALO** #{symbol} {order_type}
📉 Resulta: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Sa susunod babawiin natin yan.', 'close_minus'),
	('tl', '👋 Hi! Sumahin natin ang linggo:

📈 Kita: **{profit} USD**
📉 Pagkatalo: **{loss} USD**
✅ Netong resulta: **{net_result} USD**

Mahusay na trabaho, ipagpatuloy! 💪', 'weekly_report'),
	('tl', '🗓️ Tapos na ang linggo:

📈 Panalo: **{positive_trades}**
📉 Talo: **{negative_trades}**
💰 Resulta: **{net_result} USD**

Nananatiling matatag!', 'weekly_report'),
	('tl', '📅 Isinara ang linggo:

📈 Trades: **+{positive_trades}**
📉 Trades: **−{negative_trades}**
📊 Balanse: **{net_result} USD**

Sumusulong.', 'weekly_report'),
	('tl', '🤝 Buod ng linggo:

📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Resulta: **{net_result} USD**

Ang susi ay pagiging pare-pareho.', 'weekly_report'),
	('tl', '💬 Ngayong linggo:

📈 Panalo: **{positive_trades}**
📉 Talo: **{negative_trades}**
💰 Netong resulta: **{net_result} USD**

Sa mga bagong trade naman!', 'weekly_report'),
	('tl', '👋 Hi! Tapusin natin ang buwan:

📊 Kabuuang trades: **{TotalOrders}**
💰 Kita: **{TotalProfit} USD**
🏆 Pinakamahusay: #{BestSymbol_1} #{BestSymbol_2} #{BestSymbol_3}

Salamat sa pananatili sa amin — bagong buwan at bagong pagkakataon ang nasa unahan! 🚀', 'monthly_report'),
	('tl', '✨ Tapos na ang buwan, tingnan natin ang mga resulta:

🔹 Trades: **{TotalOrders}**
🔹 Kabuuang resulta: **{TotalProfit} USD**
🔹 Pinakamahusay na trade: **{BestTradeSymbol}** (+{BestTradeProfit} USD)

Patuloy tayong sumulong! 💪', 'monthly_report'),
	('tl', '📈 Handa na ang buwanang pagsusuri!

📊 Trades: **{TotalOrders}**
💰 Balanse: **{TotalProfit} USD**
🚀 Max profit: **{MaxProfitTrade} USD**

Bagong buwan — bagong mga layunin! 🔥', 'monthly_report'),
	('tl', '📅 Ngayong buwan nakamit natin:

✔️ Trades: **{TotalOrders}**
✔️ Kita/Talo: **{TotalProfit} USD**
✔️ Pinakamahusay na asset: #{BestSymbol_1} #{BestSymbol_2} #{BestSymbol_3}

Salamat sa pagsulong kasama namin. Sa mga bagong tagumpay! 🌟', 'monthly_report'),
	('tl', '📝 Sumahin natin ang buwan:

📊 Kabuuang operasyon: **{TotalOrders}**
💰 Kabuuang resulta: **{TotalProfit} USD**
🏆 Pinakamahusay na instrumento: #{BestSymbol} (+{BestTradeProfit} USD)

Sa susunod na buwan mas gagalingan pa natin! 🚀', 'monthly_report'),
	('tl', '📊 **INAYOS** #{symbol} {order_type}
📏 Vol: `{lots}`

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Binabantayan ang na-update na diskarte.', 'position_sltp_update'),
	('tl', '🔄 **UPDATED LEVELS** #{symbol} {order_type}

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Umaangkop sa merkado.', 'position_sltp_update'),
	('tl', '⚙️ **SETTINGS CHANGED** #{symbol} {order_type}

🎯 TP: `{old_take_profit}` ➔ **{take_profit}**
🛑 SL: `{old_stop_loss}` ➔ **{stop_loss}**

Gumagawa gamit ang bagong datos.', 'position_sltp_update'),
	('tl', '🛠 **MGA PAGBABAGO** #{symbol} {order_type}

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Tingnan natin ang epekto.', 'position_sltp_update'),
	('tl', '📈 **RECONFIGURED** #{symbol} {order_type}

🎯 TP: `{old_take_profit}` ➔ **{take_profit}**
🛑 SL: `{old_stop_loss}` ➔ **{stop_loss}**

Naghihintay ng reaksyon ng merkado.', 'position_sltp_update'),
	('tl', '👋 Hi! Sumahin natin ang linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
✅ Netong resulta: **{net_result} USD**
Mahusay na trabaho, ipagpatuloy! 💪

— — —

🟣 **VIP REFERENCE**
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Positibong trades: {vip_positive_trades}
❌ Negatibong trades: {vip_negative_trades}
Gusto ng ganitong level? Mag-VIP na.', 'weekly_report_2'),
	('tl', '🗓️ Tapos na ang linggo:
📈 Panalo: **{positive_trades}**
📉 Talo: **{negative_trades}**
💰 Resulta: **{net_result} USD**
Nananatiling matatag!

— — —

🟣 **VIP REFERENCE**
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Positibong trades: {vip_positive_trades}
❌ Negatibong trades: {vip_negative_trades}
Gusto ng ganitong level? Mag-VIP na.', 'weekly_report_2'),
	('tl', '📅 Isinara ang linggo:
📈 Trades: **+{positive_trades}**
📉 Trades: **−{negative_trades}**
📊 Balanse: **{net_result} USD**
Sumusulong.

— — —

🟣 **VIP REFERENCE**
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Positibong trades: {vip_positive_trades}
❌ Negatibong trades: {vip_negative_trades}
Gusto ng ganitong level? Mag-VIP na.', 'weekly_report_2'),
	('tl', '🤝 Buod ng linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Resulta: **{net_result} USD**
Ang susi ay pagiging pare-pareho.

— — —

🟣 **VIP REFERENCE**
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Positibong trades: {vip_positive_trades}
❌ Negatibong trades: {vip_negative_trades}
Gusto ng ganitong level? Mag-VIP na.', 'weekly_report_2'),
	('tl', '💬 Ngayong linggo:
📈 Panalo: **{positive_trades}**
📉 Talo: **{negative_trades}**
💰 Netong resulta: **{net_result} USD**
Sa mga bagong trade naman!

— — —

🟣 **VIP REFERENCE**
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Positibong trades: {vip_positive_trades}
❌ Negatibong trades: {vip_negative_trades}
Gusto ng ganitong level? Mag-VIP na.', 'weekly_report_2'),
	('tl', '💬 Ngayong linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Netong resulta: **{net_result} USD**
✅ Panalong trades: **{positive_trades}**
❌ Talong trades: **{negative_trades}**

— — —

🟣 **BASELINE** (walang filtering)
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Panalo: {vip_positive_trades}
❌ Talo: {vip_negative_trades}
Gusto ng parehong resulta? I-off ang filtering sa /filter.', 'weekly_report_3'),
	('tl', '🗓️ Buod ng linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Net: **{net_result} USD**
✅ Panalo: **{positive_trades}**
❌ Talo: **{negative_trades}**

— — —

🟣 **BASELINE** (walang filtering)
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Panalo: {vip_positive_trades}
❌ Talo: {vip_negative_trades}
Gusto ng parehong resulta? I-off ang filtering sa /filter.', 'weekly_report_3'),
	('tl', '📅 Isinara ang linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Net: **{net_result} USD**
✅ Panalong trades: **{positive_trades}**
❌ Talong trades: **{negative_trades}**

— — —

🟣 **REFERENCE** (walang filtering)
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Panalo: {vip_positive_trades}
❌ Talo: {vip_negative_trades}
Gusto ng pareho? I-off ang filtering sa /filter.', 'weekly_report_3'),
	('tl', '🤝 Resulta ng linggo:
📈 Kita: **{profit} USD**
📉 Talo: **{loss} USD**
💹 Netong resulta: **{net_result} USD**
✅ Panalo: **{positive_trades}**
❌ Talo: **{negative_trades}**

— — —

🟣 **BENCHMARK** (walang filtering)
📈 Kita: **{vip_profit} USD**
📉 Talo: **{vip_loss} USD**
💹 Resulta: **{vip_net_result} USD**
✅ Panalo: {vip_positive_trades}
❌ Talo: {vip_negative_trades}
Gusto ng pareho? I-off ang filtering sa /filter.', 'weekly_report_3');

