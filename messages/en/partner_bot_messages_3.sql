-- Replace 1 with your specific bot_id
INSERT INTO public.bot_messages (bot_id, lang, message, "type") VALUES


	(3, 'en', '👋 <b>Welcome!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive signals with high win rates
✅ Access exclusive market analytics
✅ Join a community of winners

<b>Activate your FREE trial now to start earning!</b>👇
', 

'partner_welcome'),
	(3, 'en', '
Also, if you want to <b>change language</b>, tap this button 👇
', 

'partner_welcome_lang'),

	(3, 'en', '👋 <b>Welcome!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive signals with high win rates
✅ Access exclusive market analytics
✅ Join a community of winners

<b>Activate your FREE trial now to start earning!</b>👇', 'partner_channel_prompt'),

	(3, 'en', '✅ <b>Success! Trial Activated</b>

You now have <b>{daysRemaining} days</b> of full access until {expiryDate}.

🔥 <b>All set!</b> Premium signals will now flow directly into this chat. Get ready for your next profitable trade! 💸

Enjoy! 🎉', 'partner_trial_activated'),
	(3, 'en', '⌛️ <b>Trial Expired</b>

Your free access ended on {expiryDate}. You are now missing out on:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Exclusive Trading Strategies

<b>Don''t leave money on the table!</b> 📉

Renew subscription NOW to instantly restore full access! 👇', 'partner_trial_expired'),
	(3, 'en', '💎 <b>Premium Access Active</b>

You have <b>{daysRemaining} days</b> left to profit from our exclusive signals! 📈

Expires: {expiryDate}

Make them count! 🚀', 'partner_trial_status'),
	(3, 'en', '🌐 <b>Choose Language:</b>', 'lang_select_prompt'),
	(3, 'en', '✅ <b>English selected.</b>', 'lang_changed'),
	(3, 'en', '🌐 Language', 'button_change_language'),
	(3, 'en', 'Activate Free Trial 🚀', 'button_i_subscribed'),
	(3, 'en', '🔄 Try Again', 'button_try_again'),
	(3, 'en', '🎁 Extend Free Period', 'button_extend_trial'),
	(3, 'en', '💳 Buy Subscription', 'button_buy_subscription'),
	(3, 'en', '📊 Daily Report — Today 📅

💰 Your Profit: **{TotalProfit} USD**
✅ Trades: **{TotalOrders}**
🚀 Best Asset: #{BestSymbol} (+{BestTradeProfit} USD)

Thanks for moving forward with us. To new victories! 🌟', 'daily_report');
