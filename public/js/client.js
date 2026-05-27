/* ================================================================
   AGILE BUSINESS — Client Profile Page
   ================================================================ */
(function () {
    'use strict';

    const $ = (s, p) => (p || document).querySelector(s);

    function getSlug() {
        const parts = (window.location.pathname || '').split('/').filter(Boolean);
        return parts[0] === 'client' ? (parts[1] || '') : '';
    }

    function getLang() {
        try { return localStorage.getItem('ab_lang') || document.documentElement.getAttribute('lang') || 'ru'; }
        catch { return 'ru'; }
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function normalizeExternalUrl(raw) {
        const src = String(raw || '').trim();
        if (!src) return '';
        if (/^https?:\/\//i.test(src)) return src;
        return `https://${src}`;
    }

    function buildMapHref(client) {
        const hasCoords = typeof client.lat === 'number' && typeof client.lng === 'number' && !Number.isNaN(client.lat) && !Number.isNaN(client.lng);
        if (hasCoords) {
            return `https://yandex.ru/maps/?pt=${encodeURIComponent(`${client.lng},${client.lat}`)}&z=15&l=map`;
        }
        const addr = [client.address, client.city, client.country].filter(Boolean).join(', ');
        if (!addr) return '';
        return `https://yandex.ru/maps/?text=${encodeURIComponent(addr)}`;
    }

    function makeRowClickable(row, href) {
        if (!row || !href) return;
        row.classList.add('client-info-row--clickable');
        row.setAttribute('role', 'link');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', 'Открыть ссылку');
        row.addEventListener('click', () => {
            window.open(href, '_blank', 'noopener,noreferrer');
        });
        row.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
        });
    }

    function setClientFavicon(url) {
        const faviconUrl = String(url || '').trim() || '/assets/logo.png';
        document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(el => el.remove());
        const icon = document.createElement('link');
        icon.rel = 'icon';
        icon.type = 'image/png';
        icon.href = faviconUrl;
        document.head.appendChild(icon);
        const apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        apple.href = faviconUrl;
        document.head.appendChild(apple);
    }

    function isBoostMarineSlug(slug) {
        const s = String(slug || '').toLowerCase().trim();
        return s === 'boostmarine' || s === 'boost-marine' || s.includes('boost') && (s.includes('marin') || s.includes('marine'));
    }

    function enhanceCompanyDescription(html, slug) {
        const safe = sanitizeHtml(html || '');
        if (!safe) return '';
        if (!isBoostMarineSlug(slug)) return safe;
        const tmp = document.createElement('div');
        tmp.innerHTML = safe;
        const hCount = tmp.querySelectorAll('h1,h2,h3,h4').length;
        if (hCount >= 2) return tmp.innerHTML;

        const pNodes = Array.from(tmp.querySelectorAll('p')).filter(p => (p.textContent || '').trim());
        const plan = [
            { idx: 1, title: 'Задача проекта' },
            { idx: 2, title: 'Что реализовали' },
            { idx: 3, title: 'Результат' }
        ];
        for (const step of plan) {
            const target = pNodes[step.idx];
            if (!target) continue;
            const heading = document.createElement('h3');
            heading.textContent = step.title;
            target.parentNode.insertBefore(heading, target);
        }

        Array.from(tmp.children).forEach(node => {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            const looksLikeHeading = text.length <= 90 && (!/[.!?]$/.test(text) || /:$/.test(text));
            if (looksLikeHeading) {
                const h = document.createElement('h3');
                h.textContent = text.replace(/:$/, '');
                node.replaceWith(h);
            }
        });
        return tmp.innerHTML;
    }

    /* Sanitize HTML from server — allow safe tags only */
    function sanitizeHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        // Remove script/style/iframe/object/embed tags
        tmp.querySelectorAll('script,style,iframe,object,embed,form,input,textarea,button').forEach(el => el.remove());
        // Remove event handler attributes
        tmp.querySelectorAll('*').forEach(el => {
            for (const attr of [...el.attributes]) {
                if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
            }
        });
        return tmp.innerHTML;
    }

    function buildYandexMap(client) {
        const wrap = $('#mapWrap');
        const card = $('#mapCard');
        if (!wrap || !card) return;

        const hasCoords = typeof client.lat === 'number' && typeof client.lng === 'number' && !Number.isNaN(client.lat) && !Number.isNaN(client.lng);
        const addr = [client.address, client.city, client.country].filter(Boolean).join(', ');

        if (client.show_map === false || (!hasCoords && !addr)) {
            card.style.display = 'none';
            return;
        }

        card.style.display = '';

        if (hasCoords) {
            // Use Yandex Static Maps API (no key needed for static)
            const ll = `${client.lng},${client.lat}`;
            wrap.innerHTML = `<iframe
                title="Yandex Map"
                src="https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(ll)}&z=15&pt=${encodeURIComponent(ll + ',pm2rdm')}&size=560,400&l=map"
                style="width:100%;height:420px;border:0;border-radius:0 0 20px 20px;"
                loading="lazy"
                allowfullscreen></iframe>`;
        } else {
            // Geocode by address via Yandex widget search
            const q = encodeURIComponent(addr);
            wrap.innerHTML = `<iframe
                title="Yandex Map"
                src="https://yandex.ru/map-widget/v1/?text=${q}&z=14&l=map"
                style="width:100%;height:420px;border:0;border-radius:0 0 20px 20px;"
                loading="lazy"
                allowfullscreen></iframe>`;
        }
    }

    async function init() {
        const slug = getSlug();
        if (!slug) return;
        const r = await fetch(`/api/clients/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        const c = d.client;
        if (!c) return;

        // Hero
        $('#clientName').textContent = c.company_name || c.slug;
        setClientFavicon(c.logo_url);

        // Smart back link: go back to referring work page if came from one
        const backLink = $('#clientBackLink');
        if (backLink) {
            try {
                const ref = document.referrer;
                if (ref) {
                    const refUrl = new URL(ref);
                    if (refUrl.origin === location.origin && /^\/work\//.test(refUrl.pathname)) {
                        backLink.href = refUrl.pathname;
                    }
                }
            } catch (_) { /* ignore */ }
        }

        // Logo
        const logoWrap = $('#clientLogoWrap');
        if (logoWrap) {
            if (c.logo_url) {
                logoWrap.innerHTML = `<img src="${esc(c.logo_url)}" alt="${esc(c.company_name || c.slug)}">`;
            } else {
                logoWrap.innerHTML = `<span class="client-hero__logo-fallback">${esc((c.company_name || c.slug || 'C')[0].toUpperCase())}</span>`;
            }
        }

        // Badges (city, country)
        const badges = $('#clientBadges');
        if (badges) {
            const parts = [];
            if (c.city) parts.push(c.city);
            if (c.country) parts.push(c.country);
            badges.innerHTML = parts.map(p => `<span class="client-hero__badge">${esc(p)}</span>`).join('');
        }

        // Website in hero
        const wsWrap = $('#clientWebsiteWrap');
        const wsLink = $('#clientWebsite');
        const siteUrl = normalizeExternalUrl(c.website);
        if (wsWrap && wsLink && c.website) {
            wsLink.href = siteUrl;
            wsLink.textContent = c.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
            wsWrap.style.display = '';
        }

        // Description (rich HTML)
        const desc = $('#clientDesc');
        if (desc) {
            if (c.description) {
                // Check if it looks like HTML
                const isHtml = /<[a-z][\s\S]*>/i.test(c.description);
                desc.innerHTML = isHtml ? enhanceCompanyDescription(c.description, c.slug) : `<p>${esc(c.description)}</p>`;
            } else {
                desc.innerHTML = '<p class="text-muted">Описание пока не добавлено.</p>';
            }
        }

        // Sidebar: address
        const addressRow = $('#clientAddressRow');
        const addressEl = $('#clientAddress');
        if (addressRow && addressEl && c.address) {
            addressEl.textContent = c.address;
            addressRow.style.display = '';
        }

        // Sidebar: location
        const locRow = $('#clientLocationRow');
        const locEl = $('#clientLocation');
        const locText = [c.city, c.country].filter(Boolean).join(', ');
        if (locRow && locEl && locText) {
            locEl.textContent = locText;
            locRow.style.display = '';
        }

        // Sidebar: website
        const wsRow = $('#clientWebsiteRow');
        const wsRowLink = $('#clientWebsiteLink');
        if (wsRow && wsRowLink && c.website) {
            wsRowLink.href = siteUrl;
            wsRowLink.textContent = c.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
            wsRow.style.display = '';
        }

        // Make contact rows behave like clickable buttons
        const mapHref = buildMapHref(c);
        if (addressRow && c.address && mapHref) makeRowClickable(addressRow, mapHref);
        if (locRow && locText && mapHref) makeRowClickable(locRow, mapHref);
        if (wsRow && siteUrl) makeRowClickable(wsRow, siteUrl);

        // Yandex Map
        buildYandexMap(c);

        // SEO title
        document.title = (c.company_name ? `${c.company_name} — ` : '') + 'Agile Business';
        if (typeof applyTranslations === 'function') applyTranslations(getLang());
    }

    document.addEventListener('DOMContentLoaded', init);
})();

