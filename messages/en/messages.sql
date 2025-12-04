INSERT INTO public.messages (lang, message, "type") VALUES
	('en', '🚀 **OPEN** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Entry: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Let''s see how this plays out.', 'open'),
	('en', '📈 **ENTRY** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Price: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

I think the move will be interesting.', 'open'),
	('en', '✅ **TAKING** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Entry: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

We''ll keep an eye on it.', 'open'),
	('en', '💹 **TRADE** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Price: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Calmly watching the chart.', 'open'),
	('en', '🔔 **POSITION** #{symbol} {order_type}
📏 Vol: `{lots}`
💵 Entry: `{open_price}`
🕒 Time: `{created_at}`

🎯 TP: `{take_profit}`
🛑 SL: `{stop_loss}`

Let''s see where the market goes.', 'open'),
	('en', '🎉 **WIN** #{symbol} {order_type}
💰 Profit: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Worked perfectly!', 'close_plus'),
	('en', '🚀 **PROFIT** #{symbol} {order_type}
💰 Result: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Now that’s a result!', 'close_plus'),
	('en', '✅ **SUCCESS** #{symbol} {order_type}
💰 Profit: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Happy with the outcome.', 'close_plus'),
	('en', '💹 **CLOSED** #{symbol} {order_type}
💰 Profit: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Caught a good move.', 'close_plus'),
	('en', '🔥 **NICE** #{symbol} {order_type}
💰 Profit: **+{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Let’s keep it up.', 'close_plus'),
	('en', '😕 **LOSS** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

It happens.', 'close_minus'),
	('en', '📉 **NEGATIVE** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

The main thing is to control risk.', 'close_minus'),
	('en', '🛑 **STOPPED** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Not a big deal, moving on.', 'close_minus'),
	('en', '🙄 **OUCH** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

We’ll recover and adjust the strategy.', 'close_minus'),
	('en', '❗ **LOSS** #{symbol} {order_type}
📉 Result: **{profit}$**

📏 Vol: `{lots}`
💵 `{open_price}` ➔ `{close_price}`
🕒 `{created_at}` ➔ `{close_time}`

Next time we’ll get it back.', 'close_minus'),
	('en', '👋 Hi there! Let’s sum up the week:

📈 Profit: **{profit} USD**
📉 Losses: **{loss} USD**
✅ Net result: **{net_result} USD**

Great job, keep it up! 💪', 'weekly_report'),
	('en', '🗓️ Week is over:

📈 Profitable: **{positive_trades}**
📉 Losing: **{negative_trades}**
💰 Result: **{net_result} USD**

Holding strong!', 'weekly_report'),
	('en', '📅 Closed the week:

📈 Trades: **+{positive_trades}**
📉 Trades: **−{negative_trades}**
📊 Balance: **{net_result} USD**

Moving forward.', 'weekly_report'),
	('en', '🤝 Weekly summary:

📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Result: **{net_result} USD**

The key is consistency.', 'weekly_report'),
	('en', '💬 This week:

📈 Wins: **{positive_trades}**
📉 Losses: **{negative_trades}**
💰 Net result: **{net_result} USD**

On to new trades!', 'weekly_report'),
	('en', '👋 Hi! Let’s wrap up the month:

📊 Total trades: **{TotalOrders}**
💰 Profit: **{TotalProfit} USD**
🏆 Best: #{BestSymbol_1} #{BestSymbol_2} #{BestSymbol_3}

Thanks for staying with us — a new month and new opportunities lie ahead! 🚀', 'monthly_report'),
	('en', '✨ The month is over, let’s check the results:

🔹 Trades: **{TotalOrders}**
🔹 Total result: **{TotalProfit} USD**
🔹 Best trade: **{BestTradeSymbol}** (+{BestTradeProfit} USD)

Let’s keep moving forward! 💪', 'monthly_report'),
	('en', '📈 Monthly review is ready!

📊 Trades: **{TotalOrders}**
💰 Balance: **{TotalProfit} USD**
🚀 Max profit: **{MaxProfitTrade} USD**

New month — new goals! 🔥', 'monthly_report'),
	('en', '📅 This month we achieved:

✔️ Trades: **{TotalOrders}**
✔️ Profit/Loss: **{TotalProfit} USD**
✔️ Best asset: #{BestSymbol_1} #{BestSymbol_2} #{BestSymbol_3}

Thanks for moving forward with us. To new victories! 🌟', 'monthly_report'),
	('en', '📝 Let’s sum up the month:

📊 Total operations: **{TotalOrders}**
💰 Total result: **{TotalProfit} USD**
🏆 Best instrument: #{BestSymbol} (+{BestTradeProfit} USD)

Next month we’ll do even better! 🚀', 'monthly_report'),
	('en', '📊 **ADJUSTED** #{symbol} {order_type}
📏 Vol: `{lots}`

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Watching the updated strategy.', 'position_sltp_update'),
	('en', '🔄 **UPDATED LEVELS** #{symbol} {order_type}

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Adapting to the market.', 'position_sltp_update'),
	('en', '⚙️ **SETTINGS CHANGED** #{symbol} {order_type}

🎯 TP: `{old_take_profit}` ➔ **{take_profit}**
🛑 SL: `{old_stop_loss}` ➔ **{stop_loss}**

Working with new data.', 'position_sltp_update'),
	('en', '🛠 **CHANGES** #{symbol} {order_type}

TP: `{old_take_profit}` ➔ **{take_profit}**
SL: `{old_stop_loss}` ➔ **{stop_loss}**

Let''s see the impact.', 'position_sltp_update'),
	('en', '📈 **RECONFIGURED** #{symbol} {order_type}

🎯 TP: `{old_take_profit}` ➔ **{take_profit}**
🛑 SL: `{old_stop_loss}` ➔ **{stop_loss}**

Waiting for market reaction.', 'position_sltp_update'),
	('en', '👋 Hi there! Let’s sum up the week:
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
	('en', '🗓️ Week is over:
📈 Profitable: **{positive_trades}**
📉 Losing: **{negative_trades}**
💰 Result: **{net_result} USD**
Holding strong!

— — —

🟣 **VIP REFERENCE**
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('en', '📅 Closed the week:
📈 Trades: **+{positive_trades}**
📉 Trades: **−{negative_trades}**
📊 Balance: **{net_result} USD**
Moving forward.

— — —

🟣 **VIP REFERENCE**
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('en', '🤝 Weekly summary:
📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Result: **{net_result} USD**
The key is consistency.

— — —

🟣 **VIP REFERENCE**
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('en', '💬 This week:
📈 Wins: **{positive_trades}**
📉 Losses: **{negative_trades}**
💰 Net result: **{net_result} USD**
On to new trades!

— — —

🟣 **VIP REFERENCE**
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Positive trades: {vip_positive_trades}
❌ Negative trades: {vip_negative_trades}
Want this level? Go VIP.', 'weekly_report_2'),
	('en', '💬 This week:
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
Want the same results? Turn off filtering in /filter.', 'weekly_report_3'),
	('en', '🗓️ Weekly summary:
📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Net: **{net_result} USD**
✅ Wins: **{positive_trades}**
❌ Losses: **{negative_trades}**

— — —

🟣 **BASELINE** (no filtering)
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same results? Turn off filtering in /filter.', 'weekly_report_3'),
	('en', '📅 Week closed:
📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Net: **{net_result} USD**
✅ Winning trades: **{positive_trades}**
❌ Losing trades: **{negative_trades}**

— — —

🟣 **REFERENCE** (no filtering)
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same? Turn off filtering in /filter.', 'weekly_report_3'),
	('en', '🤝 Weekly results:
📈 Profit: **{profit} USD**
📉 Loss: **{loss} USD**
💹 Net result: **{net_result} USD**
✅ Wins: **{positive_trades}**
❌ Losses: **{negative_trades}**

— — —

🟣 **BENCHMARK** (no filtering)
📈 Profit: **{vip_profit} USD**
📉 Loss: **{vip_loss} USD**
💹 Result: **{vip_net_result} USD**
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same? Turn off filtering in /filter.', 'weekly_report_3');
