INSERT INTO public.messages (lang, message, "type") VALUES
	('ru', 'Добро пожаловать в партнерский бот! Здесь вы можете активировать пробный доступ к нашим каналам.', 'partner_welcome'),
	('ru', 'Пожалуйста, присоединитесь к нашему каналу "{channelName}" для продолжения: {channelUrl}

После присоединения нажмите кнопку ниже для проверки.', 'partner_channel_prompt'),
	('ru', 'Не удалось подтвердить ваше членство в канале "{channelName}". Пожалуйста, убедитесь, что вы присоединились к каналу и попробуйте снова.', 'partner_verification_failed'),
	('ru', 'Поздравляем! Ваш пробный период активирован. Вы получили доступ на {daysRemaining} дней до {expiryDate}.', 'partner_trial_activated'),
	('ru', 'Ваш пробный период истёк {expiryDate}. Для продолжения доступа к каналу, пожалуйста, приобретите подписку.', 'partner_trial_expired'),
	('ru', 'Ваш пробный период активен до {expiryDate}. Осталось дней: {daysRemaining}.', 'partner_trial_status'),
	('ru', 'Эта функция скоро будет доступна. Следите за обновлениями!', 'partner_coming_soon'),
	('ru', 'Выберите язык интерфейса:', 'lang_select_prompt'),
	('ru', 'Язык успешно изменён на русский.', 'lang_changed'),
	('ru', '🌐 Сменить язык', 'change_language_button');
