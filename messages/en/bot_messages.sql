-- Replace 1 with your specific bot_id
INSERT INTO public.bot_messages (bot_id, lang, message, "type") VALUES
	(2, 'en', '🚀 **OPEN** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Entry: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Let''s see how this plays out.', 'open'),
	(2, 'en', '🎉 **WIN** #{symbol} {order_type}
💰 Profit: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Worked perfectly!', 'close_plus'),
	(2, 'en', '😕 **LOSS** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

It happens.', 'close_minus'),
	(2, 'en', '👋 Hi there! Let’s sum up the week:

📈 Profit: **{profit} USD**
📉 Losses: **{loss} USD**
✅ Net result: **{net_result} USD**

Great job, keep it up! 💪', 'weekly_report'),
	(2, 'en', '👋 Hi! Let’s wrap up the month:

📊 Total trades: **{TotalOrders}**
💰 Profit: **{TotalProfit} USD**
🏆 Best: #{BestSymbol_1} #{BestSymbol_2} #{BestSymbol_3}

Thanks for staying with us — a new month and new opportunities lie ahead! 🚀', 'monthly_report'),
	(2, 'en', '📊 **ADJUSTED** #{symbol} {order_type}
📏 Vol: `{lots}`

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Watching the updated strategy.', 'position_sltp_update'),
	(2, 'en', '👋 Hi there! Let’s sum up the week:
📈 Profit: **{profit} USD**
📉 Losses: **{loss} USD**
✅ Net result: **{net_result} USD**
Great job, keep it up! 💪

— — —

🟣 **VIP REFERENCE**
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	(2, 'en', '💬 This week:
📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Net result: **{net_result} USD**
✅ Winning trades: **{positive_trades}**
❌ Losing trades: **{negative_trades}**

— — —

🟣 **BASELINE** (no filtering)
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same results? Turn off filtering in /filter.', 'weekly_report_3');

