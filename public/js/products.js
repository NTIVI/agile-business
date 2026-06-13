(function () {
    'use strict';

    const DEMO_URL = 'https://agile-coll.vercel.app?room=O49I7J';

    const PRODUCTS = [
        {
            id: 'agile-call',
            titleKey: 'product_call_title',
            title: 'Agile Call',
            descKey: 'product_call_desc',
            desc: 'Видеоконференции для команд: аналог МТС Линк и Яндекс Телемост. Созвоны с управлением участниками, субтитрами на экране и ИИ-отчётами по итогам встречи.',
            featuresKey: 'product_call_features',
            features: [
                'Создатель комнаты управляет микрофонами, камерами и демонстрацией экрана у всех участников',
                'Речь отображается в чате и на веб-камере — ничего не теряется при сбоях микрофона или лагах',
                'Триггер-слово: сохранение разговора, ИИ-отчёт и план действий в чате (второе слово — в разработке)',
                'Адаптивный интерфейс для телефонов',
                'Режимы показа камер: сетка, докладчик, карусель'
            ],
            demoUrl: DEMO_URL,
            demoKey: 'product_call_demo'
        },
        {
            id: 'agile-kpi',
            titleKey: 'product_kpi_title',
            title: 'Agile KPI',
            descKey: 'product_kpi_desc',
            desc: 'Система KPI для сотрудников и руководителей: дедлайны, качество сдачи, прозрачная оценка и бонусы. Внедряется на всю команду — от линейных специалистов до топ-менеджмента.',
            featuresKey: 'product_kpi_features',
            features: [
                'KPI по срокам, качеству и ответственности',
                'Контроль честности оценок руководителей',
                'Учёт возвратов на доработку и уважительных причин',
                'Дашборды для сотрудника, руководителя и владельца',
                'Гибкая настройка под роли и отделы'
            ]
        }
    ];

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function txt(key, fallback) {
        return (typeof t === 'function') ? t(key) : fallback;
    }

    function featureList(p) {
        const raw = txt(p.featuresKey, '');
        if (raw && raw.includes('|')) {
            return raw.split('|').map(s => s.trim()).filter(Boolean);
        }
        return p.features;
    }

    function render() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        grid.innerHTML = PRODUCTS.map(p => {
            const features = featureList(p);
            const demoBtn = p.demoUrl
                ? `<a href="${esc(p.demoUrl)}" class="btn btn--primary product-card__cta" target="_blank" rel="noopener noreferrer">${esc(txt(p.demoKey, 'Попробовать демо'))}</a>`
                : '';
            return `
            <article class="product-card" id="${esc(p.id)}">
                <span class="product-card__badge">${esc(txt('products_page_label', 'Продукт'))}</span>
                <h2>${esc(txt(p.titleKey, p.title))}</h2>
                <p class="product-card__desc">${esc(txt(p.descKey, p.desc))}</p>
                <ul class="product-card__features">
                    ${features.map(f => `<li>${esc(f)}</li>`).join('')}
                </ul>
                <div class="product-card__actions">
                    ${demoBtn}
                    <a href="/#contact" class="btn btn--ghost product-card__cta">${esc(txt('products_cta', 'Запросить внедрение'))}</a>
                </div>
            </article>
        `;
        }).join('');
    }

    document.addEventListener('DOMContentLoaded', render);
    document.addEventListener('ab:langchange', render);
})();
