INSERT INTO public.messages (lang, message, "type") VALUES
	('kz', 'Серіктестік ботқа қош келдіңіз! Мұнда біздің арналарға сынақ кіруді іске қоса аласыз.', 'partner_welcome'),
	('kz', 'Жалғастыру үшін біздің "{channelName}" арнасына қосылыңыз: {channelUrl}

Қосылғаннан кейін, тексеру үшін төмендегі батырманы басыңыз.', 'partner_channel_prompt'),
	('kz', 'Сіздің "{channelName}" арнасындағы мүшелігіңізді растау мүмкін болмады. Арнаға қосылғаныңызға көз жеткізіңіз және қайта көріңіз.', 'partner_verification_failed'),
	('kz', 'Құттықтаймыз! Сіздің сынақ кезеңіңіз іске қосылды. Сізде {expiryDate} дейін {daysRemaining} күнге кіру құқығы бар.', 'partner_trial_activated'),
	('kz', 'Сіздің сынақ кезеңіңіз {expiryDate} аяқталды. Арнаға кіруді жалғастыру үшін жазылымды сатып алыңыз.', 'partner_trial_expired'),
	('kz', 'Сіздің сынақ кезеңіңіз {expiryDate} дейін белсенді. Қалған күндер: {daysRemaining}.', 'partner_trial_status'),
	('kz', 'Бұл мүмкіндік жақын арада қолжетімді болады. Жаңартулар үшін күтіңіз!', 'partner_coming_soon'),
	('kz', 'Интерфейс тілін таңдаңыз:', 'lang_select_prompt'),
	('kz', 'Тіл қазақ тіліне сәтті өзгертілді.', 'lang_changed'),
	('kz', '🌐 Тілді өзгерту', 'change_language_button');
