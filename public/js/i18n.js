/* ================================================================
   AGILE BUSINESS — i18n Engine (30 Languages)
   Fallback chain: selected → EN → RU → key
   ================================================================ */
const I18N = {};
const I18N_REMOTE = { loaded: {}, dict: {} };

/* ── Russian (Primary, Complete) ────────────────────── */
I18N.ru = {
    nav_about:'О нас', nav_works:'Наши работы', nav_articles:'Статьи', nav_services:'Услуги', nav_approach:'Подход', nav_contact:'Контакты', nav_cta:'Рассчитать проект',
    hero_badge:'Бизнес-консалтинг нового поколения',
    hero_title_1:'Решение', hero_title_2:'под задачи', hero_title_3:'бизнеса',
    hero_subtitle:'3 направления экспертизы для трансформации и масштабирования вашего бизнеса',
    hero_btn_discuss:'Обсудить проект', hero_btn_services:'Наши услуги', hero_btn_contact:'Связаться',
    about_label:'О компании', about_title_1:'Agile подход', about_title_2:'к вашему бизнесу',
    about_text:'Мы — команда экспертов, объединяющая аналитику, стратегию и технологии для решения самых сложных бизнес-задач. Наш подход основан на гибкости, данных и глубоком понимании рынка.',
    about_stat_1_label:'направлений\nэкспертизы', about_stat_2_label:'успешных\nпроектов', about_stat_3_label:'клиентов\nрекомендуют',
    about_card_metric_label:'ROI проектов',
    about_card_title:'Комплексный консалтинг', about_card_text:'Маркетинг · Стратегия · Рост — от идеи до результата',
    about_card_marketing:'Выстроим воронку продаж, SEO и brand-стратегию под ваш бизнес',
    srv_label:'Экспертиза', srv_title_1:'3 направления', srv_title_2:'для вашего роста',
    srv_desc:'Каждое направление — это команда специалистов с глубокой экспертизой и проверенной методологией',
    srv_1_title:'Управление и Стратегия',
    srv_1_desc:'Определение долгосрочных целей, планирование проектов, оптимизация бизнес-процессов, управление изменениями и цифровая трансформация',
    srv_2_title:'Инвестиции и Оценка',
    srv_2_desc:'Привлечение финансирования, оценка бизнеса, Due Diligence, разработка бизнес-планов и инвестиционных предложений',
    srv_3_title:'Креатив',
    srv_3_desc:'Комплексный маркетинг, продажи и дизайн. Нажмите для подробной информации по подсферам',
    srv_4_title:'Бизнес аналитика',
    srv_4_desc:'Бизнес-аналитика, BI-системы, прогнозирование, визуализация данных, оценка рисков и data-driven управление',
    srv_5_title:'ИТ и Разработка',
    srv_5_desc:'ИТ-стратегия, веб- и мобильная разработка, кибербезопасность, облачные решения и системная интеграция',
    srv_flip_tab:'Направление',
    srv_flip_title:'Подробнее',
    srv_flip_hint:'Нажмите карточку — откроется полное описание',
    appr_label:'Наш подход', appr_title_1:'Методология', appr_title_2:'Agile Business',
    appr_step_1_title:'Диагностика', appr_step_1_desc:'Глубокий анализ текущего состояния бизнеса, выявление точек роста и узких мест',
    appr_step_2_title:'Стратегия', appr_step_2_desc:'Разработка дорожной карты с чёткими KPI, сроками и ответственными',
    appr_step_3_title:'Реализация', appr_step_3_desc:'Внедрение решений с постоянным мониторингом и корректировкой курса',
    appr_step_4_title:'Масштабирование', appr_step_4_desc:'Закрепление результатов и выход на новые уровни эффективности',
    marquee_1:'СТРАТЕГИЯ', marquee_2:'АНАЛИТИКА', marquee_3:'РЕЗУЛЬТАТ', marquee_4:'РОСТ', marquee_5:'ЭФФЕКТИВНОСТЬ',
    contact_label:'Контакты', contact_title_1:'Начнём', contact_title_2:'сотрудничество',
    contact_text:'Оставьте заявку и мы свяжемся с вами для обсуждения вашего проекта в течение 24 часов',
    contact_name:'Ваше имя', contact_email:'Email', contact_phone:'Телефон', contact_company:'Компания',
    contact_message:'Расскажите о вашем проекте', contact_submit:'Отправить заявку',
    contact_success:'Заявка отправлена! Мы свяжемся с вами.', contact_error:'Ошибка. Попробуйте позже.',
    footer_rights:'\u00a9 2026 Сайт разработан компанией Agile Business',
    footer_privacy:'Политика конфиденциальности',
    calc_title:'Рассчитать проект', calc_page_label:'Калькулятор', calc_subtitle:'Рассчитайте предварительную стоимость консалтинговых услуг',
    calc_step_1_title:'Выберите направление', calc_step_1_sub:'Какая сфера консалтинга вас интересует?',
    calc_step_2_title:'Размер компании', calc_step_2_sub:'Укажите масштаб вашего бизнеса',
    calc_step_3_title:'Уровень сложности', calc_step_3_sub:'Выберите подходящий пакет услуг',
    calc_step_4_title:'Срок проекта', calc_step_4_sub:'Предполагаемая длительность сотрудничества',
    calc_step_5_title:'Опишите задачу', calc_step_5_sub:'Расскажите подробнее о вашем проекте',
    calc_textarea_placeholder:'Опишите вашу задачу, цели и ожидания...',
    calc_next:'Далее', calc_prev:'Назад', calc_calculate:'Рассчитать',
    calc_result_title:'Предварительная оценка', calc_result_subtitle:'Итоговая стоимость может отличаться после детального анализа',
    calc_per_month:'/ мес',
    calc_contact_title:'Оставьте контакты', calc_contact_sub:'Мы свяжемся с вами для детального обсуждения',
    calc_contact_send:'Отправить', calc_contact_success:'Спасибо! Мы свяжемся с вами.',
    calc_smart_warn:'Описание не соответствует выбранному направлению. Уточните задачу.',
    calc_smart_hint:'Подсказка по направлению',
    it_criteria_title:'IT-критерии оценки',
    it_criteria_selected:'Выбрано доп. работ',
    size_small:'Малый бизнес', size_small_desc:'До 50 сотрудников',
    size_medium:'Средний бизнес', size_medium_desc:'50\u2013250 сотрудников',
    size_large:'Крупный бизнес', size_large_desc:'Более 250 сотрудников',
    complexity_basic:'Базовый', complexity_basic_desc:'Консультации и рекомендации',
    complexity_standard:'Стандарт', complexity_standard_desc:'Разработка и внедрение',
    complexity_premium:'Премиум', complexity_premium_desc:'Полное сопровождение',
    dur_1:'1\u20133 месяца', dur_1_desc:'Краткосрочный проект',
    dur_2:'3\u20136 месяцев', dur_2_desc:'Среднесрочный проект',
    dur_3:'6\u201312 месяцев', dur_3_desc:'Долгосрочное сотрудничество',
    res_service:'Услуга', res_size:'Масштаб', res_complexity:'Пакет', res_duration:'Срок',
    cta_float:'Рассчитаем стоимость вашего проекта за 15 минут', cta_float_close:'Закрыть', fab_whatsapp:'WhatsApp', partners_label:'Нам доверяют',
    social_proof_text:'рассчитал проект', home_link:'Главная',
    hero_scroll:'Листайте',
    page_title:'Agile Business — Бизнес-консалтинг нового поколения',
    page_title_calc:'Калькулятор стоимости — Agile Business',
    about_page_title:'О нас — Agile Business',
    works_page_title:'Наши работы — Agile Business',
    articles_page_title:'Статьи — Agile Business',
    page_desc:'Профессиональный бизнес-консалтинг в 3 направлениях: бизнес-аналитика, ИТ-разработка, креатив.',
    page_desc_calc:'Рассчитайте стоимость консалтинговых услуг онлайн. 3 направления экспертизы.',
    currency_symbol:'₽',
    works_label:'Наши работы',
    works_project:'Проект',
    works_empty:'Пока проектов нет — добавьте их через админку.',
    works_review_label:'Отзыв заказчика',
    work_back:'К работам',
    work_other:'Другие проекты',
    work_all:'Все работы',
    work_stack:'На чём сделано',
    work_description:'Описание',
    work_not_found:'Проект не найден',
    article_other:'Другие статьи',
    article_all:'Все статьи',
    article_stack:'Теги и материалы',
    article_description:'Текст',
    back_articles:'К статьям',
    client_profile_label:'Профиль заказчика',
    client_profile_company:'Компания',
    client_profile_address:'Адрес',
    client_profile_location:'Локация',
    client_access_label:'Кабинет клиента',
    client_access_title:'Вход / Регистрация',
    client_login_tab:'Вход',
    client_register_tab:'Регистрация',
    client_password:'Пароль',
    client_slug:'Slug (ссылка профиля)',
    client_login_btn:'Войти',
    client_register_btn:'Создать профиль',
    articles_label:'Статьи',
    article_label:'Статья',
    articles_empty:'Пока статей нет — добавьте их через админку.',
    mascot_greeting:'Привет! Я Agile — ваш бизнес-помощник!',
    mascot_tip_1:'Нажми на калькулятор — узнай стоимость!',
    mascot_tip_2:'У нас 5 направлений экспертизы',
    mascot_tip_3:'Оставьте заявку — ответим за 24 часа!',
    mascot_tip_4:'Переключи язык — я говорю на 30+ языках!',
    about_feat_1:'Аудит и диагностика',
    about_feat_2:'Стратегическое планирование',
    about_feat_3:'Внедрение и сопровождение',
    about_feat_4:'Масштабирование результатов',
    error_404_title:'404',
    error_404_text:'Страница не найдена',
    error_404_back:'На главную',
    trust_secure:'Надёжность',
    trust_fast:'Оперативность',
    trust_quality:'Качество'
};

