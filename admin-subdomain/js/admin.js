/* ================================================================
   AGILE BUSINESS — Admin Panel SPA
   Dashboard · CMS · CRM · Calculator Pricing · User Management
   ================================================================ */
(function () {
    'use strict';

    const API = '/api/admin';

    /* ── Global event delegation for data-nav / data-clear (CSP-safe) ── */
    document.addEventListener('click', e => {
        const nav = e.target.closest('[data-nav]');
        if (nav) { e.preventDefault(); location.hash = nav.dataset.nav; return; }
        const clr = e.target.closest('[data-clear]');
        if (clr) { e.preventDefault(); const el = document.getElementById(clr.dataset.clear); if (el) el.innerHTML = ''; }
    });
    const LANGS = [
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
        { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
        { code: 'bg', name: 'Български', flag: '🇧🇬' }
    ];
    const SERVICE_NAMES = {
        management: 'Управление и Стратегия', investment: 'Инвестиции и Оценка',
        creative: 'Креатив', analytics: 'Аналитика и Данные', it: 'ИТ и Разработка'
    };
    const STATUS_LABELS = { new: 'Новая', processing: 'В обработке', accepted: 'Принята', rejected: 'Отклонена', completed: 'Завершена', in_progress: 'В работе', cancelled: 'Отменён', on_hold: 'На паузе' };

    const STACK_CATEGORIES = [
        { key: 'front', label: 'Frontend' },
        { key: 'back', label: 'Backend' },
        { key: 'db', label: 'Database' },
        { key: 'deploy', label: 'DevOps / Deploy' },
        { key: 'android', label: 'Android' },
        { key: 'ios', label: 'iOS' }
    ];
    const TECH_STACK_OPTIONS = [
        { id:'react', name:'React', icon:'devicon-react-original', cat:'front' },
        { id:'vue', name:'Vue.js', icon:'devicon-vuejs-plain', cat:'front' },
        { id:'angular', name:'Angular', icon:'devicon-angularjs-plain', cat:'front' },
        { id:'nextjs', name:'Next.js', icon:'devicon-nextjs-plain', cat:'front' },
        { id:'nuxtjs', name:'Nuxt.js', icon:'devicon-nuxtjs-plain', cat:'front' },
        { id:'svelte', name:'Svelte', icon:'devicon-svelte-plain', cat:'front' },
        { id:'typescript', name:'TypeScript', icon:'devicon-typescript-plain', cat:'front' },
        { id:'javascript', name:'JavaScript', icon:'devicon-javascript-plain', cat:'front' },
        { id:'html5', name:'HTML5', icon:'devicon-html5-plain', cat:'front' },
        { id:'css3', name:'CSS3', icon:'devicon-css3-plain', cat:'front' },
        { id:'tailwind', name:'Tailwind', icon:'devicon-tailwindcss-plain', cat:'front' },
        { id:'bootstrap', name:'Bootstrap', icon:'devicon-bootstrap-plain', cat:'front' },
        { id:'sass', name:'Sass', icon:'devicon-sass-original', cat:'front' },
        { id:'flutter', name:'Flutter', icon:'devicon-flutter-plain', cat:'front' },
        { id:'reactnative', name:'React Native', icon:'devicon-react-original', cat:'front' },
        { id:'nodejs', name:'Node.js', icon:'devicon-nodejs-plain', cat:'back' },
        { id:'express', name:'Express', icon:'devicon-express-original', cat:'back' },
        { id:'nestjs', name:'NestJS', icon:'devicon-nestjs-original', cat:'back' },
        { id:'python', name:'Python', icon:'devicon-python-plain', cat:'back' },
        { id:'django', name:'Django', icon:'devicon-django-plain', cat:'back' },
        { id:'fastapi', name:'FastAPI', icon:'devicon-fastapi-plain', cat:'back' },
        { id:'flask', name:'Flask', icon:'devicon-flask-original', cat:'back' },
        { id:'php', name:'PHP', icon:'devicon-php-plain', cat:'back' },
        { id:'laravel', name:'Laravel', icon:'devicon-laravel-original', cat:'back' },
        { id:'go', name:'Go', icon:'devicon-go-plain', cat:'back' },
        { id:'rust', name:'Rust', icon:'devicon-rust-original', cat:'back' },
        { id:'java', name:'Java', icon:'devicon-java-plain', cat:'back' },
        { id:'spring', name:'Spring', icon:'devicon-spring-plain', cat:'back' },
        { id:'csharp', name:'C#', icon:'devicon-csharp-plain', cat:'back' },
        { id:'dotnet', name:'.NET', icon:'devicon-dotnetcore-plain', cat:'back' },
        { id:'ruby', name:'Ruby', icon:'devicon-ruby-plain', cat:'back' },
        { id:'rails', name:'Rails', icon:'devicon-rails-plain', cat:'back' },
        { id:'graphql', name:'GraphQL', icon:'devicon-graphql-plain', cat:'back' },
        { id:'postgresql', name:'PostgreSQL', icon:'devicon-postgresql-plain', cat:'db' },
        { id:'mysql', name:'MySQL', icon:'devicon-mysql-plain', cat:'db' },
        { id:'mongodb', name:'MongoDB', icon:'devicon-mongodb-plain', cat:'db' },
        { id:'redis', name:'Redis', icon:'devicon-redis-plain', cat:'db' },
        { id:'sqlite', name:'SQLite', icon:'devicon-sqlite-plain', cat:'db' },
        { id:'firebase', name:'Firebase', icon:'devicon-firebase-plain', cat:'db' },
        { id:'supabase', name:'Supabase', icon:'devicon-supabase-plain', cat:'db' },
        { id:'elasticsearch', name:'Elasticsearch', icon:'devicon-elasticsearch-plain', cat:'db' },
        { id:'docker', name:'Docker', icon:'devicon-docker-plain', cat:'deploy' },
        { id:'kubernetes', name:'Kubernetes', icon:'devicon-kubernetes-plain', cat:'deploy' },
        { id:'aws', name:'AWS', icon:'devicon-amazonwebservices-plain-wordmark', cat:'deploy' },
        { id:'gcp', name:'Google Cloud', icon:'devicon-googlecloud-plain', cat:'deploy' },
        { id:'azure', name:'Azure', icon:'devicon-azure-plain', cat:'deploy' },
        { id:'nginx', name:'Nginx', icon:'devicon-nginx-original', cat:'deploy' },
        { id:'vercel', name:'Vercel', icon:'devicon-vercel-original', cat:'deploy' },
        { id:'netlify', name:'Netlify', icon:'devicon-netlify-plain', cat:'deploy' },
        { id:'github', name:'GitHub Actions', icon:'devicon-github-original', cat:'deploy' },
        { id:'gitlab', name:'GitLab CI', icon:'devicon-gitlab-plain', cat:'deploy' },
        { id:'linux', name:'Linux', icon:'devicon-linux-plain', cat:'deploy' },
        { id:'kotlin', name:'Kotlin', icon:'devicon-kotlin-plain', cat:'android' },
        { id:'android', name:'Android SDK', icon:'devicon-android-plain', cat:'android' },
        { id:'jetpack', name:'Jetpack Compose', icon:'devicon-jetpackcompose-plain', cat:'android' },
        { id:'swift', name:'Swift', icon:'devicon-swift-plain', cat:'ios' },
        { id:'xcode', name:'Xcode', icon:'devicon-xcode-plain', cat:'ios' },
        { id:'objectivec', name:'Objective-C', icon:'devicon-objectivec-plain', cat:'ios' }
    ];

    let currentUser = null;
    let currentSection = '';
    let charts = {};
    let quillInstances = {};
    let geoMap = null;

    /* ── Helpers ───────────────────────────────────── */
    const $ = (s, p) => (p || document).querySelector(s);
    const $$ = (s, p) => [...(p || document).querySelectorAll(s)];
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    function formatDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    function formatDateTime(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('ru-RU') + ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
    function formatMoney(n) { return Number(n || 0).toLocaleString('ru-RU') + ' ₽'; }

    const CYR_TO_LAT = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
        к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
        х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
    };

    function slugify(value, maxLen = 140) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return '';
        const translit = Array.from(raw).map(ch => Object.prototype.hasOwnProperty.call(CYR_TO_LAT, ch) ? CYR_TO_LAT[ch] : ch).join('');
        return translit
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-')
            .slice(0, maxLen)
            .replace(/-+$/g, '');
    }

    function firstFilledValue(values) {
        for (const value of values || []) {
            const s = String(value || '').trim();
            if (s) return s;
        }
        return '';
    }

    function setupSlugSync(inputSelector, titleSelectors, maxLen) {
        const slugEl = $(inputSelector);
        if (!slugEl) return;
        const titleEls = (titleSelectors || []).map(sel => $(sel)).filter(Boolean);
        const sanitize = () => {
            const cleaned = slugify(slugEl.value, maxLen);
            if (cleaned !== slugEl.value) slugEl.value = cleaned;
            if (!slugEl.value.trim()) slugEl.dataset.slugDirty = '0';
        };
        const autofill = () => {
            if (slugEl.dataset.slugDirty === '1' && slugEl.value.trim()) return;
            const best = firstFilledValue(titleEls.map(el => el.value));
            if (best) slugEl.value = slugify(best, maxLen);
        };
        sanitize();
        if (!slugEl.value.trim()) autofill();
        slugEl.oninput = () => {
            const caret = slugEl.selectionStart;
            sanitize();
            slugEl.dataset.slugDirty = slugEl.value.trim() ? '1' : '0';
            try { slugEl.setSelectionRange(caret, caret); } catch (e) { /* noop */ }
        };
        slugEl.onblur = sanitize;
        titleEls.forEach(el => {
            el.addEventListener('input', autofill);
            el.addEventListener('blur', autofill);
        });
    }

    async function api(path, opts = {}) {
        const url = path.startsWith('/') ? path : `${API}/${path}`;
        const config = {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            ...opts
        };
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }
        const r = await fetch(url, config);
        let data;
        try { data = await r.json(); } catch { data = { ok: false, error: `HTTP ${r.status}` }; }
        // Не считаем 401 на /login «разлогином»: там приходит текст ошибки (неверный пароль и т.д.)
        const isLoginRoute = /\/api\/admin\/login\/?$/i.test(url) || String(path).replace(/^\//, '') === 'login';
        if (!r.ok && r.status === 401 && !isLoginRoute) {
            showLogin();
            throw new Error('Unauthorized');
        }
        return data;
    }

    function toast(msg, type = 'success') {
        const c = $('#toastContainer');
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        c.appendChild(el);
        setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, 3000);
    }

    /* ── Typing Animation ──────────────────────────── */
    function typeText(el, text, speed = 60) {
        if (!el) return Promise.resolve();
        el.innerHTML = '';
        let i = 0;
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        el.appendChild(cursor);
        return new Promise(resolve => {
            function tick() {
                if (!cursor.isConnected || cursor.parentNode !== el) {
                    resolve();
                    return;
                }
                if (i < text.length) {
                    el.insertBefore(document.createTextNode(text[i]), cursor);
                    i++;
                    setTimeout(tick, speed);
                } else {
                    setTimeout(() => { if (cursor.isConnected) cursor.remove(); resolve(); }, 1500);
                }
            }
            tick();
        });
    }

    /* ── Clock ─────────────────────────────────────── */
    function updateClock() {
        const el = $('#topbarClock');
        if (!el) return;
        const now = new Date();
        const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        el.textContent = `${days[msk.getDay()]}, ${msk.toLocaleDateString('ru-RU')} ${msk.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} МСК`;
    }

    /* ── Calendar Popup ────────────────────────────── */
    function toggleCalendar(e) {
        let popup = document.getElementById('calendarPopup');
        if (popup) { popup.remove(); return; }
        popup = document.createElement('div');
        popup.id = 'calendarPopup';
        popup.className = 'calendar-popup show';
        const rect = e.target.getBoundingClientRect();
        popup.style.top = (rect.bottom + 8) + 'px';
        popup.style.left = Math.max(10, rect.left - 100) + 'px';
        renderCalendar(popup, new Date());
        document.body.appendChild(popup);
        setTimeout(() => document.addEventListener('click', closeCalendar), 10);
    }
    function closeCalendar(e) {
        const p = document.getElementById('calendarPopup');
        if (p && !p.contains(e.target)) { p.remove(); document.removeEventListener('click', closeCalendar); }
    }
    function renderCalendar(popup, date) {
        const y = date.getFullYear(), m = date.getMonth();
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const firstDay = new Date(y, m, 1).getDay() || 7;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const today = new Date();

        let html = `<div class="calendar-header">
            <button data-m="-1">&lt;</button>
            <span>${months[m]} ${y}</span>
            <button data-m="1">&gt;</button>
        </div><div class="calendar-grid">`;
        ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(d => html += `<div class="day-name">${d}</div>`);
        for (let i = 1; i < firstDay; i++) html += '<div class="day other-month"></div>';
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
            html += `<div class="day${isToday ? ' today' : ''}">${d}</div>`;
        }
        html += '</div>';
        popup.innerHTML = html;
        popup.querySelectorAll('[data-m]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); renderCalendar(popup, new Date(y, m + parseInt(btn.dataset.m), 1)); };
        });
    }

    /* ── Auth ──────────────────────────────────────── */
    function showLogin() {
        $('#loginScreen').style.display = '';
        $('#adminShell').style.display = 'none';
        currentUser = null;
        const g2fa = document.getElementById('login2faGroup');
        if (g2fa) g2fa.remove();
        const userGrp = document.getElementById('loginUser');
        if (userGrp) userGrp.closest('.form-group').style.display = '';
        const passGrp = document.getElementById('loginPass');
        if (passGrp) passGrp.closest('.form-group').style.display = '';
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.textContent = 'Войти';
        const errEl = document.getElementById('loginError');
        if (errEl) errEl.textContent = '';
        typeText($('#loginTyping'), 'Добро пожаловать в админ-панель');
    }

    let clockInterval = null;
    function showAdmin(user) {
        currentUser = user;
        $('#loginScreen').style.display = 'none';
        $('#adminShell').style.display = '';
        $('#topbarName').textContent = user.display_name || user.username;
        $('#topbarRole').textContent = user.role;
        $('#topbarAvatar').textContent = (user.display_name || user.username || 'A').charAt(0).toUpperCase();
        updateClock();
        if (clockInterval) clearInterval(clockInterval);
        clockInterval = setInterval(updateClock, 1000);
        navigate(location.hash || '#dashboard');
    }

    async function checkAuth() {
        try {
            const data = await api('me');
            if (data.ok && data.user) { showAdmin(data.user); return; }
        } catch (e) { /* not logged in */ }
        showLogin();
    }

    /* ── Router ────────────────────────────────────── */
    function navigate(hash) {
        const section = hash.replace(/^#/, '') || 'dashboard';
        currentSection = section;
        // Update sidebar active
        let sidebarSection = section;
        if (section.startsWith('lead/')) sidebarSection = 'leads';
        else if (section.startsWith('order/')) sidebarSection = 'orders';
        else if (section.startsWith('project/')) sidebarSection = 'projects';
        else if (section.startsWith('article/')) sidebarSection = 'articles';
        else if (section === 'pages' || section.startsWith('page/')) sidebarSection = 'pages';
        else if (section === 'seo') sidebarSection = 'seo';
        else if (section.startsWith('client/')) sidebarSection = 'clients';
        $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.getAttribute('data-section') === sidebarSection));
        renderSection(section);
    }

    async function renderSection(section) {
        const area = $('#contentArea');
        area.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        quillInstances = {};

        try {
            if (section === 'dashboard') await renderDashboard(area);
            else if (section === 'projects') await renderProjects(area);
            else if (section.startsWith('project/')) await renderProjectEditor(area, section.replace('project/', ''));
            else if (section === 'articles') await renderArticles(area);
            else if (section.startsWith('article/')) await renderArticleEditor(area, section.replace('article/', ''));
            else if (section === 'pages') await renderPagesHub(area);
            else if (section.startsWith('page/')) await renderPageEditor(area, section.replace('page/', ''));
            else if (section === 'seo') await renderSeoSettings(area);
            else if (section === 'calculator') await renderCalculatorPricing(area);
            else if (section === 'leads') await renderLeads(area);
            else if (section.startsWith('lead/')) await renderLeadDetail(area, section.replace('lead/', ''));
            else if (section === 'orders') await renderOrders(area);
            else if (section.startsWith('order/')) await renderOrderEditor(area, section.replace('order/', ''));
            else if (section === 'clients') await renderClients(area);
            else if (section.startsWith('client/')) await renderClientEditor(area, section.replace('client/', ''));
            else if (section === 'settings') await renderSettings(area);
            else area.innerHTML = '<div class="empty-state"><p>Раздел не найден</p></div>';
        } catch (e) {
            area.innerHTML = `<div class="empty-state"><p>Ошибка загрузки: ${esc(e.message)}</p></div>`;
        }
    }

    /* ── DASHBOARD ─────────────────────────────────── */
    function parseMetrikaTimeline(byTime) {
        if (!byTime || !byTime.time_intervals || !byTime.data) return { labels: [], visits: [], pageviews: [], users: [] };
        const labels = byTime.time_intervals.map(t => { const d = new Date(t[0]); return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }); });
        const visits = byTime.data[0] ? byTime.data[0].metrics[0] : [];
        const pageviews = byTime.data[0] ? byTime.data[0].metrics[1] : [];
        const users = byTime.data[0] ? byTime.data[0].metrics[2] : [];
        return { labels, visits, pageviews, users };
    }

    function parseMetrikaDimension(resp) {
        if (!resp || !resp.data) return [];
        return resp.data.map(row => ({
            name: row.dimensions && row.dimensions[0] ? row.dimensions[0].name : 'unknown',
            value: row.metrics ? row.metrics[0] : 0
        }));
    }

    function parseMetrikaGeo(resp) {
        if (!resp || !resp.data) return [];
        return resp.data.map(row => {
            const dims = row.dimensions || [];
            return {
                country: dims[0] ? dims[0].name : '',
                city: dims[1] ? dims[1].name : '',
                visits: row.metrics ? row.metrics[0] : 0,
                users: row.metrics ? row.metrics[1] : 0
            };
        });
    }

    async function renderDashboard(area) {
        const [data, ym] = await Promise.all([
            api('dashboard/stats'),
            api('dashboard/metrika').catch(() => ({ ok: false }))
        ]);
        if (!data.ok) { area.innerHTML = '<p>Ошибка загрузки</p>'; return; }
        const s = data.stats;

        const ymOk = ym && ym.ok;
        let visitorsToday = s.visitors.today;
        if (ymOk && ym.today && ym.today.data && ym.today.data[0]) {
            visitorsToday = Math.round(ym.today.data[0].metrics[1] || 0);
        }

        const ymTimeline = ymOk ? parseMetrikaTimeline(ym.byTime) : null;
        const ymDevices = ymOk ? parseMetrikaDimension(ym.devices) : null;
        const ymBrowsers = ymOk ? parseMetrikaDimension(ym.browsers) : null;
        const ymGeo = ymOk ? parseMetrikaGeo(ym.geo) : null;

        const ymBadge = ymOk
            ? '<span style="font-size:11px;color:#4CAF50;margin-left:8px" title="Данные из Яндекс.Метрики">YM</span>'
            : '<span style="font-size:11px;color:#9E9E9E;margin-left:8px" title="Метрика не подключена">DB</span>';

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Дашборд</div><div class="section-subtitle">Обзор ключевых показателей${ymBadge}</div></div>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="stat-info"><div class="stat-value">${s.leads.total}</div><div class="stat-label">Всего лидов</div></div></div>
                <div class="stat-card"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><div class="stat-info"><div class="stat-value">${s.leads.new}</div><div class="stat-label">Новых заявок</div></div></div>
                <div class="stat-card"><div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg></div><div class="stat-info"><div class="stat-value">${s.orders.active}</div><div class="stat-label">Активных заказов</div></div></div>
                <div class="stat-card"><div class="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(s.orders.revenue)}</div><div class="stat-label">Выручка</div></div></div>
                <div class="stat-card"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div><div class="stat-info"><div class="stat-value">${visitorsToday}</div><div class="stat-label">Посетителей сегодня</div></div></div>
                <div class="stat-card"><div class="stat-icon red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg></div><div class="stat-info"><div class="stat-value">${s.calculator.completed}</div><div class="stat-label">Расчётов калькулятора</div></div></div>
            </div>
            <div class="charts-grid">
                <div class="chart-card"><div class="chart-title">Визиты за неделю${ymOk ? ' <small style="color:#999">(Метрика)</small>' : ''}</div><div class="chart-wrap"><canvas id="chartViews"></canvas></div></div>
                <div class="chart-card"><div class="chart-title">Лиды по статусу</div><div class="chart-wrap"><canvas id="chartLeadStatus"></canvas></div></div>
                <div class="chart-card"><div class="chart-title">Устройства${ymOk ? ' <small style="color:#999">(Метрика)</small>' : ''}</div><div class="chart-wrap"><canvas id="chartDevices"></canvas></div></div>
                <div class="chart-card"><div class="chart-title">Браузеры${ymOk ? ' <small style="color:#999">(Метрика)</small>' : ''}</div><div class="chart-wrap"><canvas id="chartBrowsers"></canvas></div></div>
            </div>
            <div class="card mb-24"><div class="card-header"><div class="card-title">Гео-карта посетителей${ymOk ? ' <small style="color:#999">(Метрика)</small>' : ''}</div></div><div id="geoMapContainer" style="height:360px;border-radius:var(--radius-sm);"></div></div>
            <div class="table-card">
                <div class="table-header"><div class="table-title">Последние заявки</div><a href="#leads" class="btn btn-sm btn-secondary">Все заявки</a></div>
                <table><thead><tr><th>Имя</th><th>Email</th><th>Направление</th><th>Статус</th><th>Дата</th></tr></thead><tbody>
                ${s.recentLeads.map(l => `<tr style="cursor:pointer" data-nav="#lead/${l.id}">
                    <td>${esc(l.name)}</td><td>${esc(l.email)}</td><td>${esc(SERVICE_NAMES[l.service] || l.service || '—')}</td>
                    <td><span class="badge badge-${l.status}">${STATUS_LABELS[l.status] || l.status}</span></td>
                    <td>${formatDateTime(l.created_at)}</td>
                </tr>`).join('')}
                </tbody></table>
            </div>`;

        setTimeout(() => {
            Object.values(charts).forEach(c => c.destroy && c.destroy());
            charts = {};
            if (typeof Chart === 'undefined') return;

            const chartColors = { red: '#D32F2F', redLight: 'rgba(211,47,47,0.15)', blue: '#2196F3', green: '#4CAF50', orange: '#FF9800', purple: '#9C27B0', grey: '#9E9E9E' };

            const viewsCtx = document.getElementById('chartViews');
            if (viewsCtx) {
                let vLabels, vDatasets;
                if (ymTimeline) {
                    vLabels = ymTimeline.labels;
                    vDatasets = [
                        { label: 'Визиты', data: ymTimeline.visits, borderColor: chartColors.red, backgroundColor: chartColors.redLight, fill: true, tension: 0.4, borderWidth: 2 },
                        { label: 'Просмотры', data: ymTimeline.pageviews, borderColor: chartColors.blue, backgroundColor: 'rgba(33,150,243,0.10)', fill: false, tension: 0.4, borderWidth: 2 },
                        { label: 'Посетители', data: ymTimeline.users, borderColor: chartColors.green, backgroundColor: 'rgba(76,175,80,0.10)', fill: false, tension: 0.4, borderWidth: 2, borderDash: [5, 3] }
                    ];
                } else {
                    vLabels = (s.dailyViews || []).map(d => { const dt = new Date(d.view_date); return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }); });
                    vDatasets = [{ label: 'Просмотры', data: (s.dailyViews || []).map(d => d.total), borderColor: chartColors.red, backgroundColor: chartColors.redLight, fill: true, tension: 0.4, borderWidth: 2 }];
                }
                charts.views = new Chart(viewsCtx, {
                    type: 'line',
                    data: { labels: vLabels, datasets: vDatasets },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: !!ymTimeline, position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } }
                });
            }

            const statusCtx = document.getElementById('chartLeadStatus');
            if (statusCtx) {
                const statusColors = { new: '#2196F3', processing: '#FF9800', accepted: '#4CAF50', rejected: '#F44336', completed: '#1B5E20' };
                charts.leadStatus = new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: (s.leadsByStatus || []).map(d => STATUS_LABELS[d.status] || d.status),
                        datasets: [{ data: (s.leadsByStatus || []).map(d => d.c), backgroundColor: (s.leadsByStatus || []).map(d => statusColors[d.status] || '#9E9E9E'), borderWidth: 0 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } } } }
                });
            }

            const devCtx = document.getElementById('chartDevices');
            if (devCtx) {
                let dLabels, dData;
                if (ymDevices && ymDevices.length) {
                    dLabels = ymDevices.map(d => d.name);
                    dData = ymDevices.map(d => d.value);
                } else {
                    dLabels = (s.deviceStats || []).map(d => d.device_type || 'unknown');
                    dData = (s.deviceStats || []).map(d => d.c);
                }
                charts.devices = new Chart(devCtx, {
                    type: 'doughnut',
                    data: { labels: dLabels, datasets: [{ data: dData, backgroundColor: [chartColors.red, chartColors.blue, chartColors.orange, chartColors.green], borderWidth: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                });
            }

            const brCtx = document.getElementById('chartBrowsers');
            if (brCtx) {
                let bLabels, bData;
                if (ymBrowsers && ymBrowsers.length) {
                    bLabels = ymBrowsers.map(d => d.name);
                    bData = ymBrowsers.map(d => d.value);
                } else {
                    bLabels = (s.browserStats || []).map(d => d.browser || 'unknown');
                    bData = (s.browserStats || []).map(d => d.c);
                }
                charts.browsers = new Chart(brCtx, {
                    type: 'bar',
                    data: { labels: bLabels, datasets: [{ label: 'Визиты', data: bData, backgroundColor: chartColors.redLight, borderColor: chartColors.red, borderWidth: 1, borderRadius: 6 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            }

            const mapEl = document.getElementById('geoMapContainer');
            if (mapEl && typeof L !== 'undefined') {
                if (geoMap) { geoMap.remove(); geoMap = null; }
                geoMap = L.map(mapEl).setView([55.75, 37.62], 3);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                    subdomains: 'abcd', maxZoom: 19
                }).addTo(geoMap);

                const cityCoords = {
                    'Moscow': [55.75, 37.62], 'Saint Petersburg': [59.93, 30.32], 'Москва': [55.75, 37.62],
                    'Санкт-Петербург': [59.93, 30.32], 'Tbilisi': [41.69, 44.80], 'Yerevan': [40.18, 44.51],
                    'Sofia': [42.7, 23.32], 'Novosibirsk': [55.03, 82.92], 'Kazan': [55.79, 49.11],
                    'Minsk': [53.9, 27.56], 'Kiev': [50.45, 30.52], 'Almaty': [43.24, 76.95],
                    'Новосибирск': [55.03, 82.92], 'Казань': [55.79, 49.11], 'Тбилиси': [41.69, 44.80],
                    'Ереван': [40.18, 44.51], 'Киев': [50.45, 30.52], 'Минск': [53.9, 27.56]
                };

                const geoItems = ymGeo && ymGeo.length ? ymGeo : (s.geoData || []);
                geoItems.forEach(g => {
                    const city = g.city || '';
                    const country = g.country || '';
                    const count = g.visits || g.users || g.c || 0;
                    const coords = cityCoords[city] || cityCoords[country];
                    if (coords) {
                        L.circleMarker(coords, { radius: Math.min(20, 5 + count * 2), color: '#FF5252', fillColor: '#FF5252', fillOpacity: 0.45, weight: 2 })
                            .bindPopup(`<b>${esc(city || country)}</b><br>${count} визитов`)
                            .addTo(geoMap);
                    }
                });
                setTimeout(() => geoMap.invalidateSize(), 200);
            }
        }, 100);
    }

    /* ── PAGE HUB / CMS ────────────────────────────── */
    async function renderPagesHub(area) {
        const data = await api('pages').catch(() => ({ pages: [] }));
        const rows = Array.isArray(data.pages) ? data.pages : [];
        const wanted = [
            { slug: 'about', title: 'О нас', desc: 'Текст и презентация компании.' },
            { slug: 'works', title: 'Наши работы', desc: 'Заголовок и вводный текст страницы кейсов.' },
            { slug: 'articles', title: 'Статьи', desc: 'Заголовок и вводный текст раздела статей.' }
        ];
        const bySlug = Object.fromEntries(rows.map(r => [r.slug, r]));
        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Страницы сайта</div><div class="section-subtitle">Редактирование текстов разделов, включая страницу «О нас»</div></div>
            </div>
            <div class="stats-grid">
                ${wanted.map(item => {
                    const row = bySlug[item.slug] || {};
                    return `
                        <div class="stat-card" style="align-items:flex-start;min-height:160px;cursor:pointer" data-nav="#page/${item.slug}">
                            <div class="stat-info" style="gap:8px;display:flex;flex-direction:column;align-items:flex-start;">
                                <div class="stat-label" style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)">${esc(item.slug)}</div>
                                <div class="stat-value" style="font-size:24px;line-height:1.2">${esc(row.title || item.title)}</div>
                                <div class="section-subtitle" style="margin:0">${esc(item.desc)}</div>
                                <span class="btn btn-sm btn-secondary" style="margin-top:6px">Редактировать</span>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    }

    /* ── PAGE EDITOR (CMS) ─────────────────────────── */
    async function renderPageEditor(area, slug) {
        const data = await api(`pages/${slug}`);
        const page = data.page || { title: '', html: '' };
        const localesByLang = {};
        (data.locales || []).forEach(l => { localesByLang[l.lang] = l; });

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Редактирование: ${esc(slug)}</div></div>
                <button class="btn btn-primary" id="savePageBtn">Сохранить</button>
            </div>
            <div class="card">
                <div class="lang-tabs" id="langTabs">
                    ${LANGS.map((l, i) => `<button class="lang-tab${i === 0 ? ' active' : ''}" data-lang="${l.code}"><span>${l.flag}</span> ${l.name}</button>`).join('')}
                </div>
                ${LANGS.map((l, i) => `
                    <div class="editor-pane${i === 0 ? ' active' : ''}" data-lang-pane="${l.code}">
                        <div class="form-group"><label>Заголовок (${l.name})</label>
                            <input type="text" class="page-title-input" data-lang="${l.code}" value="${esc((localesByLang[l.code] || page).title || '')}">
                        </div>
                        <div class="editor-container"><div id="editor-${slug}-${l.code}" class="quill-editor"></div></div>
                    </div>
                `).join('')}
            </div>`;

        // Init lang tabs
        $$('#langTabs .lang-tab').forEach(tab => {
            tab.onclick = () => {
                $$('.lang-tab').forEach(t => t.classList.remove('active'));
                $$('.editor-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                $(`.editor-pane[data-lang-pane="${tab.dataset.lang}"]`).classList.add('active');
            };
        });

        // Init Quill editors
        setTimeout(() => {
            if (typeof Quill === 'undefined') return;
            LANGS.forEach(l => {
                const el = document.getElementById(`editor-${slug}-${l.code}`);
                if (!el) return;
                const q = new Quill(el, {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            [{ header: [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            ['blockquote', 'code-block'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            [{ align: [] }],
                            ['link', 'image'],
                            ['clean']
                        ]
                    }
                });
                const content = (localesByLang[l.code] || (l.code === 'ru' ? page : {})).html || '';
                if (content) q.root.innerHTML = content;
                quillInstances[`${slug}-${l.code}`] = q;
            });
        }, 100);

        // Save
        $('#savePageBtn').onclick = async () => {
            const locales = {};
            LANGS.forEach(l => {
                const titleInput = $(`.page-title-input[data-lang="${l.code}"]`);
                const qInst = quillInstances[`${slug}-${l.code}`];
                locales[l.code] = { title: titleInput ? titleInput.value : '', html: qInst ? qInst.root.innerHTML : '' };
            });
            const result = await api(`pages/${slug}`, { method: 'PUT', body: { title: locales.ru.title, html: locales.ru.html, locales } });
            if (result.ok) toast('Страница сохранена'); else toast(result.error || 'Ошибка', 'error');
        };
    }

    /* ── SEO SETTINGS (фиксированные страницы, без смены slug) ── */
    const SEO_PAGE_DEFS = [
        { slug: 'index', name: 'Главная страница', hint: 'Публичная главная' },
        { slug: 'about', name: 'О компании', hint: 'Раздел «О нас»' },
        { slug: 'works', name: 'Наши работы', hint: 'Список кейсов' },
        { slug: 'work', name: 'Страница кейса', hint: 'Шаблон одного проекта' },
        { slug: 'articles', name: 'Статьи', hint: 'Список материалов' },
        { slug: 'article', name: 'Страница статьи', hint: 'Шаблон публикации' },
        { slug: 'calculator', name: 'Калькулятор стоимости', hint: 'Оценка проекта' },
        { slug: 'privacy', name: 'Политика конфиденциальности', hint: 'Юридический текст' },
        { slug: 'client-access', name: 'Вход для клиента', hint: 'Авторизация клиента' },
        { slug: 'client', name: 'Профиль клиента', hint: 'Личный кабинет' }
    ];

    async function renderSeoSettings(area) {
        const data = await api('seo-settings').catch(() => ({ rows: [] }));
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const byPage = new Map(rows.map(r => [String(r.page || '').toLowerCase(), r]));

        area.innerHTML = `
            <div class="section-header">
                <div>
                    <div class="section-title">SEO и ключевые слова</div>
                    <div class="section-subtitle">Настройки привязаны к страницам сайта. Название раздела — для удобства; технический ключ фиксирован и не меняется.</div>
                </div>
            </div>
            <div id="seoRowsWrap" class="seo-settings-wrap"></div>`;

        const wrap = document.getElementById('seoRowsWrap');
        wrap.innerHTML = SEO_PAGE_DEFS.map((def) => {
            const r = byPage.get(def.slug) || {};
            const seo_title = r.seo_title != null ? r.seo_title : '';
            const seo_description = r.seo_description != null ? r.seo_description : '';
            const keywords = r.keywords != null ? r.keywords : '';
            const keywords_plus = r.keywords_plus != null ? r.keywords_plus : '';
            const keywords_minus = r.keywords_minus != null ? r.keywords_minus : '';
            return `
                <details class="seo-page-details card mb-24" data-seo-slug="${esc(def.slug)}">
                    <summary class="seo-page-summary">
                        <span class="seo-page-summary__main">
                            <span class="seo-page-summary__name">${esc(def.name)}</span>
                            <span class="seo-page-summary__hint">${esc(def.hint)}</span>
                        </span>
                        <span class="seo-page-summary__tech">Ключ: <code>${esc(def.slug)}</code></span>
                    </summary>
                    <div class="seo-page-body">
                        <div class="form-row">
                            <div class="form-group" style="flex:1">
                                <label>Заголовок страницы (meta title)</label>
                                <input type="text" class="seo-title" value="${esc(seo_title)}" placeholder="Краткий заголовок для поиска и вкладки браузера">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Описание (meta description)</label>
                            <textarea class="seo-description" rows="3" placeholder="Краткое описание сути страницы, до ~160 символов">${esc(seo_description)}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Ключевые слова</label>
                            <textarea class="seo-keywords" rows="2" placeholder="Через запятую: консалтинг, стратегия, аналитика">${esc(keywords)}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Плюс-слова (усилить)</label>
                                <textarea class="seo-keywords-plus" rows="2" placeholder="Приоритетные формулировки и уточнения">${esc(keywords_plus)}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Минус-слова (отсев)</label>
                                <textarea class="seo-keywords-minus" rows="2" placeholder="Нерелевантные запросы, которые не про вашу услугу">${esc(keywords_minus)}</textarea>
                            </div>
                        </div>
                        <div class="inline-flex gap-8">
                            <button type="button" class="btn btn-primary seo-save-btn">Сохранить</button>
                        </div>
                    </div>
                </details>`;
        }).join('');

        $$('.seo-save-btn', wrap).forEach((btn) => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const details = btn.closest('.seo-page-details');
                const slug = details && details.dataset.seoSlug;
                if (!slug) return;
                const payload = {
                    seo_title: details.querySelector('.seo-title').value || '',
                    seo_description: details.querySelector('.seo-description').value || '',
                    keywords: details.querySelector('.seo-keywords').value || '',
                    keywords_plus: details.querySelector('.seo-keywords-plus').value || '',
                    keywords_minus: details.querySelector('.seo-keywords-minus').value || ''
                };
                const result = await api(`seo-settings/${encodeURIComponent(slug)}`, { method: 'PUT', body: payload });
                if (result.ok) {
                    const def = SEO_PAGE_DEFS.find((d) => d.slug === slug);
                    toast(def ? `Сохранено: ${def.name}` : 'Сохранено');
                } else {
                    toast(result.error || 'Ошибка сохранения', 'error');
                }
            };
        });
    }

    /* ── PROJECTS LIST ─────────────────────────────── */
    async function renderProjects(area) {
        const data = await api('projects');
        const projects = data.projects || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Проекты</div><div class="section-subtitle">${projects.length} проектов</div></div>
                <button class="btn btn-primary" data-nav="#project/new">+ Добавить проект</button>
            </div>
            <div class="table-card"><table><thead><tr><th>Название</th><th>Slug</th><th>Опубликован</th><th>Дата</th><th></th></tr></thead><tbody>
            ${projects.map(p => `<tr>
                <td>${esc(p.title_ru || p.slug)}</td>
                <td class="text-muted">${esc(p.slug)}</td>
                <td>${p.is_published ? '<span class="badge badge-accepted">Да</span>' : '<span class="badge badge-rejected">Нет</span>'}</td>
                <td>${formatDate(p.created_at)}</td>
                <td><a href="#project/${p.id}" class="btn btn-sm btn-secondary">Редактировать</a></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    }

    /* ── PROJECT EDITOR ────────────────────────────── */
    async function renderProjectEditor(area, id) {
        let project = { slug: '', is_published: 1, cover_image: '', deadline_text: '', duration_text: '' };
        let localesByLang = {};
        let reviews = [];
        let clientsList = [];
        const isNew = id === 'new';

        if (!isNew) {
            const [projData, revData, clData] = await Promise.all([
                api(`projects/${id}`),
                api(`projects/${id}/reviews`),
                api('clients')
            ]);
            project = projData.project || project;
            (projData.locales || []).forEach(l => { localesByLang[l.lang] = l; });
            reviews = revData.reviews || [];
            clientsList = clData.clients || [];
        }

        let coverUrl = project.cover_image || '';
        const galleryUrls = {};
        const stackSelections = {};
        LANGS.forEach(l => {
            const loc = localesByLang[l.code] || {};
            try { galleryUrls[l.code] = JSON.parse(loc.gallery_json || '[]'); } catch(e) { galleryUrls[l.code] = []; }
        });
        STACK_CATEGORIES.forEach(cat => {
            const loc = localesByLang['ru'] || {};
            const key = cat.key === 'front' ? 'stack_front_json' : cat.key === 'back' ? 'stack_back_json' : cat.key === 'db' ? 'stack_db_json' : cat.key === 'deploy' ? 'stack_deploy_json' : cat.key === 'android' ? 'stack_android_json' : 'stack_ios_json';
            try {
                const arr = JSON.parse(loc[key] || '[]');
                stackSelections[cat.key] = arr.map(x => typeof x === 'string' ? x : (x.id || x.name || '')).filter(Boolean);
            } catch(e) { stackSelections[cat.key] = []; }
        });

        const isPublished = !!project.is_published;

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новый проект' : 'Редактировать проект'}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#projects">Назад</button>
                    <button class="btn btn-primary" id="saveProjectBtn">Сохранить</button>
                    ${!isNew ? '<button class="btn btn-danger btn-sm" id="deleteProjectBtn">Удалить</button>' : ''}
                </div>
            </div>

            <!-- Settings -->
            <div class="card mb-24">
                <div class="form-section-title">Основные настройки</div>
                <div class="form-row">
                    <div class="form-group"><label>ЧПУ (URL)</label><input type="text" id="projSlug" value="${esc(project.slug)}" placeholder="my-project"></div>
                    <div class="form-group"><label>Публикация</label>
                        <div class="toggle-switch ${isPublished ? 'active' : ''}" id="projPublishToggle">
                            <div class="toggle-switch__track"></div>
                            <span class="toggle-switch__label">${isPublished ? 'Опубликован' : 'Черновик'}</span>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Срок выполнения</label><input type="text" id="projDuration" value="${esc(project.duration_text || '')}" placeholder="например, 4 недели"></div>
                    <div class="form-group"><label>Дедлайн / дата сдачи</label><input type="text" id="projDeadline" value="${esc(project.deadline_text || '')}" placeholder="например, до 15 мая 2026"></div>
                </div>
                <div class="form-group">
                    <label>Обложка (для предпросмотра на сайте)</label>
                    <div class="upload-dropzone" id="coverDropzone">
                        <input type="file" accept="image/*">
                        <div class="upload-dropzone__icon">📁</div>
                        <div class="upload-dropzone__text">Перетащите файл или <strong>нажмите для выбора</strong><br>до 10 МБ</div>
                    </div>
                    <div id="coverPreview">${coverUrl ? `<div class="upload-preview"><img src="${esc(coverUrl)}"><button class="upload-preview__remove" id="removeCover">&times;</button></div>` : ''}</div>
                </div>
            </div>

            <!-- Gallery -->
            <div class="card mb-24">
                <div class="form-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Галерея (карусель внутри проекта)
                </div>
                <div class="upload-dropzone" id="galleryDropzone">
                    <input type="file" accept="image/*" multiple>
                    <div class="upload-dropzone__icon">🖼️</div>
                    <div class="upload-dropzone__text">Перетащите файлы или <strong>нажмите для выбора</strong><br>до 20 фото, до 10 МБ каждое</div>
                </div>
                <div class="gallery-grid" id="galleryGrid"></div>
            </div>

            <!-- Language Tabs -->
            <div class="card mb-24">
                <div class="form-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Контент на разных языках
                </div>
                <div class="lang-tabs" id="langTabs">
                    ${LANGS.map((l, i) => `<button class="lang-tab${i === 0 ? ' active' : ''}" data-lang="${l.code}"><span>${l.flag}</span> ${l.name}</button>`).join('')}
                </div>
                ${LANGS.map((l, i) => `
                    <div class="editor-pane${i === 0 ? ' active' : ''}" data-lang-pane="${l.code}">
                        <div class="form-row">
                            <div class="form-group"><label>Название (${l.name})</label><input type="text" class="proj-title" data-lang="${l.code}" value="${esc((localesByLang[l.code] || {}).title || '')}"></div>
                        </div>
                        <div class="form-group"><label>Краткое описание (для предпросмотра)</label><input type="text" class="proj-excerpt" data-lang="${l.code}" value="${esc((localesByLang[l.code] || {}).excerpt || '')}"></div>
                        <div class="form-group"><label>Полное описание</label>
                            <div class="editor-container"><div id="projEditor-${l.code}" class="quill-editor"></div></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Client Review -->
            <div class="card mb-24">
                <div class="form-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Отзыв клиента
                </div>
                <div id="reviewsArea">
                    ${reviews.length ? reviews.map(r => `
                        <div class="review-item" data-review-id="${r.id}">
                            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                                <div class="review-logo-preview">${r.logo_url ? `<img src="${esc(r.logo_url)}">` : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}</div>
                                <div class="upload-dropzone rv-logo-drop" style="padding:8px 12px;border-radius:10px;"><input type="file" accept="image/*"><div class="upload-dropzone__text" style="font-size:11px;white-space:nowrap;">Загрузить лого</div></div>
                                <input type="hidden" class="rv-logo-url" value="${esc(r.logo_url)}">
                            </div>
                            <div class="review-fields">
                                <div class="form-row">
                                    <div class="form-group"><label>Компания</label><input type="text" class="rv-company" value="${esc(r.company_name)}" placeholder="Название компании"></div>
                                    <div class="form-group"><label>Сайт компании</label><input type="text" class="rv-website" value="${esc(r.website)}" placeholder="https://example.com"></div>
                                </div>
                                <div class="form-group"><label>Текст отзыва</label><textarea class="rv-text" rows="4" placeholder="Напишите отзыв клиента...">${esc(r.review_text)}</textarea></div>
                                <div class="form-row">
                                    <div class="form-group"><label>Рейтинг</label>
                                        <div class="star-rating">${[1,2,3,4,5].map(s => `<span class="star-rating__star ${s <= (r.rating||5) ? 'active' : ''}" data-val="${s}">★</span>`).join('')}</div>
                                        <input type="hidden" class="rv-rating" value="${r.rating||5}">
                                    </div>
                                    <div class="form-group"><label>Язык отзыва</label><select class="rv-lang">${LANGS.map(l => `<option value="${l.code}" ${l.code===r.lang?'selected':''}>${l.flag} ${l.name}</option>`).join('')}</select></div>
                                    <div class="form-group"><label>Профиль компании</label><select class="rv-client-id"><option value="">— Не привязана —</option>${clientsList.map(c => `<option value="${c.id}" ${r.client_id == c.id ? 'selected' : ''}>${esc(c.company_name || c.slug)}</option>`).join('')}</select></div>
                                </div>
                                <div class="inline-flex gap-8" style="padding-top:4px;">
                                    <button class="btn btn-sm btn-primary rv-save">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        Сохранить
                                    </button>
                                    <button class="btn btn-sm btn-danger rv-delete">Удалить</button>
                                </div>
                            </div>
                        </div>
                    `).join('') : `<div style="text-align:center;padding:32px 16px;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);opacity:.4;margin-bottom:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        <p class="text-muted" style="font-size:13px;">Отзывов пока нет. Добавьте отзыв клиента для этого проекта.</p>
                    </div>`}
                </div>
                ${!isNew ? '<button class="btn btn-secondary mt-16" id="addReviewBtn" style="width:100%;justify-content:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Добавить отзыв</button>' : '<div class="text-muted" style="font-size:13px;margin-top:12px;text-align:center;padding:12px;background:var(--bg);border-radius:10px;">Сохраните проект, чтобы добавить отзыв</div>'}
            </div>

            <!-- Tech Stack -->
            <div class="card mb-24">
                <div class="form-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Стек технологий
                </div>
                ${STACK_CATEGORIES.map(cat => `
                    <div class="stack-group">
                        <div class="stack-group__title">${cat.label}</div>
                        <div id="stack_${cat.key}"></div>
                    </div>
                `).join('')}
            </div>`;

        // Toggle switch
        const toggle = $('#projPublishToggle');
        if (toggle) toggle.onclick = () => {
            toggle.classList.toggle('active');
            toggle.querySelector('.toggle-switch__label').textContent = toggle.classList.contains('active') ? 'Опубликован' : 'Черновик';
        };

        // Cover dropzone
        const coverDz = $('#coverDropzone');
        if (coverDz) initDropzone(coverDz, {
            maxSizeMb: 10,
            onUploaded: (urls) => {
                coverUrl = urls[0];
                document.getElementById('coverPreview').innerHTML = `<div class="upload-preview"><img src="${esc(coverUrl)}"><button class="upload-preview__remove" id="removeCover">&times;</button></div>`;
                document.getElementById('removeCover').onclick = () => { coverUrl = ''; document.getElementById('coverPreview').innerHTML = ''; };
            }
        });
        const rcBtn = document.getElementById('removeCover');
        if (rcBtn) rcBtn.onclick = () => { coverUrl = ''; document.getElementById('coverPreview').innerHTML = ''; };

        // Gallery (shared across langs — stored per first lang)
        const activeGallery = galleryUrls['ru'] || [];
        renderGalleryGrid('galleryGrid', activeGallery);
        const galDz = $('#galleryDropzone');
        if (galDz) initDropzone(galDz, {
            maxSizeMb: 10,
            onUploaded: (urls) => { activeGallery.push(...urls); renderGalleryGrid('galleryGrid', activeGallery); }
        });

        // Lang tabs
        setupLangTabs();
        setupSlugSync('#projSlug', LANGS.map(l => `.proj-title[data-lang="${l.code}"]`), 120);

        // Quill editors
        setTimeout(() => {
            LANGS.forEach(l => {
                const q = initQuillWithUpload(`projEditor-${l.code}`, (localesByLang[l.code] || {}).html || '');
                if (q) quillInstances[`proj-${l.code}`] = q;
            });
        }, 100);

        // Stack selectors
        STACK_CATEGORIES.forEach(cat => {
            if (!stackSelections[cat.key]) stackSelections[cat.key] = [];
            renderStackSelector(`stack_${cat.key}`, cat.key, stackSelections[cat.key]);
        });

        // Review interactions
        $$('.review-item').forEach(item => {
            const rid = item.dataset.reviewId;
            // Star rating
            item.querySelectorAll('.star-rating__star').forEach(star => {
                star.onclick = () => {
                    const val = parseInt(star.dataset.val);
                    item.querySelector('.rv-rating').value = val;
                    item.querySelectorAll('.star-rating__star').forEach((s, i) => s.classList.toggle('active', i < val));
                };
            });
            // Logo upload
            const logoDz = item.querySelector('.rv-logo-drop');
            if (logoDz) initDropzone(logoDz, {
                maxSizeMb: 10,
                onUploaded: (urls) => {
                    item.querySelector('.rv-logo-url').value = urls[0];
                    const preview = item.querySelector('.review-logo-preview');
                    preview.innerHTML = `<img src="${esc(urls[0])}">`;
                }
            });
            // Save review
            item.querySelector('.rv-save').onclick = async () => {
                const body = {
                    company_name: item.querySelector('.rv-company').value,
                    website: item.querySelector('.rv-website').value,
                    logo_url: item.querySelector('.rv-logo-url').value,
                    review_text: item.querySelector('.rv-text').value,
                    rating: parseInt(item.querySelector('.rv-rating').value) || 5,
                    lang: item.querySelector('.rv-lang').value,
                    client_id: item.querySelector('.rv-client-id').value || null
                };
                const res = await api(`reviews/${rid}`, { method: 'PUT', body });
                if (res.ok) toast('Отзыв сохранён'); else toast(res.error || 'Ошибка', 'error');
            };
            // Delete review
            item.querySelector('.rv-delete').onclick = async () => {
                if (!confirm('Удалить отзыв?')) return;
                await api(`reviews/${rid}`, { method: 'DELETE' });
                toast('Отзыв удалён'); renderProjectEditor(area, id);
            };
        });

        // Add review
        const addRevBtn = $('#addReviewBtn');
        if (addRevBtn) addRevBtn.onclick = async () => {
            const res = await api(`projects/${id}/reviews`, { method: 'POST', body: { company_name: '', review_text: '', rating: 5, lang: 'ru' } });
            if (res.ok) { toast('Отзыв создан'); renderProjectEditor(area, id); }
        };

        // Save project
        $('#saveProjectBtn').onclick = async () => {
            const locales = {};
            LANGS.forEach(l => {
                const stackData = {};
                STACK_CATEGORIES.forEach(cat => {
                    const key = cat.key === 'front' ? 'stack_front' : cat.key === 'back' ? 'stack_back' : cat.key === 'db' ? 'stack_db' : cat.key === 'deploy' ? 'stack_deploy' : cat.key === 'android' ? 'stack_android' : 'stack_ios';
                    stackData[key] = stackSelections[cat.key] || [];
                });
                locales[l.code] = {
                    title: $(`.proj-title[data-lang="${l.code}"]`).value,
                    excerpt: $(`.proj-excerpt[data-lang="${l.code}"]`).value,
                    html: quillInstances[`proj-${l.code}`] ? quillInstances[`proj-${l.code}`].root.innerHTML : '',
                    gallery: activeGallery,
                    ...stackData
                };
            });
            const normalizedSlug = slugify($('#projSlug').value || firstFilledValue(Object.values(locales).map(v => v.title)), 120);
            if (!normalizedSlug) {
                toast('Укажите ЧПУ или название проекта', 'error');
                $('#projSlug').focus();
                return;
            }
            $('#projSlug').value = normalizedSlug;
            const body = {
                slug: normalizedSlug,
                is_published: toggle && toggle.classList.contains('active') ? 1 : 0,
                cover_image: coverUrl,
                deadline_text: $('#projDeadline') ? $('#projDeadline').value : '',
                duration_text: $('#projDuration') ? $('#projDuration').value : '',
                locales
            };
            const result = isNew ? await api('projects', { method: 'POST', body }) : await api(`projects/${id}`, { method: 'PUT', body });
            if (result.ok) {
                if (result.slug) $('#projSlug').value = result.slug;
                toast('Проект сохранён');
                if (isNew && result.id) location.hash = `#project/${result.id}`;
            }
            else toast(result.error || 'Ошибка', 'error');
        };

        // Delete project
        const delBtn = $('#deleteProjectBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить проект?')) return;
            await api(`projects/${id}`, { method: 'DELETE' });
            toast('Проект удалён'); location.hash = '#projects';
        };
    }

    /* ── ARTICLES LIST ─────────────────────────────── */
    async function renderArticles(area) {
        const data = await api('articles');
        const articles = data.articles || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Статьи</div><div class="section-subtitle">${articles.length} статей</div></div>
                <button class="btn btn-primary" data-nav="#article/new">+ Добавить статью</button>
            </div>
            <div class="table-card"><table><thead><tr><th>Название</th><th>Slug</th><th>Опубликована</th><th>Дата</th><th></th></tr></thead><tbody>
            ${articles.map(a => `<tr>
                <td>${esc(a.title_ru || a.slug)}</td>
                <td class="text-muted">${esc(a.slug)}</td>
                <td>${a.is_published ? '<span class="badge badge-accepted">Да</span>' : '<span class="badge badge-rejected">Нет</span>'}</td>
                <td>${formatDate(a.created_at)}</td>
                <td><a href="#article/${a.id}" class="btn btn-sm btn-secondary">Редактировать</a></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    }

    /* ── ARTICLE EDITOR ────────────────────────────── */
    async function renderArticleEditor(area, id) {
        let article = { slug: '', is_published: 1, cover_image: '' };
        let localesByLang = {};
        const isNew = id === 'new';

        if (!isNew) {
            const data = await api(`articles/${id}`);
            article = data.article || article;
            (data.locales || []).forEach(l => { localesByLang[l.lang] = l; });
        }

        let coverUrl = article.cover_image || '';
        const galleryUrls = {};
        LANGS.forEach(l => {
            const loc = localesByLang[l.code] || {};
            try { galleryUrls[l.code] = JSON.parse(loc.gallery_json || '[]'); } catch(e) { galleryUrls[l.code] = []; }
        });

        const isPublished = !!article.is_published;

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новая статья' : 'Редактировать статью'}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#articles">Назад</button>
                    <button class="btn btn-primary" id="saveArticleBtn">Сохранить</button>
                    ${!isNew ? '<button class="btn btn-danger btn-sm" id="deleteArticleBtn">Удалить</button>' : ''}
                </div>
            </div>

            <!-- Settings -->
            <div class="card mb-24">
                <div class="form-section-title">Основные настройки</div>
                <div class="form-row">
                    <div class="form-group"><label>ЧПУ (URL)</label><input type="text" id="artSlug" value="${esc(article.slug)}" placeholder="my-article"></div>
                    <div class="form-group"><label>Публикация</label>
                        <div class="toggle-switch ${isPublished ? 'active' : ''}" id="artPublishToggle">
                            <div class="toggle-switch__track"></div>
                            <span class="toggle-switch__label">${isPublished ? 'Опубликована' : 'Черновик'}</span>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Обложка (для предпросмотра на сайте)</label>
                    <div class="upload-dropzone" id="artCoverDropzone">
                        <input type="file" accept="image/*">
                        <div class="upload-dropzone__icon">📁</div>
                        <div class="upload-dropzone__text">Перетащите файл или <strong>нажмите для выбора</strong><br>до 12 МБ</div>
                    </div>
                    <div id="artCoverPreview">${coverUrl ? `<div class="upload-preview"><img src="${esc(coverUrl)}"><button class="upload-preview__remove" id="removeArtCover">&times;</button></div>` : ''}</div>
                </div>
            </div>

            <!-- Gallery -->
            <div class="card mb-24">
                <div class="form-section-title">Галерея (фото для статьи)</div>
                <div class="upload-dropzone" id="artGalleryDropzone">
                    <input type="file" accept="image/*" multiple>
                    <div class="upload-dropzone__icon">🖼️</div>
                    <div class="upload-dropzone__text">Перетащите файлы или <strong>нажмите для выбора</strong><br>до 20 фото, до 12 МБ каждое</div>
                </div>
                <div class="gallery-grid" id="artGalleryGrid"></div>
            </div>

            <!-- Language Tabs -->
            <div class="card mb-24">
                <div class="form-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Контент на разных языках
                </div>
                <div class="lang-tabs" id="langTabs">
                    ${LANGS.map((l, i) => `<button class="lang-tab${i === 0 ? ' active' : ''}" data-lang="${l.code}"><span>${l.flag}</span> ${l.name}</button>`).join('')}
                </div>
                ${LANGS.map((l, i) => `
                    <div class="editor-pane${i === 0 ? ' active' : ''}" data-lang-pane="${l.code}">
                        <div class="form-row">
                            <div class="form-group"><label>Название (${l.name})</label><input type="text" class="art-title" data-lang="${l.code}" value="${esc((localesByLang[l.code] || {}).title || '')}"></div>
                        </div>
                        <div class="form-group"><label>Краткое описание (для предпросмотра)</label><input type="text" class="art-excerpt" data-lang="${l.code}" value="${esc((localesByLang[l.code] || {}).excerpt || '')}"></div>
                        <div class="form-group"><label>Полный текст статьи</label>
                            <div class="editor-container"><div id="artEditor-${l.code}" class="quill-editor"></div></div>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        // Toggle switch
        const toggle = $('#artPublishToggle');
        if (toggle) toggle.onclick = () => {
            toggle.classList.toggle('active');
            toggle.querySelector('.toggle-switch__label').textContent = toggle.classList.contains('active') ? 'Опубликована' : 'Черновик';
        };

        // Cover dropzone
        const coverDz = $('#artCoverDropzone');
        if (coverDz) initDropzone(coverDz, {
            maxSizeMb: 12,
            onUploaded: (urls) => {
                coverUrl = urls[0];
                document.getElementById('artCoverPreview').innerHTML = `<div class="upload-preview"><img src="${esc(coverUrl)}"><button class="upload-preview__remove" id="removeArtCover">&times;</button></div>`;
                document.getElementById('removeArtCover').onclick = () => { coverUrl = ''; document.getElementById('artCoverPreview').innerHTML = ''; };
            }
        });
        const rcBtn = document.getElementById('removeArtCover');
        if (rcBtn) rcBtn.onclick = () => { coverUrl = ''; document.getElementById('artCoverPreview').innerHTML = ''; };

        // Gallery
        const activeGallery = galleryUrls['ru'] || [];
        renderGalleryGrid('artGalleryGrid', activeGallery);
        const galDz = $('#artGalleryDropzone');
        if (galDz) initDropzone(galDz, {
            maxSizeMb: 12,
            onUploaded: (urls) => { activeGallery.push(...urls); renderGalleryGrid('artGalleryGrid', activeGallery); }
        });

        // Lang tabs
        setupLangTabs();
        setupSlugSync('#artSlug', LANGS.map(l => `.art-title[data-lang="${l.code}"]`), 140);

        // Quill editors with image upload
        setTimeout(() => {
            LANGS.forEach(l => {
                const q = initQuillWithUpload(`artEditor-${l.code}`, (localesByLang[l.code] || {}).html || '');
                if (q) quillInstances[`art-${l.code}`] = q;
            });
        }, 100);

        // Save
        $('#saveArticleBtn').onclick = async () => {
            const locales = {};
            LANGS.forEach(l => {
                locales[l.code] = {
                    title: $(`.art-title[data-lang="${l.code}"]`).value,
                    excerpt: $(`.art-excerpt[data-lang="${l.code}"]`).value,
                    html: quillInstances[`art-${l.code}`] ? quillInstances[`art-${l.code}`].root.innerHTML : '',
                    gallery: activeGallery
                };
            });
            const normalizedSlug = slugify($('#artSlug').value || firstFilledValue(Object.values(locales).map(v => v.title)), 140);
            if (!normalizedSlug) {
                toast('Укажите ЧПУ или название статьи', 'error');
                $('#artSlug').focus();
                return;
            }
            $('#artSlug').value = normalizedSlug;
            const body = {
                slug: normalizedSlug,
                is_published: toggle && toggle.classList.contains('active') ? 1 : 0,
                cover_image: coverUrl,
                locales
            };
            const result = isNew ? await api('articles', { method: 'POST', body }) : await api(`articles/${id}`, { method: 'PUT', body });
            if (result.ok) {
                if (result.slug) $('#artSlug').value = result.slug;
                toast('Статья сохранена');
                if (isNew && result.id) location.hash = `#article/${result.id}`;
            }
            else toast(result.error || 'Ошибка', 'error');
        };

        // Delete
        const delBtn = $('#deleteArticleBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить статью?')) return;
            await api(`articles/${id}`, { method: 'DELETE' });
            toast('Статья удалена'); location.hash = '#articles';
        };
    }

    /* ── CALCULATOR PRICING ────────────────────────── */
    async function renderCalculatorPricing(area) {
        const data = await api('calculator/pricing');
        const p = data.pricing || {};
        const base = p.base_prices || {};
        const size = p.size_mult || {};
        const complex = p.complexity_mult || {};
        const dur = p.duration_mult || {};

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Калькулятор — Цены</div><div class="section-subtitle">Настройка цен для каждого направления</div></div>
                <button class="btn btn-primary" id="savePricingBtn">Сохранить</button>
            </div>
            <div class="form-section"><div class="form-section-title">Базовые цены по направлениям</div>
                <div class="pricing-grid">
                    ${Object.entries(SERVICE_NAMES).map(([k, name]) => `
                        <div class="pricing-card"><h4>${name}</h4>
                            <div class="pricing-input"><label>Базовая цена:</label><input type="number" id="bp_${k}" value="${base[k] || 0}"> ₽</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-section"><div class="form-section-title">Множители размера компании</div>
                <div class="card">
                    <div class="form-row">
                        <div class="form-group"><label>Малый бизнес</label><input type="number" step="0.1" id="sm_small" value="${size.small || 1}"></div>
                        <div class="form-group"><label>Средний бизнес</label><input type="number" step="0.1" id="sm_medium" value="${size.medium || 1.5}"></div>
                        <div class="form-group"><label>Крупный бизнес</label><input type="number" step="0.1" id="sm_large" value="${size.large || 2.5}"></div>
                    </div>
                </div>
            </div>
            <div class="form-section"><div class="form-section-title">Множители сложности</div>
                <div class="card">
                    <div class="form-row">
                        <div class="form-group"><label>Базовый</label><input type="number" step="0.1" id="cm_basic" value="${complex.basic || 1}"></div>
                        <div class="form-group"><label>Стандарт</label><input type="number" step="0.1" id="cm_standard" value="${complex.standard || 1.8}"></div>
                        <div class="form-group"><label>Премиум</label><input type="number" step="0.1" id="cm_premium" value="${complex.premium || 3}"></div>
                    </div>
                </div>
            </div>
            <div class="form-section"><div class="form-section-title">Множители срока</div>
                <div class="card">
                    <div class="form-row">
                        <div class="form-group"><label>1–3 месяца</label><input type="number" step="0.1" id="dm_short" value="${dur.short || 1}"></div>
                        <div class="form-group"><label>3–6 месяцев</label><input type="number" step="0.1" id="dm_medium" value="${dur.medium || 0.9}"></div>
                        <div class="form-group"><label>6–12 месяцев</label><input type="number" step="0.1" id="dm_long" value="${dur.long || 0.8}"></div>
                    </div>
                </div>
            </div>`;

        $('#savePricingBtn').onclick = async () => {
            const pricing = {
                base_prices: {},
                size_mult: { small: parseFloat($('#sm_small').value), medium: parseFloat($('#sm_medium').value), large: parseFloat($('#sm_large').value) },
                complexity_mult: { basic: parseFloat($('#cm_basic').value), standard: parseFloat($('#cm_standard').value), premium: parseFloat($('#cm_premium').value) },
                duration_mult: { short: parseFloat($('#dm_short').value), medium: parseFloat($('#dm_medium').value), long: parseFloat($('#dm_long').value) },
                it_criteria: p.it_criteria || []
            };
            Object.keys(SERVICE_NAMES).forEach(k => { pricing.base_prices[k] = parseInt($(`#bp_${k}`).value) || 0; });
            const result = await api('calculator/pricing', { method: 'PUT', body: { pricing } });
            if (result.ok) toast('Цены сохранены'); else toast(result.error || 'Ошибка', 'error');
        };
    }

    /* ── LEADS ─────────────────────────────────────── */
    let leadsPage = 1;
    let leadsFilter = '';
    let leadsSearch = '';

    async function renderLeads(area) {
        const params = new URLSearchParams({ page: leadsPage, limit: 20 });
        if (leadsFilter) params.set('status', leadsFilter);
        if (leadsSearch) params.set('search', leadsSearch);
        const data = await api(`leads?${params}`);
        const leads = data.leads || [];
        const total = data.total || 0;
        const pages = Math.ceil(total / 20);

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Клиенты (Лиды)</div><div class="section-subtitle">${total} заявок</div></div>
            </div>
            <div class="table-card">
                <div class="table-header">
                    <div class="table-title">Все заявки</div>
                    <div class="table-actions">
                        <input type="text" class="table-search" id="leadsSearchInput" placeholder="Поиск..." value="${esc(leadsSearch)}">
                    </div>
                </div>
                <div class="table-filters">
                    <button class="filter-btn ${!leadsFilter ? 'active' : ''}" data-filter="">Все</button>
                    <button class="filter-btn ${leadsFilter === 'new' ? 'active' : ''}" data-filter="new">Новые</button>
                    <button class="filter-btn ${leadsFilter === 'processing' ? 'active' : ''}" data-filter="processing">В обработке</button>
                    <button class="filter-btn ${leadsFilter === 'accepted' ? 'active' : ''}" data-filter="accepted">Принятые</button>
                    <button class="filter-btn ${leadsFilter === 'rejected' ? 'active' : ''}" data-filter="rejected">Отклонённые</button>
                    <button class="filter-btn ${leadsFilter === 'completed' ? 'active' : ''}" data-filter="completed">Завершённые</button>
                </div>
                <table><thead><tr><th>Имя</th><th>Email</th><th>Телефон</th><th>Направление</th><th>Статус</th><th>Дата</th><th></th></tr></thead><tbody>
                ${leads.length ? leads.map(l => `<tr>
                    <td><strong>${esc(l.name)}</strong></td>
                    <td>${esc(l.email)}</td>
                    <td>${esc(l.phone || '—')}</td>
                    <td>${esc(SERVICE_NAMES[l.service] || l.service || '—')}</td>
                    <td><span class="badge badge-${l.status}">${STATUS_LABELS[l.status] || l.status}</span></td>
                    <td>${formatDateTime(l.created_at)}</td>
                    <td><a href="#lead/${l.id}" class="btn btn-sm btn-secondary">Подробнее</a></td>
                </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">Нет заявок</td></tr>'}
                </tbody></table>
                ${pages > 1 ? `<div class="pagination">
                    <button class="page-btn" ${leadsPage <= 1 ? 'disabled' : ''} data-page="${leadsPage - 1}">&lt;</button>
                    ${(()=>{ const s=Math.max(1,leadsPage-4),e=Math.min(pages,s+9); return Array.from({length:e-s+1},(_,i)=>s+i).map(p=>`<button class="page-btn ${p===leadsPage?'active':''}" data-page="${p}">${p}</button>`).join(''); })()}
                    <button class="page-btn" ${leadsPage >= pages ? 'disabled' : ''} data-page="${leadsPage + 1}">&gt;</button>
                </div>` : ''}
            </div>`;

        // Filters
        $$('.filter-btn').forEach(btn => {
            btn.onclick = () => { leadsFilter = btn.dataset.filter; leadsPage = 1; renderLeads(area); };
        });
        // Search
        let searchTimer;
        $('#leadsSearchInput').oninput = (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => { leadsSearch = e.target.value; leadsPage = 1; renderLeads(area); }, 400);
        };
        // Pagination
        $$('.page-btn').forEach(btn => {
            btn.onclick = () => { if (!btn.disabled) { leadsPage = parseInt(btn.dataset.page); renderLeads(area); } };
        });
    }

    /* ── LEAD DETAIL ───────────────────────────────── */
    const PIPELINE_STAGES = ['new', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
    const STAGE_LABELS = { new: 'Новый', qualification: 'Квалификация', proposal: 'КП', negotiation: 'Переговоры', won: 'Выигран', lost: 'Проигран' };

    async function renderLeadDetail(area, id) {
        const data = await api(`leads/${id}`);
        const l = data.lead;
        if (!l) { area.innerHTML = '<p>Заявка не найдена</p>'; return; }

        const commentsData = await api(`comments?entity_type=lead&entity_id=${id}`);
        const comments = commentsData.comments || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Заявка #${l.id}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#leads">Назад</button>
                    ${l.phone ? `<a href="tel:${esc(l.phone)}" class="btn btn-success">Позвонить</a>` : ''}
                </div>
            </div>
            <div class="detail-panel">
                <div class="detail-grid">
                    <div class="detail-field"><label>Имя</label><div class="value">${esc(l.name)}</div></div>
                    <div class="detail-field"><label>Email</label><div class="value">${esc(l.email)}</div></div>
                    <div class="detail-field"><label>Телефон</label><div class="value">${esc(l.phone || '—')}</div></div>
                    <div class="detail-field"><label>Компания</label><div class="value">${esc(l.company || '—')}</div></div>
                    <div class="detail-field"><label>Направление</label><div class="value">${esc(SERVICE_NAMES[l.service] || l.service || '—')}</div></div>
                    <div class="detail-field"><label>Размер компании</label><div class="value">${esc(l.company_size || '—')}</div></div>
                    <div class="detail-field"><label>Пакет</label><div class="value">${esc(l.complexity || '—')}</div></div>
                    <div class="detail-field"><label>Срок</label><div class="value">${esc(l.duration || '—')}</div></div>
                    <div class="detail-field"><label>Оценка</label><div class="value">${l.estimated_price ? formatMoney(l.estimated_price) : '—'}</div></div>
                    <div class="detail-field"><label>Источник</label><div class="value">${l.source === 'calculator' ? 'Калькулятор' : 'Форма контакта'}</div></div>
                    <div class="detail-field"><label>Дата</label><div class="value">${formatDateTime(l.created_at)}</div></div>
                    <div class="detail-field"><label>Статус</label>
                        <select id="leadStatus" class="form-group" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:10px;">
                            ${['new', 'processing', 'accepted', 'rejected', 'completed'].map(s => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <!-- Pipeline Stage -->
                <div class="card mt-16" style="background:var(--bg);padding:16px;">
                    <label style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:block;">Этап воронки</label>
                    <div class="pipeline-stages-bar">
                        ${PIPELINE_STAGES.map(s => `<button class="stage-chip ${(l.stage || 'new') === s ? 'active' : ''}" data-stage="${s}">${STAGE_LABELS[s]}</button>`).join('')}
                    </div>
                </div>
                <!-- UTM -->
                ${(l.utm_source || l.utm_medium || l.utm_campaign) ? `
                <div class="card mt-16" style="background:var(--bg);padding:16px;">
                    <label style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:block;">UTM-метки</label>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;">
                        ${l.utm_source ? `<span><strong>source:</strong> ${esc(l.utm_source)}</span>` : ''}
                        ${l.utm_medium ? `<span><strong>medium:</strong> ${esc(l.utm_medium)}</span>` : ''}
                        ${l.utm_campaign ? `<span><strong>campaign:</strong> ${esc(l.utm_campaign)}</span>` : ''}
                        ${l.utm_content ? `<span><strong>content:</strong> ${esc(l.utm_content)}</span>` : ''}
                        ${l.utm_term ? `<span><strong>term:</strong> ${esc(l.utm_term)}</span>` : ''}
                    </div>
                </div>` : ''}
                ${l.message ? `<div class="mt-16"><label style="font-size:12px;color:var(--text-muted)">Сообщение</label><div class="card mt-8" style="background:var(--bg);padding:16px;font-size:14px;white-space:pre-wrap;">${esc(l.message)}</div></div>` : ''}
                <div class="form-group mt-16"><label>Заметки</label><textarea id="leadNotes" rows="3">${esc(l.notes || '')}</textarea></div>
                <div class="detail-actions">
                    <button class="btn btn-primary" id="saveLeadBtn">Сохранить</button>
                    ${currentUser && currentUser.role === 'admin' ? `<button class="btn btn-danger btn-sm" id="deleteLeadBtn">Удалить</button>` : ''}
                    <button class="btn btn-success" id="createOrderFromLead">Создать заказ</button>
                </div>
            </div>

            <!-- Comments -->
            <div class="card mt-24">
                <div class="card-header"><div class="card-title">Комментарии</div></div>
                <div id="commentsList">
                    ${comments.map(c => `<div class="comment-item">
                        <div class="comment-header"><strong>${esc(c.user_name || 'Пользователь')}</strong><span class="text-muted" style="font-size:12px;margin-left:8px;">${formatDateTime(c.created_at)}</span></div>
                        <div class="comment-text">${esc(c.text)}</div>
                    </div>`).join('') || '<div class="text-muted" style="padding:12px;text-align:center;">Нет комментариев</div>'}
                </div>
                <div class="mt-16" style="display:flex;gap:8px;">
                    <textarea id="commentText" rows="2" style="flex:1;" placeholder="Написать комментарий..."></textarea>
                    <button class="btn btn-primary btn-sm" id="addCommentBtn" style="align-self:flex-end;">Отправить</button>
                </div>
            </div>`;

        // Pipeline stages click
        $$('.stage-chip').forEach(btn => {
            btn.onclick = async () => {
                const newStage = btn.dataset.stage;
                const result = await api(`leads/${id}/stage`, { method: 'PUT', body: { stage: newStage } });
                if (result.ok) { toast('Этап изменён'); renderLeadDetail(area, id); }
                else toast(result.error || 'Ошибка', 'error');
            };
        });
        // Add comment
        $('#addCommentBtn').onclick = async () => {
            const text = $('#commentText').value.trim();
            if (!text) return;
            await api('comments', { method: 'POST', body: { entity_type: 'lead', entity_id: parseInt(id), text } });
            toast('Комментарий добавлен'); renderLeadDetail(area, id);
        };

        $('#saveLeadBtn').onclick = async () => {
            const result = await api(`leads/${id}`, { method: 'PUT', body: { status: $('#leadStatus').value, notes: $('#leadNotes').value } });
            if (result.ok) toast('Сохранено'); else toast(result.error || 'Ошибка', 'error');
        };
        const delBtn = $('#deleteLeadBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить заявку?')) return;
            await api(`leads/${id}`, { method: 'DELETE' });
            toast('Удалено'); location.hash = '#leads';
        };
        $('#createOrderFromLead').onclick = () => {
            location.hash = `#order/new?lead_id=${l.id}&name=${encodeURIComponent(l.name)}&email=${encodeURIComponent(l.email)}&phone=${encodeURIComponent(l.phone || '')}&service=${encodeURIComponent(l.service || '')}&price=${l.estimated_price || 0}&source=${encodeURIComponent(l.source || '')}`;
        };
    }

    /* ── ORDERS ────────────────────────────────────── */
    async function renderOrders(area) {
        const data = await api('orders');
        const orders = data.orders || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Заказы</div><div class="section-subtitle">${orders.length} заказов</div></div>
                <button class="btn btn-primary" data-nav="#order/new">+ Новый заказ</button>
            </div>
            <div class="table-card"><table><thead><tr><th>ID</th><th>Клиент</th><th>Направление</th><th>Стоимость</th><th>Статус</th><th>Дедлайн</th><th></th></tr></thead><tbody>
            ${orders.length ? orders.map(o => `<tr>
                <td>#${o.id}</td>
                <td><strong>${esc(o.client_name)}</strong><br><span class="text-muted">${esc(o.client_email)}</span></td>
                <td>${esc(SERVICE_NAMES[o.service] || o.service || '—')}</td>
                <td>${formatMoney(o.total_price)}</td>
                <td><span class="badge badge-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
                <td>${formatDate(o.deadline)}</td>
                <td><a href="#order/${o.id}" class="btn btn-sm btn-secondary">Открыть</a></td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">Нет заказов</td></tr>'}
            </tbody></table></div>`;
    }

    /* ── ORDER EDITOR ──────────────────────────────── */
    async function renderOrderEditor(area, id) {
        let order = { client_name: '', client_email: '', client_phone: '', service: '', description: '', status: 'new', total_price: 0, source: '', source_detail: '', deadline: '', notes: '' };
        const isNew = id.startsWith('new');

        // Parse params from lead creation
        if (isNew) {
            const urlParams = new URLSearchParams(id.replace('new?', '').replace('new', ''));
            if (urlParams.get('name')) order.client_name = urlParams.get('name');
            if (urlParams.get('email')) order.client_email = urlParams.get('email');
            if (urlParams.get('phone')) order.client_phone = urlParams.get('phone');
            if (urlParams.get('service')) order.service = urlParams.get('service');
            if (urlParams.get('price')) order.total_price = urlParams.get('price');
            if (urlParams.get('source')) order.source = urlParams.get('source');
            if (urlParams.get('lead_id')) order.lead_id = urlParams.get('lead_id');
        } else {
            const data = await api(`orders/${id}`);
            order = data.order || order;
        }

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новый заказ' : `Заказ #${order.id}`}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#orders">Назад</button>
                    <button class="btn btn-primary" id="saveOrderBtn">Сохранить</button>
                    ${!isNew && currentUser && currentUser.role === 'admin' ? '<button class="btn btn-danger btn-sm" id="deleteOrderBtn">Удалить</button>' : ''}
                </div>
            </div>
            <div class="card">
                <div class="form-row">
                    <div class="form-group"><label>Имя клиента</label><input type="text" id="ordName" value="${esc(order.client_name)}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="ordEmail" value="${esc(order.client_email)}"></div>
                    <div class="form-group"><label>Телефон</label><input type="tel" id="ordPhone" value="${esc(order.client_phone)}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Направление</label>
                        <select id="ordService">
                            <option value="">— Выбрать —</option>
                            ${Object.entries(SERVICE_NAMES).map(([k, v]) => `<option value="${k}" ${order.service === k ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Стоимость (₽)</label><input type="number" id="ordPrice" value="${order.total_price || 0}"></div>
                    <div class="form-group"><label>Статус</label>
                        <select id="ordStatus">
                            ${['new', 'in_progress', 'completed', 'cancelled', 'on_hold'].map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Источник</label><input type="text" id="ordSource" value="${esc(order.source)}" placeholder="calculator, сайт, реклама..."></div>
                    <div class="form-group"><label>Подробнее об источнике</label><input type="text" id="ordSourceDetail" value="${esc(order.source_detail)}"></div>
                    <div class="form-group"><label>Дедлайн</label><input type="date" id="ordDeadline" value="${order.deadline ? new Date(order.deadline).toISOString().slice(0, 10) : ''}"></div>
                </div>
                <div class="form-group"><label>Описание</label><textarea id="ordDesc" rows="4">${esc(order.description || '')}</textarea></div>
                <div class="form-group"><label>Заметки</label><textarea id="ordNotes" rows="3">${esc(order.notes || '')}</textarea></div>
            </div>`;

        $('#saveOrderBtn').onclick = async () => {
            const body = {
                lead_id: order.lead_id || null, client_name: $('#ordName').value, client_email: $('#ordEmail').value,
                client_phone: $('#ordPhone').value, service: $('#ordService').value, description: $('#ordDesc').value,
                status: $('#ordStatus').value, total_price: parseFloat($('#ordPrice').value) || 0,
                source: $('#ordSource').value, source_detail: $('#ordSourceDetail').value,
                deadline: $('#ordDeadline').value || null, notes: $('#ordNotes').value
            };
            const result = isNew ? await api('orders', { method: 'POST', body }) : await api(`orders/${order.id}`, { method: 'PUT', body });
            if (result.ok) { toast('Заказ сохранён'); if (isNew && result.id) location.hash = `#order/${result.id}`; }
            else toast(result.error || 'Ошибка', 'error');
        };

        const delBtn = $('#deleteOrderBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить заказ?')) return;
            await api(`orders/${order.id}`, { method: 'DELETE' });
            toast('Удалено'); location.hash = '#orders';
        };
    }

    /* ── USERS ─────────────────────────────────────── */
    async function renderUsers(area) {
        if (currentUser && currentUser.role !== 'admin') {
            area.innerHTML = '<div class="empty-state"><p>Доступ только для администратора</p></div>';
            return;
        }
        const data = await api('users');
        const users = data.users || [];
        const roleLabels = { admin: 'Админ', manager: 'Менеджер', director: 'Руководитель' };

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Пользователи</div></div>
                <button class="btn btn-primary" id="addUserBtn">+ Добавить</button>
            </div>
            <div class="table-card"><table><thead><tr><th>Логин</th><th>Имя</th><th>Роль</th><th>Активен</th><th>Последний вход</th><th></th></tr></thead><tbody>
            ${users.map(u => `<tr>
                <td><strong>${esc(u.username)}</strong></td><td>${esc(u.display_name)}</td>
                <td><span class="badge badge-${u.role === 'admin' ? 'accepted' : 'processing'}">${roleLabels[u.role] || u.role}</span></td>
                <td>${u.is_active ? 'Да' : 'Нет'}</td>
                <td>${formatDateTime(u.last_login)}</td>
                <td><button class="btn btn-sm btn-secondary" data-edit-user="${u.id}">Изменить</button></td>
            </tr>`).join('')}
            </tbody></table></div>
            <div id="userFormArea"></div>`;

        $('#addUserBtn').onclick = () => showUserForm(null);
        $$('[data-edit-user]').forEach(btn => {
            btn.onclick = () => {
                const u = users.find(x => x.id === parseInt(btn.dataset.editUser));
                if (u) showUserForm(u);
            };
        });
    }

    function showUserForm(user) {
        const formArea = $('#userFormArea');
        const isEdit = !!user;
        formArea.innerHTML = `
            <div class="card mt-24">
                <div class="card-header"><div class="card-title">${isEdit ? 'Редактировать пользователя' : 'Новый пользователь'}</div></div>
                <div class="form-row">
                    <div class="form-group"><label>Логин</label><input type="text" id="uUsername" value="${esc(user ? user.username : '')}" ${isEdit ? 'readonly' : ''}></div>
                    <div class="form-group"><label>Имя</label><input type="text" id="uDisplayName" value="${esc(user ? user.display_name : '')}"></div>
                    <div class="form-group"><label>Роль</label>
                        <select id="uRole">
                            <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Админ</option>
                            <option value="manager" ${!user || user.role === 'manager' ? 'selected' : ''}>Менеджер</option>
                            <option value="director" ${user && user.role === 'director' ? 'selected' : ''}>Руководитель</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>${isEdit ? 'Новый пароль (необязательно)' : 'Пароль'}</label><input type="password" id="uPassword" placeholder="Мин. 6 символов"></div>
                    ${isEdit ? `<div class="form-group"><label>Активен</label><select id="uActive"><option value="1" ${user.is_active ? 'selected' : ''}>Да</option><option value="0" ${!user.is_active ? 'selected' : ''}>Нет</option></select></div>` : ''}
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="saveUserBtn">Сохранить</button>
                    <button class="btn btn-secondary" data-clear="userFormArea">Отмена</button>
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteUserBtn">Удалить</button>` : ''}
                </div>
            </div>`;

        $('#saveUserBtn').onclick = async () => {
            const body = { display_name: $('#uDisplayName').value, role: $('#uRole').value };
            const passwordVal = $('#uPassword').value;
            if (passwordVal) body.password = passwordVal;
            if (isEdit) {
                body.is_active = $('#uActive') ? $('#uActive').value === '1' : true;
                const result = await api(`users/${user.id}`, { method: 'PUT', body });
                if (result.ok) { toast('Сохранено'); navigate('#users'); } else toast(result.error || 'Ошибка', 'error');
            } else {
                body.username = $('#uUsername').value;
                body.password = passwordVal;
                const result = await api('users', { method: 'POST', body });
                if (result.ok) { toast('Пользователь создан'); navigate('#users'); } else toast(result.error || 'Ошибка', 'error');
            }
        };
        const delBtn = $('#deleteUserBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить пользователя?')) return;
            await api(`users/${user.id}`, { method: 'DELETE' });
            toast('Удалено'); navigate('#users');
        };
    }

    /* ── CLIENT COMPANIES ───────────────────────────── */
    async function renderClients(area) {
        const data = await api('clients');
        const clients = data.clients || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Компании</div><div class="section-subtitle">${clients.length} компаний</div></div>
                <button class="btn btn-primary" data-nav="#client/new">+ Новая компания</button>
            </div>
            <div class="table-card"><table><thead><tr><th>Лого</th><th>Название</th><th>Slug</th><th>Город / Страна</th><th>Сайт</th><th></th></tr></thead><tbody>
            ${clients.length ? clients.map(c => `<tr>
                <td>${c.logo_url ? `<img src="${esc(c.logo_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;">` : '—'}</td>
                <td><strong>${esc(c.company_name || c.slug)}</strong></td>
                <td class="text-muted">${esc(c.slug)}</td>
                <td>${esc([c.city, c.country].filter(Boolean).join(', ') || '—')}</td>
                <td>${c.website ? `<a href="${esc(c.website)}" target="_blank" class="text-muted" style="font-size:12px;">${esc(c.website)}</a>` : '—'}</td>
                <td><a href="#client/${c.id}" class="btn btn-sm btn-secondary">Изменить</a></td>
            </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;">Нет компаний</td></tr>'}
            </tbody></table></div>`;
    }

    async function renderClientEditor(area, id) {
        let client = { slug: '', company_name: '', logo_url: '', website: '', description: '', address: '', city: '', country: '', show_map: true };
        const isNew = id === 'new';

        if (!isNew) {
            const data = await api(`clients/${id}`);
            client = data.client || client;
        }

        let logoUrl = client.logo_url || '';

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новая компания' : esc(client.company_name || client.slug)}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#clients">Назад</button>
                    <button class="btn btn-primary" id="saveClientBtn">Сохранить</button>
                    ${!isNew ? '<button class="btn btn-danger btn-sm" id="deleteClientBtn">Удалить</button>' : ''}
                </div>
            </div>
            <div class="card mb-24">
                <div class="form-row">
                    <div class="form-group"><label>Название компании</label><input type="text" id="clCompany" value="${esc(client.company_name)}"></div>
                    <div class="form-group"><label>Slug (URL)</label><input type="text" id="clSlug" value="${esc(client.slug)}" placeholder="boostmarine"></div>
                </div>
                <div class="form-row" style="align-items:flex-start;">
                    <div class="form-group" style="flex:0 0 auto;">
                        <label>Логотип</label>
                        <div id="clientLogoPreview" class="review-logo-preview" style="margin-bottom:8px;">${logoUrl ? `<img src="${esc(logoUrl)}">` : ''}</div>
                        <div class="upload-dropzone" id="clientLogoDz" style="padding:8px 12px;border-radius:10px;"><input type="file" accept="image/*"><div class="upload-dropzone__text" style="font-size:11px;">Загрузить лого</div></div>
                    </div>
                    <div class="form-group" style="flex:1;"><label>Сайт компании</label><input type="text" id="clWebsite" value="${esc(client.website)}" placeholder="https://example.com"></div>
                </div>
                <div class="form-group">
                    <label>Описание компании <span class="text-muted" style="font-weight:400;font-size:12px;">(форматируемый текст)</span></label>
                    <div id="clDescEditor" style="min-height:200px;"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Адрес</label><input type="text" id="clAddress" value="${esc(client.address || '')}"></div>
                    <div class="form-group"><label>Город</label><input type="text" id="clCity" value="${esc(client.city || '')}"></div>
                    <div class="form-group"><label>Страна</label><input type="text" id="clCountry" value="${esc(client.country || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Карта на странице компании</label>
                        <div class="toggle-switch ${client.show_map !== false ? 'active' : ''}" id="clMapToggle">
                            <div class="toggle-switch__track"></div>
                            <span class="toggle-switch__label">${client.show_map !== false ? 'Показывать карту' : 'Скрыть карту'}</span>
                        </div>
                    </div>
                </div>
            </div>`;

        // Initialize Quill editor for description
        let descQuill = null;
        setTimeout(() => {
            descQuill = initQuillWithUpload('clDescEditor', client.description || '');
        }, 80);

        // Logo upload
        const logoDz = document.getElementById('clientLogoDz');
        if (logoDz) initDropzone(logoDz, {
            maxSizeMb: 10,
            onUploaded: (urls) => {
                logoUrl = urls[0];
                document.getElementById('clientLogoPreview').innerHTML = `<img src="${esc(logoUrl)}">`;
            }
        });

        // Slug auto-gen
        const clCompany = document.getElementById('clCompany');
        const clSlug = document.getElementById('clSlug');
        if (clCompany && clSlug && isNew) {
            clCompany.addEventListener('input', () => {
                if (!clSlug.dataset.manual) clSlug.value = slugify(clCompany.value, 60);
            });
            clSlug.addEventListener('input', () => { clSlug.dataset.manual = '1'; });
        }
        const mapToggle = document.getElementById('clMapToggle');
        if (mapToggle) mapToggle.onclick = () => {
            mapToggle.classList.toggle('active');
            const label = mapToggle.querySelector('.toggle-switch__label');
            if (label) label.textContent = mapToggle.classList.contains('active') ? 'Показывать карту' : 'Скрыть карту';
        };

        // Save
        document.getElementById('saveClientBtn').onclick = async () => {
            const descHtml = descQuill ? descQuill.root.innerHTML : '';
            const body = {
                slug: clSlug.value.trim(),
                company_name: clCompany.value.trim(),
                logo_url: logoUrl,
                website: document.getElementById('clWebsite').value.trim(),
                description: descHtml,
                address: document.getElementById('clAddress').value.trim(),
                city: document.getElementById('clCity').value.trim(),
                country: document.getElementById('clCountry').value.trim(),
                show_map: !!(mapToggle && mapToggle.classList.contains('active'))
            };
            if (!body.slug) { toast('Укажите slug', 'error'); return; }
            const result = isNew
                ? await api('clients', { method: 'POST', body })
                : await api(`clients/${client.id}`, { method: 'PUT', body });
            if (result.ok) {
                toast('Компания сохранена');
                if (isNew && result.id) location.hash = `#client/${result.id}`;
            } else toast(result.error || 'Ошибка', 'error');
        };

        // Delete
        const delBtn = document.getElementById('deleteClientBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить компанию?')) return;
            await api(`clients/${client.id}`, { method: 'DELETE' });
            toast('Компания удалена'); location.hash = '#clients';
        };
    }

    /* ── SETTINGS ──────────────────────────────────── */
    async function renderSettings(area) {
        const data = await api('settings');
        const s = data.settings || {};
        // Get 2FA status
        const meData = await api('me');
        const me = meData.user || {};

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Настройки</div></div>
                <button class="btn btn-primary" id="saveSettingsBtn">Сохранить</button>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Профиль</div></div>
                <div class="form-row">
                    <div class="form-group"><label>Текущий пароль</label><input type="password" id="currentPassword"></div>
                    <div class="form-group"><label>Новый пароль</label><input type="password" id="newPassword" placeholder="Мин. 6 символов"></div>
                    <div class="form-group" style="align-self:end"><button class="btn btn-secondary" id="changePassBtn">Сменить пароль</button></div>
                </div>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Двухфакторная аутентификация (2FA)</div></div>
                <div id="twoFaArea">
                    ${me.totp_enabled ? `
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--success);color:#fff;font-size:20px;">&#10003;</span>
                            <div>
                                <p style="color:var(--success);font-weight:600;font-size:16px;margin:0;">2FA включена</p>
                                <p class="text-muted" style="font-size:13px;margin:4px 0 0;">Google Authenticator подключён</p>
                            </div>
                        </div>
                        <div style="background:var(--bg);border-radius:8px;padding:16px;border:1px solid var(--border);">
                            <p style="font-size:14px;margin-bottom:12px;font-weight:500;">Отключение 2FA</p>
                            <p class="text-muted" style="font-size:13px;margin-bottom:12px;">Введите код из Google Authenticator для подтверждения отключения.</p>
                            <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">
                                <div class="form-group" style="margin:0;flex:0 0 200px;">
                                    <label>Код из приложения</label>
                                    <input type="text" id="disable2faCode" maxlength="6" placeholder="000 000" style="text-align:center;font-size:18px;letter-spacing:4px;font-weight:600;">
                                </div>
                                <button class="btn btn-danger btn-sm" id="disable2faBtn">Отключить 2FA</button>
                            </div>
                        </div>
                    ` : `
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--border);color:var(--text-secondary);font-size:20px;">&#128274;</span>
                            <div>
                                <p style="font-weight:600;font-size:16px;margin:0;">2FA не подключена</p>
                                <p class="text-muted" style="font-size:13px;margin:4px 0 0;">Подключите Google Authenticator для усиления безопасности входа</p>
                            </div>
                        </div>
                        <button class="btn btn-primary" id="setup2faBtn">
                            <span style="margin-right:6px;">&#128272;</span> Подключить Google Authenticator
                        </button>
                        <div id="setup2faArea" style="display:none;margin-top:20px;">
                            <div style="background:var(--bg);border-radius:12px;padding:24px;border:1px solid var(--border);">
                                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                                    <div style="flex:0 0 auto;text-align:center;">
                                        <p style="font-weight:600;margin-bottom:12px;">1. Отсканируйте QR-код</p>
                                        <div id="qrCodeCanvas" style="background:#fff;padding:12px;border-radius:8px;display:inline-block;border:1px solid var(--border);"></div>
                                    </div>
                                    <div style="flex:1;min-width:250px;">
                                        <p style="font-weight:600;margin-bottom:8px;">Или введите ключ вручную:</p>
                                        <div style="position:relative;margin-bottom:16px;">
                                            <code id="totpSecret" style="display:block;font-size:13px;font-weight:600;user-select:all;background:var(--card-bg);padding:10px 40px 10px 12px;border-radius:6px;border:1px solid var(--border);word-break:break-all;letter-spacing:1px;"></code>
                                            <button id="copySecretBtn" type="button" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:6px;" title="Копировать">&#128203;</button>
                                        </div>
                                        <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px;">
                                            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Аккаунт:</p>
                                            <p style="font-weight:500;font-size:14px;" id="totpAccountName"></p>
                                        </div>
                                        <p style="font-weight:600;margin-bottom:8px;">2. Введите 6-значный код из приложения:</p>
                                        <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">
                                            <div class="form-group" style="margin:0;flex:0 0 200px;">
                                                <input type="text" id="enable2faCode" maxlength="6" placeholder="000 000" style="text-align:center;font-size:20px;letter-spacing:6px;font-weight:700;" autocomplete="one-time-code">
                                            </div>
                                            <button class="btn btn-primary" id="enable2faBtn">Подтвердить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Контактные данные сайта</div></div>
                <div class="form-row">
                    <div class="form-group"><label>Телефон</label><input type="text" id="s_site_phone" value="${esc(s.site_phone || '')}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="s_site_email" value="${esc(s.site_email || '')}"></div>
                    <div class="form-group"><label>Адрес</label><input type="text" id="s_site_address" value="${esc(s.site_address || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>WhatsApp</label><input type="text" id="s_site_whatsapp" value="${esc(s.site_whatsapp || '')}"></div>
                    <div class="form-group"><label>Telegram</label><input type="text" id="s_site_telegram" value="${esc(s.site_telegram || '')}"></div>
                </div>
                <div class="form-group"><label>Бегущая строка (Marquee)</label><textarea id="s_site_marquee_text" rows="2">${esc(s.site_marquee_text || '')}</textarea></div>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Яндекс Метрика & Вебмастер</div></div>
                <div class="form-row">
                    <div class="form-group"><label>ID счётчика Метрики</label><input type="text" id="s_ym_counter_id" value="${esc(s.ym_counter_id || '')}" placeholder="12345678"></div>
                    <div class="form-group"><label>OAuth токен</label><input type="text" id="s_ym_oauth_token" value="${esc(s.ym_oauth_token || '')}" placeholder="Токен для API Метрики и Вебмастера"></div>
                    <div class="form-group"><label>Host ID (Вебмастер)</label><input type="text" id="s_webmaster_host_id" value="${esc(s.webmaster_host_id || '')}" placeholder="https:agile-business-pro.com:443"></div>
                </div>
                <p class="text-muted mt-8" style="font-size:12px;">Получите OAuth-токен на <a href="https://oauth.yandex.ru/" target="_blank">oauth.yandex.ru</a> (создайте приложение, укажите права на Метрику и Вебмастер).</p>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Telegram бот</div></div>
                <div class="form-row">
                    <div class="form-group"><label>Bot Token</label><input type="text" id="s_tg_bot_token" value="${esc(s.tg_bot_token || '')}" placeholder="123456789:AA..."></div>
                    <div class="form-group"><label>Chat IDs</label><input type="text" id="s_tg_chat_id" value="${esc(s.tg_chat_id || '')}" placeholder="123456789 или -100..."></div>
                </div>
                <p class="text-muted mt-8" style="font-size:12px;line-height:1.5;">Ваш числовой ID — у бота <a href="https://t.me/userinfobot" target="_blank">@userinfobot</a>. Для лички сначала напишите боту <code>/start</code>. Несколько ID — через запятую. После сохранения нажмите проверку.</p>
                <div class="mt-12"><button type="button" class="btn btn-sm btn-secondary" id="tgTestBtn">Проверить Telegram</button></div>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Email (SMTP)</div></div>
                <div class="form-row">
                    <div class="form-group"><label>SMTP Host</label><input type="text" id="s_smtp_host" value="${esc(s.smtp_host || '')}"></div>
                    <div class="form-group"><label>SMTP Port</label><input type="number" id="s_smtp_port" value="${esc(s.smtp_port || '587')}"></div>
                    <div class="form-group"><label>SSL/TLS</label><select id="s_smtp_secure"><option value="false" ${s.smtp_secure !== 'true' ? 'selected' : ''}>Нет</option><option value="true" ${s.smtp_secure === 'true' ? 'selected' : ''}>Да</option></select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>SMTP User</label><input type="text" id="s_smtp_user" value="${esc(s.smtp_user || '')}"></div>
                    <div class="form-group"><label>SMTP Password</label><input type="password" id="s_smtp_pass" value="${esc(s.smtp_pass || '')}"></div>
                    <div class="form-group"><label>Email From</label><input type="text" id="s_email_from" value="${esc(s.email_from || '')}"></div>
                    <div class="form-group"><label>Email To (уведомления)</label><input type="text" id="s_email_to" value="${esc(s.email_to || '')}"></div>
                </div>
            </div>

            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Экспорт данных</div></div>
                <div class="inline-flex gap-8" style="flex-wrap:wrap;">
                    <a href="${API}/export/leads" class="btn btn-sm btn-secondary" target="_blank">Экспорт лидов CSV</a>
                    <a href="${API}/export/orders" class="btn btn-sm btn-secondary" target="_blank">Экспорт заказов CSV</a>
                    <a href="${API}/export/invoices" class="btn btn-sm btn-secondary" target="_blank">Экспорт счетов CSV</a>
                </div>
            </div>

            ${currentUser && currentUser.role === 'admin' ? `
            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Последние попытки входа</div></div>
                <div id="loginAttemptsArea"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>` : ''}`;

        // 2FA setup
        const setupBtn = $('#setup2faBtn');
        if (setupBtn) {
            setupBtn.onclick = async () => {
                setupBtn.disabled = true;
                setupBtn.textContent = 'Генерация...';
                const result = await api('2fa/setup', { method: 'POST' });
                if (result.ok) {
                    $('#setup2faArea').style.display = '';
                    setupBtn.style.display = 'none';
                    $('#totpSecret').textContent = result.secret;
                    const accName = document.getElementById('totpAccountName');
                    if (accName) accName.textContent = `AgileBusiness (${me.username || me.display_name || 'admin'})`;
                    const qrContainer = document.getElementById('qrCodeCanvas');
                    if (qrContainer && result.qr_data_url) {
                        qrContainer.innerHTML = `<img src="${result.qr_data_url}" alt="QR Code" style="display:block;border-radius:8px;width:200px;height:200px;">`;
                    } else if (qrContainer) {
                        qrContainer.innerHTML = '<p style="color:var(--danger);font-size:13px;">Не удалось сгенерировать QR</p>';
                    }
                    const copyBtn = document.getElementById('copySecretBtn');
                    if (copyBtn) {
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(result.secret).then(() => {
                                copyBtn.innerHTML = '&#10003;';
                                setTimeout(() => { copyBtn.innerHTML = '&#128203;'; }, 2000);
                            });
                        };
                    }
                    const codeInput = document.getElementById('enable2faCode');
                    if (codeInput) codeInput.focus();
                } else {
                    toast(result.error || 'Ошибка генерации', 'error');
                    setupBtn.disabled = false;
                    setupBtn.innerHTML = '<span style="margin-right:6px;">&#128272;</span> Подключить Google Authenticator';
                }
            };
        }
        const enableBtn = $('#enable2faBtn');
        if (enableBtn) {
            enableBtn.onclick = async () => {
                const code = ($('#enable2faCode').value || '').replace(/\s/g, '').trim();
                if (!code || code.length !== 6) { toast('Введите 6-значный код', 'error'); return; }
                enableBtn.disabled = true;
                enableBtn.textContent = 'Проверка...';
                const result = await api('2fa/enable', { method: 'POST', body: { code } });
                if (result.ok) { toast('2FA успешно включена! Google Authenticator подключён.'); renderSettings(area); }
                else { toast(result.error || 'Неверный код', 'error'); enableBtn.disabled = false; enableBtn.textContent = 'Подтвердить'; }
            };
        }
        const disableBtn = $('#disable2faBtn');
        if (disableBtn) {
            disableBtn.onclick = async () => {
                const code = ($('#disable2faCode').value || '').replace(/\s/g, '').trim();
                if (!code || code.length !== 6) { toast('Введите 6-значный код', 'error'); return; }
                if (!confirm('Вы уверены что хотите отключить 2FA? Это снизит безопасность аккаунта.')) return;
                disableBtn.disabled = true;
                disableBtn.textContent = 'Отключение...';
                const result = await api('2fa/disable', { method: 'POST', body: { code } });
                if (result.ok) { toast('2FA отключена'); renderSettings(area); }
                else { toast(result.error || 'Неверный код', 'error'); disableBtn.disabled = false; disableBtn.textContent = 'Отключить 2FA'; }
            };
        }

        // Load login attempts
        if (currentUser && currentUser.role === 'admin') {
            try {
                const la = await api('login-attempts');
                const attempts = la.attempts || [];
                const attArea = $('#loginAttemptsArea');
                if (attArea) {
                    attArea.innerHTML = attempts.length ? `
                        <table><thead><tr><th>Дата</th><th>Логин</th><th>IP</th><th>Результат</th></tr></thead><tbody>
                        ${attempts.slice(0, 30).map(a => `<tr>
                            <td>${formatDateTime(a.created_at)}</td>
                            <td>${esc(a.username)}</td>
                            <td class="text-muted">${esc(a.ip)}</td>
                            <td>${a.success ? '<span class="badge badge-accepted">OK</span>' : '<span class="badge badge-rejected">Неудача</span>'}</td>
                        </tr>`).join('')}
                        </tbody></table>
                    ` : '<p class="text-muted" style="padding:12px;">Нет записей</p>';
                }
            } catch(e) { /* ignore */ }
        }

        // Change password
        $('#changePassBtn').onclick = async () => {
            const current = $('#currentPassword').value;
            const newPass = $('#newPassword').value;
            if (!current || !newPass) { toast('Заполните оба поля пароля', 'error'); return; }
            const result = await api('password', { method: 'PUT', body: { current_password: current, new_password: newPass } });
            if (result.ok) { toast('Пароль изменён'); $('#currentPassword').value = ''; $('#newPassword').value = ''; }
            else toast(result.error || 'Ошибка', 'error');
        };

        // Save settings
        $('#saveSettingsBtn').onclick = async () => {
            const settings = {};
            const keys = ['site_phone', 'site_email', 'site_address', 'site_whatsapp', 'site_telegram', 'site_marquee_text',
                'ym_counter_id', 'ym_oauth_token', 'webmaster_host_id',
                'tg_bot_token', 'tg_chat_id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from', 'email_to'];
            keys.forEach(k => {
                const el = $(`#s_${k}`);
                if (el) settings[k] = el.value;
            });
            const result = await api('settings', { method: 'PUT', body: { settings } });
            if (result.ok) toast('Настройки сохранены'); else toast(result.error || 'Ошибка', 'error');
        };

        const tgTestBtn = $('#tgTestBtn');
        if (tgTestBtn) {
            tgTestBtn.onclick = async () => {
                tgTestBtn.disabled = true;
                tgTestBtn.textContent = 'Сохранение...';
                try {
                    const settings = {};
                    ['tg_bot_token', 'tg_chat_id'].forEach(k => {
                        const el = $(`#s_${k}`);
                        if (el) settings[k] = el.value;
                    });
                    const save = await api('settings', { method: 'PUT', body: { settings } });
                    if (!save.ok) { toast(save.error || 'Не удалось сохранить токен/чат', 'error'); return; }
                    tgTestBtn.textContent = 'Отправка...';
                    const r = await api('telegram/test', { method: 'POST', body: {} });
                    if (r.ok) toast('Сообщение отправлено — проверьте Telegram');
                    else toast(r.error || 'Ошибка', 'error');
                } catch (e) {
                    toast(e.message || 'Ошибка сети', 'error');
                }
                tgTestBtn.disabled = false;
                tgTestBtn.textContent = 'Проверить Telegram';
            };
        }
    }

    /* ── PIPELINE (Kanban) ─────────────────────────── */
    async function renderPipeline(area) {
        const data = await api('pipeline');
        const leads = data.leads || [];
        const grouped = {};
        PIPELINE_STAGES.forEach(s => { grouped[s] = []; });
        leads.forEach(l => { const s = l.stage || 'new'; if (grouped[s]) grouped[s].push(l); else grouped['new'].push(l); });

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Воронка продаж</div><div class="section-subtitle">${leads.length} лидов</div></div>
            </div>
            <div class="pipeline-board">
                ${PIPELINE_STAGES.map(stage => `
                    <div class="pipeline-column" data-stage="${stage}">
                        <div class="pipeline-col-header">
                            <span>${STAGE_LABELS[stage]}</span>
                            <span class="pipeline-count">${grouped[stage].length}</span>
                        </div>
                        <div class="pipeline-cards">
                            ${grouped[stage].map(l => `
                                <div class="pipeline-card" data-nav="#lead/${l.id}">
                                    <div class="pipeline-card-name">${esc(l.name)}</div>
                                    <div class="pipeline-card-info">${esc(SERVICE_NAMES[l.service] || l.service || '—')}</div>
                                    ${l.estimated_price ? `<div class="pipeline-card-price">${formatMoney(l.estimated_price)}</div>` : ''}
                                    <div class="pipeline-card-date">${formatDate(l.created_at)}</div>
                                </div>
                            `).join('') || '<div class="pipeline-empty">Пусто</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    /* ── TASKS ──────────────────────────────────────── */
    let tasksFilter = '';

    async function renderTasks(area) {
        const params = new URLSearchParams({ limit: 50 });
        if (tasksFilter) params.set('status', tasksFilter);
        const data = await api(`tasks?${params}`);
        const tasks = data.tasks || [];

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Задачи</div><div class="section-subtitle">${tasks.length} задач</div></div>
                <button class="btn btn-primary" id="addTaskBtn">+ Новая задача</button>
            </div>
            <div class="table-card">
                <div class="table-filters">
                    <button class="filter-btn ${!tasksFilter ? 'active' : ''}" data-tf="">Все</button>
                    <button class="filter-btn ${tasksFilter === 'pending' ? 'active' : ''}" data-tf="pending">Ожидают</button>
                    <button class="filter-btn ${tasksFilter === 'in_progress' ? 'active' : ''}" data-tf="in_progress">В работе</button>
                    <button class="filter-btn ${tasksFilter === 'done' ? 'active' : ''}" data-tf="done">Готовые</button>
                </div>
                <table><thead><tr><th></th><th>Задача</th><th>Связь</th><th>Приоритет</th><th>Срок</th><th>Статус</th><th></th></tr></thead><tbody>
                ${tasks.length ? tasks.map(t => `<tr>
                    <td><span class="task-check ${t.status === 'done' ? 'done' : ''}" data-tid="${t.id}" style="cursor:pointer;font-size:18px;">${t.status === 'done' ? '&#10003;' : '&#9675;'}</span></td>
                    <td><strong>${esc(t.title)}</strong>${t.description ? `<br><span class="text-muted" style="font-size:12px;">${esc(t.description).slice(0, 80)}</span>` : ''}</td>
                    <td>${t.entity_type ? `<a href="#${t.entity_type}/${t.entity_id}">${t.entity_type} #${t.entity_id}</a>` : '—'}</td>
                    <td><span class="badge badge-${t.priority === 'urgent' ? 'rejected' : t.priority === 'high' ? 'processing' : t.priority === 'low' ? 'on_hold' : 'new'}">${t.priority}</span></td>
                    <td>${t.due_date ? formatDate(t.due_date) : '—'}</td>
                    <td><span class="badge badge-${t.status === 'done' ? 'completed' : t.status === 'in_progress' ? 'accepted' : 'new'}">${t.status}</span></td>
                    <td><button class="btn btn-sm btn-danger" data-del-task="${t.id}" title="Удалить">&times;</button></td>
                </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">Нет задач</td></tr>'}
                </tbody></table>
            </div>
            <div id="taskFormArea"></div>`;

        $$('[data-tf]').forEach(btn => { btn.onclick = () => { tasksFilter = btn.dataset.tf; renderTasks(area); }; });
        $$('.task-check').forEach(btn => {
            btn.onclick = async () => {
                const tid = btn.dataset.tid;
                const isDone = btn.classList.contains('done');
                await api(`tasks/${tid}`, { method: 'PUT', body: { status: isDone ? 'pending' : 'done' } });
                renderTasks(area);
            };
        });
        $$('[data-del-task]').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm('Удалить задачу?')) return;
                await api(`tasks/${btn.dataset.delTask}`, { method: 'DELETE' });
                toast('Удалено'); renderTasks(area);
            };
        });

        $('#addTaskBtn').onclick = () => {
            const fa = $('#taskFormArea');
            fa.innerHTML = `
                <div class="card mt-24">
                    <div class="card-header"><div class="card-title">Новая задача</div></div>
                    <div class="form-row">
                        <div class="form-group"><label>Название</label><input type="text" id="ntTitle"></div>
                        <div class="form-group"><label>Приоритет</label><select id="ntPriority"><option value="normal">Обычный</option><option value="low">Низкий</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></div>
                        <div class="form-group"><label>Срок</label><input type="date" id="ntDue"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Тип связи</label><select id="ntEntity"><option value="">Нет</option><option value="lead">Лид</option><option value="order">Заказ</option></select></div>
                        <div class="form-group"><label>ID связи</label><input type="number" id="ntEntityId" placeholder="ID лида/заказа"></div>
                    </div>
                    <div class="form-group"><label>Описание</label><textarea id="ntDesc" rows="2"></textarea></div>
                    <div class="form-actions">
                        <button class="btn btn-primary" id="saveNewTask">Создать</button>
                        <button class="btn btn-secondary" data-clear="taskFormArea">Отмена</button>
                    </div>
                </div>`;
            $('#saveNewTask').onclick = async () => {
                const title = $('#ntTitle').value.trim();
                if (!title) { toast('Введите название', 'error'); return; }
                await api('tasks', { method: 'POST', body: {
                    title, description: $('#ntDesc').value, priority: $('#ntPriority').value,
                    due_date: $('#ntDue').value || null,
                    entity_type: $('#ntEntity').value || '', entity_id: parseInt($('#ntEntityId').value) || null
                }});
                toast('Задача создана'); renderTasks(area);
            };
        };
    }

    /* ── PROPOSALS ──────────────────────────────────── */
    async function renderProposals(area) {
        const data = await api('proposals');
        const proposals = data.proposals || [];
        const statusLabels = { draft: 'Черновик', sent: 'Отправлено', accepted: 'Принято', rejected: 'Отклонено', expired: 'Истекло' };

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Коммерческие предложения</div><div class="section-subtitle">${proposals.length} КП</div></div>
                <button class="btn btn-primary" data-nav="#proposal/new">+ Новое КП</button>
            </div>
            <div class="table-card"><table><thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th><th>Действует до</th><th>Дата</th><th></th></tr></thead><tbody>
            ${proposals.length ? proposals.map(p => `<tr>
                <td>#${p.id}</td>
                <td><strong>${esc(p.client_name)}</strong><br><span class="text-muted">${esc(p.client_email)}</span></td>
                <td>${formatMoney(p.total)}</td>
                <td><span class="badge badge-${p.status === 'accepted' ? 'accepted' : p.status === 'rejected' ? 'rejected' : p.status === 'sent' ? 'processing' : p.status === 'expired' ? 'on_hold' : 'new'}">${statusLabels[p.status] || p.status}</span></td>
                <td>${formatDate(p.valid_until)}</td>
                <td>${formatDate(p.created_at)}</td>
                <td><a href="#proposal/${p.id}" class="btn btn-sm btn-secondary">Открыть</a></td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">Нет КП</td></tr>'}
            </tbody></table></div>`;
    }

    /* ── PROPOSAL EDITOR ───────────────────────────── */
    async function renderProposalEditor(area, id) {
        let proposal = { client_name: '', client_email: '', client_phone: '', items_json: '[]', total: 0, status: 'draft', valid_until: '', notes: '' };
        const isNew = id === 'new';
        if (!isNew) {
            const data = await api(`proposals/${id}`);
            proposal = data.proposal || proposal;
        }
        let items = [];
        try { items = typeof proposal.items_json === 'string' ? JSON.parse(proposal.items_json) : (proposal.items_json || []); } catch(e) { items = []; }
        if (!items.length) items.push({ name: '', qty: 1, price: 0 });

        function renderItems() {
            return items.map((it, i) => `
                <div class="line-item" data-idx="${i}">
                    <input type="text" class="li-name" value="${esc(it.name)}" placeholder="Название услуги" style="flex:3;">
                    <input type="number" class="li-qty" value="${it.qty || 1}" min="1" style="flex:0.5;">
                    <input type="number" class="li-price" value="${it.price || 0}" step="100" style="flex:1;">
                    <span class="li-sum" style="flex:0.8;text-align:right;font-weight:600;">${formatMoney((it.qty || 1) * (it.price || 0))}</span>
                    <button class="btn-icon" data-rmi="${i}" title="Удалить">&times;</button>
                </div>
            `).join('');
        }
        function calcTotal() { return items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0); }

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новое КП' : `КП #${proposal.id}`}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#proposals">Назад</button>
                    <button class="btn btn-primary" id="saveProposalBtn">Сохранить</button>
                    ${!isNew ? '<button class="btn btn-danger btn-sm" id="deleteProposalBtn">Удалить</button>' : ''}
                </div>
            </div>
            <div class="card mb-24">
                <div class="form-row">
                    <div class="form-group"><label>Клиент</label><input type="text" id="prName" value="${esc(proposal.client_name)}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="prEmail" value="${esc(proposal.client_email)}"></div>
                    <div class="form-group"><label>Телефон</label><input type="tel" id="prPhone" value="${esc(proposal.client_phone)}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Статус</label>
                        <select id="prStatus">
                            ${['draft','sent','accepted','rejected','expired'].map(s => `<option value="${s}" ${proposal.status === s ? 'selected' : ''}>${{draft:'Черновик',sent:'Отправлено',accepted:'Принято',rejected:'Отклонено',expired:'Истекло'}[s]}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Действует до</label><input type="date" id="prValid" value="${proposal.valid_until ? new Date(proposal.valid_until).toISOString().slice(0,10) : ''}"></div>
                </div>
            </div>
            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Позиции</div><button class="btn btn-sm btn-secondary" id="addItemBtn">+ Позиция</button></div>
                <div class="line-items-header"><span style="flex:3;">Услуга</span><span style="flex:0.5;">Кол-во</span><span style="flex:1;">Цена</span><span style="flex:0.8;text-align:right;">Сумма</span><span style="width:36px;"></span></div>
                <div id="lineItemsList">${renderItems()}</div>
                <div class="line-items-total">Итого: <span id="prTotal">${formatMoney(calcTotal())}</span></div>
            </div>
            <div class="card"><div class="form-group"><label>Заметки</label><textarea id="prNotes" rows="3">${esc(proposal.notes || '')}</textarea></div></div>`;

        function bindItemEvents() {
            $$('.line-item input').forEach(inp => {
                inp.oninput = () => {
                    const row = inp.closest('.line-item');
                    const idx = parseInt(row.dataset.idx);
                    items[idx].name = row.querySelector('.li-name').value;
                    items[idx].qty = parseInt(row.querySelector('.li-qty').value) || 1;
                    items[idx].price = parseFloat(row.querySelector('.li-price').value) || 0;
                    row.querySelector('.li-sum').textContent = formatMoney(items[idx].qty * items[idx].price);
                    $('#prTotal').textContent = formatMoney(calcTotal());
                };
            });
            $$('[data-rmi]').forEach(btn => {
                btn.onclick = () => { items.splice(parseInt(btn.dataset.rmi), 1); if (!items.length) items.push({ name: '', qty: 1, price: 0 }); $('#lineItemsList').innerHTML = renderItems(); bindItemEvents(); $('#prTotal').textContent = formatMoney(calcTotal()); };
            });
        }
        bindItemEvents();

        $('#addItemBtn').onclick = () => { items.push({ name: '', qty: 1, price: 0 }); $('#lineItemsList').innerHTML = renderItems(); bindItemEvents(); };

        $('#saveProposalBtn').onclick = async () => {
            const body = {
                client_name: $('#prName').value, client_email: $('#prEmail').value, client_phone: $('#prPhone').value,
                items_json: items, total: calcTotal(), status: $('#prStatus').value,
                valid_until: $('#prValid').value || null, notes: $('#prNotes').value
            };
            const result = isNew ? await api('proposals', { method: 'POST', body }) : await api(`proposals/${id}`, { method: 'PUT', body });
            if (result.ok) { toast('КП сохранено'); if (isNew && result.id) location.hash = `#proposal/${result.id}`; }
            else toast(result.error || 'Ошибка', 'error');
        };

        const delBtn = $('#deleteProposalBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить КП?')) return;
            await api(`proposals/${id}`, { method: 'DELETE' });
            toast('Удалено'); location.hash = '#proposals';
        };
    }

    /* ── INVOICES ───────────────────────────────────── */
    async function renderInvoices(area) {
        const data = await api('invoices');
        const invoices = data.invoices || [];
        const statusLabels = { draft: 'Черновик', sent: 'Отправлен', paid: 'Оплачен', overdue: 'Просрочен', cancelled: 'Отменён' };

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Счета</div><div class="section-subtitle">${invoices.length} счетов</div></div>
                <button class="btn btn-primary" data-nav="#invoice/new">+ Новый счёт</button>
            </div>
            <div class="table-card"><table><thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th><th>Срок оплаты</th><th>Оплачен</th><th></th></tr></thead><tbody>
            ${invoices.length ? invoices.map(inv => `<tr>
                <td>#${inv.id}</td>
                <td><strong>${esc(inv.client_name)}</strong></td>
                <td>${formatMoney(inv.total)}</td>
                <td><span class="badge badge-${inv.status === 'paid' ? 'completed' : inv.status === 'overdue' ? 'rejected' : inv.status === 'sent' ? 'processing' : inv.status === 'cancelled' ? 'cancelled' : 'new'}">${statusLabels[inv.status] || inv.status}</span></td>
                <td>${formatDate(inv.due_date)}</td>
                <td>${inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                <td><a href="#invoice/${inv.id}" class="btn btn-sm btn-secondary">Открыть</a></td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">Нет счетов</td></tr>'}
            </tbody></table></div>`;
    }

    /* ── INVOICE EDITOR ────────────────────────────── */
    async function renderInvoiceEditor(area, id) {
        let invoice = { client_name: '', client_email: '', items_json: '[]', total: 0, status: 'draft', due_date: '', paid_at: '', notes: '' };
        const isNew = id === 'new';
        if (!isNew) {
            const data = await api(`invoices/${id}`);
            invoice = data.invoice || invoice;
        }
        let items = [];
        try { items = typeof invoice.items_json === 'string' ? JSON.parse(invoice.items_json) : (invoice.items_json || []); } catch(e) { items = []; }
        if (!items.length) items.push({ name: '', qty: 1, price: 0 });

        function renderItems() {
            return items.map((it, i) => `
                <div class="line-item" data-idx="${i}">
                    <input type="text" class="li-name" value="${esc(it.name)}" placeholder="Услуга" style="flex:3;">
                    <input type="number" class="li-qty" value="${it.qty || 1}" min="1" style="flex:0.5;">
                    <input type="number" class="li-price" value="${it.price || 0}" step="100" style="flex:1;">
                    <span class="li-sum" style="flex:0.8;text-align:right;font-weight:600;">${formatMoney((it.qty || 1) * (it.price || 0))}</span>
                    <button class="btn-icon" data-rmi="${i}" title="Удалить">&times;</button>
                </div>
            `).join('');
        }
        function calcTotal() { return items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0); }

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">${isNew ? 'Новый счёт' : `Счёт #${invoice.id}`}</div></div>
                <div class="inline-flex gap-8">
                    <button class="btn btn-secondary" data-nav="#invoices">Назад</button>
                    <button class="btn btn-primary" id="saveInvoiceBtn">Сохранить</button>
                    ${!isNew ? '<button class="btn btn-danger btn-sm" id="deleteInvoiceBtn">Удалить</button>' : ''}
                </div>
            </div>
            <div class="card mb-24">
                <div class="form-row">
                    <div class="form-group"><label>Клиент</label><input type="text" id="invName" value="${esc(invoice.client_name)}"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="invEmail" value="${esc(invoice.client_email)}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Статус</label>
                        <select id="invStatus">
                            ${['draft','sent','paid','overdue','cancelled'].map(s => `<option value="${s}" ${invoice.status === s ? 'selected' : ''}>${{draft:'Черновик',sent:'Отправлен',paid:'Оплачен',overdue:'Просрочен',cancelled:'Отменён'}[s]}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Срок оплаты</label><input type="date" id="invDue" value="${invoice.due_date ? new Date(invoice.due_date).toISOString().slice(0,10) : ''}"></div>
                    <div class="form-group"><label>Дата оплаты</label><input type="date" id="invPaid" value="${invoice.paid_at ? new Date(invoice.paid_at).toISOString().slice(0,10) : ''}"></div>
                </div>
            </div>
            <div class="card mb-24">
                <div class="card-header"><div class="card-title">Позиции</div><button class="btn btn-sm btn-secondary" id="addInvItemBtn">+ Позиция</button></div>
                <div class="line-items-header"><span style="flex:3;">Услуга</span><span style="flex:0.5;">Кол-во</span><span style="flex:1;">Цена</span><span style="flex:0.8;text-align:right;">Сумма</span><span style="width:36px;"></span></div>
                <div id="invLineItems">${renderItems()}</div>
                <div class="line-items-total">Итого: <span id="invTotal">${formatMoney(calcTotal())}</span></div>
            </div>
            <div class="card"><div class="form-group"><label>Заметки</label><textarea id="invNotes" rows="3">${esc(invoice.notes || '')}</textarea></div></div>`;

        function bindItemEvents() {
            $$('#invLineItems .line-item input').forEach(inp => {
                inp.oninput = () => {
                    const row = inp.closest('.line-item');
                    const idx = parseInt(row.dataset.idx);
                    items[idx].name = row.querySelector('.li-name').value;
                    items[idx].qty = parseInt(row.querySelector('.li-qty').value) || 1;
                    items[idx].price = parseFloat(row.querySelector('.li-price').value) || 0;
                    row.querySelector('.li-sum').textContent = formatMoney(items[idx].qty * items[idx].price);
                    $('#invTotal').textContent = formatMoney(calcTotal());
                };
            });
            $$('#invLineItems [data-rmi]').forEach(btn => {
                btn.onclick = () => { items.splice(parseInt(btn.dataset.rmi), 1); if (!items.length) items.push({ name: '', qty: 1, price: 0 }); $('#invLineItems').innerHTML = renderItems(); bindItemEvents(); $('#invTotal').textContent = formatMoney(calcTotal()); };
            });
        }
        bindItemEvents();
        $('#addInvItemBtn').onclick = () => { items.push({ name: '', qty: 1, price: 0 }); $('#invLineItems').innerHTML = renderItems(); bindItemEvents(); };

        $('#saveInvoiceBtn').onclick = async () => {
            const body = {
                client_name: $('#invName').value, client_email: $('#invEmail').value,
                items_json: items, total: calcTotal(), status: $('#invStatus').value,
                due_date: $('#invDue').value || null, paid_at: $('#invPaid').value || null, notes: $('#invNotes').value
            };
            const result = isNew ? await api('invoices', { method: 'POST', body }) : await api(`invoices/${id}`, { method: 'PUT', body });
            if (result.ok) { toast('Счёт сохранён'); if (isNew && result.id) location.hash = `#invoice/${result.id}`; }
            else toast(result.error || 'Ошибка', 'error');
        };
        const delBtn = $('#deleteInvoiceBtn');
        if (delBtn) delBtn.onclick = async () => {
            if (!confirm('Удалить счёт?')) return;
            await api(`invoices/${id}`, { method: 'DELETE' });
            toast('Удалено'); location.hash = '#invoices';
        };
    }

    /* ── REVENUE DASHBOARD ─────────────────────────── */
    async function renderRevenue(area) {
        const data = await api('revenue');
        if (!data.ok) { area.innerHTML = '<p>Ошибка</p>'; return; }
        const r = data.revenue;

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Выручка и финансы</div></div>
                <div class="inline-flex gap-8">
                    <a href="${API}/export/orders" class="btn btn-sm btn-secondary" target="_blank">Экспорт заказов CSV</a>
                    <a href="${API}/export/invoices" class="btn btn-sm btn-secondary" target="_blank">Экспорт счетов CSV</a>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(r.total)}</div><div class="stat-label">Завершённая выручка</div></div></div>
                <div class="stat-card"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(r.active)}</div><div class="stat-label">Активные заказы</div></div></div>
                <div class="stat-card"><div class="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(r.paid)}</div><div class="stat-label">Оплачено (счета)</div></div></div>
                <div class="stat-card"><div class="stat-icon red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(r.overdue)}</div><div class="stat-label">Просрочено</div></div></div>
                <div class="stat-card"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg></div><div class="stat-info"><div class="stat-value">${formatMoney(r.avgCheck)}</div><div class="stat-label">Средний чек</div></div></div>
            </div>
            <div class="charts-grid">
                <div class="chart-card"><div class="chart-title">Выручка по месяцам</div><div class="chart-wrap"><canvas id="chartMonthly"></canvas></div></div>
                <div class="chart-card"><div class="chart-title">По направлениям</div><div class="chart-wrap"><canvas id="chartByService"></canvas></div></div>
            </div>
            ${(r.bySource || []).length ? `
            <div class="table-card mt-24">
                <div class="table-header"><div class="table-title">Выручка по источникам</div></div>
                <table><thead><tr><th>Источник</th><th>Заказов</th><th>Выручка</th></tr></thead><tbody>
                ${r.bySource.map(s => `<tr><td>${esc(s.source || 'Прямой')}</td><td>${s.orders_count}</td><td>${formatMoney(s.revenue)}</td></tr>`).join('')}
                </tbody></table>
            </div>` : ''}`;

        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            Object.values(charts).forEach(c => c.destroy && c.destroy());
            charts = {};
            const monthly = (r.monthly || []).reverse();
            const mCtx = document.getElementById('chartMonthly');
            if (mCtx) {
                charts.monthly = new Chart(mCtx, {
                    type: 'bar', data: {
                        labels: monthly.map(m => m.month),
                        datasets: [{ label: 'Выручка', data: monthly.map(m => Number(m.revenue)), backgroundColor: 'rgba(211,47,47,0.15)', borderColor: '#D32F2F', borderWidth: 1, borderRadius: 6 }]
                    }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            }
            const sCtx = document.getElementById('chartByService');
            if (sCtx) {
                const svcData = r.byService || [];
                charts.byService = new Chart(sCtx, {
                    type: 'doughnut', data: {
                        labels: svcData.map(s => SERVICE_NAMES[s.service] || s.service || '—'),
                        datasets: [{ data: svcData.map(s => Number(s.revenue)), backgroundColor: ['#D32F2F','#2196F3','#4CAF50','#FF9800','#9C27B0','#00BCD4','#795548','#607D8B','#E91E63','#3F51B5'], borderWidth: 0 }]
                    }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                });
            }
        }, 100);
    }

    /* ── UTM ANALYTICS ─────────────────────────────── */
    async function renderUtmAnalytics(area) {
        const data = await api('utm-analytics');
        if (!data.ok) { area.innerHTML = '<p>Ошибка</p>'; return; }

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">UTM Аналитика</div><div class="section-subtitle">Сквозная аналитика по источникам трафика</div></div>
                <a href="${API}/export/leads" class="btn btn-sm btn-secondary" target="_blank">Экспорт лидов CSV</a>
            </div>
            ${(data.bySource || []).length ? `
            <div class="table-card mb-24">
                <div class="table-header"><div class="table-title">По источникам (utm_source)</div></div>
                <table><thead><tr><th>Источник</th><th>Лидов</th><th>Выиграно</th><th>Конверсия</th><th>Оценка выручки</th></tr></thead><tbody>
                ${data.bySource.map(s => `<tr>
                    <td><strong>${esc(s.utm_source)}</strong></td>
                    <td>${s.leads}</td>
                    <td>${s.won}</td>
                    <td>${s.leads > 0 ? (s.won / s.leads * 100).toFixed(1) + '%' : '0%'}</td>
                    <td>${formatMoney(s.est_revenue)}</td>
                </tr>`).join('')}
                </tbody></table>
            </div>` : '<div class="card mb-24"><div class="empty-state"><p>Нет данных по UTM-источникам. Лиды с UTM-метками появятся после первых переходов с рекламных кампаний.</p></div></div>'}

            ${(data.byCampaign || []).length ? `
            <div class="table-card mb-24">
                <div class="table-header"><div class="table-title">По кампаниям (utm_campaign)</div></div>
                <table><thead><tr><th>Кампания</th><th>Источник</th><th>Лидов</th><th>Выиграно</th></tr></thead><tbody>
                ${data.byCampaign.map(c => `<tr>
                    <td><strong>${esc(c.utm_campaign)}</strong></td>
                    <td>${esc(c.utm_source)}</td>
                    <td>${c.leads}</td>
                    <td>${c.won}</td>
                </tr>`).join('')}
                </tbody></table>
            </div>` : ''}

            ${(data.byMedium || []).length ? `
            <div class="table-card mb-24">
                <div class="table-header"><div class="table-title">По каналам (utm_medium)</div></div>
                <table><thead><tr><th>Канал</th><th>Лидов</th></tr></thead><tbody>
                ${data.byMedium.map(m => `<tr><td><strong>${esc(m.utm_medium)}</strong></td><td>${m.leads}</td></tr>`).join('')}
                </tbody></table>
            </div>` : ''}`;
    }

    /* ── AUDIT LOG ──────────────────────────────────── */
    let auditPage = 1;

    async function renderAuditLog(area) {
        if (currentUser && currentUser.role !== 'admin') {
            area.innerHTML = '<div class="empty-state"><p>Доступ только для администратора</p></div>';
            return;
        }
        const data = await api(`audit?page=${auditPage}&limit=50`);
        const logs = data.logs || [];
        const total = data.total || 0;
        const pages = Math.ceil(total / 50);

        area.innerHTML = `
            <div class="section-header">
                <div><div class="section-title">Журнал действий</div><div class="section-subtitle">${total} записей</div></div>
            </div>
            <div class="table-card">
                <table><thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th>Детали</th><th>IP</th></tr></thead><tbody>
                ${logs.length ? logs.map(l => `<tr>
                    <td>${formatDateTime(l.created_at)}</td>
                    <td>${esc(l.username)}</td>
                    <td><span class="badge badge-new">${esc(l.action)}</span></td>
                    <td>${l.entity_type ? `${esc(l.entity_type)} #${l.entity_id}` : '—'}</td>
                    <td class="text-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(l.details || '')}</td>
                    <td class="text-muted">${esc(l.ip)}</td>
                </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;">Нет записей</td></tr>'}
                </tbody></table>
                ${pages > 1 ? `<div class="pagination">
                    <button class="page-btn" ${auditPage <= 1 ? 'disabled' : ''} data-ap="${auditPage - 1}">&lt;</button>
                    ${(()=>{ const s=Math.max(1,auditPage-4),e=Math.min(pages,s+9); return Array.from({length:e-s+1},(_,i)=>s+i).map(p=>`<button class="page-btn ${p===auditPage?'active':''}" data-ap="${p}">${p}</button>`).join(''); })()}
                    <button class="page-btn" ${auditPage >= pages ? 'disabled' : ''} data-ap="${auditPage + 1}">&gt;</button>
                </div>` : ''}
            </div>`;

        $$('[data-ap]').forEach(btn => {
            btn.onclick = () => { if (!btn.disabled) { auditPage = parseInt(btn.dataset.ap); renderAuditLog(area); } };
        });
    }

    /* ── FILE UPLOAD HELPERS ──────────────────────────── */
    async function uploadFiles(files) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        try {
            const resp = await fetch(`${API}/upload-files`, { method: 'POST', body: fd, credentials: 'same-origin' });
            if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
            return await resp.json();
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    function initDropzone(container, opts = {}) {
        const input = container.querySelector('input[type="file"]');
        if (!input) return;
        let dragCount = 0;
        container.addEventListener('click', e => { if (e.target !== input) input.click(); });
        container.addEventListener('dragenter', e => { e.preventDefault(); dragCount++; container.classList.add('dragover'); });
        container.addEventListener('dragover', e => { e.preventDefault(); });
        container.addEventListener('dragleave', e => { e.preventDefault(); dragCount--; if (dragCount <= 0) { dragCount = 0; container.classList.remove('dragover'); } });
        container.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation(); dragCount = 0; container.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleDropzoneFiles(e.dataTransfer.files, opts);
        });
        input.addEventListener('change', () => { if (input.files.length) handleDropzoneFiles(input.files, opts); input.value = ''; });
    }

    async function handleDropzoneFiles(fileList, opts) {
        const maxSize = (opts.maxSizeMb || 12) * 1024 * 1024;
        const files = Array.from(fileList).filter(f => f.size <= maxSize);
        if (!files.length) { toast('Файлы слишком большие', 'error'); return; }
        toast('Загрузка...');
        const data = await uploadFiles(files);
        if (data.ok && data.urls && opts.onUploaded) opts.onUploaded(data.urls);
        else if (!data.ok) toast(data.error || 'Ошибка загрузки', 'error');
    }

    function renderGalleryGrid(containerId, urls, onChange) {
        const c = document.getElementById(containerId);
        if (!c) return;
        c.innerHTML = urls.map((u, i) => `<div class="gallery-item">
            <img src="${esc(u)}" alt="">
            <button class="gallery-item__remove" data-idx="${i}">&times;</button>
        </div>`).join('') || '<div class="text-muted" style="padding:12px;font-size:12px;">Нет изображений</div>';
        c.querySelectorAll('.gallery-item__remove').forEach(btn => {
            btn.onclick = e => { e.stopPropagation(); urls.splice(parseInt(btn.dataset.idx), 1); renderGalleryGrid(containerId, urls, onChange); if (onChange) onChange(); };
        });
    }

    function initQuillWithUpload(elementId, initialHtml) {
        const el = document.getElementById(elementId);
        if (!el || typeof Quill === 'undefined') return null;
        const q = new Quill(el, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: [[{header:[1,2,3,false]}],['bold','italic','underline','strike'],['blockquote','code-block'],[{list:'ordered'},{list:'bullet'}],[{align:[]}],['link','image'],['clean']],
                    handlers: {
                        image: function() {
                            const input = document.createElement('input');
                            input.type = 'file'; input.accept = 'image/*'; input.multiple = false;
                            input.onchange = async () => {
                                const f = input.files[0]; if (!f) return;
                                const data = await uploadFiles([f]);
                                if (data.ok && data.urls && data.urls[0]) {
                                    const range = q.getSelection(true) || { index: q.getLength() };
                                    q.insertEmbed(range.index, 'image', data.urls[0]);
                                    q.setSelection(range.index + 1);
                                }
                            };
                            input.click();
                        }
                    }
                }
            }
        });
        if (initialHtml) q.root.innerHTML = initialHtml;
        return q;
    }

    function renderStackSelector(containerId, category, selectedIds, onChange) {
        const options = TECH_STACK_OPTIONS.filter(t => t.cat === category);
        const c = document.getElementById(containerId);
        if (!c) return;
        const searchId = `${containerId}_search`;
        c.innerHTML = `<div class="stack-search"><input type="text" id="${searchId}" placeholder="Поиск..."></div>
            <div class="stack-options" id="${containerId}_opts"></div>
            <div class="stack-pills" id="${containerId}_pills"></div>`;
        function render(filter) {
            const f = (filter || '').toLowerCase();
            const optsEl = document.getElementById(`${containerId}_opts`);
            const pillsEl = document.getElementById(`${containerId}_pills`);
            optsEl.innerHTML = options.filter(t => !f || t.name.toLowerCase().includes(f) || t.id.toLowerCase().includes(f))
                .map(t => `<span class="stack-option ${selectedIds.includes(t.id)?'selected':''}" data-sid="${t.id}"><i class="${t.icon}"></i> ${t.name}</span>`).join('');
            pillsEl.innerHTML = selectedIds.map(sid => { const t = options.find(o=>o.id===sid); return t ? `<span class="stack-pill"><i class="${t.icon}"></i> ${t.name}<button class="stack-pill__remove" data-sid="${t.id}">&times;</button></span>` : ''; }).join('');
            optsEl.querySelectorAll('.stack-option').forEach(btn => {
                btn.onclick = () => {
                    const sid = btn.dataset.sid;
                    const idx = selectedIds.indexOf(sid);
                    if (idx >= 0) selectedIds.splice(idx, 1); else selectedIds.push(sid);
                    render(f); if (onChange) onChange();
                };
            });
            pillsEl.querySelectorAll('.stack-pill__remove').forEach(btn => {
                btn.onclick = () => { const idx = selectedIds.indexOf(btn.dataset.sid); if (idx >= 0) selectedIds.splice(idx, 1); render(f); if (onChange) onChange(); };
            });
        }
        render('');
        const searchEl = document.getElementById(searchId);
        if (searchEl) searchEl.oninput = () => render(searchEl.value);
    }

    /* ── LANG TABS HELPER ──────────────────────────── */
    function setupLangTabs() {
        $$('#langTabs .lang-tab').forEach(tab => {
            tab.onclick = () => {
                $$('.lang-tab').forEach(t => t.classList.remove('active'));
                $$('.editor-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const pane = $(`.editor-pane[data-lang-pane="${tab.dataset.lang}"]`);
                if (pane) pane.classList.add('active');
            };
        });
    }

    /* ── INIT ──────────────────────────────────────── */
    function init() {
        // Login form
        let loginPending2fa = false;
        let loginSavedCreds = null;
        $('#loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = $('#loginBtn');
            const errEl = $('#loginError');
            btn.disabled = true;
            errEl.textContent = '';
            errEl.style.color = '';

            if (loginPending2fa) {
                const codeInput = document.getElementById('login2faCode');
                const code = (codeInput ? codeInput.value : '').replace(/\s/g, '').trim();
                if (!code || code.length !== 6) {
                    errEl.textContent = 'Введите 6-значный код';
                    errEl.style.color = 'var(--danger)';
                    btn.disabled = false;
                    return;
                }
                btn.textContent = 'Проверка кода...';
                try {
                    const body = { ...loginSavedCreds, totp_code: code };
                    const data = await api('login', { method: 'POST', body });
                    if (data.ok && data.user) {
                        loginPending2fa = false;
                        loginSavedCreds = null;
                        showAdmin(data.user);
                    } else {
                        errEl.textContent = data.error || 'Неверный код';
                        errEl.style.color = 'var(--danger)';
                        if (codeInput) { codeInput.value = ''; codeInput.focus(); }
                    }
                } catch (ex) {
                    errEl.textContent = 'Ошибка соединения';
                    errEl.style.color = 'var(--danger)';
                }
                btn.disabled = false;
                btn.textContent = 'Подтвердить';
                return;
            }

            btn.textContent = 'Вход...';
            try {
                const body = { username: $('#loginUser').value, password: $('#loginPass').value };
                const data = await api('login', { method: 'POST', body });
                if (data.needs_2fa) {
                    loginPending2fa = true;
                    loginSavedCreds = { username: body.username, password: body.password };
                    const formEl = document.getElementById('loginForm');
                    if (!document.getElementById('login2faGroup')) {
                        document.getElementById('loginUser').closest('.form-group').style.display = 'none';
                        document.getElementById('loginPass').closest('.form-group').style.display = 'none';
                        const grp = document.createElement('div');
                        grp.id = 'login2faGroup';
                        grp.innerHTML = `
                            <div style="text-align:center;margin-bottom:20px;">
                                <div style="font-size:40px;margin-bottom:8px;">&#128274;</div>
                                <p style="font-weight:600;font-size:16px;margin-bottom:4px;">Двухфакторная аутентификация</p>
                                <p style="color:var(--text-secondary);font-size:13px;">Введите 6-значный код из Google Authenticator</p>
                            </div>
                            <div class="form-group">
                                <input type="text" id="login2faCode" maxlength="6" placeholder="000 000"
                                    required autocomplete="one-time-code" inputmode="numeric"
                                    style="text-align:center;font-size:28px;letter-spacing:8px;font-weight:700;padding:14px;">
                            </div>
                            <button type="button" id="login2faBack" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:13px;display:block;margin:8px auto 0;text-decoration:underline;">
                                &larr; Вернуться к входу
                            </button>`;
                        btn.parentNode.insertBefore(grp, btn);
                        document.getElementById('login2faBack').onclick = () => {
                            loginPending2fa = false;
                            loginSavedCreds = null;
                            grp.remove();
                            document.getElementById('loginUser').closest('.form-group').style.display = '';
                            document.getElementById('loginPass').closest('.form-group').style.display = '';
                            btn.textContent = 'Войти';
                            errEl.textContent = '';
                        };
                    }
                    btn.textContent = 'Подтвердить';
                    setTimeout(() => {
                        const ci = document.getElementById('login2faCode');
                        if (ci) ci.focus();
                    }, 100);
                } else if (data.ok && data.user) {
                    showAdmin(data.user);
                } else {
                    errEl.textContent = data.error || 'Ошибка входа';
                    errEl.style.color = 'var(--danger)';
                }
            } catch (ex) {
                errEl.textContent = 'Ошибка соединения';
                errEl.style.color = 'var(--danger)';
            }
            btn.disabled = false;
            if (!loginPending2fa) btn.textContent = 'Войти';
        };

        // Sidebar toggle
        $('#sidebarToggle').onclick = () => $('#sidebar').classList.toggle('open');

        // Sidebar group toggles
        $$('.sidebar-group-toggle').forEach(btn => {
            btn.onclick = () => btn.closest('.sidebar-group').classList.toggle('open');
        });

        // Sidebar navigation
        $$('.sidebar-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                location.hash = '#' + section;
                // Close mobile sidebar
                $('#sidebar').classList.remove('open');
            };
        });

        // Hash routing
        window.onhashchange = () => navigate(location.hash);

        // Logout
        $('#logoutBtn').onclick = async () => {
            await api('logout', { method: 'POST' });
            showLogin();
            location.hash = '';
        };

        // Clock click -> calendar
        $('#topbarClock').onclick = toggleCalendar;

        // Check authentication
        checkAuth();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
