/**
 * Agile Business — Server v2.0 (PostgreSQL + Telegram Inline + Smart Matching)
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { execFile } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();
/** За Nginx / балансировщиком — иначе req.secure и cookie Secure могут быть неверными. */
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const adminSpaRoot = path.join(__dirname, 'admin-subdomain');

function requestHostname(req) {
    return String(req.get('host') || '').split(':')[0].toLowerCase();
}

/** Поддомен админки (admin.example.com): корень = SPA, а не public-сайт */
function isAdminSubdomainHost(req) {
    const host = requestHostname(req);
    const configured = String(process.env.ADMIN_HOST || '').trim().toLowerCase();
    if (configured) return host === configured.split(':')[0];
    return host.startsWith('admin.');
}

/* ── Simple Perf Logger & In-Memory Cache ───────────── */
const perfLoggerEnabled = process.env.PERF_LOG === '1';

// Very small in-process cache for public, rarely changing responses.
// Keys are arbitrary strings, values are { expiresAt:number, payload:any }.
const memoryCache = new Map();

// Periodic sweep to prevent unbounded cache growth
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of memoryCache) {
        if (item.expiresAt && item.expiresAt < now) memoryCache.delete(key);
    }
}, 60_000);

function cacheGet(key) {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
    }
    return item.payload;
}

function cacheSet(key, payload, ttlMs) {
    if (!ttlMs || ttlMs <= 0) return;
    memoryCache.set(key, { payload, expiresAt: Date.now() + ttlMs });
}

function invalidatePublicCache(prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    const wanted = list.map(v => String(v || '').trim()).filter(Boolean);
    if (!wanted.length) return 0;
    let removed = 0;
    for (const key of Array.from(memoryCache.keys())) {
        if (wanted.some(prefix => key === prefix || key.startsWith(prefix))) {
            memoryCache.delete(key);
            removed++;
        }
    }
    return removed;
}

/** Escape HTML entities for Telegram parse_mode:'HTML' */
function tgEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Basic email format validation */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function withJsonCache(cacheKeyBuilder, ttlMs, handler) {
    return async (req, res) => {
        try {
            const key = cacheKeyBuilder(req);
            const cached = cacheGet(key);
            if (cached) {
                res.setHeader('X-AB-Cache', 'hit');
                return res.json(cached);
            }
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                cacheSet(key, body, ttlMs);
                res.setHeader('X-AB-Cache', 'miss');
                return originalJson(body);
            };
            await handler(req, res);
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    };
}

/* ── PostgreSQL Pool ─────────────────────────────────── */
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agile_business',
    max: 40
});

let dbReady = false;
let isInitializingDb = false;

async function ensureDbConnected() {
    if (dbReady) return true;
    if (isInitializingDb) return false;
    isInitializingDb = true;
    try {
        await pool.query('SELECT 1');
        console.log('  ✅ PostgreSQL connected (lazy connection)');
        await ensureExtraSchemaColumns();
        dbReady = true;
        isInitializingDb = false;
        return true;
    } catch (e) {
        isInitializingDb = false;
        console.warn('  ⚠️ PostgreSQL lazy connection attempt failed:', e.message);
        return false;
    }
}

async function query(sql, params) {
    await ensureDbConnected();
    if (!dbReady) throw new Error('Database not available');
    const { rows } = await pool.query(sql, params || []);
    return rows;
}

async function getSetting(key) {
    const rows = await query('SELECT setting_value FROM settings WHERE setting_key = $1', [key]);
    return rows.length ? rows[0].setting_value : '';
}

/* ── Smart Matching Keywords ────────────────────────── */
const SERVICE_KEYWORDS = {
    management: {
        name: 'Управление и Стратегия',
        keywords: ['стратегия','управление','менеджмент','проект','kpi','roadmap','бэклог','scrum','agile','waterfall','бизнес-процесс','реинжиниринг','стейкхолдер','трансформация','оптимизация','планирование','координация','mvp','pmo','канбан','спринт','esg','цифровизация','dx','автоматизация','продукт','product','стратегический','долгосрочный','цель','развитие','изменение','рост','масштабирование','директор','ceo','логистика','склад','поставка','scm','операция','процесс','эффективность','аутсорсинг','bpo','sla','erp','wms','tms','дистрибуция','закупки','снабжение','финанс','бюджет','учёт','налог','отчётность','p&l','баланс','cash flow','мсфо','себестоимость','рентабельность','1c','sap','бухгалтер','аудит','прибыль','расход','доход','капитал','ликвидность'],
        context: 'Опишите вашу задачу в области управления: цели, сроки, текущие проблемы, масштаб проекта',
        tg_emoji: '🏛'
    },
    investment: {
        name: 'Инвестиции и Оценка',
        keywords: ['инвестиция','оценка','due diligence','dcf','мультипликатор','pitch deck','бизнес-план','финансирование','стоимость','актив','сделка','m&a','венчур','раунд','инвестор','irr','npv','eva','стартап','акция','фонд','портфель','доходность','дивиденд','капитализация','стоимость компании','кредит'],
        context: 'Опишите инвестиционную задачу: тип сделки, стадия компании, необходимый объём',
        tg_emoji: '📈'
    },
    creative: {
        name: 'Креатив',
        keywords: ['маркетинг','реклама','бренд','seo','smm','таргет','контекст','конверсия','лид','воронка','цa','позиционирование','контент','promotion','cpa','cpc','roi','digital','соцсети','instagram','tiktok','email','рассылка','utm','трафик','айдентика','логотип','pr','event','мероприятие','исследование рынка','продажа','crm','клиент','скрипт','cold call','менеджер по продажам','отдел продаж','up-sell','cross-sell','retention','churn','customer success','onboarding','pipeline','b2b','b2c','план продаж','дизайн','ui','ux','figma','photoshop','illustrator','фирменный стиль','брендбук','макет','прототип','анимация','видео','моушн','3d','креатив','визуал','графика','лендинг','hr','персонал','подбор','рекрутинг','обучение','мотивация','корпоративная культура','вакансия','собеседование','адаптация','кадровый резерв'],
        context: 'Опишите задачу: маркетинг, продажи, дизайн, HR — целевая аудитория, бюджет, текущие каналы',
        tg_emoji: '🎨'
    },
    analytics: {
        name: 'Аналитика и Данные',
        keywords: ['аналитика','данные','data','bi','дашборд','dashboard','sql','python','excel','метрика','kpi','прогноз','модель','визуализация','etl','big data','ml','machine learning','power bi','tableau','риск','отчёт','статистика','анализ','мониторинг','olap','хранилище','сегментация','a/b тест','когорта','data-driven'],
        context: 'Опишите задачу аналитики: какие данные есть, какие решения нужно поддержать, объём данных',
        tg_emoji: '📊'
    },
    it: {
        name: 'ИТ и Разработка',
        keywords: ['разработка','программирование','код','api','сайт','приложение','мобильное','backend','frontend','fullstack','devops','облако','aws','azure','crm','erp','кибербезопасность','пентест','архитектура','интеграция','saas','git','база данных','автоматизация','тестирование','qa','it','ит','сервер','хостинг'],
        context: 'Опишите IT-задачу: тип проекта, технологии, текущая инфраструктура',
        tg_emoji: '💻'
    },
};

/* ── Telegram Bot ───────────────────────────────────── */
let bot = null;
let tgChatIds = [];

function parseTelegramChatIds(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(x => String(x).trim()).filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    try {
        const j = JSON.parse(s);
        if (Array.isArray(j)) return j.map(x => String(x).trim()).filter(Boolean);
    } catch { /* ignore */ }
    // Allow: comma-separated, whitespace-separated, or mix.
    return s.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
}