/* ── English (Complete) ─────────────────────────────── */
I18N.en = {
    nav_about:'About', nav_works:'Our work', nav_articles:'Articles', nav_services:'Services', nav_approach:'Approach', nav_contact:'Contact', nav_cta:'Calculate project',
    hero_badge:'Next-generation business consulting',
    hero_title_1:'Solutions', hero_title_2:'for your', hero_title_3:'business',
    hero_subtitle:'3 areas of expertise to transform and scale your business',
    hero_btn_discuss:'Discuss project', hero_btn_services:'Our services', hero_btn_contact:'Contact us',
    about_label:'About us', about_title_1:'Agile approach', about_title_2:'to your business',
    about_text:'We are a team of experts combining analytics, strategy and technology to solve the most complex business challenges. Our approach is built on agility, data, and deep market understanding.',
    about_stat_1_label:'areas of\nexpertise', about_stat_2_label:'successful\nprojects', about_stat_3_label:'clients\nrecommend',
    about_card_metric_label:'project ROI',
    about_card_title:'Full-cycle consulting', about_card_text:'Marketing \u00b7 Strategy \u00b7 Growth \u2014 from idea to result',
    srv_label:'Expertise', srv_title_1:'3 directions', srv_title_2:'for your growth',
    srv_desc:'Each direction is a team of specialists with deep expertise and proven methodology',
    srv_1_title:'Management & Strategy', srv_1_desc:'Long-term goal setting, project planning, business process optimization, change management and digital transformation',
    srv_2_title:'Investment & Valuation', srv_2_desc:'Fundraising, business valuation, Due Diligence, business plans and investment proposals',
    srv_3_title:'Creative', srv_3_desc:'Comprehensive marketing, sales, and design. Click to view detailed information by sub-spheres',
    srv_4_title:'Business Analytics', srv_4_desc:'Business analytics, BI systems, forecasting, data visualization, risk assessment and data-driven management',
    srv_5_title:'IT & Development', srv_5_desc:'IT strategy, web & mobile development, cybersecurity, cloud solutions and system integration',
    srv_flip_tab:'Focus',
    srv_flip_title:'Details',
    srv_flip_hint:'Click the card to open the full description',
    appr_label:'Our approach', appr_title_1:'Methodology', appr_title_2:'Agile Business',
    appr_step_1_title:'Diagnostics', appr_step_1_desc:'Deep analysis of current business state, identifying growth points and bottlenecks',
    appr_step_2_title:'Strategy', appr_step_2_desc:'Roadmap development with clear KPIs, timelines and responsibilities',
    appr_step_3_title:'Implementation', appr_step_3_desc:'Deploying solutions with continuous monitoring and course correction',
    appr_step_4_title:'Scaling', appr_step_4_desc:'Consolidating results and reaching new efficiency levels',
    marquee_1:'STRATEGY', marquee_2:'ANALYTICS', marquee_3:'RESULTS', marquee_4:'GROWTH', marquee_5:'EFFICIENCY',
    contact_label:'Contact', contact_title_1:"Let's start", contact_title_2:'working together',
    contact_text:'Leave a request and we will contact you to discuss your project within 24 hours',
    contact_name:'Your name', contact_email:'Email', contact_phone:'Phone', contact_company:'Company',
    contact_message:'Tell us about your project', contact_submit:'Send request',
    contact_success:'Request sent! We will contact you.', contact_error:'Error. Try again later.',
    footer_rights:'\u00a9 2026 Website developed by Agile Business',
    footer_privacy:'Privacy Policy',
    calc_title:'Calculate project', calc_page_label:'Calculator', calc_subtitle:'Estimate the cost of consulting services',
    calc_step_1_title:'Choose a direction', calc_step_1_sub:'What area of consulting interests you?',
    calc_step_2_title:'Company size', calc_step_2_sub:'Specify the scale of your business',
    calc_step_3_title:'Complexity level', calc_step_3_sub:'Choose the right service package',
    calc_step_4_title:'Project duration', calc_step_4_sub:'Expected length of cooperation',
    calc_step_5_title:'Describe the task', calc_step_5_sub:'Tell us more about your project',
    calc_textarea_placeholder:'Describe your task, goals and expectations...',
    calc_next:'Next', calc_prev:'Back', calc_calculate:'Calculate',
    calc_result_title:'Preliminary estimate', calc_result_subtitle:'Final cost may vary after detailed analysis',
    calc_per_month:'/ mo',
    calc_contact_title:'Leave your contacts', calc_contact_sub:'We will contact you for a detailed discussion',
    calc_contact_send:'Send', calc_contact_success:'Thank you! We will get in touch soon.',
    calc_smart_warn:'Description does not match the selected service. Please clarify.',
    calc_smart_hint:'Service hint',
    it_criteria_title:'IT evaluation criteria',
    it_criteria_selected:'Selected add-ons',
    size_small:'Small business', size_small_desc:'Up to 50 employees',
    size_medium:'Medium business', size_medium_desc:'50\u2013250 employees',
    size_large:'Large business', size_large_desc:'Over 250 employees',
    complexity_basic:'Basic', complexity_basic_desc:'Consulting & recommendations',
    complexity_standard:'Standard', complexity_standard_desc:'Development & implementation',
    complexity_premium:'Premium', complexity_premium_desc:'Full support',
    dur_1:'1\u20133 months', dur_1_desc:'Short-term project',
    dur_2:'3\u20136 months', dur_2_desc:'Medium-term project',
    dur_3:'6\u201312 months', dur_3_desc:'Long-term cooperation',
    res_service:'Service', res_size:'Scale', res_complexity:'Package', res_duration:'Duration',
    cta_float:'We will calculate your project cost in 15 minutes', cta_float_close:'Close', fab_whatsapp:'WhatsApp', partners_label:'Trusted by',
    social_proof_text:'requested an estimate', home_link:'Home',
    hero_scroll:'Scroll',
    page_title:'Agile Business — Next-gen Business Consulting',
    page_title_calc:'Cost Calculator — Agile Business',
    about_page_title:'About — Agile Business',
    works_page_title:'Our work — Agile Business',
    articles_page_title:'Articles — Agile Business',
    page_desc:'Professional business consulting in 3 areas: business analytics, IT development, creative.',
    page_desc_calc:'Calculate the cost of consulting services online. 3 areas of expertise.',
    currency_symbol:'\u20bd',
    works_label:'Our work',
    works_project:'Project',
    works_empty:'No projects yet — add them in the admin panel.',
    works_review_label:'Client review',
    work_back:'All projects',
    work_other:'More projects',
    work_all:'View all',
    work_stack:'Built with',
    work_description:'Overview',
    work_not_found:'Project not found',
    article_other:'More articles',
    article_all:'All articles',
    article_stack:'Tags & stack',
    article_description:'Text',
    back_articles:'Back to articles',
    client_profile_label:'Client profile',
    client_profile_company:'Company',
    client_profile_address:'Address',
    client_profile_location:'Location',
    client_access_label:'Client area',
    client_access_title:'Login / Register',
    client_login_tab:'Login',
    client_register_tab:'Register',
    client_password:'Password',
    client_slug:'Slug (profile link)',
    client_login_btn:'Login',
    client_register_btn:'Create profile'
    ,articles_label:'Articles'
    ,article_label:'Article'
    ,articles_empty:'No articles yet — add them in the admin panel.'
    ,about_feat_1:'Audit & Diagnostics'
    ,about_feat_2:'Strategic Planning'
    ,about_feat_3:'Implementation & Support'
    ,about_feat_4:'Scaling Results'
    ,error_404_title:'404'
    ,error_404_text:'Page not found'
    ,error_404_back:'Go home'
    ,trust_secure:'Reliability'
    ,trust_fast:'Responsiveness'
    ,trust_quality:'Quality'
    ,about_card_marketing:'We\'ll build a sales funnel, SEO and brand strategy for your business'
    ,mascot_greeting:'Hi! I\'m Agile — your business assistant!'
    ,mascot_tip_1:'Try the calculator — get a quote!'
    ,mascot_tip_2:'We have 5 areas of expertise'
    ,mascot_tip_3:'Leave a request — we\'ll respond in 24h!'
    ,mascot_tip_4:'Switch language — I speak 30+ languages!'
};

