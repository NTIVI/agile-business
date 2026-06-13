const { Pool } = require('pg');
require('dotenv').config();

(async () => {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'agile_business',
        max: 2,
        ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') ? { rejectUnauthorized: false } : false
    });
    const { rows } = await pool.query(`
        SELECT p.id, p.slug, p.is_published, p.created_at,
               (SELECT COUNT(*) FROM project_locales pl WHERE pl.project_id = p.id) AS loc_cnt,
               (SELECT COUNT(*) FROM project_locales pl WHERE pl.project_id = p.id AND pl.lang = 'ru') AS ru_cnt
        FROM projects p
        ORDER BY p.id DESC
        LIMIT 12
    `);
    console.log(JSON.stringify(rows, null, 2));
    await pool.end();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
