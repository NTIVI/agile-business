/**
 * Agile Business — PostgreSQL Database Setup
 * Run: node setup-db.js
 */
require('dotenv').config();
const { Client } = require('pg');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};
const DB_NAME = process.env.DB_NAME || 'agile_business';

async function setup() {
    console.log('Agile Business — PostgreSQL Database Setup\n');

    // Connect to default 'postgres' DB to create target DB if missing
    try {
        const rootClient = new Client({ ...DB_CONFIG, database: 'postgres' });
        await rootClient.connect();

        console.log(`Creating database "${DB_NAME}" if it does not exist...`);
        const res = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
        if (!res.rows.length) {
            await rootClient.query(`CREATE DATABASE "${DB_NAME}" ENCODING 'UTF8'`);
            console.log(`  Database "${DB_NAME}" created.`);
        } else {
            console.log(`  Database "${DB_NAME}" already exists.`);
        }
        await rootClient.end();
    } catch (e) {
        console.warn(`  ⚠️ Could not connect to default 'postgres' database or create database dynamically: ${e.message}`);
        console.warn('  ℹ️ Attempting to connect directly to the target database...');
    }

    // Now connect to target DB
    const conn = new Client({ ...DB_CONFIG, database: DB_NAME });
    await conn.connect();

    console.log('Creating tables...');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS visitors (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(36),
            ip VARCHAR(45),
            user_agent TEXT,
            device VARCHAR(20) DEFAULT 'desktop',
            browser VARCHAR(50) DEFAULT 'unknown',
            os VARCHAR(50) DEFAULT 'unknown',
            referrer TEXT,
            page VARCHAR(255) DEFAULT '/',
            lang VARCHAR(10) DEFAULT 'ru',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors (created_at)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_visitors_page ON visitors (page)`);
    console.log('  visitors');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) DEFAULT '',
            company VARCHAR(255) DEFAULT '',
            message TEXT,
            source VARCHAR(50) DEFAULT 'contact',
            service VARCHAR(100) DEFAULT '',
            service_sub VARCHAR(200) DEFAULT '',
            company_size VARCHAR(50) DEFAULT '',
            complexity VARCHAR(50) DEFAULT '',
            duration VARCHAR(50) DEFAULT '',
            estimated_price DECIMAL(12,2) DEFAULT 0,
            status VARCHAR(30) DEFAULT 'new',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source)`);
    console.log('  leads');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS calculator_sessions (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(36) UNIQUE,
            current_step INT DEFAULT 1,
            completed BOOLEAN DEFAULT FALSE,
            service VARCHAR(100) DEFAULT '',
            service_sub VARCHAR(200) DEFAULT '',
            company_size VARCHAR(50) DEFAULT '',
            complexity VARCHAR(50) DEFAULT '',
            duration VARCHAR(50) DEFAULT '',
            description TEXT,
            it_criteria_json TEXT,
            estimated_price DECIMAL(12,2) DEFAULT 0,
            relevance_score REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_calc_completed ON calculator_sessions (completed)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_calc_created ON calculator_sessions (created_at)`);
    console.log('  calculator_sessions');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS seo_settings (
            id SERIAL PRIMARY KEY,
            page VARCHAR(50) UNIQUE NOT NULL,
            title VARCHAR(255) DEFAULT '',
            description TEXT,
            keywords TEXT,
            og_title VARCHAR(255) DEFAULT '',
            og_description TEXT,
            og_image VARCHAR(255) DEFAULT ''
        )
    `);
    console.log('  seo_settings');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT
        )
    `);
    console.log('  settings');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS i18n_translations (
            id SERIAL PRIMARY KEY,
            lang VARCHAR(10) NOT NULL,
            tkey VARCHAR(190) NOT NULL,
            tvalue TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (lang, tkey)
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_i18n_lang ON i18n_translations (lang)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_i18n_key ON i18n_translations (tkey)`);
    console.log('  i18n_translations');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS pages (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(80) UNIQUE NOT NULL,
            title VARCHAR(255) DEFAULT '',
            html TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  pages');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS page_locales (
            id SERIAL PRIMARY KEY,
            page_id INT NOT NULL,
            lang VARCHAR(10) NOT NULL,
            title VARCHAR(255) DEFAULT '',
            html TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (page_id, lang),
            CONSTRAINT fk_page_locales_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_page_locales_lang ON page_locales (lang)`);
    console.log('  page_locales');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(120) UNIQUE NOT NULL,
            is_published BOOLEAN DEFAULT TRUE,
            cover_image VARCHAR(255) DEFAULT '',
            deadline_text VARCHAR(255) DEFAULT '',
            duration_text VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_projects_published ON projects (is_published)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_projects_created ON projects (created_at)`);
    console.log('  projects');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS project_locales (
            id SERIAL PRIMARY KEY,
            project_id INT NOT NULL,
            lang VARCHAR(10) NOT NULL,
            title VARCHAR(255) DEFAULT '',
            excerpt TEXT,
            html TEXT,
            gallery_json TEXT,
            stack_json TEXT,
            stack_front_json TEXT,
            stack_back_json TEXT,
            stack_db_json TEXT,
            stack_deploy_json TEXT,
            stack_android_json TEXT,
            stack_ios_json TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (project_id, lang),
            CONSTRAINT fk_project_locales_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_project_locales_lang ON project_locales (lang)`);
    console.log('  project_locales');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(120) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_clients_active ON clients (is_active)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_clients_created ON clients (created_at)`);
    console.log('  clients');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS client_profiles (
            id SERIAL PRIMARY KEY,
            client_id INT NOT NULL UNIQUE,
            company_name VARCHAR(255) DEFAULT '',
            logo_url VARCHAR(255) DEFAULT '',
            website VARCHAR(255) DEFAULT '',
            description TEXT,
            address VARCHAR(255) DEFAULT '',
            city VARCHAR(120) DEFAULT '',
            country VARCHAR(120) DEFAULT '',
                show_map BOOLEAN DEFAULT TRUE,
            lat DECIMAL(10,7) DEFAULT NULL,
            lng DECIMAL(10,7) DEFAULT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_client_profiles_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
    `);
    console.log('  client_profiles');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS project_reviews (
            id SERIAL PRIMARY KEY,
            project_id INT NOT NULL,
            client_id INT,
            lang VARCHAR(10) NOT NULL,
            rating SMALLINT DEFAULT 5,
            review_text TEXT,
            is_published BOOLEAN DEFAULT TRUE,
            company_name VARCHAR(255) DEFAULT '',
            logo_url VARCHAR(255) DEFAULT '',
            website VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_project_reviews_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_reviews_project ON project_reviews (project_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_reviews_client ON project_reviews (client_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_reviews_published ON project_reviews (is_published)`);
    console.log('  project_reviews');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS articles (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(140) UNIQUE NOT NULL,
            is_published BOOLEAN DEFAULT TRUE,
            cover_image VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (is_published)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_articles_created ON articles (created_at)`);
    console.log('  articles');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS article_locales (
            id SERIAL PRIMARY KEY,
            article_id INT NOT NULL,
            lang VARCHAR(10) NOT NULL,
            title VARCHAR(255) DEFAULT '',
            excerpt TEXT,
            html TEXT,
            gallery_json TEXT,
            stack_json TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (article_id, lang),
            CONSTRAINT fk_article_locales_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_article_locales_lang ON article_locales (lang)`);
    console.log('  article_locales');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS page_views (
            id SERIAL PRIMARY KEY,
            page VARCHAR(255),
            views INT DEFAULT 1,
            view_date DATE,
            UNIQUE (page, view_date)
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views (view_date)`);
    console.log('  page_views');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL,
            event_type VARCHAR(50) NOT NULL DEFAULT 'pageview',
            page_url VARCHAR(500),
            page_title VARCHAR(255),
            referrer VARCHAR(500),
            device_type VARCHAR(20),
            browser VARCHAR(50),
            os VARCHAR(50),
            screen_width INT,
            screen_height INT,
            language VARCHAR(10),
            country VARCHAR(50),
            city VARCHAR(100),
            element_clicked VARCHAR(255),
            scroll_depth INT,
            time_on_page INT,
            is_calculator_start BOOLEAN DEFAULT FALSE,
            is_calculator_complete BOOLEAN DEFAULT FALSE,
            is_lead_submit BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events (session_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event_type)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events (page_url)`);
    console.log('  analytics_events');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            client_name VARCHAR(255) NOT NULL DEFAULT '',
            client_email VARCHAR(255) DEFAULT '',
            client_phone VARCHAR(50) DEFAULT '',
            lead_id INT NULL,
            title VARCHAR(255) NOT NULL DEFAULT '',
            description TEXT,
            service VARCHAR(100) DEFAULT '',
            status VARCHAR(30) DEFAULT 'new',
            priority VARCHAR(20) DEFAULT 'medium',
            estimated_price DECIMAL(12,2) DEFAULT 0,
            final_price DECIMAL(12,2) DEFAULT 0,
            deadline DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at)`);
    console.log('  orders');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS order_stages (
            id SERIAL PRIMARY KEY,
            order_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            sort_order INT DEFAULT 0,
            completed_at TIMESTAMP NULL,
            CONSTRAINT fk_order_stages_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);
    console.log('  order_stages');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS order_comments (
            id SERIAL PRIMARY KEY,
            order_id INT NOT NULL,
            author VARCHAR(100) DEFAULT 'admin',
            comment_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_order_comments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);
    console.log('  order_comments');

    // Insert default SEO settings
    await conn.query(`
        INSERT INTO seo_settings (page, title, description, keywords) VALUES
        ('home', 'Agile Business — Бизнес-консалтинг нового поколения', 'Профессиональный бизнес-консалтинг в 5 направлениях: управление, инвестиции, креатив, аналитика, IT', 'бизнес консалтинг, стратегия, аналитика'),
        ('calculator', 'Калькулятор стоимости — Agile Business', 'Рассчитайте стоимость консалтинговых услуг онлайн', 'калькулятор стоимости, консалтинг')
        ON CONFLICT (page) DO NOTHING
    `);

    // Insert default pages
    await conn.query(`
        INSERT INTO pages (slug, title, html) VALUES
        ('about', 'О нас', '<h2>О нас</h2><p>Добавьте текст «О нас» через админку.</p>'),
        ('works', 'Наши работы', '<h2>Наши работы</h2><p>Добавьте проекты через админку.</p>'),
        ('articles', 'Статьи', '<h2>Статьи</h2><p>Добавьте статьи через админку.</p>')
        ON CONFLICT (slug) DO NOTHING
    `);

    // Insert default settings
    const bcrypt = require('bcryptjs');
    const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await conn.query("INSERT INTO settings (setting_key, setting_value) VALUES ('admin_password_hash', $1) ON CONFLICT (setting_key) DO NOTHING", [adminHash]);
    await conn.query("INSERT INTO settings (setting_key, setting_value) VALUES ('tg_bot_token', $1) ON CONFLICT (setting_key) DO NOTHING", [process.env.TG_BOT_TOKEN || '']);
    await conn.query("INSERT INTO settings (setting_key, setting_value) VALUES ('tg_chat_id', $1) ON CONFLICT (setting_key) DO NOTHING", [process.env.TG_CHAT_ID || '']);

    // Calculator pricing config
    const defaultPricing = {
        base_prices: {
            management: 250000, investment: 300000, creative: 180000, analytics: 200000, it: 350000
        },
        size_mult: { small: 1, medium: 1.5, large: 2.5 },
        complexity_mult: { basic: 1, standard: 1.8, premium: 3 },
        duration_mult: { short: 1, medium: 0.9, long: 0.8 },
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
    await conn.query(
        "INSERT INTO settings (setting_key, setting_value) VALUES ('calculator_pricing_json', $1) ON CONFLICT (setting_key) DO NOTHING",
        [JSON.stringify(defaultPricing)]
    );

    // Backward-compatible alter for existing DBs
    try { await conn.query('ALTER TABLE calculator_sessions ADD COLUMN IF NOT EXISTS it_criteria_json TEXT'); } catch (e) {}

    console.log('\nDatabase setup complete!');
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);

    await conn.end();
    process.exit(0);
}

setup().catch(err => {
    console.error('\nSetup failed:', err.message);
    console.error('\nMake sure PostgreSQL is running and credentials in .env are correct.');
    process.exit(1);
});