/* ── Other languages loaded on-demand from i18n-extra.js ──── */
var _i18nExtraLoaded = false;
var _i18nExtraLoading = null;
function loadExtraLangs() {
    if (_i18nExtraLoaded) return Promise.resolve();
    if (_i18nExtraLoading) return _i18nExtraLoading;
    _i18nExtraLoading = new Promise(function(resolve) {
        var s = document.createElement('script');
        s.src = '/js/i18n-extra.js';
        s.onload = function() { _i18nExtraLoaded = true; resolve(); };
        s.onerror = function() { resolve(); };
        document.head.appendChild(s);
    });
    return _i18nExtraLoading;
}
function needsExtraLangs(lang) {
    return lang && lang !== 'ru' && lang !== 'en';
}

const LANG_NAMES = {
    ru:'\u0420\u0443\u0441\u0441\u043a\u0438\u0439',  // Русский
    en:'English',       // Английский
    ka:'\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8',  // Грузинский
    hy:'\u0540\u0561\u0575\u0565\u0580\u0565\u0576',  // Армянский
    bg:'\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438'   // Болгарский
};

/* ── i18n Engine ────────────────────────────────────── */
function getCurrentLang() {
    return localStorage.getItem('ab_lang') || detectBrowserLang() || 'ru';
}

