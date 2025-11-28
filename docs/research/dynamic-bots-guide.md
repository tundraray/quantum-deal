# Dynamic Bots Management Guide

Руководство для службы поддержки по добавлению и управлению динамическими ботами.

## Обзор архитектуры

В системе есть три типа ботов:

| Тип | Webhook Path | Конфигурация | Описание |
|-----|--------------|--------------|----------|
| Static Bot | `/bot` | ENV переменные | Основной бот для пользователей |
| Master Bot | `/masterbot` | ENV переменные | Админский бот для менеджеров |
| Dynamic Bots | `/dynamic/{path}` | База данных | Партнерские/брендовые боты |

**Dynamic Bots** загружаются из базы данных при старте приложения.

---

## Добавление нового Dynamic Bot

### Шаг 1: Создание бота в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота (например: `QuantumDeal Partner Bot`)
4. Введите username бота (например: `QuantumDealPartnerBot`)
5. **Сохраните токен** - он понадобится на следующем шаге

### Шаг 2: Добавление бота в базу данных

Выполните SQL-скрипт в базе данных:

```sql
-- 1. Добавление записи бота
INSERT INTO bots (token, name, username, webhook_path, is_dynamic, is_active)
VALUES (
    '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ',  -- Токен от BotFather
    'Partner Brand Bot',                        -- Внутреннее имя
    'QuantumDealPartnerBot',                   -- @username без @
    '/dynamic/partner-brand',                   -- Уникальный webhook path
    true,                                       -- is_dynamic = true
    true                                        -- is_active = true
)
RETURNING id;

-- Запомните возвращенный id для следующего шага
```

### Шаг 3: Настройка параметров бота

```sql
-- 2. Добавление настроек бота (используйте id из предыдущего шага)
INSERT INTO bot_settings (bot_id, settings, payment_settings)
VALUES (
    1,  -- Замените на реальный id бота
    '{
        "features": {
            "trialEnabled": true,
            "paymentsEnabled": true,
            "signalsEnabled": true,
            "broadcastEnabled": false
        },
        "defaults": {
            "subscriptionDays": 30,
            "trialDays": 7,
            "language": "en"
        },
        "ui": {
            "welcomeImage": null,
            "brandColor": "#3B82F6"
        }
    }'::jsonb,
    '{
        "starsEnabled": true,
        "minAmount": 1,
        "maxAmount": 10000,
        "refundWindowHours": 24
    }'::jsonb
);
```

### Шаг 4: Перезапуск приложения

Dynamic боты загружаются **только при старте** приложения.

```bash
# Перезапустите приложение
pm2 restart quantum-deal

# Или через Docker
docker-compose restart app
```

### Шаг 5: Проверка

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Проверьте логи приложения:

```bash
# Должны увидеть строку:
# [DynamicTelegrafService] Initialized bot "Partner Brand Bot" (@QuantumDealPartnerBot)
```

---

## Полезные SQL-скрипты

### Просмотр всех ботов

```sql
SELECT
    b.id,
    b.name,
    b.username,
    b.webhook_path,
    b.is_dynamic,
    b.is_active,
    bs.settings->'features' as features
FROM bots b
LEFT JOIN bot_settings bs ON bs.bot_id = b.id
ORDER BY b.id;
```

### Деактивация бота

```sql
-- Деактивировать бота (не удаляет, просто отключает)
UPDATE bots
SET is_active = false, updated_at = NOW()
WHERE id = 1;  -- id бота
```

### Активация бота

```sql
-- Активировать бота обратно
UPDATE bots
SET is_active = true, updated_at = NOW()
WHERE id = 1;  -- id бота
```

### Изменение настроек фич

```sql
-- Включить/выключить фичу для бота
UPDATE bot_settings
SET
    settings = jsonb_set(settings, '{features,paymentsEnabled}', 'false'),
    updated_at = NOW()
WHERE bot_id = 1;  -- id бота
```

### Удаление бота

```sql
-- Полное удаление бота (bot_settings удалится каскадно)
DELETE FROM bots WHERE id = 1;  -- id бота
```

---

## Описание полей

### Таблица `bots`

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `token` | varchar(100) | Да | Токен от BotFather |
| `name` | varchar(100) | Да | Внутреннее имя (уникальное) |
| `username` | varchar(100) | Нет | @username бота без @ |
| `webhook_path` | varchar(100) | Да* | Путь webhook (например `/dynamic/brand`) |
| `is_dynamic` | boolean | Да | `true` для динамических ботов |
| `is_active` | boolean | Да | `true` = бот активен |

> *`webhook_path` обязателен для динамических ботов. Боты без него будут пропущены.

### Таблица `bot_settings`

| Поле | Тип | Описание |
|------|-----|----------|
| `bot_id` | bigint | FK на `bots.id` |
| `settings` | jsonb | Настройки фич и дефолтов |
| `payment_settings` | jsonb | Настройки платежей (опционально) |

### Структура `settings`

```json
{
  "features": {
    "trialEnabled": true,      // Включить пробный период
    "paymentsEnabled": true,   // Включить платежи
    "signalsEnabled": true,    // Включить торговые сигналы
    "broadcastEnabled": false  // Включить рассылки
  },
  "defaults": {
    "subscriptionDays": 30,    // Дней подписки по умолчанию
    "trialDays": 7,            // Дней пробного периода
    "language": "en"           // Язык по умолчанию (en/ru)
  },
  "ui": {
    "welcomeImage": null,      // URL картинки приветствия
    "brandColor": "#3B82F6"    // Цвет бренда (HEX)
  }
}
```

---

## Troubleshooting

### Бот не отвечает после добавления

1. **Проверьте перезапуск** - боты загружаются только при старте
2. **Проверьте `is_active`** - должен быть `true`
3. **Проверьте `webhook_path`** - должен быть заполнен
4. **Проверьте логи** на ошибки валидации токена

### Ошибка "No bot found for webhook path"

Webhook path в БД не совпадает с URL, куда Telegram отправляет updates.

```sql
-- Проверьте текущий webhook_path
SELECT webhook_path FROM bots WHERE username = 'YourBotUsername';
```

### Ошибка валидации токена

```
[DynamicTelegrafService] Failed to initialize bot: token validation failed
```

Токен невалиден или бот заблокирован. Получите новый токен через BotFather.

### Дублирование пользователей

Пользователи в таблице `bot_users` привязаны к конкретному боту через `bot_id`. Один Telegram пользователь может быть в нескольких ботах.

---

## Чеклист добавления бота

- [ ] Создан бот в BotFather
- [ ] Сохранен токен
- [ ] Добавлена запись в `bots`
- [ ] Добавлена запись в `bot_settings`
- [ ] Webhook path уникален
- [ ] Приложение перезапущено
- [ ] Бот отвечает на `/start`
- [ ] Проверены логи на ошибки
