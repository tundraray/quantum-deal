INSERT INTO public.messages (lang, message, "type") VALUES
	('fr', 'Bienvenue dans le bot partenaire! Ici, vous pouvez activer un accès d''essai à nos chaînes.', 'partner_welcome'),
	('fr', 'Veuillez rejoindre notre chaîne "{channelName}" pour continuer: {channelUrl}

Après avoir rejoint, cliquez sur le bouton ci-dessous pour vérifier.', 'partner_channel_prompt'),
	('fr', 'Échec de la vérification de votre adhésion à la chaîne "{channelName}". Veuillez vous assurer que vous avez rejoint la chaîne et réessayer.', 'partner_verification_failed'),
	('fr', 'Félicitations! Votre période d''essai a été activée. Vous avez accès pendant {daysRemaining} jours jusqu''à {expiryDate}.', 'partner_trial_activated'),
	('fr', 'Votre période d''essai a expiré le {expiryDate}. Pour continuer à accéder à la chaîne, veuillez acheter un abonnement.', 'partner_trial_expired'),
	('fr', 'Votre période d''essai est active jusqu''au {expiryDate}. Jours restants: {daysRemaining}.', 'partner_trial_status'),
	('fr', 'Cette fonctionnalité sera bientôt disponible. Restez à l''écoute pour les mises à jour!', 'partner_coming_soon'),
	('fr', 'Sélectionnez la langue de l''interface:', 'lang_select_prompt'),
	('fr', 'Langue changée avec succès en français.', 'lang_changed'),
	('fr', '🌐 Changer de langue', 'change_language_button');