/* Auto-detect language from browser or URL ?lang= param */
function detectBrowserLang() {
    // Check URL ?lang= parameter first (for hreflang links from Google)
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get('lang');
    if (urlLang && LANG_NAMES[urlLang]) {
        localStorage.setItem('ab_lang', urlLang);
        // Clean URL without reloading
        if (window.history && window.history.replaceState) {
            var clean = window.location.pathname + window.location.hash;
            window.history.replaceState(null, '', clean);
        }
        return urlLang;
    }
    // If user already chose a language before, respect it
    if (localStorage.getItem('ab_lang')) return null;
    // Detect from browser language
    var browserLangs = (navigator.languages || [navigator.language || '']).map(function(l) { return l.toLowerCase(); });
    var langMap = Object.assign({}, LANG_NAMES);
    for (var i = 0; i < browserLangs.length; i++) {
        var bl = browserLangs[i].split('-')[0];
        if (langMap[bl]) return bl;
    }
    return null;
}

function setLang(lang) {
    if (!I18N[lang] && !LANG_NAMES[lang]) return;
    localStorage.setItem('ab_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'he') document.documentElement.setAttribute('dir', 'rtl');
    else document.documentElement.removeAttribute('dir');
    if (needsExtraLangs(lang) && !I18N[lang]) {
        loadExtraLangs().then(function() {
            applyTranslations(lang);
        });
    } else {
        applyTranslations(lang);
    }
    // Update dropdown display
    var dd = document.querySelector('.lang-dropdown__current');
    if (dd) dd.textContent = (LANG_NAMES[lang] || lang).split(' ')[0];
}

function t(key) {
    var lang = getCurrentLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || (I18N.ru && I18N.ru[key]) || key;
}

function applyTranslations(lang) {
    lang = lang || getCurrentLang();
    var dict = I18N[lang] || {};
    var fallbackEn = I18N.en || {};
    var fallbackRu = I18N.ru || {};
    var remote = (I18N_REMOTE.dict && I18N_REMOTE.dict[lang]) || {};

    function tr(key) {
        return remote[key] || dict[key] || fallbackEn[key] || fallbackRu[key] || '';
    }

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var text = tr(key);
        if (!text) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
            return;
        }
        /* FAB-кнопки: не затирать SVG — только подсказки */
        if (el.classList.contains('fab-hub__item') || (el.closest && el.closest('.fab-hub__items'))) {
            el.setAttribute('title', text);
            el.setAttribute('aria-label', text);
            return;
        }
        el.textContent = text;
    });

    // Update page title
    var isCalcPage = window.location.pathname.indexOf('calculator') !== -1;
    var titleKey = isCalcPage ? 'page_title_calc' : 'page_title';
    var descKey = isCalcPage ? 'page_desc_calc' : 'page_desc';
    var titleText = tr(titleKey);
    var descText = tr(descKey);
    if (titleText) document.title = titleText;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && descText) metaDesc.setAttribute('content', descText);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && titleText) ogTitle.setAttribute('content', titleText);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && descText) ogDesc.setAttribute('content', descText);

    // Update lang dropdown text
    var dd = document.querySelector('.lang-dropdown__current');
    if (dd) dd.textContent = (LANG_NAMES[lang] || lang).split(' ')[0];
}

