INSERT INTO public.messages (lang, message, "type") VALUES
	('en', '👋 <b>Welcome to the Inner Circle!</b>

You are just one step away from unlocking our <b>Premium Trading Signals</b>. 🚀

Get ready to:
✅ Receive high-win-rate signals
✅ Access exclusive market insights
✅ Join a community of winners

<b>Activate your FREE trial now to start profiting!</b> 👇', 'partner_welcome'),
	('en', '🚀 <b>One Final Step to Profit!</b>

To activate your <b>Exclusive Free Trial</b>, you must join our partner channel first.

This is where the magic happens! 🌟
👉 {channelUrl}

<i>Join now to unlock the full potential of our trading signals.</i>

👇 <b>Click the button below once you''ve joined:</b>', 'partner_channel_prompt'),
	('en', '⚠️ <b>Verification Incomplete</b>

We couldn''t verify your membership yet. Don''t miss out on profitable opportunities! 💸

Please make sure you have joined <b>{channelName}</b>:
👉 {channelUrl}

<i>Once you join, try clicking the button again!</i>', 'partner_verification_failed'),
	('en', '✅ <b>Success! Trial Activated</b>

You now have <b>{daysRemaining} days</b> of full access until {expiryDate}.

🔥 <b>You''re all set!</b> Premium signals will now flow directly into this chat. Get ready for your next winning trade! 💸

Enjoy! 🎉', 'partner_trial_activated'),
	('en', '⌛ <b>Trial Period Expired</b>

Your free access ended on {expiryDate}. You are now missing out on:
❌ Premium Buy/Sell Signals
❌ Real-time Market Alerts
❌ Exclusive Trading Strategies

<b>Don''t leave money on the table!</b> 📉

Renew your subscription NOW to restore full access immediately! 👇', 'partner_trial_expired'),
	('en', '💎 <b>Premium Access Active</b>

You have <b>{daysRemaining} days</b> left to profit from our exclusive signals! 📈

Expires: {expiryDate}

Make them count! 🚀', 'partner_trial_status'),
	('en', '🚧 <b>Coming Soon</b>

We''re working on this! Stay tuned.', 'partner_coming_soon'),
	('en', '🌐 <b>Choose Language:</b>', 'lang_select_prompt'),
	('en', '✅ <b>English selected.</b>', 'lang_changed'),
	('en', '🌐 Language', 'button_change_language'),
	('en', '✅ I Joined! Activate Trial 🚀', 'button_i_subscribed'),
	('en', '🔄 Try Again', 'button_try_again'),
	('en', '🎁 Extend Free Period', 'button_extend_trial'),
	('en', '💳 Buy Subscription', 'button_buy_subscription');
