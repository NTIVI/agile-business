(function () {
    'use strict';

    const $ = (s, p) => (p || document.querySelector(s));
    let catalog = null;
    let activeSphere = 'analytics';

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function fmt(n) {
        return Number(n || 0).toLocaleString('ru-RU');
    }

    function priceBlock(item) {
        const sym = (typeof t === 'function') ? t('currency_symbol') : '₽';
        if (item.prices_by_size) {
            const p = item.prices_by_size;
            return `<div class="price-tier-row"><span>${(typeof t === 'function') ? t('size_small') : 'Малый'}</span><strong>${fmt(p.small)} ${sym}</strong></div>
                <div class="price-tier-row"><span>${(typeof t === 'function') ? t('size_medium') : 'Средний'}</span><strong>${fmt(p.medium)} ${sym}</strong></div>
                <div class="price-tier-row"><span>${(typeof t === 'function') ? t('size_large') : 'Крупный'}</span><strong>${fmt(p.large)} ${sym}</strong></div>`;
        }
        if (Array.isArray(item.tiers)) {
            return item.tiers.map(tier => `
                <div class="price-tier-row"><span>${esc(tier.label)}</span><strong>${fmt(tier.price_min)} – ${fmt(tier.price_max)} ${sym}</strong></div>
            `).join('');
        }
        return `<div class="price-tier-row"><span></span><strong>${fmt(item.price)} ${sym}</strong></div>`;
    }

    function renderCatalog() {
        const root = $('#servicesCatalog');
        if (!root || !catalog) return;
        const items = (catalog.it_criteria || []).filter(i => i.sphere === activeSphere);
        const groups = new Map();
        items.forEach(item => {
            const g = item.group || 'Услуги';
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(item);
        });

        if (!items.length) {
            root.innerHTML = `<p class="services__desc">${esc((typeof t === 'function') ? t('services_empty') : 'Скоро добавим ценники для этого направления.')}</p>`;
            return;
        }

        let html = '';
        groups.forEach((arr, groupName) => {
            html += `<div class="services-group"><h3 class="services-group__title">${esc(groupName)}</h3><div class="services-price-grid">`;
            arr.forEach(item => {
                html += `<article class="service-price-card">
                    <h4>${esc(item.label)}</h4>
                    ${item.what ? `<p class="service-price-card__what">${esc(item.what)}</p>` : ''}
                    <div class="service-price-card__prices">${priceBlock(item)}</div>
                    <a href="/calculator" class="service-price-card__link">${esc((typeof t === 'function') ? t('services_card_calc') : 'Рассчитать')}</a>
                </article>`;
            });
            html += '</div></div>';
        });
        root.innerHTML = html;
    }

    function renderPackages() {
        const grid = $('#packagesGrid');
        if (!grid || !catalog) return;
        const pkgs = catalog.packages || [];
        const sym = (typeof t === 'function') ? t('currency_symbol') : '₽';
        grid.innerHTML = pkgs.map(pkg => `
            <article class="package-card">
                <h3>${esc(pkg.title)}</h3>
                <p class="package-card__audience">${esc(pkg.audience)}</p>
                <ul class="package-card__list">${(pkg.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
                <div class="package-card__price">
                    <span class="package-card__was">${fmt(pkg.was)} ${sym}</span>
                    <strong>${fmt(pkg.price)} ${sym}</strong>
                </div>
            </article>
        `).join('');
    }

    function bindTabs() {
        const tabs = document.querySelectorAll('.services-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                activeSphere = tab.dataset.sphere || 'analytics';
                tabs.forEach(t => {
                    const on = t === tab;
                    t.classList.toggle('active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                renderCatalog();
            });
        });
    }

    async function load() {
        try {
            const r = await fetch('/api/pricing/calculator', { cache: 'no-store' });
            const d = await r.json();
            catalog = (d && d.pricing) || {};
        } catch (e) {
            catalog = { it_criteria: [], packages: [] };
        }
        renderCatalog();
        renderPackages();
        bindTabs();
    }

    document.addEventListener('DOMContentLoaded', load);
})();
