INSERT INTO public.messages (lang, message, "type") VALUES
	('tl', 'Maligayang pagdating sa partner bot! Dito maaari mong i-activate ang trial access sa aming mga channel.', 'partner_welcome'),
	('tl', 'Mangyaring sumali sa aming channel na "{channelName}" upang magpatuloy: {channelUrl}

Pagkatapos sumali, i-click ang button sa ibaba para ma-verify.', 'partner_channel_prompt'),
	('tl', 'Nabigong i-verify ang iyong membership sa channel na "{channelName}". Pakisigurong sumali ka na sa channel at subukang muli.', 'partner_verification_failed'),
	('tl', 'Binabati kita! Ang iyong trial period ay na-activate na. Mayroon kang access sa loob ng {daysRemaining} araw hanggang {expiryDate}.', 'partner_trial_activated'),
	('tl', 'Ang iyong trial period ay nag-expire na noong {expiryDate}. Upang patuloy na ma-access ang channel, mangyaring bumili ng subscription.', 'partner_trial_expired'),
	('tl', 'Ang iyong trial period ay aktibo hanggang {expiryDate}. Mga araw na natitira: {daysRemaining}.', 'partner_trial_status'),
	('tl', 'Ang tampok na ito ay paparating na. Abangan ang mga update!', 'partner_coming_soon'),
	('tl', 'Piliin ang wika ng interface:', 'lang_select_prompt'),
	('tl', 'Ang wika ay matagumpay na napalitan sa Tagalog.', 'lang_changed'),
	('tl', '🌐 Palitan ang wika', 'change_language_button');
