-- =============================================================================
-- Update weekly_report_3 templates: concise two-section layout with CTA
-- Languages: ru, en, uk, hi, fr, kz, uz, tj (4 variants each)
-- Uses only safe placeholders in first section and VIP no-filter placeholders
-- in the second section. Includes CTA to manage filtering via /filter.
-- =============================================================================

-- Remove previous weekly_report_3 templates to avoid duplicates
DELETE FROM messages WHERE type = 'weekly_report_3';

-- Russian (ru) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('ru', 'weekly_report_3', '💬 На этой неделе:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых сделок: {positive_trades}
❌ Минусовых сделок: {negative_trades}

— — —

🟣 Эталон без фильтрации за ту же неделю
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых сделок: {vip_positive_trades}
❌ Минусовых сделок: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.'),

('ru', 'weekly_report_3', '🗓️ Итоги недели:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый результат: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Без фильтрации (эталон)
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.'),

('ru', 'weekly_report_3', '📅 Неделя закрыта:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Сравнение без фильтрации
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.'),

('ru', 'weekly_report_3', '🤝 Сводка за неделю:
📈 Плюс: {profit} USD
📉 Минус: {loss} USD
💹 Чистый итог: {net_result} USD
✅ Плюсовых: {positive_trades}
❌ Минусовых: {negative_trades}

— — —

🟣 Эталон (без фильтрации)
📈 Плюс: {vip_profit} USD
📉 Минус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсовых: {vip_positive_trades}
❌ Минусовых: {vip_negative_trades}
Хочешь так же? Отключай фильтрацию в /filter.');

-- English (en) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('en', 'weekly_report_3', '💬 This week:
📈 Profit: {profit} USD
📉 Loss: {loss} USD
💹 Net result: {net_result} USD
✅ Winning trades: {positive_trades}
❌ Losing trades: {negative_trades}

— — —

🟣 Baseline without filtering (same week)
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Winning trades: {vip_positive_trades}
❌ Losing trades: {vip_negative_trades}
Want the same results? Turn off filtering in /filter.'),

('en', 'weekly_report_3', '🗓️ Weekly summary:
📈 Profit: {profit} USD
📉 Loss: {loss} USD
💹 Net: {net_result} USD
✅ Wins: {positive_trades}
❌ Losses: {negative_trades}

— — —

🟣 No-filter benchmark
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same results? Turn off filtering in /filter.'),

('en', 'weekly_report_3', '📅 Week closed:
📈 Profit: {profit} USD
📉 Loss: {loss} USD
💹 Net: {net_result} USD
✅ Winning trades: {positive_trades}
❌ Losing trades: {negative_trades}

— — —

🟣 Reference (no filtering)
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Winning trades: {vip_positive_trades}
❌ Losing trades: {vip_negative_trades}
Want the same? Turn off filtering in /filter.'),

('en', 'weekly_report_3', '🤝 Weekly results:
📈 Profit: {profit} USD
📉 Loss: {loss} USD
💹 Net result: {net_result} USD
✅ Wins: {positive_trades}
❌ Losses: {negative_trades}

— — —

🟣 Benchmark (no filtering)
📈 Profit: {vip_profit} USD
📉 Loss: {vip_loss} USD
💹 Result: {vip_net_result} USD
✅ Wins: {vip_positive_trades}
❌ Losses: {vip_negative_trades}
Want the same? Turn off filtering in /filter.');

-- Ukrainian (uk) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('uk', 'weekly_report_3', '💬 За цей тиждень:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових угод: {positive_trades}
❌ Мінусових угод: {negative_trades}

— — —

🟣 Еталон без фільтрації (за той самий тиждень)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових угод: {vip_positive_trades}
❌ Мінусових угод: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.'),

('uk', 'weekly_report_3', '🗓️ Підсумки тижня:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий результат: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Без фільтрації (еталон)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.'),

('uk', 'weekly_report_3', '📅 Тиждень закрито:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Порівняння без фільтрації
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.'),

('uk', 'weekly_report_3', '🤝 Зведення за тиждень:
📈 Плюс: {profit} USD
📉 Мінус: {loss} USD
💹 Чистий підсумок: {net_result} USD
✅ Плюсових: {positive_trades}
❌ Мінусових: {negative_trades}

— — —

🟣 Еталон (без фільтрації)
📈 Плюс: {vip_profit} USD
📉 Мінус: {vip_loss} USD
💹 Результат: {vip_net_result} USD
✅ Плюсових: {vip_positive_trades}
❌ Мінусових: {vip_negative_trades}
Хочеш так само? Вимикай фільтрацію в /filter.');

-- Hindi (hi) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('hi', 'weekly_report_3', '💬 इस हफ्ते:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 शुद्ध परिणाम: {net_result} USD
✅ फायदे वाली डील्स: {positive_trades}
❌ नुकसान वाली डील्स: {negative_trades}

— — —

🟣 बिना फ़िल्टरिंग का मानक (यही हफ्ता)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे वाली डील्स: {vip_positive_trades}
❌ नुकसान वाली डील्स: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.'),

('hi', 'weekly_report_3', '🗓️ साप्ताहिक सारांश:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 नेट: {net_result} USD
✅ फायदे: {positive_trades}
❌ नुकसान: {negative_trades}

— — —

🟣 नो-फ़िल्टर बेंचमार्क
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे: {vip_positive_trades}
❌ नुकसान: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.'),

('hi', 'weekly_report_3', '📅 हफ्ता बंद:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 नेट: {net_result} USD
✅ फायदे वाली डील्स: {positive_trades}
❌ नुकसान वाली डील्स: {negative_trades}

— — —

🟣 संदर्भ (बिना फ़िल्टरिंग)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे वाली डील्स: {vip_positive_trades}
❌ नुकसान वाली डील्स: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.'),

('hi', 'weekly_report_3', '🤝 साप्ताहिक नतीजे:
📈 मुनाफा: {profit} USD
📉 नुकसान: {loss} USD
💹 शुद्ध परिणाम: {net_result} USD
✅ फायदे: {positive_trades}
❌ नुकसान: {negative_trades}

— — —

🟣 बेंचमार्क (नो-फ़िल्टर)
📈 मुनाफा: {vip_profit} USD
📉 नुकसान: {vip_loss} USD
💹 परिणाम: {vip_net_result} USD
✅ फायदे: {vip_positive_trades}
❌ नुकसान: {vip_negative_trades}
ऐसा ही चाहते हैं? /filter में फ़िल्टरिंग बंद करें.');

-- French (fr) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('fr', 'weekly_report_3', '💬 Cette semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat net : {net_result} USD
✅ Trades gagnants : {positive_trades}
❌ Trades perdants : {negative_trades}

— — —

🟣 Référence sans filtrage (même semaine)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Trades gagnants : {vip_positive_trades}
❌ Trades perdants : {vip_negative_trades}
Tu veux pareil ? Désactive le filtrage dans /filter.'),

('fr', 'weekly_report_3', '🗓️ Bilan hebdomadaire :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Net : {net_result} USD
✅ Gagnants : {positive_trades}
❌ Perdants : {negative_trades}

— — —

🟣 Benchmark sans filtrage
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Gagnants : {vip_positive_trades}
❌ Perdants : {vip_negative_trades}
Tu veux pareil ? Désactive le filtrage dans /filter.'),

('fr', 'weekly_report_3', '📅 Semaine clôturée :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Net : {net_result} USD
✅ Trades gagnants : {positive_trades}
❌ Trades perdants : {negative_trades}

— — —

🟣 Référence (sans filtrage)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Trades gagnants : {vip_positive_trades}
❌ Trades perdants : {vip_negative_trades}
Tu veux les mêmes résultats ? Désactive le filtrage dans /filter.'),

('fr', 'weekly_report_3', '🤝 Résultats de la semaine :
📈 Gain : {profit} USD
📉 Perte : {loss} USD
💹 Résultat net : {net_result} USD
✅ Gagnants : {positive_trades}
❌ Perdants : {negative_trades}

— — —

🟣 Benchmark (sans filtrage)
📈 Gain : {vip_profit} USD
📉 Perte : {vip_loss} USD
💹 Résultat : {vip_net_result} USD
✅ Gagnants : {vip_positive_trades}
❌ Perdants : {vip_negative_trades}
Tu veux les mêmes résultats ? Désactive le filtrage dans /filter.');

-- Kazakh (kz) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('kz', 'weekly_report_3', '💬 Осы аптада:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Таза нәтиже: {net_result} USD
✅ Жеңісті мәмілелер: {positive_trades}
❌ Зиянды мәмілелер: {negative_trades}

— — —

🟣 Сүзгілері жоқ эталон (осы апта)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңісті мәмілелер: {vip_positive_trades}
❌ Зиянды мәмілелер: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.'),

('kz', 'weekly_report_3', '🗓️ Апталық қорытынды:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Нетто: {net_result} USD
✅ Жеңістер: {positive_trades}
❌ Жогалтулар: {negative_trades}

— — —

🟣 Сүзгісіз бенчмарк
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңістер: {vip_positive_trades}
❌ Жогалтулар: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.'),

('kz', 'weekly_report_3', '📅 Апта жабылды:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Нетто: {net_result} USD
✅ Жеңісті мәмілелер: {positive_trades}
❌ Зиянды мәмілелер: {negative_trades}

— — —

🟣 Анықтама (сүзгісіз)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңісті мәмілелер: {vip_positive_trades}
❌ Зиянды мәмілелер: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.'),

('kz', 'weekly_report_3', '🤝 Апталық нәтиже:
📈 Пайда: {profit} USD
📉 Залал: {loss} USD
💹 Таза нәтиже: {net_result} USD
✅ Жеңістер: {positive_trades}
❌ Жогалтулар: {negative_trades}

— — —

🟣 Бенчмарк (сүзгісіз)
📈 Пайда: {vip_profit} USD
📉 Залал: {vip_loss} USD
💹 Нәтиже: {vip_net_result} USD
✅ Жеңістер: {vip_positive_trades}
❌ Жогалтулар: {vip_negative_trades}
Осындай нәтиже керек пе? /filter арқылы сүзгіні өшіріңіз.');

-- Uzbek (uz) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('uz', 'weekly_report_3', '💬 Bu haftada:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Sof natija: {net_result} USD
✅ Yutuqli savdolar: {positive_trades}
❌ Zararli savdolar: {negative_trades}

— — —

🟣 Filtrlashsiz etalon (shu hafta)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqli savdolar: {vip_positive_trades}
❌ Zararli savdolar: {vip_negative_trades}
Xuddi shunday bo‘lishini xohlaysizmi? /filter da filtrlashni o‘chirib qo‘ying.'),

('uz', 'weekly_report_3', '🗓️ Haftalik yakun:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Netta: {net_result} USD
✅ Yutuqlar: {positive_trades}
❌ Yo‘qotishlar: {negative_trades}

— — —

🟣 No-filter benchmark
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqlar: {vip_positive_trades}
❌ Yo‘qotishlar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o‘chirib qo‘ying.'),

('uz', 'weekly_report_3', '📅 Hafta yopildi:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Netta: {net_result} USD
✅ Yutuqli savdolar: {positive_trades}
❌ Zararli savdolar: {negative_trades}

— — —

🟣 Ma’lumot uchun (filtrlashsiz)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqli savdolar: {vip_positive_trades}
❌ Zararli savdolar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o‘chirib qo‘ying.'),

('uz', 'weekly_report_3', '🤝 Haftalik natijalar:
📈 Foyda: {profit} USD
📉 Zarar: {loss} USD
💹 Sof natija: {net_result} USD
✅ Yutuqlar: {positive_trades}
❌ Yo‘qotishlar: {negative_trades}

— — —

🟣 Benchmark (filtrlashsiz)
📈 Foyda: {vip_profit} USD
📉 Zarar: {vip_loss} USD
💹 Natija: {vip_net_result} USD
✅ Yutuqlar: {vip_positive_trades}
❌ Yo‘qotishlar: {vip_negative_trades}
Xuddi shunday natija istaysizmi? /filter da filtrlashni o‘chirib qo‘ying.');

-- Tajik (tj) - 4 variants
INSERT INTO messages (lang, type, message) VALUES
('tj', 'weekly_report_3', '💬 Дар ин ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натиҷаи соф: {net_result} USD
✅ Муомилаҳои бо фоида: {positive_trades}
❌ Муомилаҳои бо зиён: {negative_trades}

— — —

🟣 Меъёр бе филтркунӣ (ҳамин ҳафта)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.'),

('tj', 'weekly_report_3', '🗓️ Хулосаи ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Нетто: {net_result} USD
✅ Бо фоида: {positive_trades}
❌ Бо зиён: {negative_trades}

— — —

🟣 Бидуни филтр (меъёр)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.'),

('tj', 'weekly_report_3', '📅 Ҳафта баста шуд:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Нетто: {net_result} USD
✅ Муомилаҳои бо фоида: {positive_trades}
❌ Муомилаҳои бо зиён: {negative_trades}

— — —

🟣 Маълумот барои қиёс (бе филтр)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.'),

('tj', 'weekly_report_3', '🤝 Натиҷаҳои ҳафта:
📈 Фоида: {profit} USD
📉 Зиён: {loss} USD
💹 Натиҷаи соф: {net_result} USD
✅ Бо фоида: {positive_trades}
❌ Бо зиён: {negative_trades}

— — —

🟣 Бенчмарк (бе филтркунӣ)
📈 Фоида: {vip_profit} USD
📉 Зиён: {vip_loss} USD
💹 Натиҷа: {vip_net_result} USD
✅ Бо фоида: {vip_positive_trades}
❌ Бо зиён: {vip_negative_trades}
Ҳамчун ҳамин мехоҳед? Филтркуниро дар /filter хомӯш кунед.');