async function initBot() {
    try {
        const token = String(await getSetting('tg_bot_token') || '').trim();
        tgChatIds = parseTelegramChatIds(await getSetting('tg_chat_id'));
        if (bot) {
            try { bot.stopPolling(); } catch (e) { /* ignore */ }
            bot.removeAllListeners();
            bot = null;
        }
        if (!token || token.length < 30) {
            if (token) console.warn('  ⚠️  Telegram: токен слишком короткий или битый — бот не запущен');
            else console.log('  ℹ️  Telegram: токен не задан — уведомления в Telegram отключены');
            return;
        }
        if (!tgChatIds.length) {
            console.warn('  ⚠️  Telegram: бот запущен, но не указан Chat ID — сообщения некуда отправлять');
        }
        bot = new TelegramBot(token, { polling: true });
        bot.on('callback_query', handleCallbackQuery);
        bot.on('polling_error', (err) => {
            const msg = err && err.message ? err.message : String(err);
            if (!/Conflict|terminated|ECONNRESET|EFATAL/i.test(msg)) console.warn('  Telegram polling:', msg);
        });
        console.log(`  ✅ Telegram bot подключён${tgChatIds.length ? ` (получателей: ${tgChatIds.length})` : ''}`);
    } catch (e) {
        bot = null;
        console.warn('  ⚠️  Telegram bot не запустился:', e && e.message ? e.message : e);
    }
}

async function handleCallbackQuery(callbackQuery) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    if (data === 'noop') {
        return bot.answerCallbackQuery(callbackQuery.id);
    }

    const [action, leadId] = data.split(':');
    
    try {
        if (action === 'accept') {
            await query('UPDATE leads SET status = $1 WHERE id = $2', ['accepted', leadId]);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Заявка принята в работу' });
            await bot.editMessageReplyMarkup(
                { inline_keyboard: [[{ text: '✅ Принято в работу', callback_data: 'noop' }]] },
                { chat_id: chatId, message_id: messageId }
            );
        } else if (action === 'reject') {
            await query('UPDATE leads SET status = $1 WHERE id = $2', ['rejected', leadId]);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Заявка отклонена' });
            await bot.editMessageReplyMarkup(
                { inline_keyboard: [[{ text: '❌ Отклонено', callback_data: 'noop' }]] },
                { chat_id: chatId, message_id: messageId }
            );
        } else if (action === 'process') {
            await query('UPDATE leads SET status = $1 WHERE id = $2', ['processing', leadId]);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Заявка в обработке' });
            await bot.editMessageReplyMarkup(
                { inline_keyboard: [
                    [{ text: '✅ Принять', callback_data: `accept:${leadId}` }, { text: '❌ Отклонить', callback_data: `reject:${leadId}` }],
                    [{ text: '🔄 В обработке', callback_data: 'noop' }]
                ]},
                { chat_id: chatId, message_id: messageId }
            );
        } else if (action === 'contact') {
            const rows = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
            if (rows.length > 0) {
                const lead = rows[0];
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(chatId,
                    `📱 <b>Контактные данные клиента</b>\n\n` +
                    `👤 <b>Имя:</b> ${tgEsc(lead.name)}\n` +
                    `📧 <b>Email:</b> ${tgEsc(lead.email)}\n` +
                    `📞 <b>Телефон:</b> ${tgEsc(lead.phone || '—')}\n` +
                    `🏢 <b>Компания:</b> ${tgEsc(lead.company || '—')}`,
                    { parse_mode: 'HTML' }
                );
            }
        }
    } catch (e) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Ошибка обработки' });
    }
}

function sendTelegramNewLead(lead) {
    if (!bot || !Array.isArray(tgChatIds) || !tgChatIds.length) return;

    const serviceInfo = SERVICE_KEYWORDS[lead.service] || {};
    const emoji = serviceInfo.tg_emoji || '📋';
    const serviceName = serviceInfo.name || lead.service || '—';
    
    const sizeMap = { small: 'Малый бизнес', medium: 'Средний бизнес', large: 'Крупный бизнес' };
    const complexMap = { basic: 'Базовый', standard: 'Стандарт', premium: 'Премиум' };
    const durMap = { short: '1–3 месяца', medium: '3–6 месяцев', long: '6–12 месяцев' };
    
    let msg = `🔔 <b>Новая заявка с сайта</b>\n\n`;
    msg += `👤 <b>Имя:</b> ${tgEsc(lead.name)}\n`;
    msg += `📧 <b>Email:</b> ${tgEsc(lead.email)}\n`;
    msg += `📞 <b>Телефон:</b> ${tgEsc(lead.phone || '—')}\n`;
    msg += `🏢 <b>Компания:</b> ${tgEsc(lead.company || '—')}\n\n`;
    
    if (lead.service) {
        msg += `${emoji} <b>Направление:</b> ${serviceName}\n`;
    }
    if (lead.company_size) {
        msg += `📏 <b>Размер компании:</b> ${sizeMap[lead.company_size] || lead.company_size}\n`;
    }
    if (lead.complexity) {
        msg += `⚡ <b>Пакет:</b> ${complexMap[lead.complexity] || lead.complexity}\n`;
    }
    if (lead.duration) {
        msg += `📅 <b>Срок:</b> ${durMap[lead.duration] || lead.duration}\n`;
    }
    if (lead.estimated_price > 0) {
        msg += `💰 <b>Предварительная оценка:</b> ${Number(lead.estimated_price).toLocaleString('ru-RU')} ₽\n`;
    }
    if (lead.message) {
        msg += `\n💬 <b>Сообщение:</b>\n${tgEsc(lead.message)}\n`;
    }

    const srcLabel = lead.source === 'calculator' ? '📊 Калькулятор' : '📝 Форма контактов';
    msg += `\n📌 <b>Источник:</b> ${srcLabel}`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Принять', callback_data: `accept:${lead.id}` },
                { text: '🔄 В работу', callback_data: `process:${lead.id}` },
                { text: '❌ Отклонить', callback_data: `reject:${lead.id}` }
            ],
            [
                { text: '📱 Контакты', callback_data: `contact:${lead.id}` }
            ]
        ]
    };

    tgChatIds.forEach(chatId => {
        bot.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
    });
}

function sendTelegramCalcStart(sessionId) {
    if (!bot || !Array.isArray(tgChatIds) || !tgChatIds.length) return;
    tgChatIds.forEach(chatId => {
        bot.sendMessage(chatId,
            `📊 <b>Калькулятор — новый расчёт</b>\n🆔 Сессия: <code>${sessionId.slice(0, 8)}</code>`,
            { parse_mode: 'HTML' }
        ).catch(() => {});
    });
}

function sendTelegramCalcComplete(sess) {
    if (!bot || !Array.isArray(tgChatIds) || !tgChatIds.length) return;
    const serviceInfo = SERVICE_KEYWORDS[sess.service] || {};
    const emoji = serviceInfo.tg_emoji || '📋';
    const sizeMap = { small: 'Малый бизнес', medium: 'Средний бизнес', large: 'Крупный бизнес' };
    const complexMap = { basic: 'Базовый', standard: 'Стандарт', premium: 'Премиум' };
    const durMap = { short: '1–3 месяца', medium: '3–6 месяцев', long: '6–12 месяцев' };
    
    let msg = `✅ <b>Калькулятор — расчёт завершён!</b>\n\n`;
    msg += `${emoji} <b>Направление:</b> ${serviceInfo.name || sess.service}\n`;
    msg += `📏 <b>Размер:</b> ${sizeMap[sess.company_size] || sess.company_size}\n`;
    msg += `⚡ <b>Пакет:</b> ${complexMap[sess.complexity] || sess.complexity}\n`;
    msg += `📅 <b>Срок:</b> ${durMap[sess.duration] || sess.duration}\n`;
    msg += `💰 <b>Оценка:</b> ${Number(sess.estimated_price).toLocaleString('ru-RU')} ₽\n`;
    if (sess.description) {
        msg += `\n💬 <b>Описание:</b>\n${sess.description}`;
    }

    tgChatIds.forEach(chatId => {
        bot.sendMessage(chatId, msg, { parse_mode: 'HTML' }).catch(() => {});
    });
}

/** Тест из админки: проверка токена и chat id */
async function sendTelegramTestMessage() {
    if (!bot) throw new Error('Бот не запущен. Сохраните настройки с верным токеном или проверьте логи сервера.');
    if (!tgChatIds.length) throw new Error('Укажите Chat ID (число после /start у @userinfobot или ID группы).');
    const chatId = tgChatIds[0];
    await bot.sendMessage(chatId,
        '✅ <b>Agile Business</b>\nТестовое сообщение: бот и чат настроены верно.',
        { parse_mode: 'HTML' }
    );
}

