# Agile Business — Полное описание проекта

## Общее описание

Корпоративный сайт-визитка компании **Agile Business** — IT-консалтинг, маркетинг, разработка.
Тёмная премиум-тема с анимированным hero, 3D-карточками, кастомным курсором, калькулятором стоимости проекта, блогом, портфолио и мультиязычностью (5 языков).

---

## Технологический стек

| Слой | Технология |
|------|-----------|
| **Бэкенд** | Node.js + Express 4 |
| **База данных** | PostgreSQL 17 |
| **Фронтенд** | Ванильный HTML/CSS/JS (без фреймворков) |
| **Шрифт** | Times New Roman (системный, без загрузки) |
| **ORM** | Нет, прямые SQL-запросы через `pg` |
| **Шаблонизатор** | Нет, статический HTML + API (SPA-подход) |
| **Авторизация** | express-session + bcryptjs |
| **Безопасность** | helmet, express-rate-limit, CSP-заголовки |
| **Уведомления** | Telegram Bot API, Nodemailer (SMTP) |
| **Интеграция** | Webhook → Agile-платформа |

---

## Структура папок

```
AgileBusinessVisitca/
│
├── server.js              — Главный серверный файл (Express, все API, маршруты)
├── admin-routes.js        — Роуты админ-панели (CRUD проекты, статьи, лиды, CMS)
├── setup-db.js            — Скрипт инициализации БД (создание всех таблиц)
├── seed-articles.js       — Заполнение БД тестовыми статьями
├── package.json           — Зависимости, npm-скрипты
├── package-lock.json      — Точные версии зависимостей
├── agile_business.sql     — Полный дамп SQL-схемы базы данных
├── .env                   — Переменные окружения (секреты, НЕ коммитить)
├── .env.example           — Шаблон переменных окружения (без секретов)
├── .gitignore             — Правила исключения из Git
├── README.md              — Краткое описание
│
├── public/                — Статика (отдаётся Express'ом напрямую)
│   ├── index.html         — Главная страница (hero, about, services, approach, contact)
│   ├── about.html         — Страница «О нас»
│   ├── works.html         — Портфолио (список проектов)
│   ├── work.html          — Карточка одного проекта (по slug)
│   ├── articles.html      — Блог (список статей)
│   ├── article.html       — Одна статья (по slug)
│   ├── calculator.html    — Калькулятор стоимости проекта
│   ├── client.html        — Личный кабинет клиента
│   ├── client-access.html — Вход / регистрация клиента
│   ├── privacy.html       — Политика конфиденциальности
│   ├── 404.html           — Страница 404
│   ├── 500.html           — Страница 500
│   ├── manifest.json      — PWA-манифест
│   ├── robots.txt         — Правила для поисковых роботов
│   ├── sitemap.xml        — Карта сайта
│   ├── .htaccess          — Правила для Apache (если на shared hosting)
│   │
│   ├── css/
│   │   └── style.css      — Все стили сайта (темы, адаптив, анимации, ~2800 строк)
│   │
│   ├── js/
│   │   ├── main.js        — Основной JS: курсор, параллакс, скролл-анимации, навигация,
│   │   │                    тема, формы, мобильное меню, 3D-карточки, маркиза
│   │   ├── i18n.js        — Система мультиязычности (ru, en — базовые)
│   │   ├── i18n-ka.js     — Грузинские переводы (ka)
│   │   ├── i18n-bg.js     — Болгарские переводы (bg)
│   │   ├── i18n-extra.js  — Армянские переводы (hy)
│   │   ├── calculator.js  — Логика калькулятора (шаги, расчёт цены, отправка)
│   │   ├── articles.js    — Загрузка/фильтрация статей
│   │   ├── carousel.js    — Карусель изображений
│   │   ├── work.js        — Страница одного проекта
│   │   ├── pages.js       — Загрузка динамического контента страниц
│   │   ├── client.js      — Личный кабинет клиента
│   │   ├── client-access.js — Логин/регистрация клиента
│   │   ├── analytics.js   — Аналитика (отправка событий)
│   │   └── tech-icons.js  — SVG-иконки технологий (React, Vue, Node, etc.)
│   │
│   ├── assets/
│   │   └── logo.png       — Логотип
│   │
│   └── uploads/           — Загруженные изображения (из админки, проекты/статьи)
│       └── *.png, *.jpg
│
├── admin-subdomain/       — Админ-панель (SPA)
│   ├── index.html         — Единственная HTML-страница (SPA shell)
│   ├── .htaccess          — Rewrite для SPA
│   ├── css/
│   │   └── admin.css      — Стили админки
│   └── js/
│       └── admin.js       — Полный JS админ-панели (логин, CRUD, CMS, графики)
│
├── migrations/            — SQL-миграции (для апгрейда схемы)
│   ├── 001-stack-and-article-gallery.sql
│   ├── 002-admin-panel.sql
│   └── 003-crm-marketing-cms-finance-security.sql
│
├── scripts/               — Вспомогательные скрипты
│   ├── backup.js          — Бэкап PostgreSQL (pg_dump)
│   ├── dump-projects.js   — Экспорт проектов в JSON
│   └── rebuild-sitemap.js — Пересборка sitemap.xml из БД
│
└── backups/
    └── db/                — Сохранённые бэкапы БД
        └── agile_business-20260331-155857.sql
```

