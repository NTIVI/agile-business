/* ================================================================
   Каталог технологий — цветные SVG из Devicon
   https://github.com/devicons/devicon (MIT)
   ================================================================ */
(function () {
    'use strict';

    /* CSP-safe: delegate img onerror via event listener instead of inline attribute */
    document.addEventListener('error', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('detail-page__tech-icon')) {
            if (window.abTechIconOnImgError) window.abTechIconOnImgError(e.target);
        }
    }, true);

    /** id — ключ каталога; URL строится в abTechIconUrl */
    window.TECH_CATALOG = [
        { id: 'javascript', label: 'JavaScript' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'python', label: 'Python' },
        { id: 'java', label: 'Java' },
        { id: 'csharp', label: 'C#' },
        { id: 'cplusplus', label: 'C++' },
        { id: 'c', label: 'C' },
        { id: 'go', label: 'Go' },
        { id: 'rust', label: 'Rust' },
        { id: 'ruby', label: 'Ruby' },
        { id: 'php', label: 'PHP' },
        { id: 'swift', label: 'Swift' },
        { id: 'kotlin', label: 'Kotlin' },
        { id: 'dart', label: 'Dart' },
        { id: 'react', label: 'React' },
        { id: 'nextdotjs', label: 'Next.js' },
        { id: 'nodedotjs', label: 'Node.js' },
        { id: 'express', label: 'Express' },
        { id: 'nestjs', label: 'NestJS' },
        { id: 'vuedotjs', label: 'Vue.js' },
        { id: 'nuxtdotjs', label: 'Nuxt' },
        { id: 'angular', label: 'Angular' },
        { id: 'svelte', label: 'Svelte' },
        { id: 'html5', label: 'HTML5' },
        { id: 'css3', label: 'CSS3' },
        { id: 'sass', label: 'Sass' },
        { id: 'tailwindcss', label: 'Tailwind' },
        { id: 'bootstrap', label: 'Bootstrap' },
        { id: 'wordpress', label: 'WordPress' },
        { id: 'tilda', label: 'Tilda' },
        { id: 'graphql', label: 'GraphQL' },
        { id: 'django', label: 'Django' },
        { id: 'laravel', label: 'Laravel' },
        { id: 'springboot', label: 'Spring Boot' },
        { id: 'mongodb', label: 'MongoDB' },
        { id: 'mysql', label: 'MySQL' },
        { id: 'postgresql', label: 'PostgreSQL' },
        { id: 'redis', label: 'Redis' },
        { id: 'docker', label: 'Docker' },
        { id: 'kubernetes', label: 'Kubernetes' },
        { id: 'nginx', label: 'Nginx' },
        { id: 'amazonaws', label: 'AWS' },
        { id: 'googlecloud', label: 'Google Cloud' },
        { id: 'firebase', label: 'Firebase' },
        { id: 'figma', label: 'Figma' },
        { id: 'webpack', label: 'Webpack' },
        { id: 'vite', label: 'Vite' }
    ];

    window.TECH_LABELS = Object.fromEntries(window.TECH_CATALOG.map(t => [t.id, t.label]));

    /** Папка в devicon/icons/{folder}/ совпадает с именем в devicon.json */
    var DEVICON_TAG = 'v2.16.0';
    var DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@' + DEVICON_TAG + '/icons/';

    /** Нормализованный id (как в каталоге/БД) → папка Devicon, если отличается */
    var DEVICON_FOLDER = {
        nextdotjs: 'nextjs',
        nextjs: 'nextjs',
        nodedotjs: 'nodejs',
        nodejs: 'nodejs',
        vue: 'vuejs',
        vuedotjs: 'vuejs',
        nuxtdotjs: 'nuxtjs',
        nuxtjs: 'nuxtjs',
        nuxt: 'nuxtjs',
        springboot: 'spring',
        amazonaws: 'amazonwebservices',
        aws: 'amazonwebservices',
        googlecloud: 'googlecloud',
        gcp: 'googlecloud',
        openjdk: 'java',
        css: 'css3',
        tailwind: 'tailwindcss',
        dotnet: 'dotnetcore',
        dotnetcore: 'dotnetcore',
        reactnative: 'react',
        jetpack: 'jetpackcompose',
        jetpackcompose: 'jetpackcompose'
    };

    /**
     * Папка → вариант файла (по умолчанию original — полноцветный логотип).
     * У части иконок в Devicon нет original, только plain / wordmark.
     */
    var DEVICON_VARIANT = {
        graphql: 'plain',
        django: 'plain',
        express: 'plain',
        nextjs: 'original',
        amazonwebservices: 'original-wordmark',
        googlecloud: 'plain',
        tailwindcss: 'plain',
        dotnetcore: 'plain',
        jetpackcompose: 'plain',
        objectivec: 'plain'
    };

    window.abTechIconUrl = function (id) {
        if (!id) return '';
        var slug = String(id).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!slug) return '';
        if (slug === 'tilda') {
            return 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FA8669"/>' +
                '<text x="12" y="16.5" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">T</text></svg>'
            );
        }
        var folder = DEVICON_FOLDER[slug] || slug;
        var variant = DEVICON_VARIANT[folder] || 'original';
        return DEVICON_BASE + folder + '/' + folder + '-' + variant + '.svg';
    };

    /** Если original недоступен — пробуем plain (тот же цветной набор Devicon) */
    window.abTechIconOnImgError = function (img) {
        if (!img || !img.src) return;
        var attempt = parseInt(img.dataset.deviconFallback || '0', 10) || 0;
        var u = img.src;
        img.dataset.deviconFallback = String(attempt + 1);

        if (attempt === 0) {
            if (u.indexOf('-original.svg') !== -1) {
                img.src = u.replace('-original.svg', '-plain.svg');
                return;
            }
            if (u.indexOf('-original-wordmark.svg') !== -1) {
                img.src = u.replace('-original-wordmark.svg', '-plain-wordmark.svg');
                return;
            }
        }
        if (attempt <= 1) {
            if (u.indexOf('-plain.svg') !== -1) {
                img.src = u.replace('-plain.svg', '-original-wordmark.svg');
                return;
            }
            if (u.indexOf('-plain-wordmark.svg') !== -1) {
                img.src = u.replace('-plain-wordmark.svg', '-original.svg');
                return;
            }
        }
        img.style.display = 'none';
    };

    /** Безопасная строка для отображения / slug (не [object Object]) */
    function toPlainString(v) {
        if (v == null || v === '') return '';
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            return String(v);
        }
        if (typeof v === 'object') {
            if (typeof v.label === 'string' || typeof v.label === 'number') return String(v.label);
            if (typeof v.name === 'string') return v.name;
            if (typeof v.title === 'string') return v.title;
            if (typeof v.en === 'string') return v.en;
            if (typeof v.ru === 'string') return v.ru;
            if (v.default != null) return toPlainString(v.default);
        }
        return '';
    }

    var BAD_OBJ_STR = /^\[object object\]$/i;

    /** Нормализация элементов stack из API (строка | {id,label} | {label} | вложенный label) */
    window.abNormalizeStackItem = function (item) {
        if (item == null) return null;
        if (typeof item === 'string' || typeof item === 'number') {
            const label = String(item).trim();
            if (!label || BAD_OBJ_STR.test(label)) return null;
            const id = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'tech';
            if (id === 'objectobject') return null;
            return { id, label };
        }
        if (typeof item === 'object') {
            const idRaw = item.id != null ? item.id : (item.slug != null ? item.slug : item.key);
            const idPart = (typeof idRaw !== 'object' && idRaw != null)
                ? String(idRaw).trim()
                : toPlainString(idRaw);
            let labelPart = toPlainString(item.label != null ? item.label : item.name);
            let label = ((labelPart || idPart) + '').trim();
            let id = idPart.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
            if (!label || BAD_OBJ_STR.test(label)) {
                const cat = window.TECH_LABELS && id ? window.TECH_LABELS[id] : '';
                if (cat) label = cat;
                else if (id && id !== 'objectobject') label = id;
                else return null;
            }
            if (!id) {
                id = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'tech';
            }
            if (id === 'objectobject' && window.TECH_LABELS && BAD_OBJ_STR.test(((labelPart || idPart) + '').trim())) return null;
            return { id, label: label.slice(0, 120) };
        }
        return null;
    };

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    /** Рендер блока «На чём сделано» с иконками (и текстовый фолбэк) */
    window.abRenderTechStack = function (container, rawItems) {
        if (!container) return;
        const arr = Array.isArray(rawItems) ? rawItems : [];
        const normalized = arr.map(window.abNormalizeStackItem).filter(Boolean);
        // (prod) no debug telemetry
        if (!normalized.length) {
            container.innerHTML = '<p class="services__desc" style="margin:0;opacity:.75">—</p>';
            return;
        }
        container.innerHTML = normalized.map(t => {
            const idStr = String(t.id || 'tech').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'tech';
            const url = window.abTechIconUrl(idStr);
            const hasIcon = !!(url && idStr.length > 0);
            if (hasIcon) {
                return `<span class="detail-page__tech" title="${esc(t.label)}"><img class="detail-page__tech-icon" src="${esc(url)}" alt="" width="24" height="24" loading="lazy" decoding="async"><span class="detail-page__tech-label">${esc(t.label)}</span></span>`;
            }
            return `<span class="detail-page__tag">${esc(t.label)}</span>`;
        }).join('');
    };

    /** Рендер grouped техстека на странице проекта */
    window.abRenderGroupedTechStack = function (container, stackGroups) {
        if (!container) return;
        const groups = (stackGroups && typeof stackGroups === 'object') ? stackGroups : {};
        const order = [
            ['front', 'Frontend'],
            ['back', 'Backend'],
            ['db', 'Database'],
            ['deploy', 'Deploy'],
            ['android', 'Mobile Android'],
            ['ios', 'Mobile iOS']
        ];

        const blocks = [];
        for (const [key, label] of order) {
            const raw = groups[key];
            const arr = Array.isArray(raw) ? raw : [];
            const normalized = arr.map(window.abNormalizeStackItem).filter(Boolean);
            if (!normalized.length) continue;

            const chips = normalized.map(t => {
                const idStr = String(t.id || 'tech').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48) || 'tech';
                const url = window.abTechIconUrl(idStr);
                const hasIcon = !!(url && idStr.length > 0);
                if (hasIcon) {
                    return `<span class="detail-page__tech" title="${esc(t.label)}"><img class="detail-page__tech-icon" src="${esc(url)}" alt="" width="24" height="24" loading="lazy" decoding="async"><span class="detail-page__tech-label">${esc(t.label)}</span></span>`;
                }
                return `<span class="detail-page__tag">${esc(t.label)}</span>`;
            }).join('');

            blocks.push(`
                <div class="work-tech-group">
                    <div class="work-tech-group__title">${esc(label)}</div>
                    <div class="work-tech-group__chips">${chips}</div>
                </div>
            `);
        }

        if (!blocks.length) {
            container.innerHTML = '<p class="services__desc" style="margin:0;opacity:.75">—</p>';
            return;
        }
        container.innerHTML = blocks.join('');
    };
})();