async function sendEmailToManager({ subject, text }) {
    try {
        const smtpHost = await getSetting('smtp_host');
        const smtpPortRaw = await getSetting('smtp_port');
        const smtpSecureRaw = await getSetting('smtp_secure');
        const smtpUser = await getSetting('smtp_user');
        const smtpPass = await getSetting('smtp_pass');
        const emailFrom = await getSetting('email_from');
        const emailTo = await getSetting('email_to');

        if (!smtpHost || !emailTo) return;
        const smtpPort = Number(smtpPortRaw || 587) || 587;
        const smtpSecure = String(smtpSecureRaw).toLowerCase() === 'true' || String(smtpSecureRaw) === '1';

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined
        });

        await transporter.sendMail({
            from: emailFrom || (smtpUser ? smtpUser : undefined),
            to: emailTo,
            subject: subject || 'Agile Business — уведомление',
            text: text || ''
        });
    } catch (e) {
        console.warn('Email send failed:', e && e.message ? e.message : e);
    }
}

async function sendEmailNewLead(lead) {
    const service = lead.service ? String(lead.service) : '';
    const subject = 'Новая заявка — Agile Business';
    const text =
        `Новая заявка с сайта\n\n` +
        `Имя: ${lead.name || ''}\n` +
        `Email: ${lead.email || ''}\n` +
        `Телефон: ${lead.phone || ''}\n` +
        `Компания: ${lead.company || ''}\n` +
        (service ? `Направление: ${service}\n` : '') +
        (lead.company_size ? `Размер компании: ${lead.company_size}\n` : '') +
        (lead.complexity ? `Пакет: ${lead.complexity}\n` : '') +
        (lead.duration ? `Срок: ${lead.duration}\n` : '') +
        (lead.estimated_price ? `Предварительная оценка: ${Number(lead.estimated_price).toLocaleString('ru-RU')} ₽\n` : '') +
        `\nСообщение:\n${(lead.message || '').slice(0, 2000)}\n` +
        `\nИсточник: ${lead.source || 'contact'}`;
    await sendEmailToManager({ subject, text });
}

/* ── Middleware ──────────────────────────────────────── */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://mc.yandex.ru", "https://yandex.ru", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            scriptSrcAttr: ["'none'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://mc.yandex.ru", "https://*.yandex.ru", "https://*.googleapis.com", "https://cdn.jsdelivr.net", "https://*.tile.openstreetmap.org", "https://*.basemaps.cartocdn.com", "https://unpkg.com"],
            connectSrc: ["'self'", "blob:", "https://mc.yandex.ru", "https://*.basemaps.cartocdn.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            workerSrc: ["'self'", "blob:"],
            frameSrc: ["'self'", "https://api-maps.yandex.ru", "https://yandex.ru"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
// Permissions-Policy: restrict sensitive browser APIs
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
});
/** Маркер ответа приложения: если 429 без этого заголовка — ответ не от Node (прокси/WAF). */
app.use((req, res, next) => {
    res.setHeader('X-AB-App', 'agile-business-node');
    next();
});
app.use(compression());

// Lightweight perf logging (disabled by default). Enable with PERF_LOG=1.
app.use((req, res, next) => {
    if (!perfLoggerEnabled) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1e6;
        // Only log slower requests to keep output readable.
        if (ms > 80) {
            console.log(`[perf] ${req.method} ${req.originalUrl} → ${res.statusCode} in ${ms.toFixed(1)} ms`);
        }
    });
    next();
});

// Production PHP routing uses /api.php/api/... — mirror locally for the same public API paths.
app.use((req, res, next) => {
    if (req.url === '/api.php' || req.url.startsWith('/api.php/')) {
        req.url = req.url.replace(/^\/api\.php/, '') || '/';
    }
    next();
});

// Static assets with cache headers — CSS/JS/images get long caching, HTML does not.
// Важно: статику обрабатываем ДО парсеров тела и сессий, чтобы не тратить ресурсы на CSS/JS/картинки.
const publicStaticMiddleware = express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (/\.(css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
        } else if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
        } else if (/\.html?$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
});

const adminSpaStaticMiddleware = express.static(adminSpaRoot, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (/\.(css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
        else if (/\.html?$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
});

const publicAssetsMiddleware = express.static(path.join(__dirname, 'public', 'assets'), {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
    }
});

const uploadsStaticMiddleware = express.static(path.join(__dirname, 'uploads'), {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
    }
});

app.use((req, res, next) => {
    if (isAdminSubdomainHost(req)) return next();
    publicStaticMiddleware(req, res, next);
});

// На admin.* без общего public: только логотипы и т.п. из public/assets (как в index админки /assets/...)
app.use('/assets', (req, res, next) => {
    if (!isAdminSubdomainHost(req)) return next();
    publicAssetsMiddleware(req, res, next);
});

// Uploaded media for projects/articles/clients
app.use('/uploads', uploadsStaticMiddleware);

// Корень SPA админки (https://admin.example.com/ → admin-subdomain/index.html)
app.use((req, res, next) => {
    if (!isAdminSubdomainHost(req)) return next();
    adminSpaStaticMiddleware(req, res, next);
});

// На admin.* путь /admin/css/... и /admin/js/... тоже должен работать (ссылки в index.html)
app.use('/admin', (req, res, next) => {
    if (!isAdminSubdomainHost(req)) return next();
    adminSpaStaticMiddleware(req, res, next);
});

// Тело запросов и сессии подключаем только после статики.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
const configuredCookieDomain = String(process.env.COOKIE_DOMAIN || '').trim();
const sessionCookieDomain = (configuredCookieDomain && process.env.NODE_ENV === 'production')
    ? configuredCookieDomain
    : undefined;

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        domain: sessionCookieDomain,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Lazy DB connection middleware for all API requests to handle scale-to-zero / cold starts
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api.php')) {
        await ensureDbConnected();
    }
    next();
});

// Клиентские маршруты SPA админки на поддомене (после статики, до публичных ЧПУ)
app.use((req, res, next) => {
    if (!isAdminSubdomainHost(req)) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/admin/')) return next();
    if (/\.\w{1,10}$/.test(req.path)) return next();
    if (res.headersSent) return next();
    res.sendFile(path.join(adminSpaRoot, 'index.html'));
});

/* ── Routes: Pages (ЧПУ) ───────────────────────────── */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/calculator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'calculator.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/works', (req, res) => res.sendFile(path.join(__dirname, 'public', 'works.html')));
app.get('/works/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'work.html')));
app.get('/client/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'client.html')));
app.get('/client-access', (req, res) => res.sendFile(path.join(__dirname, 'public', 'client-access.html')));
app.get('/articles', (req, res) => res.sendFile(path.join(__dirname, 'public', 'articles.html')));
app.get('/articles/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'article.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));

/* ── API: Analytics Track ───────────────────────────── */
app.post('/api/track', async (req, res) => {
    try {
        const ua = req.headers['user-agent'] || '';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        await query(
            'INSERT INTO visitors (session_id, ip, user_agent, device, browser, os, referrer, page, lang) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [req.body.session_id || uuidv4(), ip, ua, req.body.device || 'desktop', req.body.browser || 'unknown', req.body.os || 'unknown', req.body.referrer || '', req.body.page || '/', req.body.lang || 'ru']
        );
        // Update page_views
        const page = req.body.page || '/';
        const today = new Date().toISOString().slice(0, 10);
        await query(
            'INSERT INTO page_views (page, views, view_date) VALUES ($1,1,$2) ON CONFLICT (page, view_date) DO UPDATE SET views = page_views.views + 1',
            [page, today]
        );
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false });
    }
});

