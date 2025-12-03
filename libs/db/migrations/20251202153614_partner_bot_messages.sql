-- Migration: Partner Bot Messages
-- Description: Adds 48 messages for partner bot flow (6 types × 8 languages)
-- Author: System
-- Date: 2025-12-02
-- Task Reference: 20251202-feature-partner-bot-flow-task-02.md

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- This migration seeds global messages for the partner bot flow.
-- These messages support the partner channel verification and trial activation workflow.
--
-- Message Types:
--   1. partner_welcome - Initial welcome message
--   2. partner_channel_prompt - Request to join channel with URL
--   3. partner_verification_failed - Failed to verify channel membership
--   4. partner_trial_activated - Trial successfully activated
--   5. partner_trial_expired - Trial period has expired
--   6. partner_coming_soon - Feature not yet available
--
-- Languages: ru, en, uk, hi, fr, kk, uz, tg (8 total)
-- Total: 48 messages (6 types × 8 languages)

-- ==========================================
-- MESSAGE TYPE 1: partner_welcome
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_welcome', 'ru', 'Добро пожаловать в партнерский бот! Здесь вы можете активировать пробный доступ к нашим каналам.'),
('partner_welcome', 'en', 'Welcome to the partner bot! Here you can activate trial access to our channels.'),
('partner_welcome', 'uk', 'Ласкаво просимо до партнерського бота! Тут ви можете активувати пробний доступ до наших каналів.'),
('partner_welcome', 'hi', 'पार्टनर बॉट में आपका स्वागत है! यहां आप हमारे चैनलों के लिए ट्रायल एक्सेस एक्टिवेट कर सकते हैं।'),
('partner_welcome', 'fr', 'Bienvenue dans le bot partenaire! Ici, vous pouvez activer un accès d''essai à nos chaînes.'),
('partner_welcome', 'kk', 'Серіктестік ботқа қош келдіңіз! Мұнда біздің арналарға сынақ кіруді іске қоса аласыз.'),
('partner_welcome', 'uz', 'Hamkor botga xush kelibsiz! Bu yerda siz kanallarimizga sinov kirishni faollashtira olasiz.'),
('partner_welcome', 'tg', 'Ба боти шарики хуш омадед! Дар ин ҷо шумо метавонед дастрасии санҷиширо ба каналҳои мо фаъол кунед.');

-- ==========================================
-- MESSAGE TYPE 2: partner_channel_prompt
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_channel_prompt', 'ru', 'Пожалуйста, присоединитесь к нашему каналу "{channelName}" для продолжения: {channelUrl}