---

## Серверная часть (server.js)

### Запуск

```bash
npm install          # установить зависимости
cp .env.example .env # создать .env и заполнить
npm run setup-db     # создать таблицы в PostgreSQL
npm start            # запустить на порту из .env (по умолчанию 3000)
```

### Переменные окружения (.env)

| Переменная | Описание |
|-----------|----------|
| `DB_HOST` | Хост PostgreSQL (обычно `localhost`) |
| `DB_PORT` | Порт PostgreSQL (обычно `5432`) |
| `DB_USER` | Пользователь БД (обычно `postgres`) |
| `DB_PASSWORD` | Пароль БД |
| `DB_NAME` | Имя базы (обычно `agile_business`) |
| `PORT` | Порт сервера (по умолчанию `3000`) |
| `SESSION_SECRET` | Секрет сессий (случайная строка) |
| `TG_BOT_TOKEN` | Токен Telegram-бота для уведомлений |
| `TG_CHAT_ID` | ID чата для уведомлений |
| `ADMIN_PASSWORD` | Пароль админки (по умолчанию `admin123`) |
| `ADMIN_HOST` | Хост админки (например `admin.agile-business-pro.com`) |
| `COOKIE_DOMAIN` | Домен cookie (например `.agile-business-pro.com`) |
| `NODE_ENV` | `production` для прода |
| `AGILE_API_BASE` | Базовый URL платформы Agile (для webhook) |
| `AGILE_WEBHOOK_SECRET` | Секрет webhook'а (должен совпадать с платформой) |

### Маршруты страниц

| URL | Страница |
|-----|---------|
| `/` | Главная |
| `/about` | О нас |
| `/works` | Портфолио |
| `/works/:slug` | Проект |
| `/articles` | Блог |
| `/articles/:slug` | Статья |
| `/calculator` | Калькулятор |
| `/client-access` | Вход клиента |
| `/client/:slug` | Кабинет клиента |
| `/privacy` | Политика конфиденциальности |

### API-эндпоинты

#### Публичные

