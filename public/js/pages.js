/* ================================================================
   AGILE BUSINESS — Dynamic Pages (About / Works)
   Loads content from DB via /api/pages and /api/projects
   ================================================================ */
(function () {
    'use strict';

    const $ = (s, p) => (p || document).querySelector(s);

    function getLang() {
        try { return localStorage.getItem('ab_lang') || document.documentElement.getAttribute('lang') || 'ru'; }
        catch { return 'ru'; }
    }

    async function safeJsonFrom(resp, fallback) {
        try {
            if (!resp || !resp.ok) return fallback;
            return await resp.json();
        } catch (e) {
            return fallback;
        }
    }

    async function loadPage(slug) {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/pages/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`, 3);
        if (!r.ok) return { title: '', html: '' };
        return await safeJsonFrom(r, { title: '', html: '' });
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

    async function fetchWithRetry(url, attempts, opts) {
        opts = opts || {};
        const cacheMode = opts.cacheMode != null ? opts.cacheMode : 'no-store';
        const n = Math.max(1, attempts || 3);
        let lastStatus = 0;
        for (let i = 0; i < n; i++) {
            try {
                const r = await fetch(url, { cache: cacheMode, credentials: 'same-origin' });
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

    const WORKS_PAGE_META_KEY = 'ab_page_works_v1';

    function readWorksPageCache(lang) {
        try {
            const raw = sessionStorage.getItem(WORKS_PAGE_META_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || o.lang !== lang) return null;
            return { title: o.title || '', html: o.html || '' };
        } catch (e) {
            return null;
        }
    }

    function writeWorksPageCache(lang, title, html) {
        try {
            sessionStorage.setItem(WORKS_PAGE_META_KEY, JSON.stringify({
                lang, title: title || '', html: html || '', t: Date.now()
            }));
        } catch (e) { /* ignore */ }
    }

    async function loadWorksBundle() {
        const lang = getLang();
        try {
            const r = await fetchWithRetry(`/api/bundle/works?lang=${encodeURIComponent(lang)}`, 3, { cacheMode: 'no-store' });
            if (!r.ok) return null;
            const d = await safeJsonFrom(r, null);
            if (d && d.page && typeof d.page === 'object' && Array.isArray(d.projects)) {
                writeProjectsCache(lang, d.projects);
                writeWorksPageCache(lang, d.page.title, d.page.html);
                return { page: d.page, projects: d.projects };
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    const PROJECTS_CACHE_KEY = 'ab_projects_list_v1';

    function readProjectsCache(lang) {
        try {
            const raw = sessionStorage.getItem(PROJECTS_CACHE_KEY);
            if (!raw) return null;
            const o = JSON.parse(raw);
            if (!o || o.lang !== lang || !Array.isArray(o.projects)) return null;
            return o.projects;
        } catch (e) {
            return null;
        }
    }

    function writeProjectsCache(lang, projects) {
        try {
            if (!Array.isArray(projects) || !projects.length) return;
            sessionStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify({ lang, projects, t: Date.now() }));
        } catch (e) { /* quota / private mode */ }
    }

    async function loadProjects() {
        const lang = getLang();
        try {
            const r = await fetchWithRetry(`/api/projects?lang=${encodeURIComponent(lang)}`, 3);
            if (r.ok) {
                const d = await safeJsonFrom(r, null);
                if (d && Array.isArray(d.projects)) {
                    writeProjectsCache(lang, d.projects);
                    return { ok: true, projects: d.projects, fromCache: false };
                }
            }
            const cached = readProjectsCache(lang);
            if (cached && cached.length) {
                return { ok: true, projects: cached, fromCache: true };
            }
            return { ok: false, projects: [], fromCache: false };
        } catch (e) {
            const cached = readProjectsCache(lang);
            if (cached && cached.length) {
                return { ok: true, projects: cached, fromCache: true };
            }
            return { ok: false, projects: [], fromCache: false };
        }
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function renderAbout(page) {
        const titleEl = $('#pageTitle');
        const htmlEl = $('#pageHtml');
        if (titleEl && page && page.title) titleEl.textContent = page.title;
        if (!htmlEl) return;
        // Only override the default hardcoded content if the admin has provided meaningful HTML.
        // «Добавьте текст через админку» — это фикс-контент setup-db.js, игнорируем его.
        const raw = (page && page.html) ? String(page.html) : '';
        const plain = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const looksLikePlaceholder = /добавьте\s+.*через\s+админк/i.test(plain) || plain.length < 40;
        if (!looksLikePlaceholder) {
            htmlEl.innerHTML = raw;
        }
    }

    function renderWorksPageMeta(page) {
        const titleEl = $('#pageTitle');
        const introEl = $('#pageIntro');
        if (titleEl) titleEl.textContent = page.title || (typeof t === 'function' ? t('nav_works') : 'Works');
        if (introEl) {
            const temp = document.createElement('div');
            temp.innerHTML = page.html || '';
            const p = temp.querySelector('p');
            const rawIntro = (p && p.textContent) ? p.textContent : '';
            const cleaned = String(rawIntro || '').replace(/\s+/g, ' ').trim();
            const introText = (!cleaned || /добавьте\s+.*через\s+админк/i.test(cleaned))
                ? 'Реальные кейсы роста, автоматизации и цифровой трансформации бизнеса.'
                : cleaned;
            introEl.textContent = introText;
            introEl.style.display = introText ? '' : 'none';
        }
    }

    function renderProjectsGrid(projects, loadFailed, fromCache) {
        const grid = $('#projectsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // Update project count badge
        const countEl = $('#projectsCount');
        if (countEl && projects.length && !loadFailed) {
            countEl.textContent = projects.length + ' ' + (projects.length === 1 ? 'проект' : projects.length < 5 ? 'проекта' : 'проектов');
            countEl.style.display = '';
        } else if (countEl) {
            countEl.style.display = 'none';
        }
        if (fromCache) {
            grid.innerHTML = `<p class="services__desc reveal revealed" style="grid-column:1/-1;margin-bottom:12px;opacity:.85">Показан последний удачный список (временные ошибки сети или лимита). Обновление продолжается в фоне при следующей загрузке.</p>`;
        }
        if (loadFailed) {
            grid.innerHTML += `<div class="service-card reveal revealed" style="grid-column:1/-1"><h3 class="service-card__title">Не удалось загрузить проекты</h3><p class="service-card__desc" style="margin-top:8px">Временная ошибка сети — подождите минуту и обновите страницу (Ctrl+F5).</p></div>`;
            requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
            return;
        }
        if (!projects.length) {
            grid.innerHTML += `<div class="service-card reveal revealed" style="grid-column:1/-1"><h3 class="service-card__title">${esc(typeof t === 'function' ? t('works_empty') : 'No projects yet')}</h3></div>`;
            requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
            return;
        }
        projects.forEach((p) => {
            const title = p.title || p.slug;
            const desc = p.excerpt || '';
            const href = `/works/${encodeURIComponent(p.slug)}`;
            const img = p.cover_image
                ? `<div class="portfolio-card__media"><img src="${esc(p.cover_image)}" alt="${esc(title)}" loading="lazy"></div>`
                : '<div class="portfolio-card__media portfolio-card__media--placeholder"></div>';
            grid.innerHTML += `
                <a class="portfolio-card reveal revealed" data-hover href="${esc(href)}">
                    ${img}
                    <div class="portfolio-card__body">
                        <div class="portfolio-card__row">
                            <span class="portfolio-card__title">${esc(title)}</span>
                            <svg class="portfolio-card__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                        <p class="portfolio-card__sub">${esc(desc)}</p>
                    </div>
                </a>
            `;
        });
        requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
    }

    let worksInitGeneration = 0;
    let _loadedProjects = [];

    /* ── Works search filter ─────────────────────────── */
    const worksSearchInput = document.getElementById('worksSearch');
    if (worksSearchInput) {
        let wsTimer = null;
        worksSearchInput.addEventListener('input', () => {
            clearTimeout(wsTimer);
            wsTimer = setTimeout(() => {
                const q = worksSearchInput.value.trim().toLowerCase();
                if (!q) {
                    renderProjectsGrid(_loadedProjects, false, false);
                    return;
                }
                const filtered = _loadedProjects.filter(p => {
                    const title = (p.title || '').toLowerCase();
                    const desc = (p.excerpt || p.description || '').toLowerCase();
                    const tags = (p.stack || []).join(' ').toLowerCase();
                    return title.includes(q) || desc.includes(q) || tags.includes(q);
                });
                renderProjectsGrid(filtered, false, false);
            }, 250);
        });
    }

    async function init() {
        const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
        const isAbout = path === '/about' || path.endsWith('/about') || path.endsWith('/about.html');
        const isWorks = path === '/works' || path.endsWith('/works') || path.endsWith('/works.html');
        const myGen = isWorks ? ++worksInitGeneration : 0;
        try {
            if (isAbout) {
                const page = await loadPage('about');
                renderAbout(page);
            } else if (isWorks) {
                const bundle = await loadWorksBundle();
                if (bundle && myGen === worksInitGeneration) {
                    renderWorksPageMeta(bundle.page);
                    _loadedProjects = bundle.projects || [];
                    renderProjectsGrid(bundle.projects, false, false);
                } else {
                    let page = readWorksPageCache(getLang());
                    if (!page) page = await loadPage('works');
                    if (myGen !== worksInitGeneration) return;
                    renderWorksPageMeta(page);
                    if (myGen !== worksInitGeneration) return;
                    const { ok, projects, fromCache } = await loadProjects();
                    if (myGen !== worksInitGeneration) return;
                    _loadedProjects = projects || [];
                    renderProjectsGrid(projects, !ok, !!fromCache);
                }
            }
        } catch (e) {
            console.error('[pages.js]', e);
            const grid = $('#projectsGrid');
            if (grid && isWorks) {
                grid.innerHTML = '<p class="services__desc" style="grid-column:1/-1">Ошибка загрузки страницы. Обновите вкладку (F5) или откройте консоль (F12).</p>';
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
        const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
        const isWorks = path === '/works' || path.endsWith('/works') || path.endsWith('/works.html');
        if (isWorks && ev.persisted) void init();
    });
})();