function getAvailableLanguages() {
    return Object.keys(LANG_NAMES).map(function(code) {
        return { code: code, name: LANG_NAMES[code] };
    });
}

// Build language dropdown
function buildLangDropdown() {
    var wrapper = document.querySelector('.lang-dropdown');
    if (!wrapper) return;
    var current = getCurrentLang();
    var btn = wrapper.querySelector('.lang-dropdown__current');
    var list = wrapper.querySelector('.lang-dropdown__list');
    if (!btn || !list) return;

    btn.textContent = (LANG_NAMES[current] || current).split(' ')[0];
    list.innerHTML = '';
    Object.keys(LANG_NAMES).forEach(function(code) {
        var li = document.createElement('li');
        li.className = 'lang-dropdown__item' + (code === current ? ' active' : '');
        li.textContent = LANG_NAMES[code];
        li.dataset.lang = code;
        li.addEventListener('click', function() {
            setLang(code);
            wrapper.classList.remove('open');
            list.querySelectorAll('.lang-dropdown__item').forEach(function(i) { i.classList.remove('active'); });
            li.classList.add('active');
        });
        list.appendChild(li);
    });

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        wrapper.classList.toggle('open');
    });
    document.addEventListener('click', function() { wrapper.classList.remove('open'); });
}

// Init
document.addEventListener('DOMContentLoaded', function() {
    var lang = getCurrentLang();
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'he') document.documentElement.setAttribute('dir', 'rtl');
    // Load extra language pack if needed, then remote overrides, then apply
    var extraP = needsExtraLangs(lang) ? loadExtraLangs() : Promise.resolve();
    extraP.then(function() {
        return loadRemoteTranslations(lang);
    }).then(function() {
        applyTranslations(lang);
        buildLangDropdown();
    });
});