После присоединения нажмите кнопку ниже для проверки.'),
('partner_channel_prompt', 'en', 'Please join our channel "{channelName}" to continue: {channelUrl}

After joining, click the button below to verify.'),
('partner_channel_prompt', 'uk', 'Будь ласка, приєднайтесь до нашого каналу "{channelName}" для продовження: {channelUrl}

Після приєднання натисніть кнопку нижче для перевірки.'),
('partner_channel_prompt', 'hi', 'कृपया जारी रखने के लिए हमारे चैनल "{channelName}" में शामिल हों: {channelUrl}

शामिल होने के बाद, सत्यापित करने के लिए नीचे दिए गए बटन पर क्लिक करें।'),
('partner_channel_prompt', 'fr', 'Veuillez rejoindre notre chaîne "{channelName}" pour continuer: {channelUrl}

Après avoir rejoint, cliquez sur le bouton ci-dessous pour vérifier.'),
('partner_channel_prompt', 'kk', 'Жалғастыру үшін біздің "{channelName}" арнасына қосылыңыз: {channelUrl}

Қосылғаннан кейін, тексеру үшін төмендегі батырманы басыңыз.'),
('partner_channel_prompt', 'uz', 'Davom ettirish uchun bizning "{channelName}" kanalimizga qo''shiling: {channelUrl}

Qo''shilganingizdan keyin, tasdiqlash uchun quyidagi tugmani bosing.'),
('partner_channel_prompt', 'tg', 'Лутфан барои давом додан ба канали мо "{channelName}" ҳамроҳ шавед: {channelUrl}

Пас аз ҳамроҳ шудан, барои тасдиқ кунед тугмаи поёнро пахш кунед.');

-- ==========================================
-- MESSAGE TYPE 3: partner_verification_failed
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_verification_failed', 'ru', 'Не удалось подтвердить ваше членство в канале "{channelName}". Пожалуйста, убедитесь, что вы присоединились к каналу и попробуйте снова.'),
('partner_verification_failed', 'en', 'Failed to verify your membership in channel "{channelName}". Please make sure you have joined the channel and try again.'),
('partner_verification_failed', 'uk', 'Не вдалося підтвердити ваше членство в каналі "{channelName}". Будь ласка, переконайтесь, що ви приєдналися до каналу і спробуйте ще раз.'),
('partner_verification_failed', 'hi', 'चैनल "{channelName}" में आपकी सदस्यता सत्यापित करने में विफल। कृपया सुनिश्चित करें कि आप चैनल में शामिल हो गए हैं और पुनः प्रयास करें।'),
('partner_verification_failed', 'fr', 'Échec de la vérification de votre adhésion à la chaîne "{channelName}". Veuillez vous assurer que vous avez rejoint la chaîne et réessayer.'),
('partner_verification_failed', 'kk', 'Сіздің "{channelName}" арнасындағы мүшелігіңізді растау мүмкін болмады. Арнаға қосылғаныңызға көз жеткізіңіз және қайта көріңіз.'),
('partner_verification_failed', 'uz', '"{channelName}" kanalidagi a''zoligingizni tasdiqlash amalga oshmadi. Kanalga qo''shilganingizga ishonch hosil qiling va qayta urinib ko''ring.'),
('partner_verification_failed', 'tg', 'Тасдиқи узвияти шумо дар канали "{channelName}" муваффақ нашуд. Лутфан мутмаин шавед, ки шумо ба канал ҳамроҳ шудаед ва дубора кӯшиш кунед.');

-- ==========================================
-- MESSAGE TYPE 4: partner_trial_activated
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_trial_activated', 'ru', 'Поздравляем! Ваш пробный период активирован. Вы получили доступ на {daysRemaining} дней до {expiryDate}.'),
('partner_trial_activated', 'en', 'Congratulations! Your trial period has been activated. You have access for {daysRemaining} days until {expiryDate}.'),
('partner_trial_activated', 'uk', 'Вітаємо! Ваш пробний період активовано. Ви отримали доступ на {daysRemaining} днів до {expiryDate}.'),
('partner_trial_activated', 'hi', 'बधाई हो! आपकी ट्रायल अवधि सक्रिय कर दी गई है। आपके पास {expiryDate} तक {daysRemaining} दिनों के लिए एक्सेस है।'),
('partner_trial_activated', 'fr', 'Félicitations! Votre période d''essai a été activée. Vous avez accès pendant {daysRemaining} jours jusqu''à {expiryDate}.'),
('partner_trial_activated', 'kk', 'Құттықтаймыз! Сіздің сынақ кезеңіңіз іске қосылды. Сізде {expiryDate} дейін {daysRemaining} күнге кіру құқығы бар.'),
('partner_trial_activated', 'uz', 'Tabriklaymiz! Sizning sinov davrini faollashtirildi. Sizda {expiryDate} gacha {daysRemaining} kun kirish huquqi bor.'),
('partner_trial_activated', 'tg', 'Табрик! Давраи санҷиши шумо фаъол карда шуд. Шумо то {expiryDate} барои {daysRemaining} рӯз дастрасӣ доред.');

-- ==========================================
-- MESSAGE TYPE 5: partner_trial_expired
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_trial_expired', 'ru', 'Ваш пробный период истёк {expiryDate}. Для продолжения доступа к каналу, пожалуйста, приобретите подписку.'),
('partner_trial_expired', 'en', 'Your trial period expired on {expiryDate}. To continue accessing the channel, please purchase a subscription.'),
('partner_trial_expired', 'uk', 'Ваш пробний період закінчився {expiryDate}. Для продовження доступу до каналу, будь ласка, придбайте підписку.'),
('partner_trial_expired', 'hi', 'आपकी ट्रायल अवधि {expiryDate} को समाप्त हो गई। चैनल तक पहुंच जारी रखने के लिए, कृपया सदस्यता खरीदें।'),
('partner_trial_expired', 'fr', 'Votre période d''essai a expiré le {expiryDate}. Pour continuer à accéder à la chaîne, veuillez acheter un abonnement.'),
('partner_trial_expired', 'kk', 'Сіздің сынақ кезеңіңіз {expiryDate} аяқталды. Арнаға кіруді жалғастыру үшін жазылымды сатып алыңыз.'),
('partner_trial_expired', 'uz', 'Sizning sinov davringiz {expiryDate} tugadi. Kanalga kirishni davom ettirish uchun obunani sotib oling.'),
('partner_trial_expired', 'tg', 'Давраи санҷиши шумо дар {expiryDate} ба анҷом расид. Барои давом додани дастрасӣ ба канал, лутфан обунаро харед.');

-- ==========================================
-- MESSAGE TYPE 6: partner_coming_soon
-- ==========================================

INSERT INTO messages (type, lang, message) VALUES
('partner_coming_soon', 'ru', 'Эта функция скоро будет доступна. Следите за обновлениями!'),
('partner_coming_soon', 'en', 'This feature is coming soon. Stay tuned for updates!'),
('partner_coming_soon', 'uk', 'Ця функція скоро буде доступна. Слідкуйте за оновленнями!'),
('partner_coming_soon', 'hi', 'यह सुविधा जल्द ही उपलब्ध होगी। अपडेट के लिए बने रहें!'),
('partner_coming_soon', 'fr', 'Cette fonctionnalité sera bientôt disponible. Restez à l''écoute pour les mises à jour!'),
('partner_coming_soon', 'kk', 'Бұл мүмкіндік жақын арада қолжетімді болады. Жаңартулар үшін күтіңіз!'),
('partner_coming_soon', 'uz', 'Ushbu xususiyat tez orada mavjud bo''ladi. Yangilanishlar uchun kuting!'),
('partner_coming_soon', 'tg', 'Ин хусусият ба наздикӣ дастрас мешавад. Барои навсозиҳо мунтазир шавед!');

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Verify that exactly 48 messages were inserted
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM messages
  WHERE type IN (
    'partner_welcome',
    'partner_channel_prompt',
    'partner_verification_failed',
    'partner_trial_activated',
    'partner_trial_expired',
    'partner_coming_soon'
  );

  IF v_count >= 48 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Partner bot messages seed completed';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total partner messages: %', v_count;
    RAISE NOTICE 'Message types: 6 (partner_welcome, partner_channel_prompt, partner_verification_failed, partner_trial_activated, partner_trial_expired, partner_coming_soon)';
    RAISE NOTICE 'Languages: 8 (ru, en, uk, hi, fr, kk, uz, tg)';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'Expected 48 partner messages, but found only %', v_count;
  END IF;
END $$;

-- ==========================================
-- DOWN MIGRATION
-- ==========================================

-- To rollback this seed, delete the partner bot messages:
-- DELETE FROM messages WHERE type IN (
--   'partner_welcome',
--   'partner_channel_prompt',
--   'partner_verification_failed',
--   'partner_trial_activated',
--   'partner_trial_expired',
--   'partner_coming_soon'
-- );
