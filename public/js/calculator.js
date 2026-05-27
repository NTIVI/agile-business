/* ================================================================
   AGILE BUSINESS — Calculator JavaScript
   Step navigation · Pricing logic · API integration
   ================================================================ */
(function () {
    'use strict';

    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

    /* ── Pricing (defaults; overridden from DB) ─────── */
    let BASE_PRICES = {
        management: 250000,
        investment: 300000,
        creative: 180000,
        analytics: 200000,
        it: 350000
    };

    let SIZE_MULT = { small: 1, medium: 1.5, large: 2.5 };
    let COMPLEX_MULT = { basic: 1, standard: 1.8, premium: 3 };
    let DURATION_MULT = { short: 1, medium: 0.9, long: 0.8 };
    /* Fallback-каталог на случай, если API недоступен. Синхронизирован с server.js getDefaultPricing(). */
    let IT_CRITERIA = [
        { key: 'it_audit',      sphere: 'it', group: 'IT-консалтинг',       label: 'IT-аудит компании',                  price: 120000 },
        { key: 'it_strategy',   sphere: 'it', group: 'IT-консалтинг',       label: 'Разработка IT-стратегии (1–3 года)', price: 180000 },
        { key: 'digital_trans', sphere: 'it', group: 'IT-консалтинг',       label: 'Консалтинг по цифровой трансформации', price: 220000 },
        { key: 'landing',       sphere: 'it', group: 'Веб-разработка',      label: 'Лендинг (Landing Page)',             price: 120000 },
        { key: 'corporate',     sphere: 'it', group: 'Веб-разработка',      label: 'Корпоративный сайт',                  price: 250000 },
        { key: 'ecommerce',     sphere: 'it', group: 'Веб-разработка',      label: 'Интернет-магазин',                    price: 450000 },
        { key: 'saas',          sphere: 'it', group: 'Веб-разработка',      label: 'SaaS-платформа (веб-сервис)',         price: 700000 },
        { key: 'web_support',   sphere: 'it', group: 'Веб-разработка',      label: 'Поддержка и развитие веб-проектов',   price: 60000  },
        { key: 'mobile_cross',  sphere: 'it', group: 'Мобильные и корп. системы', label: 'Кроссплатформенное приложение (iOS+Android)', price: 550000 },
        { key: 'crm_erp',       sphere: 'it', group: 'Мобильные и корп. системы', label: 'CRM / ERP веб-система',          price: 480000 },
        { key: 'bi',            sphere: 'it', group: 'Мобильные и корп. системы', label: 'BI-система (аналитические панели)', price: 260000 },
        { key: 'data_analysis', sphere: 'it', group: 'Данные и AI',         label: 'Анализ и обработка данных',           price: 180000 },
        { key: 'ai_service',    sphere: 'it', group: 'Данные и AI',         label: 'Разработка AI-сервиса',               price: 320000 },
        { key: 'api_integ',     sphere: 'it', group: 'Интеграции и безопасность', label: 'Интеграции с внешними API',      price: 140000 },
        { key: 'pentest',       sphere: 'it', group: 'Интеграции и безопасность', label: 'Пентест (тест на проникновение)', price: 180000 },
        { key: 'security_audit',sphere: 'it', group: 'Интеграции и безопасность', label: 'Аудит информационной безопасности', price: 220000 },
        { key: 'web_analytics', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Веб-аналитика: настройка и аудит', price: 90000  },
        { key: 'mkt_analytics', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Внедрение маркетинговой аналитики', price: 140000 },
        { key: 'end_to_end',    sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'Сквозная аналитика (ads→CRM→продажи)', price: 200000 },
        { key: 'cro',           sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'CRO — оптимизация конверсии',    price: 150000 },
        { key: 'bi_dashboards', sphere: 'analytics', group: 'Веб-аналитика и BI', label: 'BI-дашборды и отчётность',        price: 180000 },
        { key: 'brand_strategy',sphere: 'creative',  group: 'Маркетинг',      label: 'Позиционирование и brand-стратегия', price: 180000 },
        { key: 'performance',   sphere: 'creative',  group: 'Маркетинг',      label: 'Performance-маркетинг (ads/SEO)',     price: 120000 },
        { key: 'content',       sphere: 'creative',  group: 'Маркетинг',      label: 'Контент-маркетинг и SMM',             price: 90000  },
        { key: 'funnel',        sphere: 'creative',  group: 'Маркетинг',      label: 'Выстраивание воронки продаж',         price: 140000 }
    ];
    let selectedItCriteria = new Set();

    /* Сферы, для которых показываем каталог подуслуг (Task 9: "на 3 сферы"). */
    const SPHERES_WITH_CATALOG = new Set(['it', 'analytics', 'creative']);

    const SERVICE_NAMES = {
        ru: { management:'Управление и Стратегия', investment:'Инвестиции и Оценка',
              creative:'Креатив', analytics:'Аналитика и Данные', it:'ИТ и Разработка' },
        en: { management:'Management & Strategy', investment:'Investment & Valuation',
              creative:'Creative', analytics:'Analytics & Data', it:'IT & Development' }
    };

    const SIZE_NAMES = {
        ru: { small:'Малый бизнес', medium:'Средний бизнес', large:'Крупный бизнес' },
        en: { small:'Small business', medium:'Medium business', large:'Enterprise' }
    };

    const COMPLEX_NAMES = {
        ru: { basic:'Базовый', standard:'Стандарт', premium:'Премиум' },
        en: { basic:'Basic', standard:'Standard', premium:'Premium' }
    };

    const DURATION_NAMES = {
        ru: { short:'1–3 месяца', medium:'3–6 месяцев', long:'6–12 месяцев' },
        en: { short:'1–3 months', medium:'3–6 months', long:'6–12 months' }
    };

    /* ── State ────────────────────────────────────────── */
    let currentStep = 1;
    let sessionId = null;
    let calculatedPrice = null;
    const selections = { service: null, company_size: null, complexity: null, duration: null, description: '', it_criteria_json: '' };

    /* ── Load pricing config (DB) ───────────────────── */
    async function loadPricingConfig() {
        try {
            const r = await fetch('/api/pricing/calculator', { cache: 'no-store' });
            if (!r.ok) return;
            const d = await r.json();
            const p = d && d.pricing;
            if (!p) return;
            if (p.base_prices) BASE_PRICES = { ...BASE_PRICES, ...p.base_prices };
            if (p.size_mult) SIZE_MULT = { ...SIZE_MULT, ...p.size_mult };
            if (p.complexity_mult) COMPLEX_MULT = { ...COMPLEX_MULT, ...p.complexity_mult };
            if (p.duration_mult) DURATION_MULT = { ...DURATION_MULT, ...p.duration_mult };
            if (Array.isArray(p.it_criteria) && p.it_criteria.length > 0) {
                // Принимаем данные из БД только если они уже в новом формате
                // (содержат поле sphere) и количество ≥ 10. Иначе оставляем
                // богатый fallback, чтобы не сломать UI из-за старого снапшота.
                const hasSphere = p.it_criteria.some(i => i && i.sphere);
                if (hasSphere && p.it_criteria.length >= 10) {
                    IT_CRITERIA = p.it_criteria;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    /** Подуслуги, доступные для выбранной сферы (IT / Analytics / Creative). */
    function criteriaForSphere() {
        if (!selections.service) return [];
        if (!SPHERES_WITH_CATALOG.has(selections.service)) return [];
        const list = Array.isArray(IT_CRITERIA) ? IT_CRITERIA : [];
        return list.filter(i => {
            const s = String(i.sphere || '').trim();
            // Backward-compat: items без sphere считаем IT.
            const sphere = s || 'it';
            return sphere === selections.service;
        });
    }

    /** Сумма выбранных подуслуг по текущей сфере. */
    function computeAddOns() {
        const list = criteriaForSphere();
        let sum = 0;
        list.forEach(i => {
            const key = String(i.key || '').trim();
            if (key && selectedItCriteria.has(key)) sum += Number(i.price || 0);
        });
        return sum;
    }

    function updateItCriteriaSum() {
        const sumEl = $('#itCriteriaSum');
        if (!sumEl) return;
        let sum = 0;
        const list = criteriaForSphere();
        list.forEach(i => {
            const key = String(i.key || '').trim();
            if (key && selectedItCriteria.has(key)) sum += Number(i.price || 0);
        });
        const label = (typeof t === 'function') ? t('it_criteria_selected') : 'Выбрано доп. услуг';
        sumEl.textContent = `${label}: +${sum.toLocaleString('ru-RU')} ${(typeof t === 'function') ? t('currency_symbol') : '₽'}`;
    }

    function syncItCriteriaUI() {
        const wrap = $('#itCriteriaWrap');
        const list = $('#itCriteriaList');
        const sumEl = $('#itCriteriaSum');
        if (!wrap || !list || !sumEl) return;

        const items = criteriaForSphere();
        const show = items.length > 0;
        wrap.style.display = show ? '' : 'none';
        if (!show) { list.innerHTML = ''; return; }

        const titleEl = $('#itCriteriaTitle');
        if (titleEl) {
            const sphereTitle = {
                it: 'Подуслуги: ИТ и разработка',
                analytics: 'Подуслуги: Аналитика и данные',
                creative: 'Подуслуги: Креатив и маркетинг'
            };
            titleEl.textContent = sphereTitle[selections.service] || 'Подуслуги';
        }

        // Группируем по полю group.
        const groups = new Map();
        items.forEach(it => {
            const g = String(it.group || 'Услуги');
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(it);
        });

        list.innerHTML = '';
        list.style.display = 'grid';
        list.style.gridTemplateColumns = '1fr';
        list.style.gap = '16px';

        groups.forEach((arr, groupName) => {
            const section = document.createElement('div');
            section.className = 'calc-subgroup';
            section.style.border = '1px solid var(--border)';
            section.style.borderRadius = '14px';
            section.style.padding = '14px';
            section.style.background = 'var(--bg-card)';

            const h = document.createElement('div');
            h.textContent = groupName;
            h.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px';
            section.appendChild(h);

            const rowsWrap = document.createElement('div');
            rowsWrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px';

            arr.forEach(item => {
                const key = String(item.key || '').trim();
                if (!key) return;
                const label = String(item.label || key);
                const price = Number(item.price || 0);
                const checked = selectedItCriteria.has(key);
                const id = 'itc_' + key.replace(/[^a-z0-9_]/gi, '_');

                const row = document.createElement('label');
                row.setAttribute('for', id);
                row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:12px;cursor:pointer;background:var(--bg-secondary);transition:border-color .18s,background .18s';
                row.innerHTML = `
                    <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px">
                    <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
                        <div style="color:var(--text-heading);font-weight:600;font-size:14px;line-height:1.35">${escapeHtml(label)}</div>
                        <div style="color:var(--text-muted);font-size:12px">+ ${price.toLocaleString('ru-RU')} ${(typeof t === 'function') ? t('currency_symbol') : '₽'}</div>
                    </div>
                `;
                const input = row.querySelector('input');
                input.addEventListener('change', () => {
                    if (input.checked) {
                        selectedItCriteria.add(key);
                        row.style.borderColor = 'var(--accent)';
                    } else {
                        selectedItCriteria.delete(key);
                        row.style.borderColor = '';
                    }
                    selections.it_criteria_json = JSON.stringify([...selectedItCriteria]);
                    updateItCriteriaSum();
                    updateSession(currentStep);
                });
                if (checked) row.style.borderColor = 'var(--accent)';
                rowsWrap.appendChild(row);
            });
            section.appendChild(rowsWrap);
            list.appendChild(section);
        });

        updateItCriteriaSum();
    }

    loadPricingConfig().finally(() => {
        syncItCriteriaUI();
    });

    /* ── Step Navigation ─────────────────────────────── */
    const steps = $$('.calc-step');
    const progressSteps = $$('.calc-progress__step');

    function showStep(n) {
        steps.forEach(s => {
            s.classList.remove('active');
            if (parseInt(s.dataset.step) === n || (n === 'result' && s.dataset.step === 'result')) {
                s.classList.add('active');
            }
        });
        progressSteps.forEach((p, i) => {
            p.classList.remove('active', 'done');
            if (i < n - 1) p.classList.add('done');
            else if (i === n - 1) p.classList.add('active');
        });
        currentStep = n;
        const banner = $('#calcValidation');
        if (banner) banner.style.display = 'none';
    }

    /* ── Option Selection ────────────────────────────── */
    function setupOptions(containerId, field, nextBtnId) {
        const container = $('#' + containerId);
        const nextBtn = $('#' + nextBtnId);
        if (!container || !nextBtn) return;

        container.addEventListener('click', e => {
            const option = e.target.closest('.calc-option');
            if (!option) return;
            $$('.calc-option', container).forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selections[field] = option.dataset.value;
            if (field === 'service') {
                selectedItCriteria = new Set();
                selections.it_criteria_json = '';
            }
            nextBtn.disabled = false;
        });
    }

    setupOptions('serviceOptions', 'service', 'nextStep1');
    setupOptions('sizeOptions', 'company_size', 'nextStep2');
    setupOptions('complexityOptions', 'complexity', 'nextStep3');
    setupOptions('durationOptions', 'duration', 'nextStep4');

    /* ── Navigation Buttons ──────────────────────────── */
    function bindNav(id, dir) {
        const btn = $('#' + id);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const next = currentStep + dir;
            showStep(next);
            updateSession(next);
        });
    }

    bindNav('nextStep1', 1);
    bindNav('nextStep2', 1);
    bindNav('nextStep3', 1);
    bindNav('nextStep4', 1);
    bindNav('prevStep2', -1);
    bindNav('prevStep3', -1);
    bindNav('prevStep4', -1);
    bindNav('prevStep5', -1);

    /* ── Smart Matching (Step 5 feedback) ───────────── */
    const smartContext = $('#smartContext');
    const smartHint = $('#smartHint');
    const smartFeedback = $('#smartFeedback');
    const calcDescription = $('#calcDescription');

    // Show service context when entering step 5
    const origNextStep4 = $('#nextStep4');
    if (origNextStep4) {
        origNextStep4.addEventListener('click', () => {
            loadServiceContext();
            syncItCriteriaUI();
        });
    }

    async function loadServiceContext() {
        if (!selections.service || !smartContext) return;
        try {
            const res = await fetch('/api/service-context/' + selections.service);
            if (res.ok) {
                const data = await res.json();
                if (smartHint) smartHint.textContent = data.context;
                smartContext.style.display = '';
            }
        } catch { /* ok */ }
    }

    // Debounced smart match check on textarea input
    let smartTimer = null;
    if (calcDescription) {
        calcDescription.addEventListener('input', () => {
            clearTimeout(smartTimer);
            const text = calcDescription.value.trim();
            if (text.length < 15 || !selections.service) {
                if (smartFeedback) smartFeedback.style.display = 'none';
                return;
            }
            smartTimer = setTimeout(() => checkSmartMatch(text), 800);
        });
    }

    async function checkSmartMatch(text) {
        if (!smartFeedback) return;
        try {
            const res = await fetch('/api/smart-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service: selections.service, text })
            });
            if (res.ok) {
                const data = await res.json();
                smartFeedback.style.display = '';
                const icon = smartFeedback.querySelector('.calc-smart-feedback__icon');
                const txt = smartFeedback.querySelector('.calc-smart-feedback__text');
                if (data.relevant) {
                    smartFeedback.className = 'calc-smart-feedback relevant';
                    if (icon) icon.textContent = '\u2713';
                    if (txt) txt.textContent = data.hint || (typeof t === 'function' ? t('calc_smart_hint') : 'Great match!');
                } else {
                    smartFeedback.className = 'calc-smart-feedback irrelevant';
                    if (icon) icon.textContent = '\u26a0';
                    if (txt) txt.textContent = data.hint || (typeof t === 'function' ? t('calc_smart_warn') : 'Description may not match this service.');
                }
            }
        } catch { /* ok */ }
    }

    /* ── Start Session on Step 1 Next ────────────────── */
    const nextStep1Btn = $('#nextStep1');
    if (nextStep1Btn) {
        const origHandler = nextStep1Btn.onclick;
        nextStep1Btn.addEventListener('click', () => {
            if (!sessionId) startSession();
        });
    }

    async function startSession() {
        try {
            const res = await fetch('/api/calculator/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service: selections.service })
            });
            const data = await res.json();
            sessionId = data.sessionId;
        } catch (e) { /* offline ok */ }
    }

    async function updateSession(step) {
        if (!sessionId) return;
        try {
            await fetch('/api/calculator/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, step, ...selections })
            });
        } catch (e) { /* offline ok */ }
    }

    /* ── Pre-submit validation ──────────────────────────
       Перед расчётом проверяем, что все обязательные поля заполнены,
       включая хотя бы одну подуслугу для IT/Аналитики/Креатива. */
    function validateAll() {
        const errors = [];
        if (!selections.service) errors.push({ step: 1, msg: 'Выберите сферу' });
        if (!selections.company_size) errors.push({ step: 2, msg: 'Выберите масштаб компании' });
        if (!selections.complexity) errors.push({ step: 3, msg: 'Выберите сложность проекта' });
        if (!selections.duration) errors.push({ step: 4, msg: 'Выберите срок проекта' });
        if (selections.service && SPHERES_WITH_CATALOG.has(selections.service)) {
            const avail = criteriaForSphere();
            if (avail.length > 0 && selectedItCriteria.size === 0) {
                errors.push({ step: 5, msg: 'Выберите хотя бы одну подуслугу для вашей сферы' });
            }
        }
        const desc = $('#calcDescription');
        const descText = desc ? String(desc.value || '').trim() : '';
        if (descText.length < 15) {
            errors.push({ step: 5, msg: 'Опишите задачу (минимум 15 символов), чтобы мы точнее посчитали' });
        }
        return errors;
    }

    function showValidationError(errors) {
        if (!errors.length) return;
        const first = errors[0];
        const msg = errors.map(e => '• ' + e.msg).join('\n');
        if (typeof showToast === 'function') {
            showToast(msg.replace(/\n/g, ' — '));
        }
        // Scroll and flash highlight on the relevant step
        const stepEl = document.querySelector(`.calc-step[data-step="${first.step}"]`);
        if (stepEl) {
            stepEl.classList.add('calc-step--error');
            setTimeout(() => stepEl.classList.remove('calc-step--error'), 1800);
        }
        // Inline banner in step 5 (if we have one)
        const banner = $('#calcValidation');
        if (banner) {
            banner.textContent = msg.replace(/\n/g, '  •  ');
            banner.style.display = '';
            clearTimeout(showValidationError._t);
            showValidationError._t = setTimeout(() => { banner.style.display = 'none'; }, 6000);
        }
        if (first.step && typeof showStep === 'function' && currentStep !== first.step) {
            showStep(first.step);
        }
    }

    /* ── Calculate Button ────────────────────────────── */
    const calcSubmitBtn = $('#calcSubmit');
    if (calcSubmitBtn) {
        calcSubmitBtn.addEventListener('click', () => {
            const desc = $('#calcDescription');
            if (desc) selections.description = desc.value;
            const errors = validateAll();
            if (errors.length) { showValidationError(errors); return; }
            calculateAndShow();
        });
    }

    function calculateAndShow() {
        const base = BASE_PRICES[selections.service] || 200000;
        const sizeMult = SIZE_MULT[selections.company_size] || 1;
        const complexMult = COMPLEX_MULT[selections.complexity] || 1;
        const durationMult = DURATION_MULT[selections.duration] || 1;
        const addOns = computeAddOns();
        const price = Math.round(base * sizeMult * complexMult * durationMult + addOns);
        calculatedPrice = price;

        const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'ru';

        const resService = $('#resService');
        const resSize = $('#resSize');
        const resComplexity = $('#resComplexity');
        const resDuration = $('#resDuration');

        if (resService) resService.textContent = (SERVICE_NAMES[lang] || SERVICE_NAMES.ru)[selections.service] || selections.service;
        if (resSize) resSize.textContent = (SIZE_NAMES[lang] || SIZE_NAMES.ru)[selections.company_size] || selections.company_size;
        if (resComplexity) resComplexity.textContent = (COMPLEX_NAMES[lang] || COMPLEX_NAMES.ru)[selections.complexity] || selections.complexity;
        if (resDuration) resDuration.textContent = (DURATION_NAMES[lang] || DURATION_NAMES.ru)[selections.duration] || selections.duration;

        // Show calculated price immediately
        const priceEl = $('#resultPrice');
        if (priceEl && price > 0) {
            animatePrice(priceEl, price, lang);
        }

        showStep('result');

        // Complete session on server
        completeSession(price);
    }

    function animatePrice(el, target, lang) {
        const currSymbol = (typeof t === 'function') ? t('currency_symbol') : '₽';
        const perMonth = (typeof t === 'function') ? t('calc_per_month') : '/ мес';
        const duration = 1500;
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(target * eased);
            el.innerHTML = val.toLocaleString('ru-RU') + ' ' + currSymbol + ' <small>' + perMonth + '</small>';
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    async function completeSession(price) {
        if (!sessionId) return;
        try {
            const cr = await fetch('/api/calculator/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ...selections,
                    estimated_price: price
                })
            });
            if (cr.ok && window.abAnalytics && typeof window.abAnalytics.track === 'function') {
                window.abAnalytics.track({ event_type: 'calculator_complete', is_calculator_complete: 1 });
            }
        } catch (e) { /* offline ok */ }
    }

    /* ── Show Contact Form (after result) ────────────── */
    const showContactBtn = $('#showContactForm');
    const calcContactDiv = $('#calcContact');
    if (showContactBtn && calcContactDiv) {
        showContactBtn.addEventListener('click', () => {
            calcContactDiv.classList.add('active');
            showContactBtn.style.display = 'none';
            calcContactDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    /* ── Calculator Contact Form ─────────────────────── */
    const calcContactForm = $('#calcContactForm');
    if (calcContactForm) {
        calcContactForm.addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(calcContactForm);
            const data = Object.fromEntries(fd.entries());
            const btn = calcContactForm.querySelector('button[type="submit"]');
            if (btn) btn.disabled = true;

            const base = BASE_PRICES[selections.service] || 200000;
            const addOns = computeAddOns();
            const price = Math.round(base * (SIZE_MULT[selections.company_size] || 1) * (COMPLEX_MULT[selections.complexity] || 1) * (DURATION_MULT[selections.duration] || 1) + addOns);
            calculatedPrice = price;

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...data,
                        source: 'calculator',
                        service: selections.service,
                        company_size: selections.company_size,
                        complexity: selections.complexity,
                        duration: selections.duration,
                        estimated_price: price,
                        description: selections.description,
                        service_sub: selections.it_criteria_json || ''
                    })
                });
                if (res.ok) {
                    calcContactForm.reset();
                    if (typeof showToast === 'function') {
                        showToast(typeof t === 'function' ? t('calc_contact_success') : 'Submitted!');
                    }
                    // Reveal computed price only after successful contact submit.
                    const priceEl = $('#resultPrice');
                    const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'ru';
                    if (priceEl && typeof calculatedPrice === 'number' && calculatedPrice > 0) {
                        animatePrice(priceEl, calculatedPrice, lang);
                    }
                    calcContactForm.innerHTML = '<div style="text-align:center;padding:24px;color:var(--accent)"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><p style="margin-top:12px;color:var(--text-heading)">' + (typeof t === 'function' ? t('calc_contact_success') : 'Thank you!') + '</p></div>';
                }
            } catch {
                if (typeof showToast === 'function') showToast('Connection error');
            }
            if (btn) btn.disabled = false;
        });
    }
    /* ── PDF Export ────────────────────────────────────── */
    const downloadPdfBtn = $('#downloadPdf');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (!calculatedPrice) return;
            const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'ru';
            const currSymbol = (typeof t === 'function') ? t('currency_symbol') : '₽';
            const perMonth = (typeof t === 'function') ? t('calc_per_month') : '/ мес';

            const svc = (SERVICE_NAMES[lang] || SERVICE_NAMES.ru)[selections.service] || selections.service;
            const sz = (SIZE_NAMES[lang] || SIZE_NAMES.ru)[selections.company_size] || selections.company_size;
            const cmpl = (COMPLEX_NAMES[lang] || COMPLEX_NAMES.ru)[selections.complexity] || selections.complexity;
            const dur = (DURATION_NAMES[lang] || DURATION_NAMES.ru)[selections.duration] || selections.duration;
            const price = calculatedPrice.toLocaleString('ru-RU') + ' ' + currSymbol + ' ' + perMonth;
            const date = new Date().toLocaleDateString('ru-RU');

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agile Business — Расчёт</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:48px 48px 32px;max-width:700px;margin:auto}
.logo{font-size:22px;font-weight:700;color:#c8102e;margin-bottom:4px}
.sub{font-size:12px;color:#888;margin-bottom:32px}
h1{font-size:18px;font-weight:600;margin-bottom:24px;border-bottom:2px solid #c8102e;padding-bottom:8px}
.price{font-size:36px;font-weight:800;color:#c8102e;margin:20px 0 24px;text-align:center}
table{width:100%;border-collapse:collapse;margin-bottom:28px}
td{padding:10px 12px;border-bottom:1px solid #eee;font-size:14px}
td:first-child{color:#888;width:40%}
td:last-child{font-weight:600}
.footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="logo">Agile Business</div>
<div class="sub">agile-business-pro.com &middot; ${date}</div>
<h1>${lang === 'en' ? 'Project Cost Estimate' : 'Предварительный расчёт стоимости'}</h1>
<div class="price">${price}</div>
<table>
<tr><td>${lang === 'en' ? 'Service' : 'Услуга'}</td><td>${svc}</td></tr>
<tr><td>${lang === 'en' ? 'Company Size' : 'Масштаб'}</td><td>${sz}</td></tr>
<tr><td>${lang === 'en' ? 'Package' : 'Пакет'}</td><td>${cmpl}</td></tr>
<tr><td>${lang === 'en' ? 'Duration' : 'Срок'}</td><td>${dur}</td></tr>
</table>
<p style="font-size:13px;color:#666;line-height:1.6">${lang === 'en' ? 'This is a preliminary estimate. The final cost may vary after a detailed analysis of your project.' : 'Это предварительная оценка. Итоговая стоимость может отличаться после детального анализа вашего проекта.'}</p>
<div class="footer">© ${new Date().getFullYear()} Agile Business. ${lang === 'en' ? 'All rights reserved.' : 'Все права защищены.'}</div>
</body></html>`;

            const w = window.open('', '_blank');
            if (w) {
                w.document.write(html);
                w.document.close();
                setTimeout(() => { w.print(); }, 400);
            }
        });
    }

})();
