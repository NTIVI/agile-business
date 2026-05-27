/* ================================================================
   Single work / project detail (/works/:slug)
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

    function sanitizeRichHtml(input, allowImages) {
        const src = String(input || '');
        if (!src.trim()) return '';
        if (!/<[a-z][\s\S]*>/i.test(src)) {
            return `<p>${esc(src).replace(/\n/g, '<br>')}</p>`;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${src}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return '';
        const allowed = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IMG', 'HR', 'PRE', 'CODE', 'SPAN', 'DIV']);
        const allowedClass = /^(ql-align-(center|right|justify)|ql-size-(small|large|huge)|ql-indent-[1-9]|ql-direction-rtl)$/;
        const walk = (node) => {
            const kids = Array.from(node.childNodes || []);
            for (const child of kids) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const tag = child.tagName.toUpperCase();
                    if (!allowed.has(tag) || (tag === 'IMG' && !allowImages)) {
                        while (child.firstChild) node.insertBefore(child.firstChild, child);
                        node.removeChild(child);
                        continue;
                    }
                    Array.from(child.attributes || []).forEach(attr => {
                        const name = attr.name.toLowerCase();
                        const value = attr.value || '';
                        if (tag === 'A' && name === 'href') {
                            if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value)) {
                                if (/^https?:\/\//i.test(value)) {
                                    child.setAttribute('target', '_blank');
                                    child.setAttribute('rel', 'noopener noreferrer');
                                }
                                return;
                            }
                        }
                        if (tag === 'IMG' && (name === 'src' || name === 'alt') && /^(https?:\/\/|data:image\/|\/)/i.test(value || '')) {
                            return;
                        }
                        if (name === 'class') {
                            const safe = String(value).split(/\s+/).filter(cls => allowedClass.test(cls));
                            if (safe.length) child.setAttribute('class', safe.join(' '));
                            else child.removeAttribute('class');
                            return;
                        }
                        child.removeAttribute(attr.name);
                    });
                    if (tag === 'IMG') {
                        child.setAttribute('loading', 'lazy');
                        child.setAttribute('decoding', 'async');
                    }
                    walk(child);
                } else if (child.nodeType !== Node.TEXT_NODE) {
                    node.removeChild(child);
                }
            }
        };
        walk(root);
        return root.innerHTML.trim();
    }

    function sanitizeReviewHtml(input) {
        return sanitizeRichHtml(input, false);
    }

    function renderReviewText(text) {
        const raw = String(text || '');
        if (!raw.trim()) return '';
        const hasMarkup = /<\/?[a-z][\s\S]*>/i.test(raw);
        if (hasMarkup) return sanitizeReviewHtml(raw);
        return esc(raw).replace(/\n/g, '<br>');
    }

    async function safeJsonFrom(resp, fallback) {
        try {
            if (!resp || !resp.ok) return fallback;
            return await resp.json();
        } catch (e) {
            return fallback;
        }
    }

    async function fetchWithRetry(url, attempts) {
        const n = Math.max(1, attempts || 12);
        let lastStatus = 0;
        for (let i = 0; i < n; i++) {
            try {
                const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
                lastStatus = r.status;
                if (r.ok) return r;
                const retryable = r.status === 429 || r.status === 408 || r.status >= 500;
                if (retryable && i < n - 1) {
                    await new Promise(res => setTimeout(res, 260 * Math.pow(1.45, i) + Math.random() * 120));
                    continue;
                }
                return r;
            } catch (e) {
                if (i < n - 1) {
                    await new Promise(res => setTimeout(res, 200 * Math.pow(1.45, i)));
                    continue;
                }
            }
        }
        return { ok: false, status: lastStatus, json: async () => ({}) };
    }

    function getSlugFromPath() {
        const parts = (window.location.pathname || '').split('/').filter(Boolean);
        if (parts[0] !== 'works') return '';
        return parts[1] || '';
    }

    async function loadProject(slug) {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/projects/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`, 12);
        if (!r.ok) return null;
        const d = await safeJsonFrom(r, {});
        return d.project || null;
    }

    async function loadAllProjects() {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/projects?lang=${encodeURIComponent(lang)}`, 12);
        if (!r.ok) return [];
        const d = await safeJsonFrom(r, {});
        return Array.isArray(d.projects) ? d.projects : [];
    }

    async function loadProjectReview(slug) {
        const lang = getLang();
        const r = await fetchWithRetry(`/api/projects/${encodeURIComponent(slug)}/review?lang=${encodeURIComponent(lang)}`, 12);
        if (!r.ok) return null;
        const d = await safeJsonFrom(r, {});
        return d.review || null;
    }

    function renderStack(container, items) {
        if (!container) return;
        if (typeof window.abRenderTechStack === 'function') {
            window.abRenderTechStack(container, items);
            return;
        }
        const list = Array.isArray(items) ? items.map(x => (x && typeof x === 'object' && x.label) ? x.label : String(x || '').trim()).filter(Boolean) : [];
        if (!list.length) {
            container.innerHTML = '<p class="services__desc" style="margin:0;opacity:.75">—</p>';
            return;
        }
        container.innerHTML = list.map(t => `<span class="detail-page__tag">${esc(t)}</span>`).join('');
    }

    function renderProjectMeta(project) {
        const items = [
            project && project.duration_text ? { label: 'Срок выполнения', value: project.duration_text } : null,
            project && project.deadline_text ? { label: 'Дедлайн', value: project.deadline_text } : null,
            project && project.created_at ? { label: 'Дата реализации проекта', value: new Date(project.created_at).toLocaleDateString('ru-RU') } : null
        ].filter(Boolean);
        return items.map(item => `<span class="detail-page__meta-chip"><strong>${esc(item.label)}:</strong> ${esc(item.value)}</span>`).join('');
    }

    function renderReviewQuote(review) {
        if (!review) return '';
        const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));
        const client = review.client || {};
        const logoUrl = client.logo_url || '';
        const website = client.website || '';
        const companyName = client.company_name || client.slug || '';
        const profileHref = client.slug ? `/client/${encodeURIComponent(client.slug)}` : '';
        const hasCompanyInfo = !!(companyName || profileHref);
        
        const stars = Array.from({ length: 5 }).map((_, i) => {
            const on = i + 1 <= rating;
            return `<span class="work-review__star ${on ? 'is-on' : ''}">★</span>`;
        }).join('');
        
        const avatarInner = logoUrl
            ? `<img class="work-review__logo-img" src="${esc(logoUrl)}" alt="${esc(companyName || 'Компания')}">`
            : `<span class="work-review__logo-fallback">${esc((companyName || 'C').slice(0, 1).toUpperCase())}</span>`;
        
        // Аватарка ВСЕГДА кликабельная, если есть информация о компании
        const avatarHtml = hasCompanyInfo
            ? (profileHref
                ? `<a class="work-review__logo-link" href="${esc(profileHref)}" aria-label="Профиль компании">${avatarInner}</a>`
                : `<button class="work-review__logo-link work-review__logo-btn" type="button" aria-label="Информация о компании" title="${esc(companyName)}">${avatarInner}</button>`)
            : avatarInner;
        
        const companyHtml = companyName
            ? (profileHref 
                ? `<a class="work-review__company-link" href="${esc(profileHref)}">${esc(companyName)}</a>` 
                : `<span class="work-review__company">${esc(companyName)}</span>`)
            : '';
        
        const metaBits = [
            profileHref ? `<a class="work-review__meta-link" href="${esc(profileHref)}">Профиль компании</a>` : ''
        ].filter(Boolean).join('<span class="work-review__sep">•</span>');
        
        const textHtml = renderReviewText(review.text || '');
        return `
            <div class="work-review">
                <div class="work-review__top">
                    <div class="work-review__logo">${avatarHtml}</div>
                    <div class="work-review__company-wrap">
                        ${companyHtml}
                        ${metaBits ? `<div class="work-review__meta">${metaBits}</div>` : ''}
                    </div>
                    <div class="work-review__rating">${stars}</div>
                </div>
                <div class="work-review__text">${textHtml || '—'}</div>
            </div>
        `;
    }

    function svgChevron(dir) {
        const d = dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6';
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${d}"/></svg>`;
    }

    function initRelatedStrip(track, prevBtn, nextBtn) {
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

    function renderRelated(grid, items, currentSlug) {
        if (!grid) return;
        const others = items.filter(p => p && p.slug && p.slug !== currentSlug);
        const more = $('#moreSection');
        const prevBtn = $('#relatedPrev');
        const nextBtn = $('#relatedNext');
        const maxVisible = 3;

        if (!others.length) {
            if (more) more.style.display = 'none';
            return;
        }
        if (more) more.style.display = '';

        // We intentionally show only 3 works at a time (no partial 4th card).
        // Navigation arrows re-render the next "page".
        grid.style.overflowX = 'hidden';
        grid.scrollLeft = 0;

        let pageStart = 0;
        const renderWindow = () => {
            const win = Array.from({ length: Math.min(maxVisible, others.length) }, (_, i) => others[(pageStart + i) % others.length]).filter(Boolean);
            grid.innerHTML = win.map(p => {
                const title = p.title || p.slug;
                const sub = p.excerpt || '';
                const img = p.cover_image
                    ? `<div class="portfolio-card__media"><img src="${esc(p.cover_image)}" alt="${esc(title)}" loading="lazy" decoding="async"></div>`
                    : '<div class="portfolio-card__media portfolio-card__media--placeholder"></div>';
                return `
                    <a class="portfolio-card reveal revealed" data-hover href="/works/${encodeURIComponent(p.slug)}">
                        ${img}
                        <div class="portfolio-card__body">
                            <div class="portfolio-card__row"><span class="portfolio-card__title">${esc(title)}</span></div>
                            <p class="portfolio-card__sub">${esc(sub)}</p>
                        </div>
                    </a>`;
            }).join('');
            requestAnimationFrame(() => requestAnimationFrame(() => typeof window.abForceRevealVisible === 'function' && window.abForceRevealVisible(grid)));
        };

        const pageStep = maxVisible;
        const canNav = others.length > maxVisible;
        if (prevBtn) prevBtn.style.display = canNav ? '' : 'none';
        if (nextBtn) nextBtn.style.display = canNav ? '' : 'none';

        if (canNav) {
            if (prevBtn) prevBtn.onclick = () => { pageStart = (pageStart - pageStep + others.length) % others.length; renderWindow(); };
            if (nextBtn) nextBtn.onclick = () => { pageStart = (pageStart + pageStep) % others.length; renderWindow(); };
        } else {
            if (prevBtn) prevBtn.onclick = null;
            if (nextBtn) nextBtn.onclick = null;
        }

        renderWindow();
    }

    async function init() {
        const slug = getSlugFromPath();
        if (!slug) {
            window.location.replace('/works');
            return;
        }
        const p = await loadProject(slug);
        if (!p) {
            $('#workTitle').textContent = typeof t === 'function' ? t('work_not_found') : 'Проект не найден';
            $('#workExcerpt').textContent = '';
            $('#workHtml').innerHTML = '<p>404</p>';
            return;
        }

        $('#workTitle').textContent = p.title || p.slug;
        $('#workExcerpt').textContent = p.excerpt || '';
        const metaEl = $('#workMeta');
        if (metaEl) metaEl.innerHTML = renderProjectMeta(p);
        $('#workHtml').innerHTML = sanitizeRichHtml(p.html || '', true) || '<p style="opacity:.8">—</p>';

        const slides = window.abCarousel && window.abCarousel.buildPreviewSlides
            ? window.abCarousel.buildPreviewSlides(p.cover_image, p.gallery)
            : [];
        const carEl = $('#workCarousel');
        if (carEl && window.abCarousel) window.abCarousel.mount(carEl, slides, { alt: p.title || p.slug });

        // Customer review quote (shown separately above the description)
        try {
            const review = await loadProjectReview(slug);
            const slot = $('#workReviewSlot');
            if (slot && review) {
                slot.innerHTML = `<h2 class="detail-page__h2">Отзыв клиента</h2>${renderReviewQuote(review)}`;
            } else if (slot) {
                slot.innerHTML = '';
            }
        } catch (e) { /* ignore */ }

        // (prod) no debug telemetry

        if (p.stack_groups && typeof window.abRenderGroupedTechStack === 'function') {
            window.abRenderGroupedTechStack($('#workStack'), p.stack_groups);
        } else {
            renderStack($('#workStack'), p.stack);
        }

        // (prod) no debug telemetry

        document.title = `${p.title || p.slug} — Agile Business`;
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
        meta.content = (p.excerpt || '').slice(0, 160);

        const all = await loadAllProjects();
        renderRelated($('#relatedProjects'), all, slug);
    }

    // Event delegation for company avatar buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.work-review__logo-btn');
        if (!btn) return;
        e.preventDefault();
        
        // Get company info from the button's title or nearest work-review
        const title = btn.getAttribute('title') || 'Компания';
        const reviewEl = btn.closest('.work-review');
        
        if (reviewEl) {
            const companyLink = reviewEl.querySelector('.work-review__company, .work-review__company-link');
            const companyName = (companyLink && companyLink.textContent) || title;
            
            // Try to show in alert (can be enhanced with a modal later)
            alert(`Профиль компании: ${companyName}\n\nДанная компания еще не добавлена в каталог, но оставила отзыв о нашей работе.`);
        }
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { void init(); });
    } else {
        void init();
    }
})();
