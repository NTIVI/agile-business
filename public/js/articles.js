/* ================================================================
   AGILE BUSINESS — Articles (list + detail)
   ================================================================ */
(function () {
    'use strict';

    const $ = (s, p) => (p || document).querySelector(s);

    function getLang() {
        try { return localStorage.getItem('ab_lang') || document.documentElement.getAttribute('lang') || 'ru'; }
        catch { return 'ru'; }
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    async function safeJsonFrom(resp, fallback) {
        try {
            if (!resp || !resp.ok) return fallback;
            return await resp.json();
        } catch (e) {
            return fallback;
        }
    }

    function parseRetryAfterMs(resp) {
        if (!resp || !resp.headers || !resp.headers.get) return 0;
        const h = resp.headers.get('Retry-After');
        if (!h) return 0;
        const sec = parseInt(h, 10);
        if (!isNaN(sec)) return Math.min(sec * 1000, 120000);
        const t = Date.parse(h);
        if (!isNaN(t)) return Math.min(Math.max(0, t - Date.now()), 120000);
        return 0;
    }

    async function fetchWithRetry(url, attempts) {
        const n = Math.max(1, attempts || 3);
        let lastStatus = 0;
        for (let i = 0; i < n; i++) {
            try {
                const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
                lastStatus = r.status;
                if (r.ok) return r;
                const retryable = r.status === 429 || r.status === 408 || r.status === 502 || r.status === 503 || r.status === 504
                    || (r.status >= 500 && r.status < 600);
                if (retryable && i < n - 1) {
                    let delay = Math.round(260 * Math.pow(1.5, i) + Math.random() * 180);
                    if (r.status === 429) {
                        const ra = parseRetryAfterMs(r);
                        if (ra > delay) delay = ra + Math.round(Math.random() * 400);
                    }
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }
                return r;
            } catch (e) {
                lastStatus = 0;
                if (i < n - 1) {
                    const delay = Math.round(200 * Math.pow(1.5, i) + Math.random() * 150);
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }
            }
        }
        return { ok: false, status: lastStatus, headers: { get: () => null }, json: async () => ({}) };
    }

    const ARTICLES_CACHE_KEY = 'ab_articles_list_v1';

    function readArticlesCache(lang) {
        try {
            const raw = sessionStorage.getItem(ARTICLES_CACHE_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || o.lang !== lang || !Array.isArray(o.articles)) return null;
            return o.articles;
        } catch (e) {
            return null;
        }
    }

    function writeArticlesCache(lang, articles) {
        try {
            if (!Array.isArray(articles) || !articles.length) return;
            sessionStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify({ lang, articles, t: Date.now() }));
        } catch (e) { /* quota */ }
    }

    const ARTICLES_PAGE_META_KEY = 'ab_page_articles_v1';

    function readArticlesPageCache(lang) {
        try {
            const raw = sessionStorage.getItem(ARTICLES_PAGE_META_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || o.lang !== lang) return null;
            return { title: o.title || '', html: o.html || '' };
        } catch (e) { return null; }
    }

    function writeArticlesPageCache(lang, title, html) {
        try {
            sessionStorage.setItem(ARTICLES_PAGE_META_KEY, JSON.stringify({
                lang, title: title || '', html: html || '', t: Date.now()
            }));
        } catch (e) { /* ignore */ }
    }

    async function loadArticlesBundle() {
        const lang = getLang();
        try {
            const r = await fetchWithRetry(`/api/bundle/articles?lang=${encodeURIComponent(lang)}`, 3);
            if (!r.ok) return null;
            const d = await safeJsonFrom(r, null);
            if (d && d.page && typeof d.page === 'object' && Array.isArray(d.articles)) {
                writeArticlesCache(lang, d.articles);
                writeArticlesPageCache(lang, d.page.title, d.page.html);
                return { page: d.page, articles: d.articles };
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    async function loadPageIntro() {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/pages/articles?lang=${encodeURIComponent(lang)}`, 3);
        if (!r.ok) return { title: '', html: '' };
        return await safeJsonFrom(r, { title: '', html: '' });
    }

    async function loadArticles() {
        const lang = getLang();
        try {
            const r = await fetchWithRetry(`/api/articles?lang=${encodeURIComponent(lang)}`, 3);
            if (r.ok) {
                const d = await safeJsonFrom(r, null);
                if (d && Array.isArray(d.articles)) {
                    writeArticlesCache(lang, d.articles);
                    return { ok: true, articles: d.articles, fromCache: false };
                }
            }
            const cached = readArticlesCache(lang);
            if (cached && cached.length) {
                return { ok: true, articles: cached, fromCache: true };
            }
            return { ok: false, articles: [], fromCache: false };
        } catch (e) {
            const cached = readArticlesCache(lang);
            if (cached && cached.length) {
                return { ok: true, articles: cached, fromCache: true };
            }
            return { ok: false, articles: [], fromCache: false };
        }
    }

    function getSlugFromPath() {
        const parts = (window.location.pathname || '').split('/').filter(Boolean);
        if (parts[0] !== 'articles') return '';
        return parts[1] || '';
    }

    async function loadArticle(slug) {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/articles/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`, 5);
        if (!r.ok) return null;
        const d = await safeJsonFrom(r, {});
        return d.article || null;
    }

    function renderListIntro(page) {
        const titleEl = $('#articlesTitle');
        const introEl = $('#articlesIntro');
        if (titleEl) titleEl.textContent = page.title || (typeof t === 'function' ? t('nav_articles') : 'Articles');
        if (introEl) {
            const temp = document.createElement('div');
            temp.innerHTML = page.html || '';
            const p = temp.querySelector('p');
            const rawIntro = (p && p.textContent) ? p.textContent : '';
            const cleaned = String(rawIntro || '').replace(/\s+/g, ' ').trim();
            const introText = (!cleaned || /добавьте\s+.*через\s+админк/i.test(cleaned))
                ? 'Экспертные материалы по стратегии, маркетингу, цифровизации и развитию бизнеса.'
                : cleaned;
            introEl.textContent = introText;
            introEl.style.display = introText ? '' : 'none';
        }
    }

    function renderArticlesGrid(items, loadFailed, fromCache) {
        const grid = $('#articlesGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // Update articles count badge
        const countEl = document.getElementById('articlesCount');
        if (countEl && items.length && !loadFailed) {
            const n = items.length;
            const word = n === 1 ? 'статья' : (n >= 2 && n <= 4) ? 'статьи' : 'статей';
            countEl.textContent = n + ' ' + word;
            countEl.style.display = '';
        } else if (countEl) {
            countEl.style.display = 'none';
        }
        if (fromCache) {
            grid.innerHTML = `<p class="services__desc reveal revealed" style="grid-column:1/-1;margin-bottom:12px;opacity:.85">Показан последний удачный список (временные ошибки сети или лимита).</p>`;
        }
        if (loadFailed) {
            grid.innerHTML += `<div class="service-card reveal revealed" style="grid-column:1/-1"><h3 class="service-card__title">Не удалось загрузить статьи</h3><p class="service-card__desc" style="margin-top:8px">Временная ошибка сети — подождите минуту и обновите страницу (Ctrl+F5).</p></div>`;
            requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
            return;
        }
        if (!items.length) {
            grid.innerHTML += `<div class="service-card reveal revealed" style="grid-column:1/-1"><h3 class="service-card__title">${esc(typeof t === 'function' ? t('articles_empty') : 'No articles yet')}</h3></div>`;
            requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
            return;
        }
        items.forEach((a) => {
            const title = a.title || a.slug;
            const desc = a.excerpt || '';
            const href = `/articles/${encodeURIComponent(a.slug)}`;
            const img = a.cover_image
                ? `<div class="portfolio-card__media"><img src="${esc(a.cover_image)}" alt="${esc(title)}" loading="lazy"></div>`
                : '<div class="portfolio-card__media portfolio-card__media--placeholder"></div>';
            grid.innerHTML += `
                <a class="portfolio-card reveal revealed" data-hover href="${esc(href)}">
                    ${img}
                    <div class="portfolio-card__body">
                        <div class="portfolio-card__row"><span class="portfolio-card__title">${esc(title)}</span></div>
                        <p class="portfolio-card__sub">${esc(desc)}</p>
                    </div>
                </a>
            `;
        });
        requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
    }

    function sanitizeRichHtml(input) {
        const src = String(input || '');
        if (!src.trim()) return '';
        if (!/<[a-z][\s\S]*>/i.test(src)) {
            return `<p>${esc(src).replace(/\n/g, '<br>')}</p>`;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${src}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return '';
        const allowedTags = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IMG', 'HR', 'PRE', 'CODE', 'SPAN', 'DIV']);
        const allowedClass = /^(ql-align-(center|right|justify)|ql-size-(small|large|huge)|ql-indent-[1-9]|ql-direction-rtl)$/;
        const cleanAttrs = (el) => {
            Array.from(el.attributes || []).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value || '';
                if (el.tagName === 'A' && name === 'href') {
                    if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value)) {
                        if (/^https?:\/\//i.test(value)) {
                            el.setAttribute('target', '_blank');
                            el.setAttribute('rel', 'noopener noreferrer');
                        }
                        return;
                    }
                }
                if (el.tagName === 'IMG' && (name === 'src' || name === 'alt') && /^(https?:\/\/|data:image\/|\/)/i.test(value || '')) {
                    return;
                }
                if (name === 'class') {
                    const safe = String(value).split(/\s+/).filter(cls => allowedClass.test(cls));
                    if (safe.length) el.setAttribute('class', safe.join(' '));
                    else el.removeAttribute('class');
                    return;
                }
                el.removeAttribute(attr.name);
            });
            if (el.tagName === 'IMG') {
                el.setAttribute('loading', 'lazy');
                el.setAttribute('decoding', 'async');
            }
        };
        const walk = (node) => {
            Array.from(node.childNodes || []).forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    if (!allowedTags.has(child.tagName)) {
                        while (child.firstChild) node.insertBefore(child.firstChild, child);
                        node.removeChild(child);
                        return;
                    }
                    cleanAttrs(child);
                    walk(child);
                } else if (child.nodeType !== Node.TEXT_NODE) {
                    node.removeChild(child);
                }
            });
        };
        walk(root);
        return root.innerHTML.trim();
    }

    function svgChevron(dir) {
        const d = dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6';
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${d}"/></svg>`;
    }

    function initArticleRelatedStrip(track, prevBtn, nextBtn) {
        if (!track || !prevBtn || !nextBtn) return;
        if (!prevBtn.innerHTML.trim()) prevBtn.innerHTML = svgChevron('prev');
        if (!nextBtn.innerHTML.trim()) nextBtn.innerHTML = svgChevron('next');

        function gap() {
            const cs = getComputedStyle(track);
            const g = parseFloat(cs.gap || cs.columnGap) || 0;
            return Number.isFinite(g) ? g : 22;
        }

        function stepWidth() {
            const card = track.querySelector('.portfolio-card');
            if (!card) return Math.max(240, Math.round(track.clientWidth * 0.82));
            return Math.round(card.getBoundingClientRect().width + gap());
        }

        function updateArrows() {
            const max = track.scrollWidth - track.clientWidth;
            if (max <= 6) {
                prevBtn.style.visibility = 'hidden';
                nextBtn.style.visibility = 'hidden';
                return;
            }
            prevBtn.style.visibility = track.scrollLeft <= 6 ? 'hidden' : 'visible';
            nextBtn.style.visibility = track.scrollLeft >= max - 6 ? 'hidden' : 'visible';
        }

        prevBtn.addEventListener('click', () => track.scrollBy({ left: -stepWidth(), behavior: 'smooth' }));
        nextBtn.addEventListener('click', () => track.scrollBy({ left: stepWidth(), behavior: 'smooth' }));
        track.addEventListener('scroll', () => requestAnimationFrame(updateArrows));
        window.addEventListener('resize', updateArrows);
        requestAnimationFrame(() => requestAnimationFrame(updateArrows));
    }

    function renderRelatedArticles(grid, items, currentSlug) {
        if (!grid) return;
        const others = (items || []).filter(x => x && x.slug && x.slug !== currentSlug);
        const section = $('#articleMoreSection');
        if (!others.length) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = '';
        grid.innerHTML = others.map(ar => {
            const title = ar.title || ar.slug;
            const sub = ar.excerpt || '';
            const im = ar.cover_image
                ? `<div class="portfolio-card__media"><img src="${esc(ar.cover_image)}" alt="${esc(title)}" loading="lazy" decoding="async"></div>`
                : '<div class="portfolio-card__media portfolio-card__media--placeholder"></div>';
            return `
                <a class="portfolio-card reveal revealed" data-hover href="/articles/${encodeURIComponent(ar.slug)}">
                    ${im}
                    <div class="portfolio-card__body">
                        <div class="portfolio-card__row"><span class="portfolio-card__title">${esc(title)}</span></div>
                        <p class="portfolio-card__sub">${esc(sub)}</p>
                    </div>
                </a>`;
        }).join('');
        requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
        initArticleRelatedStrip(grid, $('#articleRelatedPrev'), $('#articleRelatedNext'));
    }

    async function renderArticle(a) {
        $('#articleTitle').textContent = a.title || a.slug;
        $('#articleExcerpt').textContent = a.excerpt || '';
        const carEl = $('#articleCarousel');
        if (carEl && window.abCarousel) {
            const slides = window.abCarousel.buildPreviewSlides(a.cover_image, a.gallery);
            window.abCarousel.mount(carEl, slides, { alt: a.title || a.slug });
        }
        const bodyEl = $('#articleHtml');
        if (bodyEl) {
            bodyEl.innerHTML = sanitizeRichHtml(a.html || '') || '<p style="opacity:.8">—</p>';
        }
        document.title = `${a.title || a.slug} — Agile Business`;

        // Dynamic SEO meta
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
        meta.content = (a.excerpt || '').slice(0, 160);

        // JSON-LD BlogPosting schema
        const ld = document.createElement('script');
        ld.type = 'application/ld+json';
        const origin = location.origin;
        ld.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: a.title || a.slug,
            description: a.excerpt || '',
            image: a.cover_image || '',
            datePublished: a.created_at || '',
            author: { '@type': 'Organization', name: 'Agile Business', url: origin },
            publisher: { '@type': 'Organization', name: 'Agile Business', url: origin, logo: { '@type': 'ImageObject', url: origin + '/assets/logo.png' } },
            mainEntityOfPage: { '@type': 'WebPage', '@id': location.href }
        });
        document.head.appendChild(ld);

        // Breadcrumb schema
        const bcLd = document.createElement('script');
        bcLd.type = 'application/ld+json';
        bcLd.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Agile Business', item: origin + '/' },
                { '@type': 'ListItem', position: 2, name: typeof t === 'function' ? t('nav_articles') : 'Статьи', item: origin + '/articles' },
                { '@type': 'ListItem', position: 3, name: a.title || a.slug }
            ]
        });
        document.head.appendChild(bcLd);

        // Render visual breadcrumbs
        const heroEl = document.querySelector('.detail-page__hero');
        if (heroEl) {
            const bc = document.createElement('nav');
            bc.className = 'breadcrumbs';
            bc.setAttribute('aria-label', 'Breadcrumb');
            bc.innerHTML = `<a href="/">Agile Business</a><span class="breadcrumbs__sep">/</span><a href="/articles">${esc(typeof t === 'function' ? t('nav_articles') : 'Статьи')}</a><span class="breadcrumbs__sep">/</span><span class="breadcrumbs__current">${esc(a.title || a.slug)}</span>`;
            heroEl.insertBefore(bc, heroEl.firstChild);
        }

        const slug = a.slug;
        const { articles: allArts } = await loadArticles();
        renderRelatedArticles($('#relatedArticles'), allArts, slug);
    }

    let articlesListInitGeneration = 0;
    let _loadedArticles = [];

    /* ── Search filter ───────────────────────────────── */
    const searchInput = document.getElementById('articlesSearch');
    if (searchInput) {
        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const q = searchInput.value.trim().toLowerCase();
                if (!q) {
                    renderArticlesGrid(_loadedArticles, false, false);
                    return;
                }
                const filtered = _loadedArticles.filter(a => {
                    const title = (a.title || '').toLowerCase();
                    const excerpt = (a.excerpt || '').toLowerCase();
                    return title.includes(q) || excerpt.includes(q);
                });
                renderArticlesGrid(filtered, false, false);
            }, 250);
        });
    }

    async function init() {
        try {
            const slug = getSlugFromPath();
            if (slug) {
                const a = await loadArticle(slug);
                if (a) await renderArticle(a);
                return;
            }

            const myGen = ++articlesListInitGeneration;

            // Try bundle (single request) first
            const bundle = await loadArticlesBundle();
            if (bundle && myGen === articlesListInitGeneration) {
                renderListIntro(bundle.page);
                _loadedArticles = bundle.articles || [];
                renderArticlesGrid(bundle.articles, false, false);
                return;
            }

            // Fallback: two separate requests
            let page = readArticlesPageCache(getLang());
            if (!page) page = await loadPageIntro();
            if (myGen !== articlesListInitGeneration) return;
            renderListIntro(page);
            if (myGen !== articlesListInitGeneration) return;
            const { ok, articles, fromCache } = await loadArticles();
            if (myGen !== articlesListInitGeneration) return;
            _loadedArticles = articles || [];
            renderArticlesGrid(articles, !ok, !!fromCache);
        } catch (e) {
            console.error('[articles.js]', e);
            const grid = $('#articlesGrid');
            if (grid) {
                grid.innerHTML = '<p class="services__desc" style="grid-column:1/-1">Ошибка загрузки. Обновите страницу или откройте консоль (F12).</p>';
            }
        }
    }

    function scheduleInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => { void init(); });
        } else {
            void init();
        }
    }
    scheduleInit();
    window.addEventListener('pageshow', function (ev) {
        if (getSlugFromPath()) return;
        const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
        const isList = path === '/articles' || path.endsWith('/articles') || path.endsWith('/articles.html');
        if (isList && ev.persisted) void init();
    });
})();

