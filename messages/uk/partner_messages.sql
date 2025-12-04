INSERT INTO public.messages (lang, message, "type") VALUES
	('uk', 'Ласкаво просимо до партнерського бота! Тут ви можете активувати пробний доступ до наших каналів.', 'partner_welcome'),
	('uk', 'Будь ласка, приєднайтесь до нашого каналу "{channelName}" для продовження: {channelUrl}

Після приєднання натисніть кнопку нижче для перевірки.', 'partner_channel_prompt'),
	('uk', 'Не вдалося підтвердити ваше членство в каналі "{channelName}". Будь ласка, переконайтесь, що ви приєдналися до каналу і спробуйте ще раз.', 'partner_verification_failed'),
	('uk', 'Вітаємо! Ваш пробний період активовано. Ви отримали доступ на {daysRemaining} днів до {expiryDate}.', 'partner_trial_activated'),
	('uk', 'Ваш пробний період закінчився {expiryDate}. Для продовження доступу до каналу, будь ласка, придбайте підписку.', 'partner_trial_expired'),
	('uk', 'Ваш пробний період активний до {expiryDate}. Залишилось днів: {daysRemaining}.', 'partner_trial_status'),
	('uk', 'Ця функція скоро буде доступна. Слідкуйте за оновленнями!', 'partner_coming_soon'),
	('uk', 'Виберіть мову інтерфейсу:', 'lang_select_prompt'),
	('uk', 'Мову успішно змінено на українську.', 'lang_changed'),
	('uk', '🌐 Змінити мову', 'change_language_button');
