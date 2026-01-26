INSERT INTO public.messages (lang, message, "type") VALUES
	('hi', 'पार्टनर बॉट में आपका स्वागत है! यहां आप हमारे चैनलों के लिए ट्रायल एक्सेस एक्टिवेट कर सकते हैं।', 'partner_welcome'),
	('hi', 'कृपया जारी रखने के लिए हमारे चैनल "{channelName}" में शामिल हों: {channelUrl}

शामिल होने के बाद, सत्यापित करने के लिए नीचे दिए गए बटन पर क्लिक करें।', 'partner_channel_prompt'),
	('hi', 'चैनल "{channelName}" में आपकी सदस्यता सत्यापित करने में विफल। कृपया सुनिश्चित करें कि आप चैनल में शामिल हो गए हैं और पुनः प्रयास करें।', 'partner_verification_failed'),
	('hi', 'बधाई हो! आपकी ट्रायल अवधि सक्रिय कर दी गई है। आपके पास {expiryDate} तक {daysRemaining} दिनों के लिए एक्सेस है।', 'partner_trial_activated'),
	('hi', 'आपकी ट्रायल अवधि {expiryDate} को समाप्त हो गई। चैनल तक पहुंच जारी रखने के लिए, कृपया सदस्यता खरीदें।', 'partner_trial_expired'),
	('hi', 'आपकी ट्रायल अवधि {expiryDate} तक सक्रिय है। शेष दिन: {daysRemaining}।', 'partner_trial_status'),
	('hi', 'यह सुविधा जल्द ही उपलब्ध होगी। अपडेट के लिए बने रहें!', 'partner_coming_soon'),
	('hi', 'इंटरफ़ेस भाषा चुनें:', 'lang_select_prompt'),
	('hi', 'भाषा सफलतापूर्वक हिंदी में बदल दी गई।', 'lang_changed'),
	('hi', '🌐 भाषा बदलें', 'change_language_button');
