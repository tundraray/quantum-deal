-- ============================================================================
-- Add weekly_report_3 message templates with filter statistics
-- ============================================================================
-- This migration adds new weekly report templates that include filter statistics
-- for VIP users with CUSTOM_USER_FILTERING feature enabled (subscription_id = 3)
--
-- New placeholders:
-- - {filtered_orders_count} - Number of missed signals due to filters
-- - {filtered_percentage} - Percentage of signals missed
-- - {top_missed_1}, {top_missed_count_1} - Top missed instrument #1 and count
-- - {top_missed_2}, {top_missed_count_2} - Top missed instrument #2 and count
-- - {top_missed_3}, {top_missed_count_3} - Top missed instrument #3 and count
--
-- The filter statistics section is placed after user performance and before VIP reference
-- ============================================================================

-- Russian (ru) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('ru', 'weekly_report_3', '👋 Привет! Подведём итоги за неделю:
📈 Прибыль: {profit} USD
📉 Убытки: {loss} USD
✅ Чистый результат: {net_result} USD

🔍 Пропущенные сигналы
Из-за фильтров пропущено: {filtered_orders_count} сигналов ({filtered_percentage}%)
Топ пропущенных инструментов:
1️⃣ {top_missed_1}: {top_missed_count_1} раз
2️⃣ {top_missed_2}: {top_missed_count_2} раз
3️⃣ {top_missed_3}: {top_missed_count_3} раз

💡 Совет: Расширьте фильтры через команду /filter, чтобы получать больше сигналов

Отличная работа, так держать! 💪'),

('ru', 'weekly_report_3', '🗓️ Неделя позади:
В плюс: {positive_trades} | В минус: {negative_trades}
💰 Итог: {net_result} USD

🎯 Анализ фильтров
Пропущено сигналов: {filtered_orders_count} ({filtered_percentage}%)
Чаще всего пропускались:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Настройте фильтры в /filter для увеличения количества сделок

Хорошо держимся!'),

('ru', 'weekly_report_3', '📅 Закрыл неделю:
+{positive_trades} сделок | −{negative_trades} сделок
📊 Баланс: {net_result} USD

📉 Статистика фильтрации
Отфильтровано: {filtered_orders_count} сигналов ({filtered_percentage}%)
Лидеры по пропуску:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ Измените настройки фильтров через /filter

Двигаемся дальше.'),

('ru', 'weekly_report_3', '🤝 Подвел итоги недели:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Результат: {net_result} USD

🚫 Пропущенные возможности
Всего пропущено: {filtered_orders_count} ({filtered_percentage}%)
Инструменты:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 Откройте больше инструментов в /filter

Главное — стабильность.'),

('ru', 'weekly_report_3', '💬 На этой неделе:
Плюсовых сделок: {positive_trades}
Минусовых: {negative_trades}
💰 Чистый итог: {net_result} USD

🔒 Фильтрация сигналов
Не показано: {filtered_orders_count} сигналов ({filtered_percentage}%)
Топ-3 инструментов:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Управление фильтрами: /filter

Вперед к новым сделкам!');

-- English (en) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('en', 'weekly_report_3', '👋 Hi there! Let''s sum up the week:
📈 Profit: {profit} USD
📉 Losses: {loss} USD
✅ Net result: {net_result} USD

🔍 Missed Signals
Filtered out: {filtered_orders_count} signals ({filtered_percentage}%)
Top missed instruments:
1️⃣ {top_missed_1}: {top_missed_count_1} times
2️⃣ {top_missed_2}: {top_missed_count_2} times
3️⃣ {top_missed_3}: {top_missed_count_3} times

💡 Tip: Expand your filters via /filter command to receive more signals

Great job, keep it up! 💪'),

('en', 'weekly_report_3', '🗓️ Week is over:
Profitable: {positive_trades} | Losing: {negative_trades}
💰 Result: {net_result} USD

🎯 Filter Analysis
Missed signals: {filtered_orders_count} ({filtered_percentage}%)
Most frequently missed:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Adjust filters in /filter to increase trade volume

Holding strong!'),

('en', 'weekly_report_3', '📅 Closed the week:
+{positive_trades} trades | −{negative_trades} trades
📊 Balance: {net_result} USD

📉 Filtering Stats
Filtered: {filtered_orders_count} signals ({filtered_percentage}%)
Top missed:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ Modify filter settings via /filter

Moving forward.'),

('en', 'weekly_report_3', '🤝 Weekly summary:
📈 Profit: {profit} USD
📉 Loss: {loss} USD
💹 Result: {net_result} USD

🚫 Missed Opportunities
Total missed: {filtered_orders_count} ({filtered_percentage}%)
Instruments:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 Enable more instruments in /filter

The key is consistency.'),

('en', 'weekly_report_3', '💬 This week:
Winning trades: {positive_trades}
Losing trades: {negative_trades}
💰 Net result: {net_result} USD

🔒 Signal Filtering
Not shown: {filtered_orders_count} signals ({filtered_percentage}%)
Top 3 instruments:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Manage filters: /filter

On to new trades!');

-- Ukrainian (uk) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('uk', 'weekly_report_3', '👋 Привіт! Підсумуємо тиждень:
📈 Прибуток: {profit} USD
📉 Збитки: {loss} USD
✅ Чистий результат: {net_result} USD

🔍 Пропущені сигнали
Відфільтровано: {filtered_orders_count} сигналів ({filtered_percentage}%)
Топ пропущених інструментів:
1️⃣ {top_missed_1}: {top_missed_count_1} разів
2️⃣ {top_missed_2}: {top_missed_count_2} разів
3️⃣ {top_missed_3}: {top_missed_count_3} разів

💡 Порада: Розширте фільтри через команду /filter для отримання більше сигналів

Чудова робота, так тримати! 💪'),

('uk', 'weekly_report_3', '🗓️ Тиждень позаду:
У плюс: {positive_trades} | У мінус: {negative_trades}
💰 Підсумок: {net_result} USD

🎯 Аналіз фільтрів
Пропущено сигналів: {filtered_orders_count} ({filtered_percentage}%)
Найчастіше пропускались:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Налаштуйте фільтри в /filter для збільшення кількості угод

Тримаємось добре!'),

('uk', 'weekly_report_3', '📅 Закрив тиждень:
+{positive_trades} угод | −{negative_trades} угод
📊 Баланс: {net_result} USD

📉 Статистика фільтрації
Відфільтровано: {filtered_orders_count} сигналів ({filtered_percentage}%)
Лідери по пропуску:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ Змініть налаштування фільтрів через /filter

Рухаємось далі.'),

('uk', 'weekly_report_3', '🤝 Підбив підсумки тижня:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Результат: {net_result} USD

🚫 Пропущені можливості
Всього пропущено: {filtered_orders_count} ({filtered_percentage}%)
Інструменти:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 Відкрийте більше інструментів в /filter

Головне — стабільність.'),

('uk', 'weekly_report_3', '💬 На цьому тижні:
Плюсових угод: {positive_trades}
Мінусових: {negative_trades}
💰 Чистий підсумок: {net_result} USD

🔒 Фільтрація сигналів
Не показано: {filtered_orders_count} сигналів ({filtered_percentage}%)
Топ-3 інструментів:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Керування фільтрами: /filter

Вперед до нових угод!');

-- Hindi (hi) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('hi', 'weekly_report_3', '👋 नमस्ते! आइए इस हफ्ते का सार देखें:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
✅ शुद्ध परिणाम: {net_result} USD

🔍 छूटे हुए संकेत
फ़िल्टर किए गए: {filtered_orders_count} संकेत ({filtered_percentage}%)
सबसे ज़्यादा छूटे उपकरण:
1️⃣ {top_missed_1}: {top_missed_count_1} बार
2️⃣ {top_missed_2}: {top_missed_count_2} बार
3️⃣ {top_missed_3}: {top_missed_count_3} बार

💡 सुझाव: अधिक संकेत प्राप्त करने के लिए /filter कमांड से फ़िल्टर बढ़ाएं

शानदार काम, ऐसे ही जारी रखें! 💪'),

('hi', 'weekly_report_3', '🗓️ हफ्ता खत्म:
फ़ायदे में: {positive_trades} | नुकसान में: {negative_trades}
💰 परिणाम: {net_result} USD

🎯 फ़िल्टर विश्लेषण
छूटे संकेत: {filtered_orders_count} ({filtered_percentage}%)
सबसे अधिक छूटे:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ व्यापार बढ़ाने के लिए /filter में समायोजित करें

अच्छे से टिके हैं!'),

('hi', 'weekly_report_3', '📅 हफ्ता बंद किया:
+{positive_trades} सौदे | −{negative_trades} सौदे
📊 बैलेंस: {net_result} USD

📉 फ़िल्टरिंग आँकड़े
फ़िल्टर किए गए: {filtered_orders_count} संकेत ({filtered_percentage}%)
शीर्ष छूटे:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ /filter से फ़िल्टर सेटिंग बदलें

आगे बढ़ते हैं।'),

('hi', 'weekly_report_3', '🤝 हफ्ते का सारांश:
📈 फ़ायदा: {profit} USD
📉 नुकसान: {loss} USD
💹 परिणाम: {net_result} USD

🚫 छूटे अवसर
कुल छूटे: {filtered_orders_count} ({filtered_percentage}%)
उपकरण:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 /filter में अधिक उपकरण सक्षम करें

सबसे ज़रूरी है स्थिरता।'),

('hi', 'weekly_report_3', '💬 इस हफ्ते:
फ़ायदे वाले सौदे: {positive_trades}
नुकसान वाले सौदे: {negative_trades}
💰 शुद्ध परिणाम: {net_result} USD

🔒 संकेत फ़िल्टरिंग
नहीं दिखाए गए: {filtered_orders_count} संकेत ({filtered_percentage}%)
शीर्ष 3 उपकरण:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 फ़िल्टर प्रबंधित करें: /filter

नई डील्स की ओर बढ़ते हैं!');

-- French (fr) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('fr', 'weekly_report_3', '👋 Salut ! Faisons le bilan de la semaine :
📈 Profit : {profit} USD
📉 Pertes : {loss} USD
✅ Résultat net : {net_result} USD

🔍 Signaux manqués
Filtrés : {filtered_orders_count} signaux ({filtered_percentage}%)
Instruments les plus manqués :
1️⃣ {top_missed_1} : {top_missed_count_1} fois
2️⃣ {top_missed_2} : {top_missed_count_2} fois
3️⃣ {top_missed_3} : {top_missed_count_3} fois

💡 Conseil : Élargissez vos filtres via /filter pour recevoir plus de signaux

Excellent travail, continue comme ça ! 💪'),

('fr', 'weekly_report_3', '🗓️ Semaine terminée :
En gain : {positive_trades} | En perte : {negative_trades}
💰 Résultat : {net_result} USD

🎯 Analyse des filtres
Signaux manqués : {filtered_orders_count} ({filtered_percentage}%)
Plus fréquemment manqués :
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Ajustez les filtres dans /filter pour augmenter le volume

On tient bon !'),

('fr', 'weekly_report_3', '📅 Semaine clôturée :
+{positive_trades} trades | −{negative_trades} trades
📊 Solde : {net_result} USD

📉 Statistiques de filtrage
Filtrés : {filtered_orders_count} signaux ({filtered_percentage}%)
Plus manqués :
▫️ {top_missed_1} : {top_missed_count_1}
▫️ {top_missed_2} : {top_missed_count_2}
▫️ {top_missed_3} : {top_missed_count_3}

⚙️ Modifiez les paramètres via /filter

On avance.'),

('fr', 'weekly_report_3', '🤝 Bilan de la semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat : {net_result} USD

🚫 Opportunités manquées
Total manqué : {filtered_orders_count} ({filtered_percentage}%)
Instruments :
→ {top_missed_1} : {top_missed_count_1}
→ {top_missed_2} : {top_missed_count_2}
→ {top_missed_3} : {top_missed_count_3}

🔧 Activez plus d''instruments dans /filter

L''essentiel, c''est la stabilité.'),

('fr', 'weekly_report_3', '💬 Cette semaine :
Transactions gagnantes : {positive_trades}
Transactions perdantes : {negative_trades}
💰 Résultat net : {net_result} USD

🔒 Filtrage des signaux
Non affichés : {filtered_orders_count} signaux ({filtered_percentage}%)
Top 3 instruments :
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Gérer les filtres : /filter

En avant vers de nouveaux trades !');

-- Kazakh (kz) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('kz', 'weekly_report_3', '👋 Сәлем! Апталық қорытындыны жасайық:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
✅ Таза нәтиже: {net_result} USD

🔍 Өткізіп алынған сигналдар
Сүзгіден өтті: {filtered_orders_count} сигнал ({filtered_percentage}%)
Ең көп өткізіп алынған құралдар:
1️⃣ {top_missed_1}: {top_missed_count_1} рет
2️⃣ {top_missed_2}: {top_missed_count_2} рет
3️⃣ {top_missed_3}: {top_missed_count_3} рет

💡 Кеңес: Көбірек сигнал алу үшін /filter арқылы сүзгілерді кеңейтіңіз

Тамаша жұмыс, осылай жалғастыр! 💪'),

('kz', 'weekly_report_3', '🗓️ Апта аяқталды:
Плюсте: {positive_trades} | Минусе: {negative_trades}
💰 Нәтиже: {net_result} USD

🎯 Сүзгілер талдауы
Өткізіп алынған сигналдар: {filtered_orders_count} ({filtered_percentage}%)
Ең жиі өткізіп алынғандар:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Мәміле санын арттыру үшін /filter-де реттеңіз

Жақсы ұстап тұрмыз!'),

('kz', 'weekly_report_3', '📅 Аптаны жаптым:
+{positive_trades} мәміле | −{negative_trades} мәміле
📊 Баланс: {net_result} USD

📉 Сүзгілеу статистикасы
Сүзгіден өтті: {filtered_orders_count} сигнал ({filtered_percentage}%)
Ең көп өткізіп алынғандар:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ /filter арқылы сүзгі параметрлерін өзгертіңіз

Әрі қарай жүреміз.'),

('kz', 'weekly_report_3', '🤝 Апталық қорытынды:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Нәтиже: {net_result} USD

🚫 Өткізіп алынған мүмкіндіктер
Барлығы өткізіп алынды: {filtered_orders_count} ({filtered_percentage}%)
Құралдар:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 /filter-де көбірек құралдарды іске қосыңыз

Ең бастысы — тұрақтылық.'),

('kz', 'weekly_report_3', '💬 Осы аптада:
Плюстік мәмілелер: {positive_trades}
Минустік мәмілелер: {negative_trades}
💰 Таза нәтиже: {net_result} USD

🔒 Сигналдарды сүзгілеу
Көрсетілмеді: {filtered_orders_count} сигнал ({filtered_percentage}%)
Топ-3 құралдар:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Сүзгілерді басқару: /filter

Жаңа мәмілелерге алға!');

-- Uzbek (uz) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('uz', 'weekly_report_3', '👋 Salom! Haftalik natijalarni ko''rib chiqamiz:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
✅ Sof natija: {net_result} USD

🔍 O''tkazib yuborilgan signallar
Filtrlandi: {filtered_orders_count} signal ({filtered_percentage}%)
Eng ko''p o''tkazib yuborilgan vositalar:
1️⃣ {top_missed_1}: {top_missed_count_1} marta
2️⃣ {top_missed_2}: {top_missed_count_2} marta
3️⃣ {top_missed_3}: {top_missed_count_3} marta

💡 Maslahat: Ko''proq signal olish uchun /filter orqali filtrlarni kengaytiring

A''lo ish, shu ruhda davom eting! 💪'),

('uz', 'weekly_report_3', '🗓️ Hafta yakunlandi:
Foyda: {positive_trades} | Zararda: {negative_trades}
💰 Natija: {net_result} USD

🎯 Filtrlar tahlili
O''tkazib yuborilgan signallar: {filtered_orders_count} ({filtered_percentage}%)
Eng ko''p o''tkazib yuborilganlar:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Savdo hajmini oshirish uchun /filter da sozlang

Yaxshi turibmiz!'),

('uz', 'weekly_report_3', '📅 Haftani yopdim:
+{positive_trades} savdo | −{negative_trades} savdo
📊 Balans: {net_result} USD

📉 Filtrlash statistikasi
Filtrlandi: {filtered_orders_count} signal ({filtered_percentage}%)
Eng ko''p o''tkazib yuborilganlar:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ /filter orqali sozlamalarni o''zgartiring

Oldinga davom etamiz.'),

('uz', 'weekly_report_3', '🤝 Haftalik yakun:
📈 Foyda: {profit} USD
📉 Zararga: {loss} USD
💹 Natija: {net_result} USD

🚫 O''tkazib yuborilgan imkoniyatlar
Jami o''tkazib yuborildi: {filtered_orders_count} ({filtered_percentage}%)
Vositalar:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 /filter da ko''proq vositalarni yoqing

Asosiysi — barqarorlik.'),

('uz', 'weekly_report_3', '💬 Bu haftada:
Foydali savdolar: {positive_trades}
Zarardagi savdolar: {negative_trades}
💰 Sof natija: {net_result} USD

🔒 Signallarni filtrlash
Ko''rsatilmadi: {filtered_orders_count} signal ({filtered_percentage}%)
Top-3 vositalar:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Filtrlarni boshqarish: /filter

Yangi savdolarga oldinga!');

-- Tajik (tj) - 5 variations
INSERT INTO messages (lang, type, message) VALUES
('tj', 'weekly_report_3', '👋 Салом! Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зарар: {loss} USD
✅ Натиҷаи соф: {net_result} USD

🔍 Сигналҳои гум шуда
Филтр шуд: {filtered_orders_count} сигнал ({filtered_percentage}%)
Асбобҳои бештар гум шуда:
1️⃣ {top_missed_1}: {top_missed_count_1} маротиба
2️⃣ {top_missed_2}: {top_missed_count_2} маротиба
3️⃣ {top_missed_3}: {top_missed_count_3} маротиба

💡 Маслиҳат: Филтрҳоро тавассути /filter васеъ кунед то сигналҳои бештар гиред

Олиҷаноб! Давом диҳед! 💪'),

('tj', 'weekly_report_3', '🗓️ Ҳафта ба поён расид:
Бо фоида: {positive_trades} | Бо зиён: {negative_trades}
💰 Натича: {net_result} USD

🎯 Таҳлили филтрҳо
Сигналҳои гум шуда: {filtered_orders_count} ({filtered_percentage}%)
Бештар гум шуда:
• {top_missed_1} — {top_missed_count_1}
• {top_missed_2} — {top_missed_count_2}
• {top_missed_3} — {top_missed_count_3}

ℹ️ Барои зиёд кардани савдо дар /filter танзим кунед

Хуб истодаем!'),

('tj', 'weekly_report_3', '📅 Ҳафта баст шуд:
+{positive_trades} муомила | −{negative_trades} муомила
📊 Баланс: {net_result} USD

📉 Омори филтркунӣ
Филтр шуд: {filtered_orders_count} сигнал ({filtered_percentage}%)
Бештар гум шуда:
▫️ {top_missed_1}: {top_missed_count_1}
▫️ {top_missed_2}: {top_missed_count_2}
▫️ {top_missed_3}: {top_missed_count_3}

⚙️ Танзимотро тавассути /filter тағйир диҳед

Ба пеш ҳаракат мекунем.'),

('tj', 'weekly_report_3', '🤝 Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натича: {net_result} USD

🚫 Имкониятҳои гум шуда
Ҳамагӣ гум шуд: {filtered_orders_count} ({filtered_percentage}%)
Асбобҳо:
→ {top_missed_1}: {top_missed_count_1}
→ {top_missed_2}: {top_missed_count_2}
→ {top_missed_3}: {top_missed_count_3}

🔧 Асбобҳои бештарро дар /filter фаъол кунед

Муҳимаш — устуворӣ.'),

('tj', 'weekly_report_3', '💬 Дар ин ҳафта:
Муомилаҳои бо фоида: {positive_trades}
Муомилаҳои бо зиён: {negative_trades}
💰 Натиҷаи соф: {net_result} USD

🔒 Филтркунии сигналҳо
Намоиш дода нашуд: {filtered_orders_count} сигнал ({filtered_percentage}%)
3 асбоби аввал:
1. {top_missed_1} — {top_missed_count_1}
2. {top_missed_2} — {top_missed_count_2}
3. {top_missed_3} — {top_missed_count_3}

💬 Идоракунии филтрҳо: /filter

Ба муомилаҳои нав пеш меравем!');

-- ============================================================================
-- Update MessageType enum in schema (manual step required)
-- ============================================================================
-- NOTE: This migration adds the 'weekly_report_3' type to the messages table.
-- The TypeScript type definition in libs/db/src/schema/messages.ts should be
-- updated manually to include 'weekly_report_3' in the MessageType union:
--
-- export type MessageType =
--   | 'open'
--   | 'close_minus'
--   | 'close_plus'
--   | 'position_sltp_update'
--   | 'weekly_report'
--   | 'weekly_report_3'
--   | 'monthly_report';
-- ============================================================================