| Метод | URL | Описание |
|-------|-----|----------|
| `POST` | `/api/contact` | Отправка заявки (имя, email, телефон, сообщение). Сохраняет в БД, шлёт Telegram + Email + Agile webhook |
| `POST` | `/api/calculator/start` | Начать сессию калькулятора |
| `POST` | `/api/calculator/update` | Обновить данные шага |
| `POST` | `/api/calculator/complete` | Завершить расчёт |
| `GET` | `/api/pricing/calculator` | Получить прайс-лист для калькулятора |
| `GET` | `/api/projects` | Список проектов (портфолио) |
| `GET` | `/api/projects/:slug` | Один проект по slug |
| `GET` | `/api/projects/:slug/review` | Отзыв клиента |
| `GET` | `/api/articles` | Список статей |
| `GET` | `/api/articles/:slug` | Одна статья по slug |
| `GET` | `/api/bundle/works` | Полный бандл портфолио (одним запросом) |
| `GET` | `/api/bundle/articles` | Полный бандл статей (одним запросом) |
| `GET` | `/api/i18n/:lang` | Переводы для указанного языка |
| `GET` | `/api/pages/:slug` | Контент CMS-страницы |
| `GET` | `/api/site-info` | Контакты сайта (телефон, email, адрес) |
| `GET` | `/api/metrika-id` | ID Яндекс.Метрики |
| `POST` | `/api/track` | Трекинг визитов |
| `POST` | `/api/analytics/event` | Трекинг событий |
| `POST` | `/api/smart-match` | Валидация описания услуги |
| `GET` | `/api/service-context/:service` | Подсказки для услуги |

#### Клиентский доступ

| Метод | URL | Описание |
|-------|-----|----------|
| `POST` | `/api/client/register` | Регистрация клиента |
| `POST` | `/api/client/login` | Вход клиента |
| `POST` | `/api/client/logout` | Выход |
| `GET` | `/api/client/me` | Данные текущего клиента |

#### Админ-панель (admin-routes.js)

Доступ только через поддомен `admin.*` или при установленном `ADMIN_HOST`.
Авторизация через сессию (логин `admin`, пароль из `ADMIN_PASSWORD`).

Включает полный CRUD для:
- Проектов (портфолио) с локализациями
- Статей с локализациями
- Лидов (заявки)
- CMS-страниц
- Прайс-листа калькулятора
- Настроек сайта

---

## Фронтенд

### Дизайн

