/**
 * Admin API Routes — Agile Business Admin Panel (PostgreSQL)
 * All /api/admin/* endpoints for CRM, CMS, analytics, user management
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const QRCode = require('qrcode');

// Simple TOTP implementation (RFC 6238) — no external dependency
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function hexToBase32(hex) {
    const bytes = Buffer.from(hex, 'hex');
    let bits = '';
    for (const b of bytes) bits += b.toString(2).padStart(8, '0');
    let out = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        out += BASE32_CHARS[parseInt(chunk, 2)];
    }
    return out;
}
function generateTOTPSecret() { return crypto.randomBytes(20).toString('hex'); }
function verifyTOTP(secret, code) {
    if (!secret || !code) return false;
    const time = Math.floor(Date.now() / 30000);
    for (let i = -1; i <= 1; i++) {
        const t = time + i;
        const buf = Buffer.alloc(8);
        buf.writeUInt32BE(Math.floor(t / 0x100000000), 0);
        buf.writeUInt32BE(t & 0xffffffff, 4);
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(buf).digest();
        const offset = hmac[hmac.length - 1] & 0xf;
        const otp = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
        if (String(otp).padStart(6, '0') === String(code).trim()) return true;
    }
    return false;
}
module.exports = function createAdminRouter(pool, hooks = {}) {
    const router = express.Router();

    async function q(sql, params) {
        const { rows } = await pool.query(sql, params || []);
        return rows;
    }
    async function ex(sql, params) {
        const result = await pool.query(sql, params || []);
        return result;
    }
    async function getSetting(key) {
        const rows = await q('SELECT setting_value FROM settings WHERE setting_key = $1', [key]);
        return rows.length ? rows[0].setting_value : '';
    }
    async function setSetting(key, value) {
        await q('INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2', [key, value]);
    }

    const CYR_TO_LAT = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
        к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
        х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
    };

    function slugifyText(value, maxLen = 120) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return '';
        const translit = Array.from(raw).map(ch => Object.prototype.hasOwnProperty.call(CYR_TO_LAT, ch) ? CYR_TO_LAT[ch] : ch).join('');
        return translit
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-')
            .slice(0, maxLen)
            .replace(/-+$/g, '');
    }

    function firstLocaleTitle(locales) {
        if (!locales || typeof locales !== 'object') return '';
        for (const data of Object.values(locales)) {
            if (data && typeof data.title === 'string' && data.title.trim()) return data.title.trim();
        }
        return '';
    }

    async function ensureUniqueSlug(tableName, wantedSlug, currentId, maxLen) {
        const base = slugifyText(wantedSlug, maxLen);
        if (!base) return '';
        let candidate = base;
        let suffix = 2;
        while (true) {
            const rows = currentId
                ? await q(`SELECT id FROM ${tableName} WHERE slug = $1 AND id <> $2 LIMIT 1`, [candidate, currentId])
                : await q(`SELECT id FROM ${tableName} WHERE slug = $1 LIMIT 1`, [candidate]);
            if (!rows.length) return candidate;
            const tail = `-${suffix++}`;
            candidate = `${base.slice(0, Math.max(1, maxLen - tail.length))}${tail}`;
        }
    }

    function clearPublicCaches(prefixes) {
        if (typeof hooks.invalidatePublicCache === 'function') {
            hooks.invalidatePublicCache(Array.isArray(prefixes) ? prefixes : [prefixes]);
        }
    }

    /* ── Ensure admin tables exist ──────────────────── */
    async function ensureAdminTables() {
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(255) DEFAULT 'Admin',
                role VARCHAR(20) DEFAULT 'manager',
                avatar_url VARCHAR(500) DEFAULT '',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                totp_secret VARCHAR(255) DEFAULT '',
                totp_enabled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users (role)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users (is_active)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                lead_id INT NULL,
                client_name VARCHAR(255) NOT NULL DEFAULT '',
                client_email VARCHAR(255) DEFAULT '',
                client_phone VARCHAR(100) DEFAULT '',
                service VARCHAR(100) DEFAULT '',
                description TEXT,
                status VARCHAR(30) DEFAULT 'new',
                total_price DECIMAL(12,2) DEFAULT 0,
                source VARCHAR(100) DEFAULT '',
                source_detail VARCHAR(255) DEFAULT '',
                deadline DATE NULL,
                assigned_to INT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_lead ON orders (lead_id)`);

            // ── New CRM/Finance/Security tables ──────────
            await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY, entity_type VARCHAR(30) DEFAULT '', entity_id INT NULL,
                title VARCHAR(500) NOT NULL DEFAULT '', description TEXT, assigned_to INT NULL,
                due_date TIMESTAMP NULL, status VARCHAR(20) DEFAULT 'pending',
                priority VARCHAR(20) DEFAULT 'normal', created_by INT NULL,
                completed_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks (entity_type, entity_id)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks (assigned_to)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks (due_date)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY, entity_type VARCHAR(30) NOT NULL DEFAULT '', entity_id INT NOT NULL,
                user_id INT NULL, text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments (entity_type, entity_id)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS lead_stage_history (
                id SERIAL PRIMARY KEY, lead_id INT NOT NULL, from_stage VARCHAR(50) DEFAULT '',
                to_stage VARCHAR(50) NOT NULL, user_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON lead_stage_history (lead_id)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS content_versions (
                id SERIAL PRIMARY KEY, entity_type VARCHAR(30) NOT NULL DEFAULT '', entity_id INT NOT NULL,
                lang VARCHAR(10) DEFAULT 'ru', title VARCHAR(500) DEFAULT '', html TEXT, created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_versions_entity ON content_versions (entity_type, entity_id)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS proposals (
                id SERIAL PRIMARY KEY, order_id INT NULL, lead_id INT NULL,
                client_name VARCHAR(255) DEFAULT '', client_email VARCHAR(255) DEFAULT '', client_phone VARCHAR(100) DEFAULT '',
                items_json JSONB, total DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'draft',
                valid_until DATE NULL, notes TEXT, created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals (lead_id)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposals_order ON proposals (order_id)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY, proposal_id INT NULL, order_id INT NULL,
                client_name VARCHAR(255) DEFAULT '', client_email VARCHAR(255) DEFAULT '',
                items_json JSONB, total DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'draft',
                due_date DATE NULL, paid_at TIMESTAMP NULL, notes TEXT, created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY, user_id INT NULL, username VARCHAR(100) DEFAULT '',
                action VARCHAR(100) NOT NULL DEFAULT '', entity_type VARCHAR(50) DEFAULT '', entity_id INT NULL,
                details TEXT, ip VARCHAR(45) DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at)`);

            await pool.query(`CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY, username VARCHAR(100) DEFAULT '', ip VARCHAR(45) DEFAULT '',
                success BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts (created_at)`);
            await pool.query(`CREATE TABLE IF NOT EXISTS seo_settings (
                id SERIAL PRIMARY KEY,
                page VARCHAR(120) UNIQUE NOT NULL,
                seo_title VARCHAR(255) DEFAULT '',
                seo_description TEXT DEFAULT '',
                keywords TEXT DEFAULT '',
                keywords_plus TEXT DEFAULT '',
                keywords_minus TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // ── Safe ALTER: add columns if missing ─────
            const safeAddCol = async (table, col, def) => {
                try { await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`); } catch(e) { /* already exists */ }
            };
            await safeAddCol('leads', 'stage', "VARCHAR(50) DEFAULT 'new'");
            await safeAddCol('leads', 'utm_source', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('orders', 'total_price', "DECIMAL(12,2) DEFAULT 0");
            await safeAddCol('leads', 'utm_medium', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('leads', 'utm_campaign', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('leads', 'utm_content', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('leads', 'utm_term', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('pages', 'status', "VARCHAR(20) DEFAULT 'published'");
            await safeAddCol('pages', 'publish_at', "TIMESTAMP NULL");
            await safeAddCol('pages', 'seo_title', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('projects', 'deadline_text', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('projects', 'duration_text', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('pages', 'seo_description', "TEXT");
            await safeAddCol('pages', 'og_title', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('pages', 'og_description', "TEXT");
            await safeAddCol('articles', 'status', "VARCHAR(20) DEFAULT 'published'");
            await safeAddCol('articles', 'publish_at', "TIMESTAMP NULL");
            await safeAddCol('articles', 'seo_title', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('articles', 'seo_description', "TEXT");
            await safeAddCol('articles', 'og_title', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('articles', 'og_description', "TEXT");
            await safeAddCol('seo_settings', 'seo_title', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('seo_settings', 'seo_description', "TEXT DEFAULT ''");
            await safeAddCol('seo_settings', 'keywords_plus', "TEXT DEFAULT ''");
            await safeAddCol('seo_settings', 'keywords_minus', "TEXT DEFAULT ''");
            await safeAddCol('admin_users', 'totp_secret', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('admin_users', 'totp_enabled', "BOOLEAN DEFAULT FALSE");
            await safeAddCol('client_profiles', 'show_map', "BOOLEAN DEFAULT TRUE");

            // project_reviews: allow direct review data without requiring clients table
            await safeAddCol('project_reviews', 'company_name', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('project_reviews', 'logo_url', "VARCHAR(255) DEFAULT ''");
            await safeAddCol('project_reviews', 'website', "VARCHAR(255) DEFAULT ''");
            try { await pool.query("ALTER TABLE project_reviews ALTER COLUMN client_id DROP NOT NULL"); } catch(e) { /* already nullable or missing */ }

            // Create default admin if none exists
            const admins = await q('SELECT id FROM admin_users LIMIT 1');
            if (!admins.length) {
                const hash = bcrypt.hashSync('admin123', 10);
                await ex('INSERT INTO admin_users (username, password_hash, display_name, role) VALUES ($1,$2,$3,$4)',
                    ['admin', hash, 'Администратор', 'admin']);
                console.log('  Default admin created (admin / admin123)');
            }
        } catch (e) {
            console.warn('  Admin tables setup:', e.message);
        }
    }
    ensureAdminTables();

    /* ── Auth Middleware ─────────────────────────────── */
    async function auditLog(req, action, entityType, entityId, details) {
        try {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            await ex('INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [req.session?.adminId || null, req.session?.adminName || '', action, entityType || '', entityId || null, details ? String(details).slice(0, 2000) : '', String(ip).slice(0, 45)]);
        } catch(e) { /* ignore audit errors */ }
    }

    function requireAdmin(req, res, next) {
        if (req.session && req.session.adminId) return next();
        res.status(401).json({ error: 'Unauthorized' });
    }
    function requireRole(...roles) {
        return (req, res, next) => {
            if (!req.session || !req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
            if (roles.length && !roles.includes(req.session.adminRole)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            next();
        };
    }

    /* ── Analytics Dashboard (internal DB-based) ─────── */
    async function getAnalyticsOverview(rangeDays) {
        const days = Math.min(Math.max(parseInt(rangeDays || '7', 10) || 7, 1), 90);
        const { rows } = await pool.query(
            `SELECT
                 DATE(created_at) as d,
                 COUNT(*) as events,
                 SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
                 COUNT(DISTINCT session_id) as sessions,
                 SUM(CASE WHEN is_calculator_start THEN 1 ELSE 0 END) as calc_starts,
                 SUM(CASE WHEN is_calculator_complete THEN 1 ELSE 0 END) as calc_completes,
                 SUM(CASE WHEN is_lead_submit THEN 1 ELSE 0 END) as lead_submits
             FROM analytics_events
             WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
             GROUP BY DATE(created_at)
             ORDER BY d ASC`,
            [days - 1]
        );
        return rows;
    }

    async function getAnalyticsBreakdown(rangeDays) {
        const days = Math.min(Math.max(parseInt(rangeDays || '7', 10) || 7, 1), 90);
        const sinceExpr = "created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL";
        const params = [days - 1];
        const devices = await q(
            `SELECT device_type as label, COUNT(*) as value
             FROM analytics_events WHERE ${sinceExpr}
             GROUP BY device_type ORDER BY value DESC`,
            params
        );
        const browsers = await q(
            `SELECT browser as label, COUNT(*) as value
             FROM analytics_events WHERE ${sinceExpr}
             GROUP BY browser ORDER BY value DESC`,
            params
        );
        const oses = await q(
            `SELECT os as label, COUNT(*) as value
             FROM analytics_events WHERE ${sinceExpr}
             GROUP BY os ORDER BY value DESC`,
            params
        );
        const geo = await q(
            `SELECT
                 COALESCE(country, '') as country,
                 COALESCE(city, '') as city,
                 COUNT(*) as value
             FROM analytics_events
             WHERE ${sinceExpr}
             GROUP BY country, city
             ORDER BY value DESC
             LIMIT 200`,
            params
        );
        const pages = await q(
            `SELECT page_url as page, COUNT(*) as value
             FROM analytics_events WHERE ${sinceExpr}
             GROUP BY page_url
             ORDER BY value DESC
             LIMIT 50`,
            params
        );
        return { devices, browsers, os: oses, geo, pages };
    }

    /* ── Analytics Routes ───────────────────────────── */
    router.get('/analytics/overview', requireRole('admin', 'director'), async (req, res) => {
        try {
            const days = req.query.days || '7';
            const rows = await getAnalyticsOverview(days);
            res.json({ ok: true, range_days: Number(days) || 7, rows });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'server_error' });
        }
    });

    router.get('/analytics/breakdown', requireRole('admin', 'director'), async (req, res) => {
        try {
            const days = req.query.days || '7';
            const data = await getAnalyticsBreakdown(days);
            res.json({ ok: true, range_days: Number(days) || 7, ...data });
        } catch (e) {
            res.status(500).json({ ok: false, error: 'server_error' });
        }
    });

    /* ── Auth Routes ────────────────────────────────── */
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Введите логин и пароль' });
        if (typeof hooks.isDbReady === 'function' && !hooks.isDbReady()) {
            return res.status(503).json({
                error: 'База данных недоступна. На сервере проверьте PostgreSQL и файл .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.'
            });
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        try {
            // Rate limit: max 10 failed attempts per IP in 15 min
            const attempts = await q("SELECT COUNT(*) as c FROM login_attempts WHERE ip = $1 AND success = FALSE AND created_at > NOW() - INTERVAL '15 minutes'", [String(ip).slice(0, 45)]);
            if (parseInt(attempts[0].c) >= 10) return res.status(429).json({ error: 'Слишком много попыток. Подождите 15 минут' });

            const rows = await q('SELECT id, username, password_hash, display_name, role, avatar_url, is_active, totp_enabled FROM admin_users WHERE username = $1 LIMIT 1', [String(username).trim()]);
            if (!rows.length) {
                await ex('INSERT INTO login_attempts (username, ip, success) VALUES ($1,$2,FALSE)', [String(username).slice(0, 100), String(ip).slice(0, 45)]);
                return res.status(401).json({ error: 'Неверный логин или пароль' });
            }
            const user = rows[0];
            if (!user.is_active) return res.status(403).json({ error: 'Аккаунт деактивирован' });
            if (!bcrypt.compareSync(String(password), user.password_hash)) {
                await ex('INSERT INTO login_attempts (username, ip, success) VALUES ($1,$2,FALSE)', [String(username).slice(0, 100), String(ip).slice(0, 45)]);
                return res.status(401).json({ error: 'Неверный логин или пароль' });
            }
            // 2FA check
            if (user.totp_enabled) {
                const { totp_code } = req.body;
                if (!totp_code) return res.json({ ok: false, needs_2fa: true });
                const u2rows = await q('SELECT totp_secret FROM admin_users WHERE id = $1', [user.id]);
                if (!u2rows.length || !verifyTOTP(u2rows[0].totp_secret, String(totp_code))) {
                    return res.status(401).json({ error: 'Неверный код 2FA' });
                }
            }
            await ex('INSERT INTO login_attempts (username, ip, success) VALUES ($1,$2,TRUE)', [String(username).slice(0, 100), String(ip).slice(0, 45)]);
            req.session.adminId = user.id;
            req.session.adminRole = user.role;
            req.session.adminName = user.display_name;
            await ex('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);
            await auditLog(req, 'login', 'admin_user', user.id, '');
            res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, avatar_url: user.avatar_url } });
        } catch (e) {
            console.error('Admin login error:', e);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.post('/logout', (req, res) => {
        if (req.session) {
            delete req.session.adminId;
            delete req.session.adminRole;
            delete req.session.adminName;
        }
        res.json({ ok: true });
    });

    router.get('/me', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT id, username, display_name, role, avatar_url, totp_enabled FROM admin_users WHERE id = $1', [req.session.adminId]);
            if (!rows.length) return res.status(401).json({ error: 'Unauthorized' });
            res.json({ ok: true, user: rows[0] });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/profile', requireAdmin, async (req, res) => {
        const { display_name, avatar_url } = req.body;
        try {
            await ex('UPDATE admin_users SET display_name = $1, avatar_url = $2 WHERE id = $3',
                [String(display_name || '').slice(0, 255), String(avatar_url || '').slice(0, 500), req.session.adminId]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/password', requireAdmin, async (req, res) => {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password || new_password.length < 6) return res.status(400).json({ error: 'Пароль мин. 6 символов' });
        try {
            const rows = await q('SELECT password_hash FROM admin_users WHERE id = $1', [req.session.adminId]);
            if (!rows.length) return res.status(401).json({ error: 'Unauthorized' });
            if (!bcrypt.compareSync(String(current_password), rows[0].password_hash)) return res.status(400).json({ error: 'Неверный текущий пароль' });
            const hash = bcrypt.hashSync(String(new_password), 10);
            await ex('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, req.session.adminId]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Dashboard Stats ───────────────────────────── */
    router.get('/dashboard/stats', requireAdmin, async (req, res) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

            const leadsTotal = await q('SELECT COUNT(*) as c FROM leads');
            const leadsNew = await q("SELECT COUNT(*) as c FROM leads WHERE status = 'new'");
            const leadsMonth = await q('SELECT COUNT(*) as c FROM leads WHERE created_at >= $1', [monthAgo]);
            const ordersTotal = await q('SELECT COUNT(*) as c FROM orders');
            const ordersActive = await q("SELECT COUNT(*) as c FROM orders WHERE status IN ('new','in_progress')");
            const ordersRevenue = await q("SELECT COALESCE(SUM(total_price),0) as s FROM orders WHERE status = 'completed'");
            const visitorsToday = await q('SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE DATE(created_at) = $1', [today]);
            const visitorsWeek = await q('SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE created_at >= $1', [weekAgo]);
            const calcCompleted = await q('SELECT COUNT(*) as c FROM calculator_sessions WHERE completed = TRUE');
            const projectsCount = await q('SELECT COUNT(*) as c FROM projects WHERE is_published = TRUE');
            const articlesCount = await q('SELECT COUNT(*) as c FROM articles WHERE is_published = TRUE');

            // Page views last 7 days
            const dailyViews = await q(
                'SELECT view_date, SUM(views) as total FROM page_views WHERE view_date >= $1 GROUP BY view_date ORDER BY view_date',
                [weekAgo]
            );

            // Top pages
            const topPages = await q(
                "SELECT page_url, COUNT(*) as hits FROM analytics_events WHERE created_at >= $1 AND event_type = 'pageview' GROUP BY page_url ORDER BY hits DESC LIMIT 10",
                [weekAgo]
            );

            // Leads by source
            const leadsBySource = await q('SELECT source, COUNT(*) as c FROM leads GROUP BY source');

            // Leads by status
            const leadsByStatus = await q('SELECT status, COUNT(*) as c FROM leads GROUP BY status');

            // Visitors by device
            const deviceStats = await q(
                'SELECT device_type, COUNT(DISTINCT session_id) as c FROM analytics_events WHERE created_at >= $1 GROUP BY device_type',
                [weekAgo]
            );

            // Visitors by browser
            const browserStats = await q(
                'SELECT browser, COUNT(DISTINCT session_id) as c FROM analytics_events WHERE created_at >= $1 GROUP BY browser ORDER BY c DESC LIMIT 8',
                [weekAgo]
            );

            // Recent leads
            const recentLeads = await q('SELECT id, name, email, phone, service, status, source, created_at FROM leads ORDER BY created_at DESC LIMIT 5');

            // Geo data (from analytics_events country/city)
            const geoData = await q(
                "SELECT country, city, COUNT(DISTINCT session_id) as c FROM analytics_events WHERE created_at >= $1 AND country IS NOT NULL AND country != '' GROUP BY country, city ORDER BY c DESC LIMIT 30",
                [monthAgo]
            );

            // Visitors by language
            const langStats = await q(
                "SELECT language, COUNT(DISTINCT session_id) as c FROM analytics_events WHERE created_at >= $1 AND language != '' GROUP BY language ORDER BY c DESC LIMIT 10",
                [weekAgo]
            );

            res.json({
                ok: true,
                stats: {
                    leads: { total: leadsTotal[0].c, new: leadsNew[0].c, month: leadsMonth[0].c },
                    orders: { total: ordersTotal[0].c, active: ordersActive[0].c, revenue: Number(ordersRevenue[0].s) },
                    visitors: { today: visitorsToday[0].c, week: visitorsWeek[0].c },
                    calculator: { completed: calcCompleted[0].c },
                    content: { projects: projectsCount[0].c, articles: articlesCount[0].c },
                    dailyViews,
                    topPages,
                    leadsBySource,
                    leadsByStatus,
                    deviceStats,
                    browserStats,
                    recentLeads,
                    geoData,
                    langStats
                }
            });
        } catch (e) {
            console.error('Dashboard stats error:', e.message);
            res.status(500).json({ error: 'Ошибка загрузки статистики' });
        }
    });

    /* ── Dashboard Metrika (aggregated for dashboard cards & charts) ── */
    router.get('/dashboard/metrika', requireAdmin, async (req, res) => {
        try {
            const counterId = await getSetting('ym_counter_id');
            const token = await getSetting('ym_oauth_token');
            if (!counterId || !token) return res.json({ ok: false, error: 'Metrika not configured' });

            const today = new Date().toISOString().slice(0, 10);
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const headers = { 'Authorization': `OAuth ${token}` };
            const base = 'https://api-metrika.yandex.net/stat/v1/data';
            const ids = encodeURIComponent(counterId);

            const [byTimeRes, todayRes, devicesRes, browsersRes, geoRes] = await Promise.all([
                fetch(`${base}/bytime?ids=${ids}&metrics=ym:s:visits,ym:s:pageviews,ym:s:users&date1=${weekAgo}&date2=${today}&group=day`, { headers }),
                fetch(`${base}?ids=${ids}&metrics=ym:s:visits,ym:s:users&date1=${today}&date2=${today}`, { headers }),
                fetch(`${base}?ids=${ids}&metrics=ym:s:visits&dimensions=ym:s:deviceCategory&date1=${weekAgo}&date2=${today}&limit=10`, { headers }),
                fetch(`${base}?ids=${ids}&metrics=ym:s:visits&dimensions=ym:s:browser&date1=${weekAgo}&date2=${today}&limit=8&sort=-ym:s:visits`, { headers }),
                fetch(`${base}?ids=${ids}&metrics=ym:s:visits,ym:s:users&dimensions=ym:s:regionCountry,ym:s:regionCity&date1=${weekAgo}&date2=${today}&limit=50&sort=-ym:s:visits`, { headers })
            ]);

            const [byTime, todayData, devices, browsers, geo] = await Promise.all([
                byTimeRes.json(), todayRes.json(), devicesRes.json(), browsersRes.json(), geoRes.json()
            ]);

            res.json({ ok: true, byTime, today: todayData, devices, browsers, geo });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    /* ── Yandex Metrika Proxy ──────────────────────── */
    router.get('/metrika/stats', requireAdmin, async (req, res) => {
        try {
            const counterId = await getSetting('ym_counter_id');
            const token = await getSetting('ym_oauth_token');
            if (!counterId || !token) return res.json({ ok: false, error: 'Metrika not configured' });

            const metric = req.query.metric || 'ym:s:visits,ym:s:pageviews,ym:s:users';
            const date1 = req.query.date1 || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            const date2 = req.query.date2 || new Date().toISOString().slice(0, 10);
            const group = req.query.group || 'day';
            const dimension = req.query.dimension || '';

            let url = `https://api-metrika.yandex.net/stat/v1/data/bytime?ids=${encodeURIComponent(counterId)}&metrics=${encodeURIComponent(metric)}&date1=${date1}&date2=${date2}&group=${group}`;
            if (dimension) url += `&dimensions=${encodeURIComponent(dimension)}`;

            const resp = await fetch(url, { headers: { 'Authorization': `OAuth ${token}` } });
            const data = await resp.json();
            res.json({ ok: true, data });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    router.get('/metrika/geo', requireAdmin, async (req, res) => {
        try {
            const counterId = await getSetting('ym_counter_id');
            const token = await getSetting('ym_oauth_token');
            if (!counterId || !token) return res.json({ ok: false, error: 'Metrika not configured' });

            const date1 = req.query.date1 || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            const date2 = req.query.date2 || new Date().toISOString().slice(0, 10);

            const url = `https://api-metrika.yandex.net/stat/v1/data?ids=${encodeURIComponent(counterId)}&metrics=ym:s:visits,ym:s:users&dimensions=ym:s:regionCountry,ym:s:regionCity&date1=${date1}&date2=${date2}&limit=50&sort=-ym:s:visits`;
            const resp = await fetch(url, { headers: { 'Authorization': `OAuth ${token}` } });
            const data = await resp.json();
            res.json({ ok: true, data });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    /* ── Yandex Webmaster Proxy ─────────────────────── */
    router.get('/webmaster/stats', requireAdmin, async (req, res) => {
        try {
            const token = await getSetting('ym_oauth_token');
            const hostId = await getSetting('webmaster_host_id');
            if (!token || !hostId) return res.json({ ok: false, error: 'Webmaster not configured' });

            const userId = await getSetting('webmaster_user_id');
            if (!userId) {
                // Fetch user ID first
                const uResp = await fetch('https://api.webmaster.yandex.net/v4/user/', { headers: { 'Authorization': `OAuth ${token}` } });
                const uData = await uResp.json();
                if (uData.user_id) await setSetting('webmaster_user_id', String(uData.user_id));
            }
            const uid = userId || (await getSetting('webmaster_user_id'));
            if (!uid) return res.json({ ok: false, error: 'Cannot get user_id' });

            const date1 = req.query.date1 || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            const date2 = req.query.date2 || new Date().toISOString().slice(0, 10);

            const url = `https://api.webmaster.yandex.net/v4/user/${uid}/hosts/${encodeURIComponent(hostId)}/search-queries/all/history?query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS&query_indicator=AVG_SHOW_POSITION&date_from=${date1}&date_to=${date2}`;
            const resp = await fetch(url, { headers: { 'Authorization': `OAuth ${token}` } });
            const data = await resp.json();
            res.json({ ok: true, data });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    /* ── Leads CRUD ─────────────────────────────────── */
    router.get('/leads', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200');
            res.json({ ok: true, leads: rows, total: rows.length, page: 1, limit: 200 });
        } catch (e) {
            console.error('Admin leads list error:', e);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.get('/leads/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM leads WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            res.json({ ok: true, lead: rows[0] });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/leads/:id', requireAdmin, async (req, res) => {
        const { status, notes } = req.body;
        try {
            const sets = [];
            const params = [];
            let idx = 1;
            if (status) { sets.push(`status = $${idx++}`); params.push(status); }
            if (notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(String(notes).slice(0, 5000)); }
            if (!sets.length) return res.json({ ok: true });
            params.push(req.params.id);
            await ex(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${idx}`, params);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.delete('/leads/:id', requireRole('admin'), async (req, res) => {
        try {
            await ex('DELETE FROM leads WHERE id = $1', [req.params.id]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Orders CRUD ────────────────────────────────── */
    router.get('/orders', requireAdmin, async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const offset = (page - 1) * limit;
            const status = req.query.status || '';

            let where = '1=1';
            const params = [];
            let idx = 1;
            if (status) { where += ` AND status = $${idx++}`; params.push(status); }

            const countRow = await q(`SELECT COUNT(*) as c FROM orders WHERE ${where}`, params);
            const rows = await q(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
            res.json({ ok: true, orders: rows, total: countRow[0].c, page, limit });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.post('/orders', requireAdmin, async (req, res) => {
        const { lead_id, client_name, client_email, client_phone, service, description, status, total_price, source, source_detail, deadline, notes } = req.body;
        try {
            const result = await ex(
                'INSERT INTO orders (lead_id, client_name, client_email, client_phone, service, description, status, total_price, source, source_detail, deadline, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id',
                [lead_id || null, client_name || '', client_email || '', client_phone || '', service || '', description || '', status || 'new', total_price || 0, source || '', source_detail || '', deadline || null, notes || '']
            );
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.get('/orders/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM orders WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            res.json({ ok: true, order: rows[0] });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/orders/:id', requireAdmin, async (req, res) => {
        const { client_name, client_email, client_phone, service, description, status, total_price, source, source_detail, deadline, notes } = req.body;
        try {
            await ex(
                'UPDATE orders SET client_name=$1, client_email=$2, client_phone=$3, service=$4, description=$5, status=$6, total_price=$7, source=$8, source_detail=$9, deadline=$10, notes=$11 WHERE id=$12',
                [client_name || '', client_email || '', client_phone || '', service || '', description || '', status || 'new', total_price || 0, source || '', source_detail || '', deadline || null, notes || '', req.params.id]
            );
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.delete('/orders/:id', requireRole('admin'), async (req, res) => {
        try {
            await ex('DELETE FROM orders WHERE id = $1', [req.params.id]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Pages CRUD (CMS) ──────────────────────────── */
    router.get('/pages', requireAdmin, async (req, res) => {
        try {
            const pages = await q('SELECT id, slug, title, updated_at FROM pages ORDER BY slug');
            res.json({ ok: true, pages });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.get('/pages/:slug', requireAdmin, async (req, res) => {
        try {
            const slug = String(req.params.slug).toLowerCase().replace(/[^a-z0-9\-]/g, '');
            const rows = await q('SELECT * FROM pages WHERE slug = $1', [slug]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            const page = rows[0];
            const locales = await q('SELECT * FROM page_locales WHERE page_id = $1', [page.id]);
            res.json({ ok: true, page, locales });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/pages/:slug', requireAdmin, async (req, res) => {
        const slug = String(req.params.slug).toLowerCase().replace(/[^a-z0-9\-]/g, '');
        const { title, html, locales } = req.body;
        try {
            const rows = await q('SELECT id FROM pages WHERE slug = $1', [slug]);
            let pageId;
            if (rows.length) {
                pageId = rows[0].id;
                await ex('UPDATE pages SET title = $1, html = $2 WHERE id = $3', [title || '', html || '', pageId]);
            } else {
                const r = await ex('INSERT INTO pages (slug, title, html) VALUES ($1,$2,$3) RETURNING id', [slug, title || '', html || '']);
                pageId = r.rows[0].id;
            }
            // Update locales
            if (locales && typeof locales === 'object') {
                for (const [lang, data] of Object.entries(locales)) {
                    const l = String(lang).toLowerCase().slice(0, 10);
                    await ex(
                        'INSERT INTO page_locales (page_id, lang, title, html) VALUES ($1,$2,$3,$4) ON CONFLICT (page_id, lang) DO UPDATE SET title=EXCLUDED.title, html=EXCLUDED.html',
                        [pageId, l, data.title || '', data.html || '']
                    );
                }
            }
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Projects CRUD ──────────────────────────────── */
    router.get('/projects', requireAdmin, async (req, res) => {
        try {
            const projects = await q("SELECT p.*, (SELECT title FROM project_locales WHERE project_id = p.id AND lang='ru' LIMIT 1) as title_ru FROM projects p ORDER BY created_at DESC");
            res.json({ ok: true, projects });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.get('/projects/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM projects WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            const locales = await q('SELECT * FROM project_locales WHERE project_id = $1', [rows[0].id]);
            res.json({ ok: true, project: rows[0], locales });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.post('/projects', requireRole('admin', 'director'), async (req, res) => {
        const { slug, is_published, cover_image, deadline_text, duration_text, locales } = req.body;
        try {
            const sourceSlug = slug || firstLocaleTitle(locales);
            const s = await ensureUniqueSlug('projects', sourceSlug, null, 120);
            if (!s) return res.status(400).json({ error: 'Укажите ЧПУ или название проекта' });
            const result = await ex('INSERT INTO projects (slug, is_published, cover_image, deadline_text, duration_text) VALUES ($1,$2,$3,$4,$5) RETURNING id', [s, !!is_published, cover_image || '', deadline_text || '', duration_text || '']);
            const projectId = result.rows[0].id;
            if (locales && typeof locales === 'object') {
                for (const [lang, data] of Object.entries(locales)) {
                    await ex(
                        `INSERT INTO project_locales (project_id, lang, title, excerpt, html, gallery_json, stack_json, stack_front_json, stack_back_json, stack_db_json, stack_deploy_json, stack_android_json, stack_ios_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                        [projectId, String(lang).slice(0, 10), data.title || '', data.excerpt || '', data.html || '',
                         JSON.stringify(data.gallery || []), JSON.stringify(data.stack || []),
                         JSON.stringify(data.stack_front || []), JSON.stringify(data.stack_back || []),
                         JSON.stringify(data.stack_db || []), JSON.stringify(data.stack_deploy || []),
                         JSON.stringify(data.stack_android || []), JSON.stringify(data.stack_ios || [])]
                    );
                }
            }
            clearPublicCaches(['projects:list:', 'bundle:works:', `project:${s}:`, `projectReview:${s}:`]);
            res.json({ ok: true, id: projectId, slug: s });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.put('/projects/:id', requireAdmin, async (req, res) => {
        const { slug, is_published, cover_image, deadline_text, duration_text, locales } = req.body;
        try {
            const prevRows = await q('SELECT id, slug FROM projects WHERE id = $1 LIMIT 1', [req.params.id]);
            if (!prevRows.length) return res.status(404).json({ error: 'Not found' });
            const prevSlug = prevRows[0].slug || '';
            const sourceSlug = slug || firstLocaleTitle(locales) || prevSlug;
            const s = await ensureUniqueSlug('projects', sourceSlug, req.params.id, 120);
            if (!s) return res.status(400).json({ error: 'Укажите корректный ЧПУ для проекта' });
            await ex('UPDATE projects SET slug=$1, is_published=$2, cover_image=$3, deadline_text=$4, duration_text=$5 WHERE id=$6',
                [s, !!is_published, cover_image || '', deadline_text || '', duration_text || '', req.params.id]);
            if (locales && typeof locales === 'object') {
                for (const [lang, data] of Object.entries(locales)) {
                    await ex(
                        `INSERT INTO project_locales (project_id, lang, title, excerpt, html, gallery_json, stack_json, stack_front_json, stack_back_json, stack_db_json, stack_deploy_json, stack_android_json, stack_ios_json)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                         ON CONFLICT (project_id, lang) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, html=EXCLUDED.html,
                         gallery_json=EXCLUDED.gallery_json, stack_json=EXCLUDED.stack_json,
                         stack_front_json=EXCLUDED.stack_front_json, stack_back_json=EXCLUDED.stack_back_json,
                         stack_db_json=EXCLUDED.stack_db_json, stack_deploy_json=EXCLUDED.stack_deploy_json,
                         stack_android_json=EXCLUDED.stack_android_json, stack_ios_json=EXCLUDED.stack_ios_json`,
                        [req.params.id, String(lang).slice(0, 10), data.title || '', data.excerpt || '', data.html || '',
                         JSON.stringify(data.gallery || []), JSON.stringify(data.stack || []),
                         JSON.stringify(data.stack_front || []), JSON.stringify(data.stack_back || []),
                         JSON.stringify(data.stack_db || []), JSON.stringify(data.stack_deploy || []),
                         JSON.stringify(data.stack_android || []), JSON.stringify(data.stack_ios || [])]
                    );
                }
            }
            clearPublicCaches(['projects:list:', 'bundle:works:', `project:${prevSlug}:`, `project:${s}:`, `projectReview:${prevSlug}:`, `projectReview:${s}:`]);
            res.json({ ok: true, slug: s });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.delete('/projects/:id', requireRole('admin'), async (req, res) => {
        try {
            const rows = await q('SELECT slug FROM projects WHERE id = $1 LIMIT 1', [req.params.id]);
            const prevSlug = rows.length ? (rows[0].slug || '') : '';
            await ex('DELETE FROM projects WHERE id = $1', [req.params.id]);
            clearPublicCaches(['projects:list:', 'bundle:works:', `project:${prevSlug}:`, `projectReview:${prevSlug}:`]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Articles CRUD ──────────────────────────────── */
    router.get('/articles', requireAdmin, async (req, res) => {
        try {
            const articles = await q("SELECT a.*, (SELECT title FROM article_locales WHERE article_id = a.id AND lang='ru' LIMIT 1) as title_ru FROM articles a ORDER BY created_at DESC");
            res.json({ ok: true, articles });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.get('/articles/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM articles WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            const locales = await q('SELECT * FROM article_locales WHERE article_id = $1', [rows[0].id]);
            res.json({ ok: true, article: rows[0], locales });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.post('/articles', requireRole('admin', 'director'), async (req, res) => {
        const { slug, is_published, cover_image, locales } = req.body;
        try {
            const sourceSlug = slug || firstLocaleTitle(locales);
            const s = await ensureUniqueSlug('articles', sourceSlug, null, 140);
            if (!s) return res.status(400).json({ error: 'Укажите ЧПУ или название статьи' });
            const result = await ex('INSERT INTO articles (slug, is_published, cover_image) VALUES ($1,$2,$3) RETURNING id', [s, !!is_published, cover_image || '']);
            const articleId = result.rows[0].id;
            if (locales && typeof locales === 'object') {
                for (const [lang, data] of Object.entries(locales)) {
                    await ex(
                        'INSERT INTO article_locales (article_id, lang, title, excerpt, html, gallery_json) VALUES ($1,$2,$3,$4,$5,$6)',
                        [articleId, String(lang).slice(0, 10), data.title || '', data.excerpt || '', data.html || '', JSON.stringify(data.gallery || [])]
                    );
                }
            }
            clearPublicCaches(['articles:list:', `article:${s}:`]);
            res.json({ ok: true, id: articleId, slug: s });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.put('/articles/:id', requireAdmin, async (req, res) => {
        const { slug, is_published, cover_image, locales } = req.body;
        try {
            const prevRows = await q('SELECT id, slug FROM articles WHERE id = $1 LIMIT 1', [req.params.id]);
            if (!prevRows.length) return res.status(404).json({ error: 'Not found' });
            const prevSlug = prevRows[0].slug || '';
            const sourceSlug = slug || firstLocaleTitle(locales) || prevSlug;
            const s = await ensureUniqueSlug('articles', sourceSlug, req.params.id, 140);
            if (!s) return res.status(400).json({ error: 'Укажите корректный ЧПУ для статьи' });
            await ex('UPDATE articles SET slug=$1, is_published=$2, cover_image=$3 WHERE id=$4',
                [s, !!is_published, cover_image || '', req.params.id]);
            if (locales && typeof locales === 'object') {
                for (const [lang, data] of Object.entries(locales)) {
                    await ex(
                        'INSERT INTO article_locales (article_id, lang, title, excerpt, html, gallery_json) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (article_id, lang) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, html=EXCLUDED.html, gallery_json=EXCLUDED.gallery_json',
                        [req.params.id, String(lang).slice(0, 10), data.title || '', data.excerpt || '', data.html || '', JSON.stringify(data.gallery || [])]
                    );
                }
            }
            clearPublicCaches(['articles:list:', `article:${prevSlug}:`, `article:${s}:`]);
            res.json({ ok: true, slug: s });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.delete('/articles/:id', requireRole('admin'), async (req, res) => {
        try {
            const rows = await q('SELECT slug FROM articles WHERE id = $1 LIMIT 1', [req.params.id]);
            const prevSlug = rows.length ? (rows[0].slug || '') : '';
            await ex('DELETE FROM articles WHERE id = $1', [req.params.id]);
            clearPublicCaches(['articles:list:', `article:${prevSlug}:`]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Project Reviews CRUD ───────────────────────── */
    router.get('/projects/:id/reviews', requireAdmin, async (req, res) => {
        try {
            const rows = await q(
                `SELECT r.*, c.slug AS client_slug, cp.company_name AS cp_company
                 FROM project_reviews r
                 LEFT JOIN clients c ON c.id = r.client_id
                 LEFT JOIN client_profiles cp ON cp.client_id = c.id
                 WHERE r.project_id = $1 ORDER BY r.id DESC`,
                [req.params.id]
            );
            res.json({ ok: true, reviews: rows });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    router.post('/projects/:id/reviews', requireAdmin, async (req, res) => {
        const { company_name, logo_url, website, review_text, rating, lang, client_id } = req.body;
        try {
            const result = await ex(
                'INSERT INTO project_reviews (project_id, client_id, lang, rating, review_text, company_name, logo_url, website, is_published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE) RETURNING id',
                [req.params.id, client_id || null, lang || 'ru', rating || 5, review_text || '', company_name || '', logo_url || '', website || '']
            );
            const proj = await q('SELECT slug FROM projects WHERE id = $1', [req.params.id]);
            if (proj.length) clearPublicCaches([`projectReview:${proj[0].slug}:`]);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: 'Ошибка: ' + e.message }); }
    });

    router.put('/reviews/:id', requireAdmin, async (req, res) => {
        const { company_name, logo_url, website, review_text, rating, lang, client_id } = req.body;
        try {
            const rev = await q('SELECT project_id FROM project_reviews WHERE id = $1', [req.params.id]);
            await ex(
                'UPDATE project_reviews SET company_name=$1, logo_url=$2, website=$3, review_text=$4, rating=$5, lang=$6, client_id=$7 WHERE id=$8',
                [company_name || '', logo_url || '', website || '', review_text || '', rating || 5, lang || 'ru', client_id || null, req.params.id]
            );
            if (rev.length) {
                const proj = await q('SELECT slug FROM projects WHERE id = $1', [rev[0].project_id]);
                if (proj.length) clearPublicCaches([`projectReview:${proj[0].slug}:`]);
            }
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    router.delete('/reviews/:id', requireAdmin, async (req, res) => {
        try {
            const rev = await q('SELECT project_id FROM project_reviews WHERE id = $1', [req.params.id]);
            await ex('DELETE FROM project_reviews WHERE id = $1', [req.params.id]);
            if (rev.length) {
                const proj = await q('SELECT slug FROM projects WHERE id = $1', [rev[0].project_id]);
                if (proj.length) clearPublicCaches([`projectReview:${proj[0].slug}:`]);
            }
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    /* ── Client Companies CRUD ──────────────────────── */
    router.get('/clients', requireAdmin, async (req, res) => {
        try {
            const rows = await q(
                `SELECT c.id, c.slug, cp.company_name, cp.logo_url, cp.website, cp.description, cp.address, cp.city, cp.country, cp.show_map
                 FROM clients c
                 LEFT JOIN client_profiles cp ON cp.client_id = c.id
                 ORDER BY cp.company_name ASC, c.id DESC`
            );
            res.json({ ok: true, clients: rows });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    router.get('/clients/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q(
                `SELECT c.id, c.slug, c.email, cp.company_name, cp.logo_url, cp.website, cp.description, cp.address, cp.city, cp.country, cp.show_map
                 FROM clients c
                 LEFT JOIN client_profiles cp ON cp.client_id = c.id
                 WHERE c.id = $1`,
                [req.params.id]
            );
            if (!rows.length) return res.status(404).json({ error: 'not found' });
            res.json({ ok: true, client: rows[0] });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    router.post('/clients', requireAdmin, async (req, res) => {
        const { slug, company_name, logo_url, website, description, address, city, country, show_map } = req.body;
        const s = String(slug || company_name || '').toLowerCase().replace(/[^a-z0-9а-яёa-z\-]/gi, '').replace(/\s+/g, '-').slice(0, 120);
        if (!s) return res.status(400).json({ error: 'slug required' });
        try {
            const fakeEmail = `${s}@client.local`;
            const result = await ex(
                'INSERT INTO clients (slug, email, password_hash, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
                [s, fakeEmail, '']
            );
            const clientId = result.rows[0].id;
            await ex(
                'INSERT INTO client_profiles (client_id, company_name, logo_url, website, description, address, city, country, show_map) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
                [clientId, company_name || '', logo_url || '', website || '', description || '', address || '', city || '', country || '', show_map !== false]
            );
            clearPublicCaches([`client:${s}`]);
            res.json({ ok: true, id: clientId, slug: s });
        } catch (e) {
            if (e.code === '23505') return res.status(409).json({ error: 'Клиент с таким slug уже существует' });
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.put('/clients/:id', requireAdmin, async (req, res) => {
        const { slug, company_name, logo_url, website, description, address, city, country, show_map } = req.body;
        try {
            const old = await q('SELECT slug FROM clients WHERE id = $1', [req.params.id]);
            if (!old.length) return res.status(404).json({ error: 'not found' });
            const s = String(slug || old[0].slug).toLowerCase().replace(/[^a-z0-9а-яёa-z\-]/gi, '').replace(/\s+/g, '-').slice(0, 120);
            await ex('UPDATE clients SET slug = $1 WHERE id = $2', [s, req.params.id]);
            const hasProfile = await q('SELECT id FROM client_profiles WHERE client_id = $1', [req.params.id]);
            if (hasProfile.length) {
                await ex(
                    'UPDATE client_profiles SET company_name=$1, logo_url=$2, website=$3, description=$4, address=$5, city=$6, country=$7, show_map=$8 WHERE client_id=$9',
                    [company_name || '', logo_url || '', website || '', description || '', address || '', city || '', country || '', show_map !== false, req.params.id]
                );
            } else {
                await ex(
                    'INSERT INTO client_profiles (client_id, company_name, logo_url, website, description, address, city, country, show_map) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
                    [req.params.id, company_name || '', logo_url || '', website || '', description || '', address || '', city || '', country || '', show_map !== false]
                );
            }
            clearPublicCaches([`client:${old[0].slug}`, `client:${s}`]);
            res.json({ ok: true, slug: s });
        } catch (e) {
            if (e.code === '23505') return res.status(409).json({ error: 'Клиент с таким slug уже существует' });
            res.status(500).json({ error: 'Ошибка: ' + e.message });
        }
    });

    router.delete('/clients/:id', requireAdmin, async (req, res) => {
        try {
            const old = await q('SELECT slug FROM clients WHERE id = $1', [req.params.id]);
            await ex('DELETE FROM client_profiles WHERE client_id = $1', [req.params.id]);
            await ex('DELETE FROM clients WHERE id = $1', [req.params.id]);
            if (old.length) clearPublicCaches([`client:${old[0].slug}`]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
    });

    /* ── Calculator Pricing ─────────────────────────── */
    router.get('/calculator/pricing', requireAdmin, async (req, res) => {
        try {
            const raw = await getSetting('calculator_pricing_json');
            const pricing = raw ? JSON.parse(raw) : {
                base_prices: { management: 250000, investment: 300000, creative: 180000, analytics: 200000, it: 350000 },
                size_mult: { small: 1, medium: 1.5, large: 2.5 },
                complexity_mult: { basic: 1, standard: 1.8, premium: 3 },
                duration_mult: { short: 1, medium: 0.9, long: 0.8 },
                it_criteria: []
            };
            res.json({ ok: true, pricing });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/calculator/pricing', requireRole('admin', 'director'), async (req, res) => {
        try {
            const { pricing } = req.body;
            if (!pricing) return res.status(400).json({ error: 'pricing required' });
            await setSetting('calculator_pricing_json', JSON.stringify(pricing));
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── SEO Settings ───────────────────────────────── */
    router.get('/seo-settings', requireAdmin, async (_req, res) => {
        try {
            const rows = await q(
                `SELECT page, seo_title, seo_description, keywords, keywords_plus, keywords_minus, updated_at
                 FROM seo_settings
                 ORDER BY page ASC`
            );
            res.json({ ok: true, rows });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/seo-settings/:page', requireRole('admin', 'director'), async (req, res) => {
        const page = String(req.params.page || '').toLowerCase().trim().replace(/[^a-z0-9\-_/]/g, '').slice(0, 120);
        if (!page) return res.status(400).json({ error: 'page required' });
        const body = req.body || {};
        try {
            await ex(
                `INSERT INTO seo_settings (page, seo_title, seo_description, keywords, keywords_plus, keywords_minus, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6, CURRENT_TIMESTAMP)
                 ON CONFLICT (page) DO UPDATE SET
                    seo_title = EXCLUDED.seo_title,
                    seo_description = EXCLUDED.seo_description,
                    keywords = EXCLUDED.keywords,
                    keywords_plus = EXCLUDED.keywords_plus,
                    keywords_minus = EXCLUDED.keywords_minus,
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    page,
                    String(body.seo_title || '').slice(0, 255),
                    String(body.seo_description || '').slice(0, 4000),
                    String(body.keywords || '').slice(0, 4000),
                    String(body.keywords_plus || '').slice(0, 4000),
                    String(body.keywords_minus || '').slice(0, 4000)
                ]
            );
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── Settings ───────────────────────────────────── */
    router.get('/settings', requireAdmin, async (req, res) => {
        try {
            const keys = ['tg_bot_token', 'tg_chat_id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from', 'email_to',
                'ym_counter_id', 'ym_oauth_token', 'webmaster_host_id', 'webmaster_user_id',
                'site_phone', 'site_email', 'site_address', 'site_whatsapp', 'site_telegram', 'site_marquee_text',
                'site_name', 'site_description'];
            const rows = await q('SELECT setting_key, setting_value FROM settings WHERE setting_key = ANY($1)', [keys]);
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            // mask sensitive
            if (settings.tg_bot_token) settings.tg_bot_token = '***' + settings.tg_bot_token.slice(-6);
            if (settings.smtp_pass) settings.smtp_pass = '****';
            if (settings.ym_oauth_token) settings.ym_oauth_token = '***' + settings.ym_oauth_token.slice(-6);
            res.json({ ok: true, settings });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/settings', requireRole('admin'), async (req, res) => {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'settings object required' });
        try {
            const allowed = ['tg_bot_token', 'tg_chat_id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from', 'email_to',
                'ym_counter_id', 'ym_oauth_token', 'webmaster_host_id',
                'site_phone', 'site_email', 'site_address', 'site_whatsapp', 'site_telegram', 'site_marquee_text',
                'site_name', 'site_description'];
            let telegramSettingsChanged = false;
            for (const [key, value] of Object.entries(settings)) {
                if (!allowed.includes(key)) continue;
                if (typeof value === 'string' && (value.startsWith('***') || value === '****')) continue; // Skip masked values
                await setSetting(key, String(value).slice(0, 2000));
                if (key === 'tg_bot_token' || key === 'tg_chat_id') telegramSettingsChanged = true;
            }
            if (telegramSettingsChanged && typeof hooks.reloadTelegramBot === 'function') {
                try {
                    await hooks.reloadTelegramBot();
                } catch (e) {
                    console.warn('reloadTelegramBot:', e && e.message ? e.message : e);
                }
            }
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /** Проверка: после сохранения токена и Chat ID нажмите — должно прийти сообщение в чат */
    router.post('/telegram/test', requireRole('admin'), async (req, res) => {
        try {
            if (typeof hooks.reloadTelegramBot === 'function') await hooks.reloadTelegramBot();
            if (typeof hooks.sendTelegramTest !== 'function') {
                return res.status(501).json({ ok: false, error: 'Тест Telegram недоступен' });
            }
            await hooks.sendTelegramTest();
            res.json({ ok: true });
        } catch (e) {
            res.status(400).json({ ok: false, error: e && e.message ? e.message : 'Не удалось отправить' });
        }
    });

    /* ── User Management ────────────────────────────── */
    router.get('/users', requireRole('admin'), async (req, res) => {
        try {
            const users = await q('SELECT id, username, display_name, role, avatar_url, is_active, last_login, created_at FROM admin_users ORDER BY created_at');
            res.json({ ok: true, users });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.post('/users', requireRole('admin'), async (req, res) => {
        const { username, password, display_name, role } = req.body;
        if (!username || !password || password.length < 6) return res.status(400).json({ error: 'Логин и пароль (мин. 6) обязательны' });
        try {
            const hash = bcrypt.hashSync(String(password), 10);
            const result = await ex('INSERT INTO admin_users (username, password_hash, display_name, role) VALUES ($1,$2,$3,$4) RETURNING id',
                [String(username).trim().slice(0, 100), hash, String(display_name || username).slice(0, 255), role || 'manager']);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) {
            if (e.code === '23505') return res.status(400).json({ error: 'Такой логин уже существует' });
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.put('/users/:id', requireRole('admin'), async (req, res) => {
        const { display_name, role, is_active, password } = req.body;
        try {
            const sets = ['display_name = $1', 'role = $2', 'is_active = $3'];
            const params = [String(display_name || '').slice(0, 255), role || 'manager', !!is_active];
            let idx = 4;
            if (password && password.length >= 6) {
                sets.push(`password_hash = $${idx++}`);
                params.push(bcrypt.hashSync(String(password), 10));
            }
            params.push(req.params.id);
            await ex(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${idx}`, params);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    router.delete('/users/:id', requireRole('admin'), async (req, res) => {
        if (String(req.params.id) === String(req.session.adminId)) return res.status(400).json({ error: 'Нельзя удалить себя' });
        try {
            await ex('DELETE FROM admin_users WHERE id = $1', [req.params.id]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    /* ── File Upload (legacy base64) ───────────────── */
    router.post('/upload', requireAdmin, async (req, res) => {
        try {
            const { file, filename } = req.body;
            if (!file || !filename) return res.status(400).json({ error: 'file and filename required' });
            const ext = path.extname(filename).toLowerCase();
            const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'];
            if (!allowed.includes(ext)) return res.status(400).json({ error: 'Недопустимый формат файла' });

            const safeName = crypto.randomBytes(8).toString('hex') + ext;
            const uploadDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const buffer = Buffer.from(file.replace(/^data:[^;]+;base64,/, ''), 'base64');
            if (buffer.length > 12 * 1024 * 1024) return res.status(400).json({ error: 'Файл слишком большой (макс. 12 МБ)' });

            fs.writeFileSync(path.join(uploadDir, safeName), buffer);
            res.json({ ok: true, url: `/uploads/${safeName}` });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка загрузки' });
        }
    });

    /* ── File Upload (multipart / multer) ────────── */
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, crypto.randomBytes(8).toString('hex') + ext);
        }
    });
    const uploadMulter = multer({
        storage,
        limits: { fileSize: 12 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'];
            cb(null, allowed.includes(ext));
        }
    });

    router.post('/upload-files', requireAdmin, uploadMulter.array('files', 20), (req, res) => {
        try {
            const urls = (req.files || []).map(f => `/uploads/${f.filename}`);
            res.json({ ok: true, urls });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка загрузки' });
        }
    });

    /* ── Public Metrika counter ID ──────────────────── */
    router.get('/metrika-id', async (req, res) => {
        try {
            const id = await getSetting('ym_counter_id');
            res.json({ ok: true, counter_id: id || '' });
        } catch (e) {
            res.json({ ok: true, counter_id: '' });
        }
    });

    /* ── TASKS CRUD ─────────────────────────────────── */
    router.get('/tasks', requireAdmin, async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, parseInt(req.query.limit) || 20);
            const offset = (page - 1) * limit;
            let where = '1=1'; const params = []; let idx = 1;
            if (req.query.status && req.query.status !== 'all') { where += ` AND t.status = $${idx++}`; params.push(req.query.status); }
            if (req.query.entity_type) { where += ` AND t.entity_type = $${idx++}`; params.push(req.query.entity_type); }
            if (req.query.entity_id) { where += ` AND t.entity_id = $${idx++}`; params.push(req.query.entity_id); }
            if (req.query.assigned_to) { where += ` AND t.assigned_to = $${idx++}`; params.push(req.query.assigned_to); }
            const countRow = await q(`SELECT COUNT(*) as c FROM tasks t WHERE ${where}`, params);
            const rows = await q(`SELECT t.*, au.display_name as assignee_name, au2.display_name as creator_name FROM tasks t LEFT JOIN admin_users au ON t.assigned_to=au.id LEFT JOIN admin_users au2 ON t.created_by=au2.id WHERE ${where} ORDER BY ARRAY_POSITION(ARRAY['urgent','high','normal','low'], t.priority), t.due_date ASC NULLS LAST LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
            res.json({ ok: true, tasks: rows, total: countRow[0].c, page, limit });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/tasks', requireAdmin, async (req, res) => {
        const { entity_type, entity_id, title, description, assigned_to, due_date, priority } = req.body;
        if (!title) return res.status(400).json({ error: 'Укажите заголовок' });
        try {
            const result = await ex('INSERT INTO tasks (entity_type, entity_id, title, description, assigned_to, due_date, priority, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
                [entity_type || '', entity_id || null, String(title).slice(0, 500), description || '', assigned_to || null, due_date || null, priority || 'normal', req.session.adminId]);
            await auditLog(req, 'create_task', 'task', result.rows[0].id, title);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.put('/tasks/:id', requireAdmin, async (req, res) => {
        const { title, description, assigned_to, due_date, status, priority } = req.body;
        try {
            const completedAt = status === 'done' ? 'NOW()' : 'NULL';
            await ex(`UPDATE tasks SET title=$1, description=$2, assigned_to=$3, due_date=$4, status=$5, priority=$6, completed_at=${completedAt} WHERE id=$7`,
                [title || '', description || '', assigned_to || null, due_date || null, status || 'pending', priority || 'normal', req.params.id]);
            await auditLog(req, 'update_task', 'task', req.params.id, title);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.delete('/tasks/:id', requireAdmin, async (req, res) => {
        try {
            await ex('DELETE FROM tasks WHERE id = $1', [req.params.id]);
            await auditLog(req, 'delete_task', 'task', req.params.id, '');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── COMMENTS (universal) ──────────────────────── */
    router.get('/comments', requireAdmin, async (req, res) => {
        const { entity_type, entity_id } = req.query;
        if (!entity_type || !entity_id) return res.json({ ok: true, comments: [] });
        try {
            const rows = await q('SELECT c.*, au.display_name as user_name FROM comments c LEFT JOIN admin_users au ON c.user_id=au.id WHERE c.entity_type=$1 AND c.entity_id=$2 ORDER BY c.created_at DESC', [entity_type, entity_id]);
            res.json({ ok: true, comments: rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/comments', requireAdmin, async (req, res) => {
        const { entity_type, entity_id, text } = req.body;
        if (!entity_type || !entity_id || !text) return res.status(400).json({ error: 'text required' });
        try {
            const result = await ex('INSERT INTO comments (entity_type, entity_id, user_id, text) VALUES ($1,$2,$3,$4) RETURNING id',
                [entity_type, entity_id, req.session.adminId, String(text).slice(0, 5000)]);
            await auditLog(req, 'add_comment', entity_type, entity_id, text.slice(0, 100));
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.delete('/comments/:id', requireRole('admin'), async (req, res) => {
        try {
            await ex('DELETE FROM comments WHERE id = $1', [req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── LEAD PIPELINE (stages) ────────────────────── */
    const PIPELINE_STAGES = ['new', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];

    router.get('/pipeline', requireAdmin, async (req, res) => {
        try {
            const leads = await q('SELECT id, name, email, phone, service, status, stage, estimated_price, company, created_at FROM leads ORDER BY created_at DESC');
            const counts = {};
            PIPELINE_STAGES.forEach(s => { counts[s] = 0; });
            leads.forEach(l => { const st = l.stage || 'new'; counts[st] = (counts[st] || 0) + 1; });
            res.json({ ok: true, leads, stages: PIPELINE_STAGES, counts });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.put('/leads/:id/stage', requireAdmin, async (req, res) => {
        const { stage } = req.body;
        if (!PIPELINE_STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
        try {
            const lead = await q('SELECT stage FROM leads WHERE id = $1', [req.params.id]);
            const fromStage = lead.length ? (lead[0].stage || 'new') : 'new';
            await ex('UPDATE leads SET stage = $1 WHERE id = $2', [stage, req.params.id]);
            await ex('INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, user_id) VALUES ($1,$2,$3,$4)',
                [req.params.id, fromStage, stage, req.session.adminId]);
            await auditLog(req, 'change_stage', 'lead', req.params.id, `${fromStage} -> ${stage}`);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/leads/:id/history', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT h.*, au.display_name as user_name FROM lead_stage_history h LEFT JOIN admin_users au ON h.user_id=au.id WHERE h.lead_id=$1 ORDER BY h.created_at DESC', [req.params.id]);
            res.json({ ok: true, history: rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── PROPOSALS CRUD ────────────────────────────── */
    router.get('/proposals', requireAdmin, async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, parseInt(req.query.limit) || 20);
            const offset = (page - 1) * limit;
            const countRow = await q('SELECT COUNT(*) as c FROM proposals');
            const rows = await q('SELECT p.*, au.display_name as creator_name FROM proposals p LEFT JOIN admin_users au ON p.created_by=au.id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
            res.json({ ok: true, proposals: rows, total: countRow[0].c, page, limit });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/proposals/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM proposals WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            res.json({ ok: true, proposal: rows[0] });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/proposals', requireAdmin, async (req, res) => {
        const { order_id, lead_id, client_name, client_email, client_phone, items_json, total, valid_until, notes } = req.body;
        try {
            const result = await ex('INSERT INTO proposals (order_id, lead_id, client_name, client_email, client_phone, items_json, total, valid_until, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
                [order_id || null, lead_id || null, client_name || '', client_email || '', client_phone || '', JSON.stringify(items_json || []), total || 0, valid_until || null, notes || '', req.session.adminId]);
            await auditLog(req, 'create_proposal', 'proposal', result.rows[0].id, client_name);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.put('/proposals/:id', requireAdmin, async (req, res) => {
        const { client_name, client_email, client_phone, items_json, total, status, valid_until, notes } = req.body;
        try {
            await ex('UPDATE proposals SET client_name=$1, client_email=$2, client_phone=$3, items_json=$4, total=$5, status=$6, valid_until=$7, notes=$8 WHERE id=$9',
                [client_name || '', client_email || '', client_phone || '', JSON.stringify(items_json || []), total || 0, status || 'draft', valid_until || null, notes || '', req.params.id]);
            await auditLog(req, 'update_proposal', 'proposal', req.params.id, status);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.delete('/proposals/:id', requireRole('admin'), async (req, res) => {
        try {
            await ex('DELETE FROM proposals WHERE id = $1', [req.params.id]);
            await auditLog(req, 'delete_proposal', 'proposal', req.params.id, '');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── INVOICES CRUD ─────────────────────────────── */
    router.get('/invoices', requireAdmin, async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, parseInt(req.query.limit) || 20);
            const offset = (page - 1) * limit;
            let where = '1=1'; const params = []; let idx = 1;
            if (req.query.status) { where += ` AND i.status = $${idx++}`; params.push(req.query.status); }
            const countRow = await q(`SELECT COUNT(*) as c FROM invoices i WHERE ${where}`, params);
            const rows = await q(`SELECT i.*, au.display_name as creator_name FROM invoices i LEFT JOIN admin_users au ON i.created_by=au.id WHERE ${where} ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
            res.json({ ok: true, invoices: rows, total: countRow[0].c, page, limit });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/invoices/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            res.json({ ok: true, invoice: rows[0] });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/invoices', requireAdmin, async (req, res) => {
        const { proposal_id, order_id, client_name, client_email, items_json, total, due_date, notes } = req.body;
        try {
            const result = await ex('INSERT INTO invoices (proposal_id, order_id, client_name, client_email, items_json, total, due_date, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
                [proposal_id || null, order_id || null, client_name || '', client_email || '', JSON.stringify(items_json || []), total || 0, due_date || null, notes || '', req.session.adminId]);
            await auditLog(req, 'create_invoice', 'invoice', result.rows[0].id, client_name);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.put('/invoices/:id', requireAdmin, async (req, res) => {
        const { client_name, client_email, items_json, total, status, due_date, paid_at, notes } = req.body;
        try {
            await ex('UPDATE invoices SET client_name=$1, client_email=$2, items_json=$3, total=$4, status=$5, due_date=$6, paid_at=$7, notes=$8 WHERE id=$9',
                [client_name || '', client_email || '', JSON.stringify(items_json || []), total || 0, status || 'draft', due_date || null, paid_at || null, notes || '', req.params.id]);
            await auditLog(req, 'update_invoice', 'invoice', req.params.id, status);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.delete('/invoices/:id', requireRole('admin'), async (req, res) => {
        try {
            await ex('DELETE FROM invoices WHERE id = $1', [req.params.id]);
            await auditLog(req, 'delete_invoice', 'invoice', req.params.id, '');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── REVENUE STATS ─────────────────────────────── */
    router.get('/revenue', requireAdmin, async (req, res) => {
        try {
            const totalRev = await q("SELECT COALESCE(SUM(total_price),0) as s FROM orders WHERE status='completed'");
            const activeRev = await q("SELECT COALESCE(SUM(total_price),0) as s FROM orders WHERE status IN ('new','in_progress')");
            const invoicedTotal = await q('SELECT COALESCE(SUM(total),0) as s FROM invoices');
            const invoicePaid = await q("SELECT COALESCE(SUM(total),0) as s FROM invoices WHERE status='paid'");
            const invoiceOverdue = await q("SELECT COALESCE(SUM(total),0) as s FROM invoices WHERE status='overdue'");
            const avgCheck = await q("SELECT COALESCE(AVG(total_price),0) as a FROM orders WHERE status='completed' AND total_price > 0");

            const monthly = await q(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_price) as revenue, COUNT(*) as count
                FROM orders WHERE status='completed' GROUP BY month ORDER BY month DESC LIMIT 12`);

            const bySource = await q(`SELECT l.source, COUNT(o.id) as orders_count, COALESCE(SUM(o.total_price),0) as revenue
                FROM orders o LEFT JOIN leads l ON o.lead_id=l.id GROUP BY l.source ORDER BY revenue DESC`);

            const byService = await q(`SELECT service, COUNT(*) as count, COALESCE(SUM(total_price),0) as revenue
                FROM orders WHERE status='completed' GROUP BY service ORDER BY revenue DESC`);

            res.json({
                ok: true,
                revenue: {
                    total: Number(totalRev[0].s), active: Number(activeRev[0].s),
                    invoiced: Number(invoicedTotal[0].s), paid: Number(invoicePaid[0].s),
                    overdue: Number(invoiceOverdue[0].s), avgCheck: Number(avgCheck[0].a),
                    monthly, bySource, byService
                }
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── UTM ANALYTICS ─────────────────────────────── */
    router.get('/utm-analytics', requireAdmin, async (req, res) => {
        try {
            const bySource = await q(`SELECT utm_source, COUNT(*) as leads, SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) as won,
                COALESCE(SUM(estimated_price),0) as est_revenue FROM leads WHERE utm_source != '' GROUP BY utm_source ORDER BY leads DESC`);
            const byCampaign = await q(`SELECT utm_campaign, utm_source, COUNT(*) as leads, SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) as won
                FROM leads WHERE utm_campaign != '' GROUP BY utm_campaign, utm_source ORDER BY leads DESC LIMIT 30`);
            const byMedium = await q(`SELECT utm_medium, COUNT(*) as leads FROM leads WHERE utm_medium != '' GROUP BY utm_medium ORDER BY leads DESC`);
            const pipeline = await q(`SELECT utm_source, stage, COUNT(*) as c FROM leads WHERE utm_source != '' GROUP BY utm_source, stage`);
            res.json({ ok: true, bySource, byCampaign, byMedium, pipeline });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── CONTENT VERSIONS ──────────────────────────── */
    router.get('/versions', requireAdmin, async (req, res) => {
        const { entity_type, entity_id } = req.query;
        if (!entity_type || !entity_id) return res.json({ ok: true, versions: [] });
        try {
            const rows = await q('SELECT v.id, v.lang, v.title, v.created_by, v.created_at, au.display_name as user_name FROM content_versions v LEFT JOIN admin_users au ON v.created_by=au.id WHERE v.entity_type=$1 AND v.entity_id=$2 ORDER BY v.created_at DESC LIMIT 50', [entity_type, entity_id]);
            res.json({ ok: true, versions: rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/versions/:id', requireAdmin, async (req, res) => {
        try {
            const rows = await q('SELECT * FROM content_versions WHERE id = $1', [req.params.id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            res.json({ ok: true, version: rows[0] });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/versions', requireAdmin, async (req, res) => {
        const { entity_type, entity_id, lang, title, html } = req.body;
        try {
            const result = await ex('INSERT INTO content_versions (entity_type, entity_id, lang, title, html, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
                [entity_type, entity_id, lang || 'ru', title || '', html || '', req.session.adminId]);
            res.json({ ok: true, id: result.rows[0].id });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── AUDIT LOG ─────────────────────────────────── */
    router.get('/audit', requireRole('admin'), async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(200, parseInt(req.query.limit) || 50);
            const offset = (page - 1) * limit;
            let where = '1=1'; const params = []; let idx = 1;
            if (req.query.user_id) { where += ` AND user_id = $${idx++}`; params.push(req.query.user_id); }
            if (req.query.action) { where += ` AND action = $${idx++}`; params.push(req.query.action); }
            if (req.query.entity_type) { where += ` AND entity_type = $${idx++}`; params.push(req.query.entity_type); }
            const countRow = await q(`SELECT COUNT(*) as c FROM audit_log WHERE ${where}`, params);
            const rows = await q(`SELECT * FROM audit_log WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
            res.json({ ok: true, logs: rows, total: countRow[0].c, page, limit });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── 2FA Management ────────────────────────────── */
    router.post('/2fa/setup', requireAdmin, async (req, res) => {
        try {
            const secret = generateTOTPSecret();
            await ex('UPDATE admin_users SET totp_secret = $1 WHERE id = $2', [secret, req.session.adminId]);
            const rows = await q('SELECT username FROM admin_users WHERE id = $1', [req.session.adminId]);
            const username = rows.length ? rows[0].username : 'admin';
            const base32Secret = hexToBase32(secret);
            const otpauthUrl = `otpauth://totp/AgileBusiness:${encodeURIComponent(username)}?secret=${base32Secret}&issuer=AgileBusiness&algorithm=SHA1&digits=6&period=30`;
            const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 });
            res.json({ ok: true, secret: base32Secret, otpauth_url: otpauthUrl, qr_data_url: qrDataUrl });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/2fa/enable', requireAdmin, async (req, res) => {
        const { code } = req.body;
        try {
            const user = await q('SELECT totp_secret FROM admin_users WHERE id = $1', [req.session.adminId]);
            if (!user.length || !user[0].totp_secret) return res.status(400).json({ error: 'Сначала настройте 2FA' });
            if (!verifyTOTP(user[0].totp_secret, String(code))) return res.status(400).json({ error: 'Неверный код' });
            await ex('UPDATE admin_users SET totp_enabled = TRUE WHERE id = $1', [req.session.adminId]);
            await auditLog(req, 'enable_2fa', 'admin_user', req.session.adminId, '');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post('/2fa/disable', requireAdmin, async (req, res) => {
        const { code } = req.body;
        try {
            const user = await q('SELECT totp_secret FROM admin_users WHERE id = $1', [req.session.adminId]);
            if (!user.length) return res.status(400).json({ error: 'User not found' });
            if (user[0].totp_secret && !verifyTOTP(user[0].totp_secret, String(code))) return res.status(400).json({ error: 'Неверный код' });
            await ex("UPDATE admin_users SET totp_enabled = FALSE, totp_secret = '' WHERE id = $1", [req.session.adminId]);
            await auditLog(req, 'disable_2fa', 'admin_user', req.session.adminId, '');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── EXPORT (CSV) ──────────────────────────────── */
    router.get('/export/leads', requireRole('admin', 'director'), async (req, res) => {
        try {
            const rows = await q('SELECT * FROM leads ORDER BY created_at DESC');
            const header = 'ID,Name,Email,Phone,Company,Service,Status,Stage,Source,UTM_Source,UTM_Medium,UTM_Campaign,EstimatedPrice,CreatedAt\n';
            const csv = header + rows.map(r =>
                [r.id, `"${(r.name||'').replace(/"/g,'""')}"`, r.email, r.phone, `"${(r.company||'').replace(/"/g,'""')}"`, r.service, r.status, r.stage||'new', r.source, r.utm_source||'', r.utm_medium||'', r.utm_campaign||'', r.estimated_price, r.created_at].join(',')
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
            res.send('\uFEFF' + csv);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/export/orders', requireRole('admin', 'director'), async (req, res) => {
        try {
            const rows = await q('SELECT * FROM orders ORDER BY created_at DESC');
            const header = 'ID,ClientName,ClientEmail,Service,Status,TotalPrice,Source,Deadline,CreatedAt\n';
            const csv = header + rows.map(r =>
                [r.id, `"${(r.client_name||'').replace(/"/g,'""')}"`, r.client_email, r.service, r.status, r.total_price, r.source, r.deadline||'', r.created_at].join(',')
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
            res.send('\uFEFF' + csv);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/export/invoices', requireRole('admin', 'director'), async (req, res) => {
        try {
            const rows = await q('SELECT * FROM invoices ORDER BY created_at DESC');
            const header = 'ID,ClientName,Total,Status,DueDate,PaidAt,CreatedAt\n';
            const csv = header + rows.map(r =>
                [r.id, `"${(r.client_name||'').replace(/"/g,'""')}"`, r.total, r.status, r.due_date||'', r.paid_at||'', r.created_at].join(',')
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
            res.send('\uFEFF' + csv);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    /* ── LOGIN ATTEMPTS ────────────────────────────── */
    router.get('/login-attempts', requireRole('admin'), async (req, res) => {
        try {
            const rows = await q('SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 100');
            res.json({ ok: true, attempts: rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
};