/* ── API: Analytics Events (new tracking system) ──────── */
const trackLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});
app.post('/api/analytics/event', trackLimiter, async (req, res) => {
    if (!dbReady) return res.json({ ok: false });
    try {
        const b = req.body || {};
        const sid = String(b.session_id || '').slice(0, 64);
        if (!sid) return res.status(400).json({ error: 'session_id required' });

        const eventType = String(b.event_type || 'pageview').slice(0, 50);
        const pageUrl = String(b.page_url || '').slice(0, 500);
        const pageTitle = String(b.page_title || '').slice(0, 255);
        const referrer = String(b.referrer || '').slice(0, 500);
        const deviceType = String(b.device_type || '').slice(0, 20);
        const browser = String(b.browser || '').slice(0, 50);
        const os = String(b.os || '').slice(0, 50);
        const screenWidth = parseInt(b.screen_width) || 0;
        const screenHeight = parseInt(b.screen_height) || 0;
        const language = String(b.language || '').slice(0, 10);
        const elementClicked = String(b.element_clicked || '').slice(0, 255);
        const scrollDepth = parseInt(b.scroll_depth) || 0;
        const timeOnPage = parseInt(b.time_on_page) || 0;
        const isCalcStart = b.is_calculator_start ? 1 : 0;
        const isCalcComplete = b.is_calculator_complete ? 1 : 0;
        const isLeadSubmit = b.is_lead_submit ? 1 : 0;

        await query(
            `INSERT INTO analytics_events
             (session_id, event_type, page_url, page_title, referrer, device_type, browser, os,
              screen_width, screen_height, language, element_clicked, scroll_depth, time_on_page,
              is_calculator_start, is_calculator_complete, is_lead_submit)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [sid, eventType, pageUrl, pageTitle, referrer, deviceType, browser, os,
             screenWidth, screenHeight, language, elementClicked, scrollDepth, timeOnPage,
             isCalcStart, isCalcComplete, isLeadSubmit]
        );
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false });
    }
});

/* ── API: Smart Match (validate description relevance) ─ */
app.post('/api/smart-match', (req, res) => {
    const { service, text } = req.body;
    if (!service || !text) return res.json({ score: 0, relevant: true });
    
    const info = SERVICE_KEYWORDS[service];
    if (!info) return res.json({ score: 0, relevant: true });
    
    const words = text.toLowerCase().replace(/[^\wа-яё\- ]/gi, '').split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return res.json({ score: 0, relevant: true });

    let matches = 0;
    for (const word of words) {
        for (const kw of info.keywords) {
            if (kw.includes(word) || word.includes(kw)) {
                matches++;
                break;
            }
        }
    }
    
    const score = Math.round((matches / words.length) * 100);
    const relevant = score >= 10 || words.length < 3;
    
    res.json({
        score,
        relevant,
        service_name: info.name,
        hint: !relevant ? `Похоже, ваше описание не связано с направлением "${info.name}". Уточните задачу или выберите другое направление.` : ''
    });
});

/* ── API: Service Context (get tips for selected service) ─ */
app.get('/api/service-context/:service', (req, res) => {
    const info = SERVICE_KEYWORDS[req.params.service];
    if (!info) return res.status(404).json({ error: 'service not found' });
    res.json({
        name: info.name,
        context: info.context,
        keywords: info.keywords.slice(0, 15)
    });
});

/* ── Rate Limiters ──────────────────────────────────── */
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' }
});

const calcLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов.' }
});

const clientAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте позже.' }
});

/* ── Agile Platform Webhook ──────────────────────────── */
const AGILE_API_BASE = (process.env.AGILE_API_BASE || '').replace(/\/+$/, '');
const AGILE_WEBHOOK_SECRET = process.env.AGILE_WEBHOOK_SECRET || '';

async function sendAgileWebhook(lead) {
    if (!AGILE_API_BASE || !AGILE_WEBHOOK_SECRET) return;
    const url = `${AGILE_API_BASE}/api/applications/webhook`;
    const body = {
        name: lead.name || '',
        project_name: lead.service ? `${lead.service} — заявка с сайта` : 'Заявка с сайта',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        message: lead.message || '',
        service: lead.service || ''
    };
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': AGILE_WEBHOOK_SECRET },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            console.error(`Agile webhook ${resp.status}: ${errText}`);
        }
    } catch (e) {
        console.error('Agile webhook error:', e.message);
    }
}

/* ── API: Contact Form ──────────────────────────────── */
app.post('/api/contact', contactLimiter, async (req, res) => {
    const { name, email, phone, company, message, source, service, company_size, complexity, duration, estimated_price, description, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Укажите имя и email' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Некорректный формат email' });

    try {
        const result = await pool.query(
            `INSERT INTO leads (name, email, phone, company, message, source, service, company_size, complexity, duration, estimated_price, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
            [name, email, phone || '', company || '', message || description || '', source || 'contact', service || '', company_size || '', complexity || '', duration || '', estimated_price || 0,
             String(utm_source || '').slice(0, 255), String(utm_medium || '').slice(0, 255), String(utm_campaign || '').slice(0, 255), String(utm_content || '').slice(0, 255), String(utm_term || '').slice(0, 255)]
        );
        
        const leadId = result.rows[0].id;
        const lead = { id: leadId, name, email, phone, company, message: message || description || '', source: source || 'contact', service, company_size, complexity, duration, estimated_price };
        sendTelegramNewLead(lead);
        sendEmailNewLead(lead).catch(() => {});
        sendAgileWebhook(lead).catch(() => {});
        
        res.json({ ok: true, id: leadId });
    } catch (e) {
        console.error('Contact error:', e.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* ── API: Calculator Session ────────────────────────── */
app.post('/api/calculator/start', calcLimiter, async (req, res) => {
    const sessionId = uuidv4();
    try {
        await query(
            'INSERT INTO calculator_sessions (session_id, service) VALUES ($1,$2)',
            [sessionId, req.body.service || '']
        );
        sendTelegramCalcStart(sessionId);
        res.json({ ok: true, sessionId });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
});

app.post('/api/calculator/update', async (req, res) => {
    const { sessionId, step, service, company_size, complexity, duration, description, it_criteria_json } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    try {
        const sets = ['updated_at = NOW()'];
        const params = [];
        let idx = 1;
        if (step !== undefined) { sets.push(`current_step = $${idx++}`); params.push(step); }
        if (service) { sets.push(`service = $${idx++}`); params.push(service); }
        if (company_size) { sets.push(`company_size = $${idx++}`); params.push(company_size); }
        if (complexity) { sets.push(`complexity = $${idx++}`); params.push(complexity); }
        if (duration) { sets.push(`duration = $${idx++}`); params.push(duration); }
        if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
        if (it_criteria_json !== undefined) { sets.push(`it_criteria_json = $${idx++}`); params.push(String(it_criteria_json)); }
        params.push(sessionId);
        const sessionIdx = idx;
        try {
            await query(`UPDATE calculator_sessions SET ${sets.join(', ')} WHERE session_id = $${sessionIdx}`, params);
        } catch (e) {
            // Backward compat if DB doesn't have it_criteria_json yet
            const critIdx = sets.findIndex(s => s.startsWith('it_criteria_json'));
            if (critIdx !== -1) {
                const sets2 = sets.filter((_, i) => i !== critIdx);
                const params2 = params.filter((_, i) => i !== critIdx);
                // Renumber placeholders
                let n = 1;
                const sets2fixed = sets2.map(s => s.includes('$') ? s.replace(/\$\d+/, `$${n++}`) : s);
                params2[params2.length - 1] = sessionId;
                await query(`UPDATE calculator_sessions SET ${sets2fixed.join(', ')} WHERE session_id = $${n}`, params2);
            } else {
                throw e;
            }
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
});

app.post('/api/calculator/complete', async (req, res) => {
    const { sessionId, estimated_price } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    try {
        await query(
            'UPDATE calculator_sessions SET completed = true, estimated_price = $1, updated_at = NOW() WHERE session_id = $2',
            [estimated_price || 0, sessionId]
        );
        const rows = await query('SELECT * FROM calculator_sessions WHERE session_id = $1', [sessionId]);
        if (rows.length) sendTelegramCalcComplete(rows[0]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
});

/* ── API: Calculator Pricing (public) ─────────── */
function getDefaultPricing() {
    return {
        base_prices: {
            management: 250000, investment: 300000, creative: 180000, analytics: 200000, it: 350000
        },
        size_mult: { small: 1, medium: 1.5, large: 2.5 },
        complexity_mult: { basic: 1, standard: 1.8, premium: 3 },
        duration_mult: { short: 1, medium: 0.9, long: 0.8 },
        /* Полный каталог подуслуг для 3 «технических» сфер из ценника.
           sphere: it | analytics | creative. Frontend сам выводит их как чекбоксы. */
        it_criteria: [
            // IT и разработка
            { key: 'it_audit',      sphere: 'it', group: 'IT-консалтинг',       label: 'IT-аудит компании',                  price: 120000 },
            { key: 'it_strategy',   sphere: 'it', group: 'IT-консалтинг',       label: 'Разработка IT-стратегии (1–3 года)', price: 180000 },
            { key: 'digital_trans', sphere: 'it', group: 'IT-консалтинг',       label: 'Консалтинг по цифровой трансформации', price: 220000 },
            // Веб-разработка
            { key: 'landing',       sphere: 'it', group: 'Веб-разработка',      label: 'Лендинг (Landing Page)',             price: 120000 },
            { key: 'corporate',     sphere: 'it', group: 'Веб-разработка',      label: 'Корпоративный сайт',                  price: 250000 },
            { key: 'ecommerce',     sphere: 'it', group: 'Веб-разработка',      label: 'Интернет-магазин',                    price: 450000 },
            { key: 'saas',          sphere: 'it', group: 'Веб-разработка',      label: 'SaaS-платформа (веб-сервис)',         price: 700000 },
            { key: 'web_support',   sphere: 'it', group: 'Веб-разработка',      label: 'Поддержка и развитие веб-проектов',   price: 60000  },
            // Мобильные и корпоративные системы
            { key: 'mobile_cross',  sphere: 'it', group: 'Мобильные и корп. системы', label: 'Кроссплатформенное приложение (iOS+Android)', price: 550000 },
            { key: 'crm_erp',       sphere: 'it', group: 'Мобильные и корп. системы', label: 'CRM / ERP веб-система',          price: 480000 },
            { key: 'bi',            sphere: 'it', group: 'Мобильные и корп. системы', label: 'BI-система (аналитические панели)', price: 260000 },
            // Данные и AI
            { key: 'data_analysis', sphere: 'it', group: 'Данные и AI',         label: 'Анализ и обработка данных',           price: 180000 },
            { key: 'ai_service',    sphere: 'it', group: 'Данные и AI',         label: 'Разработка AI-сервиса',               price: 320000 },
            // Интеграции и безопасность
            { key: 'api_integ',     sphere: 'it', group: 'Интеграции и безопасность', label: 'Интеграции с внешними API',      price: 140000 },
            { key: 'pentest',       sphere: 'it', group: 'Интеграции и безопасность', label: 'Пентест (тест на проникновение)', price: 180000 },
            { key: 'security_audit',sphere: 'it', group: 'Интеграции и безопасность', label: 'Аудит информационной безопасности', price: 220000 },
            // Аналитика
            { key: 'web_analytics', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Веб-аналитика: настройка и аудит', price: 90000  },
            { key: 'mkt_analytics', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Внедрение маркетинговой аналитики', price: 140000 },
            { key: 'end_to_end',    sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Сквозная аналитика (ads→CRM→продажи)', price: 200000 },
            { key: 'cro',           sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'CRO — оптимизация конверсии',    price: 150000 },
            { key: 'bi_dashboards', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'BI-дашборды и отчётность',        price: 180000 },
            // Креатив/маркетинг
            { key: 'brand_strategy',sphere: 'creative',  group: 'Маркетинг',      label: 'Позиционирование и brand-стратегия', price: 180000 },
            { key: 'performance',   sphere: 'creative',  group: 'Маркетинг',      label: 'Performance-маркетинг (ads/SEO)',     price: 120000 },
            { key: 'content',       sphere: 'creative',  group: 'Маркетинг',      label: 'Контент-маркетинг и SMM',             price: 90000  },
            { key: 'funnel',        sphere: 'creative',  group: 'Маркетинг',      label: 'Выстраивание воронки продаж',         price: 140000 }
        ]
    };
}

app.get('/api/pricing/calculator', withJsonCache(
    () => 'pricing:calculator',
    5 * 60 * 1000,
    async (req, res) => {
        if (!dbReady) return res.json({ ok: true, pricing: getDefaultPricing() });
        try {
            const raw = await getSetting('calculator_pricing_json');
            if (!raw) {
                res.setHeader('Cache-Control', 'private, max-age=300');
                return res.json({ ok: true, pricing: getDefaultPricing() });
            }
            const parsed = JSON.parse(raw);
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.json({ ok: true, pricing: parsed });
        } catch (e) {
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.json({ ok: true, pricing: getDefaultPricing() });
        }
    }
));

/* ── API: i18n (public) ─────────────────────────────── */
app.get('/api/i18n/:lang', withJsonCache(
    (req) => `i18n:${String(req.params.lang || '').toLowerCase().slice(0, 10) || 'ru'}`,
    5 * 60 * 1000,
    async (req, res) => {
        const lang = String(req.params.lang || '').toLowerCase().slice(0, 10);
        if (!lang) return res.json({ lang: 'ru', translations: {} });
        if (!dbReady) return res.json({ lang, translations: {} });
        try {
            const rows = await query('SELECT tkey, tvalue FROM i18n_translations WHERE lang = $1', [lang]);
            const translations = {};
            rows.forEach(r => { translations[r.tkey] = r.tvalue; });
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({ lang, translations });
        } catch (e) {
            res.json({ lang, translations: {} });
        }
    }
));

/* ── API: Pages (public) ─────────────────────────────── */
app.get('/api/pages/:slug', withJsonCache(
    (req) => `page:${String(req.params.slug || '').toLowerCase()}:${normPublicLang(req.query.lang)}`,
    60 * 1000,
    async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 80);
    const lang = normPublicLang(req.query.lang);
    if (!slug) return res.status(400).json({ error: 'slug required' });
    if (!dbReady) return res.json({ slug, title: '', html: '' });
    try {
        const baseRows = await query('SELECT id, title, html FROM pages WHERE slug = $1', [slug]);
        if (!baseRows.length) return res.status(404).json({ error: 'not found' });
        const base = baseRows[0];
        let title = base.title || '';
        let html = base.html || '';
        let locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, lang]);
        if (!locRows.length && lang !== 'ru') {
            locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, 'ru']);
        }
        if (locRows.length) {
            if (locRows[0].title) title = locRows[0].title;
            if (locRows[0].html) html = locRows[0].html;
        }
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json({ slug, title, html });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
}));

/* ── API: Projects (public) ──────────────────────────── */
app.get('/api/projects', withJsonCache(
    (req) => `projects:list:${normPublicLang(req.query.lang)}`,
    60 * 1000,
    async (req, res) => {
        const preferred = normPublicLang(req.query.lang);
        if (!dbReady) return res.json({ projects: [] });
        try {
            const rows = await query('SELECT id, slug, cover_image, created_at FROM projects WHERE is_published = true ORDER BY created_at DESC LIMIT 200');
            if (!rows.length) return res.json({ projects: [] });
            const ids = rows.map(r => r.id);
            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            const locs = await query(
                `SELECT project_id, lang, title, excerpt FROM project_locales WHERE project_id IN (${placeholders})`,
                ids
            );
            const byProject = groupRowsByIdLang(locs, 'project_id');
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.json({
                projects: rows.map(p => {
                    const fields = pickListLocaleFields(byProject[p.id], preferred, 'title', 'excerpt');
                    return {
                        id: p.id,
                        slug: p.slug,
                        cover_image: p.cover_image || '',
                        created_at: p.created_at,
                        title: fields.title,
                        excerpt: fields.excerpt
                    };
                })
            });
        } catch (e) {
            console.error('GET /api/projects error:', e.message);
            res.status(500).json({ error: 'server error' });
        }
    }
));

/**
 * Одним запросом: контент страницы «works» + список проектов.
 * Раньше было два GET (/api/pages/works + /api/projects) — при лимите запросов/сек (429) второй отваливался.
 */
app.get('/api/bundle/works', withJsonCache(
    (req) => `bundle:works:${normPublicLang(req.query.lang)}`,
    30 * 1000,
    async (req, res) => {
        const preferred = normPublicLang(req.query.lang);
        if (!dbReady) {
            return res.json({ page: { slug: 'works', title: '', html: '' }, projects: [] });
        }
        try {
            let page = { slug: 'works', title: '', html: '' };
            const baseRows = await query('SELECT id, title, html FROM pages WHERE slug = $1', ['works']);
            if (baseRows.length) {
                const base = baseRows[0];
                let title = base.title || '';
                let html = base.html || '';
                let locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, preferred]);
                if (!locRows.length && preferred !== 'ru') {
                    locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, 'ru']);
                }
                if (locRows.length) {
                    if (locRows[0].title) title = locRows[0].title;
                    if (locRows[0].html) html = locRows[0].html;
                }
                page = { slug: 'works', title, html };
            }

            const rows = await query('SELECT id, slug, cover_image, created_at FROM projects WHERE is_published = true ORDER BY created_at DESC LIMIT 200');
            let projects = [];
            if (rows.length) {
                const ids = rows.map(r => r.id);
                const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
                const locs = await query(
                    `SELECT project_id, lang, title, excerpt FROM project_locales WHERE project_id IN (${placeholders})`,
                    ids
                );
                const byProject = groupRowsByIdLang(locs, 'project_id');
                projects = rows.map(p => {
                    const fields = pickListLocaleFields(byProject[p.id], preferred, 'title', 'excerpt');
                    return {
                        id: p.id,
                        slug: p.slug,
                        cover_image: p.cover_image || '',
                        created_at: p.created_at,
                        title: fields.title,
                        excerpt: fields.excerpt
                    };
                });
            }

            res.set('Cache-Control', 'private, max-age=30');
            res.json({ page, projects });
        } catch (e) {
            console.error('GET /api/bundle/works error:', e.message);
            res.status(500).json({ error: 'server error' });
        }
    }
));

app.get('/api/projects/:slug', withJsonCache(
    (req) => `project:${String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120)}:${normPublicLang(req.query.lang)}`,
    5 * 60 * 1000,
    async (req, res) => {
        const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120);
        const preferred = normPublicLang(req.query.lang);
        if (!slug) return res.status(400).json({ error: 'slug required' });
        if (!dbReady) return res.json({ slug, project: null });
        try {
            const rows = await query('SELECT id, slug, cover_image, deadline_text, duration_text, created_at FROM projects WHERE slug = $1 AND is_published = true', [slug]);
            if (!rows.length) return res.status(404).json({ error: 'not found' });
            const p = rows[0];
            const locRows = await query(
                'SELECT lang, title, excerpt, html, gallery_json, stack_json, stack_front_json, stack_back_json, stack_db_json, stack_deploy_json, stack_android_json, stack_ios_json FROM project_locales WHERE project_id = $1',
                [p.id]
            );
            const byLang = {};
            for (const r of locRows) {
                byLang[String(r.lang || '').toLowerCase()] = r;
            }
            const locale = pickProjectDetailLocale(byLang, preferred);
            const stackGroups = {
                front: normalizePublicStackItems(safeJsonArray(locale.stack_front_json)),
                back: normalizePublicStackItems(safeJsonArray(locale.stack_back_json)),
                db: normalizePublicStackItems(safeJsonArray(locale.stack_db_json)),
                deploy: normalizePublicStackItems(safeJsonArray(locale.stack_deploy_json)),
                android: normalizePublicStackItems(safeJsonArray(locale.stack_android_json)),
                ios: normalizePublicStackItems(safeJsonArray(locale.stack_ios_json))
            };

            const legacyStack = normalizePublicStackItems(safeJsonArray(locale.stack_json));
            const anyGroup = Object.values(stackGroups).some(arr => Array.isArray(arr) && arr.length > 0);
            if (!anyGroup && legacyStack.length) {
                stackGroups.front = legacyStack;
            }
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({
                slug,
                project: {
                    id: p.id,
                    slug: p.slug,
                    cover_image: p.cover_image || '',
                    deadline_text: p.deadline_text || '',
                    duration_text: p.duration_text || '',
                    created_at: p.created_at,
                    title: locale.title || '',
                    excerpt: locale.excerpt || '',
                    html: locale.html || '',
                    gallery: safeJsonArray(locale.gallery_json),
                    stack: legacyStack,
                    stack_groups: stackGroups
                }
            });
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    }
));

/* ── API: Project Review (public) ───────────────────── */
app.get('/api/projects/:slug/review', withJsonCache(
    (req) => `projectReview:${String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120)}:${normPublicLang(req.query.lang)}`,
    5 * 60 * 1000,
    async (req, res) => {
        const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120);
        const lang = String(req.query.lang || '').toLowerCase().slice(0, 10);
        if (!slug) return res.status(400).json({ error: 'slug required' });
        if (!dbReady) return res.json({ review: null });
        try {
            const pr = await query(
                `SELECT p.id as project_id
                 FROM projects p
                 WHERE p.slug = $1 AND p.is_published = true`,
                [slug]
            );
            if (!pr.length) return res.status(404).json({ error: 'not found' });
            const projectId = pr[0].project_id;
            const langTry = [lang || 'ru'];
            if (langTry[0] !== 'ru') langTry.push('ru');

            let r = null;
            for (const L of langTry) {
                const rows = await query(
                    `SELECT r.rating, r.review_text, r.company_name AS r_company, r.logo_url AS r_logo, r.website AS r_website,
                            c.slug as client_slug, cp.company_name, cp.logo_url, cp.website
                     FROM project_reviews r
                     LEFT JOIN clients c ON c.id = r.client_id
                     LEFT JOIN client_profiles cp ON cp.client_id = c.id
                     WHERE r.project_id = $1 AND r.is_published = true AND r.lang = $2
                     ORDER BY r.updated_at DESC, r.id DESC
                     LIMIT 1`,
                    [projectId, L]
                );
                if (rows.length) {
                    r = rows[0];
                    break;
                }
            }

            if (!r) return res.json({ review: null });
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({
                review: {
                    rating: r.rating || 5,
                    text: r.review_text || '',
                    client: {
                        slug: r.client_slug || '',
                        company_name: r.r_company || r.company_name || '',
                        logo_url: r.r_logo || r.logo_url || '',
                        website: r.r_website || r.website || ''
                    }
                }
            });
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    }
));

/* ── API: Articles bundle (page + list in one request) ── */
app.get('/api/bundle/articles', withJsonCache(
    (req) => `bundle:articles:${normPublicLang(req.query.lang)}`,
    30 * 1000,
    async (req, res) => {
        const preferred = normPublicLang(req.query.lang);
        if (!dbReady) {
            return res.json({ page: { slug: 'articles', title: '', html: '' }, articles: [] });
        }
        try {
            let page = { slug: 'articles', title: '', html: '' };
            const baseRows = await query('SELECT id, title, html FROM pages WHERE slug = $1', ['articles']);
            if (baseRows.length) {
                const base = baseRows[0];
                let title = base.title || '';
                let html = base.html || '';
                let locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, preferred]);
                if (!locRows.length && preferred !== 'ru') {
                    locRows = await query('SELECT title, html FROM page_locales WHERE page_id = $1 AND lang = $2', [base.id, 'ru']);
                }
                if (locRows.length) {
                    if (locRows[0].title) title = locRows[0].title;
                    if (locRows[0].html) html = locRows[0].html;
                }
                page = { slug: 'articles', title, html };
            }

            const rows = await query('SELECT id, slug, cover_image, created_at FROM articles WHERE is_published = true ORDER BY created_at DESC LIMIT 200');
            let articles = [];
            if (rows.length) {
                const ids = rows.map(r => r.id);
                const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
                const locs = await query(
                    `SELECT article_id, lang, title, excerpt FROM article_locales WHERE article_id IN (${placeholders})`,
                    ids
                );
                const byArticle = groupRowsByIdLang(locs, 'article_id');
                articles = rows.map(a => {
                    const fields = pickListLocaleFields(byArticle[a.id], preferred, 'title', 'excerpt');
                    return {
                        id: a.id,
                        slug: a.slug,
                        cover_image: a.cover_image || '',
                        created_at: a.created_at,
                        title: fields.title,
                        excerpt: fields.excerpt
                    };
                });
            }

            res.set('Cache-Control', 'private, max-age=30');
            res.json({ page, articles });
        } catch (e) {
            console.error('GET /api/bundle/articles error:', e.message);
            res.status(500).json({ error: 'server error' });
        }
    }
));

/* ── API: Articles (public) ─────────────────────────── */
app.get('/api/articles', withJsonCache(
    (req) => `articles:list:${normPublicLang(req.query.lang)}`,
    60 * 1000,
    async (req, res) => {
        const preferred = normPublicLang(req.query.lang);
        if (!dbReady) return res.json({ articles: [] });
        try {
            const rows = await query('SELECT id, slug, cover_image, created_at FROM articles WHERE is_published = true ORDER BY created_at DESC LIMIT 200');
            if (!rows.length) return res.json({ articles: [] });
            const ids = rows.map(r => r.id);
            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            const locs = await query(
                `SELECT article_id, lang, title, excerpt FROM article_locales WHERE article_id IN (${placeholders})`,
                ids
            );
            const byArticle = {};
            for (const l of locs) {
                const aid = l.article_id;
                const L = String(l.lang || '').toLowerCase();
                if (!byArticle[aid]) byArticle[aid] = {};
                byArticle[aid][L] = l;
            }
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.json({
                articles: rows.map(a => {
                    const fields = pickListLocaleFields(byArticle[a.id], preferred, 'title', 'excerpt');
                    return {
                        id: a.id,
                        slug: a.slug,
                        cover_image: a.cover_image || '',
                        created_at: a.created_at,
                        title: fields.title,
                        excerpt: fields.excerpt
                    };
                })
            });
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    }
));

app.get('/api/articles/:slug', withJsonCache(
    (req) => `article:${String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 140)}:${normPublicLang(req.query.lang)}`,
    5 * 60 * 1000,
    async (req, res) => {
        const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 140);
        const preferred = normPublicLang(req.query.lang);
        if (!slug) return res.status(400).json({ error: 'slug required' });
        if (!dbReady) return res.json({ article: null });
        try {
            const rows = await query('SELECT id, slug, cover_image, created_at FROM articles WHERE slug = $1 AND is_published = true', [slug]);
            if (!rows.length) return res.status(404).json({ error: 'not found' });
            const a = rows[0];
            const locRows = await query(
                'SELECT lang, title, excerpt, html, gallery_json, stack_json FROM article_locales WHERE article_id = $1',
                [a.id]
            );
            const byLang = {};
            for (const r of locRows) {
                byLang[String(r.lang || '').toLowerCase()] = r;
            }
            const locale = pickArticleDetailLocale(byLang, preferred);
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({
                article: {
                    id: a.id,
                    slug: a.slug,
                    cover_image: a.cover_image || '',
                    created_at: a.created_at,
                    title: locale.title || '',
                    excerpt: locale.excerpt || '',
                    html: locale.html || '',
                    gallery: safeJsonArray(locale.gallery_json),
                    stack: normalizePublicStackItems(safeJsonArray(locale.stack_json))
                }
            });
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    }
));

/* ── API: Client Profile (public) ───────────────────── */
app.get('/api/clients/:slug', withJsonCache(
    (req) => `client:${String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120)}`,
    5 * 60 * 1000,
    async (req, res) => {
        const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120);
        if (!slug) return res.status(400).json({ error: 'slug required' });
        if (!dbReady) return res.json({ client: null });
        try {
            const rows = await query(
                `SELECT c.slug, cp.company_name, cp.logo_url, cp.website, cp.description,
                    cp.address, cp.city, cp.country, cp.show_map, cp.lat, cp.lng
                 FROM clients c
                 LEFT JOIN client_profiles cp ON cp.client_id = c.id
                 WHERE c.slug = $1 AND c.is_active = true
                 LIMIT 1`,
                [slug]
            );
            if (!rows.length) return res.status(404).json({ error: 'not found' });
            const c = rows[0];
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({
                client: {
                    slug: c.slug,
                    company_name: c.company_name || '',
                    logo_url: c.logo_url || '',
                    website: c.website || '',
                    description: c.description || '',
                    address: c.address || '',
                    city: c.city || '',
                    country: c.country || '',
                    show_map: c.show_map !== false,
                    lat: c.lat === null ? null : Number(c.lat),
                    lng: c.lng === null ? null : Number(c.lng)
                }
            });
        } catch (e) {
            res.status(500).json({ error: 'server error' });
        }
    }
));

function safeJsonArray(v) {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'object') return [];
    try {
        const a = JSON.parse(String(v));
        return Array.isArray(a) ? a : [];
    } catch (e) {
        return [];
    }
}

/** Читабельная подпись технологии из поля label/name (без String({}) → "[object Object]") */
function stackLabelPlain(lab) {
    if (lab == null) return '';
    const t = typeof lab;
    if (t === 'string' || t === 'number') return String(lab).trim();
    if (t === 'boolean') return lab ? 'true' : 'false';
    if (t !== 'object') return String(lab).trim();
    if (Array.isArray(lab)) return '';
    const tryStr = (v) => (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : '';
    let s = tryStr(lab.ru) || tryStr(lab.en) || tryStr(lab.default);
    if (!s && lab.label != null) s = stackLabelPlain(lab.label);
    if (!s && lab.name != null) s = stackLabelPlain(lab.name);
    return (s || '').trim();
}

const BAD_STACK_LABEL_STR = /^\[object object\]$/i;

function prettyTechTitleFromSlug(id) {
    if (!id || typeof id !== 'string') return '';
    const slug = id.toLowerCase();
    if (!slug || slug === 'objectobject') return '';
    return slug.split(/[-_]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || slug;
}

/** Починка уже сохранённого stack для публичного API (битый label → из id) */
function normalizePublicStackItems(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const raw of arr) {
        if (raw == null) continue;
        if (typeof raw === 'string' || typeof raw === 'number') {
            let label = String(raw).trim();
            if (!label || BAD_STACK_LABEL_STR.test(label)) continue;
            let id = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'x';
            if (id === 'objectobject') continue;
            out.push({ id, label: label.slice(0, 120) });
            continue;
        }
        if (typeof raw !== 'object' || Array.isArray(raw)) continue;
        const idRaw = raw.id != null ? raw.id : (raw.slug != null ? raw.slug : raw.key);
        let id = String(idRaw != null ? idRaw : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
        const lab = raw.label != null ? raw.label : raw.name;
        let label = lab != null && typeof lab === 'object' ? stackLabelPlain(lab) : String(lab != null ? lab : '').trim();
        if (!label || BAD_STACK_LABEL_STR.test(label)) label = '';
        if (!label && id) label = prettyTechTitleFromSlug(id);
        if (!id && label) id = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'x';
        if (!label && !id) continue;
        if (BAD_STACK_LABEL_STR.test(label) || id === 'objectobject') continue;
        out.push({ id, label: label.slice(0, 120) });
        if (out.length >= 50) break;
    }
    return out;
}

/** Add columns on existing databases (idempotent). Uses pool before dbReady. */
async function ensureExtraSchemaColumns() {
    const specs = [
        { table: 'project_locales', column: 'stack_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_front_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_back_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_db_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_deploy_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_android_json', def: 'TEXT' },
        { table: 'project_locales', column: 'stack_ios_json', def: 'TEXT' },
        { table: 'article_locales', column: 'gallery_json', def: 'TEXT' },
        { table: 'article_locales', column: 'stack_json', def: 'TEXT' }
    ];
    for (const { table, column, def } of specs) {
        try {
            const { rows } = await pool.query(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
                [table, column]
            );
            if (!rows || !rows.length) {
                await pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${def}`);
                console.log(`  ✅ DB migration: ${table}.${column}`);
            }
        } catch (e) {
            console.warn(`  ⚠️  DB check ${table}.${column}:`, e.message);
        }
    }
}

/** Normalize lang for locale lookups; default ru so public API never skips locales when query is empty. */
function normPublicLang(lang) {
    return String(lang || 'ru').toLowerCase().slice(0, 10);
}

function groupRowsByIdLang(rows, idField) {
    const byId = {};
    for (const r of rows) {
        const id = r[idField];
        const L = String(r.lang || '').toLowerCase();
        if (!byId[id]) byId[id] = {};
        byId[id][L] = r;
    }
    return byId;
}

/** Prefer requested lang, then ru, then any row (projects/articles list cards). */
function pickListLocaleFields(byLang, preferredLang, titleKey, excerptKey) {
    const p = normPublicLang(preferredLang);
    for (const L of [p, 'ru']) {
        const row = byLang && byLang[L];
        if (row && (row[titleKey] || row[excerptKey])) {
            return { title: row[titleKey] || '', excerpt: row[excerptKey] || '' };
        }
    }
    const first = byLang && Object.values(byLang)[0];
    return first
        ? { title: first[titleKey] || '', excerpt: first[excerptKey] || '' }
        : { title: '', excerpt: '' };
}

/** Prefer requested lang, then ru, then any row (project detail with html + gallery_json). */
function pickProjectDetailLocale(byLang, preferredLang) {
    const p = normPublicLang(preferredLang);
    for (const L of [p, 'ru']) {
        const row = byLang && byLang[L];
        if (row && (row.title || row.html)) return { ...row };
    }
    const first = byLang && Object.values(byLang)[0];
    return first || { title: '', excerpt: '', html: '', gallery_json: '[]', stack_json: '[]' };
}

/** Prefer requested lang, then ru, then any row (article detail). */
function pickArticleDetailLocale(byLang, preferredLang) {
    const p = normPublicLang(preferredLang);
    for (const L of [p, 'ru']) {
        const row = byLang && byLang[L];
        if (row && (row.title || row.html)) return { ...row };
    }
    const first = byLang && Object.values(byLang)[0];
    return first || { title: '', excerpt: '', html: '', gallery_json: '[]', stack_json: '[]' };
}

/* ── API: Client auth (public) ──────────────────────── */
function requireClient(req, res, next) {
    if (req.session && req.session.clientId) return next();
    res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/client/register', clientAuthLimiter, async (req, res) => {
    if (!dbReady) return res.status(503).json({ error: 'db offline' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const slug = String(req.body.slug || '').trim().toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 120);
    if (!email || !password || password.length < 6) return res.status(400).json({ error: 'email and password (min 6) required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid email format' });
    if (!slug) return res.status(400).json({ error: 'slug required' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query('INSERT INTO clients (slug, email, password_hash) VALUES ($1,$2,$3) RETURNING id', [slug, email, hash]);
        const clientId = result.rows[0].id;
        await pool.query('INSERT INTO client_profiles (client_id, company_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [clientId, '']);
        req.session.clientId = clientId;
        res.json({ ok: true, slug });
    } catch (e) {
        res.status(400).json({ error: 'register failed' });
    }
});

app.post('/api/client/login', clientAuthLimiter, async (req, res) => {
    if (!dbReady) return res.status(503).json({ error: 'db offline' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid email format' });
    try {
        const rows = await query('SELECT id, password_hash, slug, is_active FROM clients WHERE email = $1 LIMIT 1', [email]);
        if (!rows.length) return res.status(401).json({ error: 'invalid credentials' });
        const c = rows[0];
        if (!c.is_active) return res.status(403).json({ error: 'inactive' });
        if (!(await bcrypt.compare(password, c.password_hash))) return res.status(401).json({ error: 'invalid credentials' });
        req.session.clientId = c.id;
        res.json({ ok: true, slug: c.slug });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
});

app.post('/api/client/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ ok: true });
        });
        return;
    }
    res.json({ ok: true });
});

app.get('/api/client/me', requireClient, async (req, res) => {
    if (!dbReady) return res.status(503).json({ error: 'db offline' });
    try {
        const rows = await query('SELECT slug, email FROM clients WHERE id = $1 LIMIT 1', [req.session.clientId]);
        if (!rows.length) return res.status(401).json({ error: 'unauthorized' });
        res.json({ ok: true, client: { slug: rows[0].slug, email: rows[0].email } });
    } catch (e) {
        res.status(500).json({ error: 'server error' });
    }
});

/* ── Admin Panel ─────────────────────────────────────── */
const createAdminRouter = require('./admin-routes');
app.use('/api/admin', express.json({ limit: '5mb' }), createAdminRouter(pool, {
    reloadTelegramBot: initBot,
    sendTelegramTest: sendTelegramTestMessage,
    isDbReady: () => dbReady,
    invalidatePublicCache
}));

// Serve admin SPA (production: only admin subdomain; local dev: /admin path works)
const isProduction = process.env.NODE_ENV === 'production';
app.use('/admin', (req, res, next) => {
    if (!isProduction || isAdminSubdomainHost(req)) return next();
    return res.redirect('/');
}, express.static(path.join(__dirname, 'admin-subdomain'), {
    etag: true, lastModified: true,
    setHeaders(res, filePath) {
        if (/\.(css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
        else if (/\.html?$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
}));
app.get('/admin/*', (req, res) => {
    if (isProduction && !isAdminSubdomainHost(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'admin-subdomain', 'index.html'));
});

// Public endpoint for Metrika counter ID
app.get('/api/metrika-id', async (req, res) => {
    try {
        if (!dbReady) return res.json({ counter_id: '' });
        const rows = await query('SELECT setting_value FROM settings WHERE setting_key = $1', ['ym_counter_id']);
        res.json({ counter_id: rows.length ? rows[0].setting_value : '' });
    } catch (e) { res.json({ counter_id: '' }); }
});

// Public endpoint for site contact info (used by main.js to hydrate [data-site] elements)
app.get('/api/site-info', async (req, res) => {
    try {
        if (!dbReady) return res.json({});
        const keys = ['site_phone', 'site_email', 'site_address', 'site_whatsapp', 'site_telegram'];
        const rows = await query('SELECT setting_key, setting_value FROM settings WHERE setting_key = ANY($1)', [keys]);
        const info = {};
        rows.forEach(r => { info[r.setting_key.replace('site_', '')] = r.setting_value; });
        res.json(info);
    } catch (e) { res.json({}); }
});

/* ── 404 Catch-All ──────────────────────────────────── */
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

/* ── Centralized Error Handler ──────────────────────── */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    const isClientError = status >= 400 && status < 500;

    if (req.path && req.path.startsWith('/api/')) {
        return res.status(status).json({
            error: isClientError ? 'bad request' : 'server error'
        });
    }

    res.status(status);
    try {
        return res.sendFile(path.join(__dirname, 'public', '500.html'));
    } catch {
        return res
            .type('text/plain')
            .send(isClientError ? 'Bad request' : 'Server error');
    }
});

/* ── Start ──────────────────────────────────────────── */

async function startServer() {
    if (process.env.VERCEL) {
        console.log('  ⚡ Running on Vercel (serverless mode). Bypassing app.listen() and eager DB connection.');
        ensureDbConnected().catch(e => {
            console.warn('  ⚠️ Lazy DB connection on Vercel startup failed:', e.message);
        });
        return;
    }

    try {
        await pool.query('SELECT 1');
        console.log('  ✅ PostgreSQL connected');
        await ensureExtraSchemaColumns();
        dbReady = true;

        // Auto-regenerate sitemap.xml for faster indexing in Google Console.
        try {
            const scriptPath = path.join(__dirname, 'scripts', 'rebuild-sitemap.js');
            await new Promise(resolve => {
                execFile(process.execPath, [scriptPath], (err, stdout, stderr) => {
                    if (err) console.warn('  ⚠️ sitemap rebuild skipped:', err.message);
                    else if (stdout && String(stdout).trim()) console.log(String(stdout).trim());
                    if (stderr && String(stderr).trim()) console.warn(String(stderr).trim());
                    resolve();
                });
            });
        } catch (e) {
            console.warn('  ⚠️ sitemap rebuild failed:', e && e.message ? e.message : e);
        }
    } catch (e) {
        console.warn('  ⚠️  PostgreSQL not available:', e.message);
        console.warn('  ℹ️  Server will run in static-only mode (no DB features)');
        console.warn('  💡 Run: node setup-db.js  to enable full functionality');
    }

    await initBot();
    
    app.listen(PORT, () => {
        console.log(`\n  🚀 Agile Business Server v2.0`);
        console.log(`  ──────────────────────────────`);
        console.log(`  → http://localhost:${PORT}`);
        console.log(`  → http://localhost:${PORT}/calculator`);
        console.log(`  📎 Все ответы этого процесса содержат заголовок: X-AB-App: agile-business-node`);
        console.log(`     Если в браузере 429 и есть X-RateLimit-* но НЕТ X-AB-App — занят другой порт/процесс.`);
        console.log(`     Задайте в .env другой PORT (например 3010) и перезапустите.`);
        if (!dbReady) console.log(`  ⚠️  Database: offline (static-only mode)`);
        console.log('');
    });
}

startServer();

module.exports = app;
