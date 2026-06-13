require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function xmlEscape(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

(async () => {
    const SITE_URL = process.env.SITE_URL || 'https://agile-business-pro.com';
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'agile_business',
        max: 2,
        ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') ? { rejectUnauthorized: false } : false
    });

    const [worksRes, articlesRes] = await Promise.all([
        pool.query('SELECT slug FROM projects WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 5000'),
        pool.query('SELECT slug FROM articles WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 5000')
    ]);

    const worksRows = worksRes.rows || [];
    const articlesRows = articlesRes.rows || [];

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);

    const staticUrls = [
        { loc: '/', changefreq: 'weekly', priority: '1.0' },
        { loc: '/about', changefreq: 'monthly', priority: '0.8' },
        { loc: '/services', changefreq: 'weekly', priority: '0.8' },
        { loc: '/products', changefreq: 'weekly', priority: '0.8' },
        { loc: '/works', changefreq: 'weekly', priority: '0.8' },
        { loc: '/articles', changefreq: 'weekly', priority: '0.8' },
        { loc: '/calculator', changefreq: 'monthly', priority: '0.9' }
    ];

    const urlItems = [];
    for (const u of staticUrls) {
        urlItems.push(
            `    <url>\n` +
            `        <loc>${xmlEscape(SITE_URL + u.loc)}</loc>\n` +
            `        <lastmod>${stamp}</lastmod>\n` +
            `        <changefreq>${xmlEscape(u.changefreq)}</changefreq>\n` +
            `        <priority>${xmlEscape(u.priority)}</priority>\n` +
            `    </url>`
        );
    }

    for (const w of worksRows) {
        if (!w?.slug) continue;
        urlItems.push(
            `    <url>\n` +
            `        <loc>${xmlEscape(SITE_URL + '/works/' + w.slug)}</loc>\n` +
            `        <lastmod>${stamp}</lastmod>\n` +
            `        <changefreq>weekly</changefreq>\n` +
            `        <priority>0.8</priority>\n` +
            `    </url>`
        );
    }

    for (const a of articlesRows) {
        if (!a?.slug) continue;
        urlItems.push(
            `    <url>\n` +
            `        <loc>${xmlEscape(SITE_URL + '/articles/' + a.slug)}</loc>\n` +
            `        <lastmod>${stamp}</lastmod>\n` +
            `        <changefreq>weekly</changefreq>\n` +
            `        <priority>0.7</priority>\n` +
            `    </url>`
        );
    }

    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        urlItems.join('\n') +
        `\n</urlset>\n`;

    const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log(`✅ sitemap.xml rebuilt: static=${staticUrls.length}, works=${worksRows.length}, articles=${articlesRows.length}`);

    await pool.end();
})().catch(err => {
    console.error('❌ rebuild-sitemap failed:', err);
    process.exit(1);
});

