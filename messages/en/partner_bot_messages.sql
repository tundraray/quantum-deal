-- Replace 1 with your specific bot_id
INSERT INTO public.bot_messages (bot_id, lang, message, "type") VALUES
	(2, 'en', '👋 <b>Welcome to the Inner Circle!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive high-win-rate signals
✅ Access exclusive market insights
✅ Join a community of winners

<b>Activate your FREE trial now to start profiting!</b> 👇', 'partner_welcome_old'),

	(2, 'en', '👋 <b>Welcome to the Inner Circle!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive high-win-rate signals
✅ Access exclusive market insights
✅ Join a community of winners

<b>Activate your FREE trial now to start profiting!</b> 👇

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

👇 <b>Click the button below once you've joined:</b>
/join

Also, if you want to <b>change the language</b>, click this button 👇
/lang
', 

'partner_welcome'),

	(2, 'en', '🚀 <b>One Final Step to Profit!</b>

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

<i>Join now to unlock the full potential of our trading signals.</i>

👇 <b>Click the button below once you''ve joined:</b>', 'partner_channel_prompt'),
	(2, 'en', '⚠️ <b>Verification Incomplete</b>

We couldn''t verify your membership yet. Don''t miss out on profitable opportunities! 💸

Please make sure you have joined <b>{channelName}</b>:
👉 {channelUrl}

<i>Once you join, try clicking the button again!</i>', 'partner_verification_failed'),
	(2, 'en', '✅ <b>Success! Trial Activated</b>

You now have <b>{daysRemaining} days</b> of full access until {expiryDate}.

🔥 <b>You''re all set!</b> Premium signals will now flow directly into this chat. Get ready for your next winning trade! 💸

Enjoy! 🎉', 'partner_trial_activated'),
	(2, 'en', '⌛ <b>Trial Period Expired</b>

Your free access ended on {expiryDate}. You are now missing out on:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Exclusive Trading Strategies

<b>Don''t leave money on the table!</b> 📉

Renew your subscription NOW to restore full access immediately! 👇', 'partner_trial_expired'),
	(2, 'en', '💎 <b>Premium Access Active</b>

You have <b>{daysRemaining} days</b> left to profit from our exclusive signals! 📈

Expires: {expiryDate}

Make them count! 🚀', 'partner_trial_status'),
	(2, 'en', '🚧 <b>Coming Soon</b>

We''re working on this! Stay tuned.', 'partner_coming_soon'),
	(2, 'en', '🌐 <b>Choose Language:</b>', 'lang_select_prompt'),
	(2, 'en', '✅ <b>English selected.</b>', 'lang_changed'),
	(2, 'en', '🌐 Language', 'button_change_language'),
	(2, 'en', '✅ I Joined! Activate Trial 🚀', 'button_i_subscribed'),
	(2, 'en', '🔄 Try Again', 'button_try_again'),
	(2, 'en', '🎁 Extend Free Period', 'button_extend_trial'),
	(2, 'en', '💳 Buy Subscription', 'button_buy_subscription');
