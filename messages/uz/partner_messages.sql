INSERT INTO public.messages (lang, message, "type") VALUES
	('uz', 'Hamkor botga xush kelibsiz! Bu yerda siz kanallarimizga sinov kirishni faollashtira olasiz.', 'partner_welcome'),
	('uz', 'Davom ettirish uchun bizning "{channelName}" kanalimizga qo''shiling: {channelUrl}

Qo''shilganingizdan keyin, tasdiqlash uchun quyidagi tugmani bosing.', 'partner_channel_prompt'),
	('uz', '"{channelName}" kanalidagi a''zoligingizni tasdiqlash amalga oshmadi. Kanalga qo''shilganingizga ishonch hosil qiling va qayta urinib ko''ring.', 'partner_verification_failed'),
	('uz', 'Tabriklaymiz! Sizning sinov davrini faollashtirildi. Sizda {expiryDate} gacha {daysRemaining} kun kirish huquqi bor.', 'partner_trial_activated'),
	('uz', 'Sizning sinov davringiz {expiryDate} tugadi. Kanalga kirishni davom ettirish uchun obunani sotib oling.', 'partner_trial_expired'),
	('uz', 'Sizning sinov davringiz {expiryDate} gacha faol. Qolgan kunlar: {daysRemaining}.', 'partner_trial_status'),
	('uz', 'Ushbu xususiyat tez orada mavjud bo''ladi. Yangilanishlar uchun kuting!', 'partner_coming_soon'),
	('uz', 'Interfeys tilini tanlang:', 'lang_select_prompt'),
	('uz', 'Til muvaffaqiyatli o''zbek tiliga o''zgartirildi.', 'lang_changed'),
	('uz', '🌐 Tilni o''zgartirish', 'change_language_button');