var AB_I18N_SS_PREFIX = 'ab_i18n_api_v2_';
var AB_I18N_SS_TTL_MS = 30 * 60 * 1000;

function loadRemoteTranslations(lang) {
    lang = lang || getCurrentLang();
    if (!lang) return Promise.resolve();
    if (I18N_REMOTE.loaded[lang]) return Promise.resolve();
    try {
        var raw = sessionStorage.getItem(AB_I18N_SS_PREFIX + lang);
        if (raw) {
            var cached = JSON.parse(raw);
            if (cached && cached.t && cached.translations && (Date.now() - cached.t) < AB_I18N_SS_TTL_MS) {
                I18N_REMOTE.dict[lang] = cached.translations;
                I18N_REMOTE.loaded[lang] = true;
                return Promise.resolve();
            }
        }
    } catch (e) { /* ignore */ }

    return new Promise(function(resolve) {
        var stagger = 120 + Math.floor(Math.random() * 200);
        setTimeout(function() {
            fetch('/api/i18n/' + encodeURIComponent(lang), { cache: 'no-store', credentials: 'same-origin' })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (!data || !data.translations) return;
                    I18N_REMOTE.dict[lang] = data.translations || {};
                    I18N_REMOTE.loaded[lang] = true;
                    try {
                        sessionStorage.setItem(AB_I18N_SS_PREFIX + lang, JSON.stringify({
                            t: Date.now(),
                            translations: data.translations
                        }));
                    } catch (e2) { /* quota */ }
                })
                .catch(function() {})
                .then(resolve);
        }, stagger);
    });
}