- **Тёмная тема** по умолчанию (#060606 фон, #c8102e акцент)
- **Светлая тема** переключается кнопкой (сохраняется в localStorage)
- **Шрифт**: Times New Roman (системный)
- **Кастомный курсор**: красная точка + кружок-follower (точка всегда внутри кружка)
- **Адаптив**: полная адаптивность, мобильное меню (бургер)
- **Анимации**: скролл-reveal, параллакс hero, 3D-карточки, маркиза

### Мультиязычность (i18n)

5 языков: **RU** (основной), **EN**, **KA** (грузинский), **HY** (армянский), **BG** (болгарский).

Переводы хранятся:
- Статические ключи (`nav_about`, `hero_title`, etc.) — в JS-файлах (`i18n.js`, `i18n-ka.js`, `i18n-bg.js`, `i18n-extra.js`)
- Динамический контент (проекты, статьи, страницы) — в таблицах БД `*_locales`

Переключатель языка в навигации. Выбор сохраняется в localStorage.

### Страницы

1. **Главная** (`index.html`) — hero с 3D-элементами (glows, grid-lines, particles), блок «О нас» со статистикой и 3D-карточкой «Комплексный консалтинг», секция услуг, подход, маркиза клиентов, форма обратной связи
2. **О нас** (`about.html`) — расширенная информация о компании
3. **Портфолио** (`works.html` → `work.html`) — карточки проектов, фильтрация, детальная страница с каруселью, отзывом клиента
4. **Блог** (`articles.html` → `article.html`) — статьи с категориями
5. **Калькулятор** (`calculator.html`) — многошаговый калькулятор стоимости проекта
6. **Клиентский доступ** (`client-access.html` → `client.html`) — регистрация/вход, личный кабинет
7. **Политика конфиденциальности** (`privacy.html`) — 9 разделов
8. **Ошибки** (`404.html`, `500.html`)

---

## База данных (PostgreSQL)

### Основные таблицы

| Таблица | Описание |
|---------|---------|
| `projects` | Проекты портфолио (slug, дата, статус, изображения) |
| `project_locales` | Локализации проектов (title, description, stack, etc. на разных языках) |
| `articles` | Статьи блога (slug, категория, изображение) |
| `article_locales` | Локализации статей |
| `leads` | Заявки с форм (имя, email, телефон, utm-метки) |
| `calculator_sessions` | Сессии калькулятора |
| `calculator_steps` | Шаги расчёта |
| `pricing` | Прайс-лист (услуги, цены, range) |
| `pages` | CMS-страницы |
| `page_locales` | Локализации страниц |
| `i18n` | Переводы UI-элементов |
| `admin_users` | Администраторы |
| `client_users` | Клиенты (личный кабинет) |
| `reviews` | Отзывы клиентов на проекты |
| `settings` | Настройки сайта (телефон, email, адрес, Yandex Metrika ID) |
| `visits` | Аналитика визитов |
| `analytics_events` | Аналитика событий |

### Инициализация

```bash
npm run setup-db   # создаст все таблицы, если их нет
```

Или вручную импортировать `agile_business.sql`.

---

## Безопасность

- **Helmet** — security-заголовки (CSP, X-Frame-Options, etc.)
- **Rate limiting** — ограничение запросов на формы (contact: 3/15мин, calculator: 10/15мин, client auth: 5/15мин, tracking: 20/мин)
- **bcryptjs** — хеширование паролей
- **express-session** — серверные сессии (не JWT)
- **CSRF-защита** — через проверку `Admin-Request` заголовка в админке
- **Валидация** — проверка email (RegExp), обязательных полей, длины строк
- **Санитизация** — `.slice()` на utm-параметры, экранирование в SQL через параметризованные запросы
- **Uploads** — только изображения (jpg/jpeg/png/gif/webp/svg), макс. 10 MB, уникальные имена через uuid

---

## Интеграции

### Telegram

При каждой заявке через `/api/contact` бот отправляет уведомление в указанный чат (`TG_BOT_TOKEN`, `TG_CHAT_ID`).

### Email (Nodemailer)

Отправка email-уведомлений о новых заявках (SMTP-настройки через env).

### Agile Webhook

При заявке с сайта — серверный POST на платформу Agile:
- URL: `{AGILE_API_BASE}/api/applications/webhook`
- Заголовок: `X-Webhook-Secret`
- Тело: name, project_name, email, phone, company, message, service
- Таймаут: 10 сек, неблокирующий (ошибки не влияют на ответ клиенту)

---

## npm-скрипты

| Команда | Описание |
|---------|---------|
| `npm start` | Запуск сервера |
| `npm run dev` | То же (для разработки) |
| `npm run setup-db` | Инициализация таблиц в PostgreSQL |
| `npm run rebuild-sitemap` | Пересборка sitemap.xml из БД |
| `npm run backup` | Бэкап базы данных (pg_dump) |

---

## Деплой

1. Скопировать проект на сервер
2. `npm install` — установить зависимости
3. Настроить `.env` (БД, секреты, Telegram, webhook)
4. `npm run setup-db` — создать таблицы
5. `npm start` или через PM2: `pm2 start server.js --name agile`
6. Настроить Nginx как reverse proxy на порт из `PORT`
7. SSL через Let's Encrypt / Certbot
8. Для админки — настроить поддомен `admin.*` на тот же сервер

---

## Восстановление из архива

```bash
# 1. Распаковать архив
# 2. Установить зависимости
npm install

# 3. Настроить PostgreSQL (создать БД)
createdb agile_business

# 4. Импорт схемы (если свежая установка)
psql -U postgres -d agile_business -f agile_business.sql

# 5. Или через setup-db (создаст таблицы, не трогает данные)
npm run setup-db

# 6. Настроить .env
cp .env.example .env
# Заполнить DB_PASSWORD, SESSION_SECRET, TG_BOT_TOKEN, etc.

# 7. Запустить
npm start
```
