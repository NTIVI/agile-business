(function() {
    'use strict';

    /** На dev-хосте отключаем весь трекинг — меньше POST и нет путаницы с лимитами/прокси. */
    var HOST = '';
    try { HOST = (location.hostname || '').toLowerCase(); } catch (e) { HOST = ''; }
    var IS_LOCAL_DEV = HOST === 'localhost' || HOST === '127.0.0.1' || HOST === '[::1]';

    /** Явные события (калькулятор и т.д.); на localhost — пустышка. */
    window.abAnalytics = {
        track: function() { /* noop until init below */ }
    };
    if (IS_LOCAL_DEV) return;

    var ENDPOINT = '/api/analytics/event';
    var SESSION_KEY = 'ab_analytics_sid';
    var SENT_SCROLLS_KEY = 'ab_scroll_sent';
    var PAGE_START = Date.now();
    /** Мин. интервал между POST (снижает 429 от nginx/Cloudflare при F5 и скролле) */
    var MIN_SEND_GAP_MS = 900;
    var NEXT_SLOT_KEY = 'ab_analytics_next_slot';
    var LAST_PV_KEY = 'ab_analytics_last_pageview';
    var PV_DEDUPE_MS = 2800;
    var eventQueue = [];
    var flushTimer = null;

    function getSessionId() {
        var sid = sessionStorage.getItem(SESSION_KEY);
        if (!sid) {
            sid = 'ab-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
            sessionStorage.setItem(SESSION_KEY, sid);
        }
        return sid;
    }

    function detectDevice() {
        var w = screen.width || window.innerWidth;
        if (w < 768) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }

    function detectBrowser() {
        var ua = navigator.userAgent || '';
        if (ua.indexOf('Edg') > -1) return 'Edge';
        if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) return 'Opera';
        if (ua.indexOf('YaBrowser') > -1) return 'Yandex';
        if (ua.indexOf('Chrome') > -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) return 'IE';
        return 'Other';
    }

    function detectOS() {
        var ua = navigator.userAgent || '';
        if (ua.indexOf('Windows') > -1) return 'Windows';
        if (ua.indexOf('Mac OS') > -1) return 'macOS';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
        if (ua.indexOf('Linux') > -1) return 'Linux';
        if (ua.indexOf('CrOS') > -1) return 'ChromeOS';
        return 'Other';
    }

    function sendEventNow(data) {
        try {
            var payload = JSON.stringify(data);
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', ENDPOINT, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(payload);
            }
        } catch (e) { /* silently fail */ }
    }

    function scheduleNextSlot() {
        try {
            var t = Date.now() + MIN_SEND_GAP_MS;
            sessionStorage.setItem(NEXT_SLOT_KEY, String(t));
        } catch (e) { /* ignore */ }
    }

    function flushQueue() {
        flushTimer = null;
        if (!eventQueue.length) return;
        var data = eventQueue.shift();
        var now = Date.now();
        var nextSlot = 0;
        try {
            nextSlot = parseInt(sessionStorage.getItem(NEXT_SLOT_KEY) || '0', 10) || 0;
        } catch (e) { nextSlot = 0; }
        if (now < nextSlot) {
            eventQueue.unshift(data);
            flushTimer = setTimeout(flushQueue, nextSlot - now + 30);
            return;
        }
        sendEventNow(data);
        scheduleNextSlot();
        if (eventQueue.length) {
            flushTimer = setTimeout(flushQueue, MIN_SEND_GAP_MS);
        }
    }

    function sendEvent(data) {
        eventQueue.push(data);
        /* не бьёмся об /api/pages и /api/i18n в первый тик */
        if (!flushTimer) {
            flushTimer = setTimeout(flushQueue, 420 + Math.floor(Math.random() * 280));
        }
    }

    function basePayload() {
        return {
            session_id: getSessionId(),
            page_url: location.pathname + location.search,
            page_title: document.title,
            device_type: detectDevice(),
            browser: detectBrowser(),
            os: detectOS(),
            screen_width: screen.width || 0,
            screen_height: screen.height || 0,
            language: localStorage.getItem('ab_lang') || navigator.language || 'ru'
        };
    }

    // Pageview
    function trackPageview() {
        var pathKey = location.pathname + location.search;
        var now = Date.now();
        try {
            var raw = sessionStorage.getItem(LAST_PV_KEY);
            if (raw) {
                var o = JSON.parse(raw);
                if (o && o.k === pathKey && (now - o.t) < PV_DEDUPE_MS) {
                    return;
                }
            }
            sessionStorage.setItem(LAST_PV_KEY, JSON.stringify({ k: pathKey, t: now }));
        } catch (e) { /* ignore */ }

        var data = basePayload();
        data.event_type = 'pageview';
        data.referrer = document.referrer || '';

        var path = location.pathname;
        if (path === '/calculator' || path === '/calculator/') {
            data.is_calculator_start = 1;
        }
        sendEvent(data);
    }

    // Scroll tracking
    function trackScroll() {
        var sentKey = SENT_SCROLLS_KEY;
        var sent = {};
        try { sent = JSON.parse(sessionStorage.getItem(sentKey + location.pathname) || '{}'); } catch (e) { sent = {}; }
        var thresholds = [25, 50, 75, 100];

        function checkScroll() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var docHeight = Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight
            );
            var winHeight = window.innerHeight;
            var scrollable = docHeight - winHeight;
            if (scrollable <= 0) return;
            var pct = Math.round((scrollTop / scrollable) * 100);

            for (var i = 0; i < thresholds.length; i++) {
                var t = thresholds[i];
                if (pct >= t && !sent[t]) {
                    sent[t] = true;
                    sessionStorage.setItem(sentKey + location.pathname, JSON.stringify(sent));
                    var data = basePayload();
                    data.event_type = 'scroll';
                    data.scroll_depth = t;
                    sendEvent(data);
                }
            }
        }

        var scrollTimer = null;
        window.addEventListener('scroll', function() {
            if (scrollTimer) return;
            scrollTimer = setTimeout(function() {
                scrollTimer = null;
                checkScroll();
            }, 300);
        }, { passive: true });
    }

    // Click tracking
    function trackClicks() {
        var selectors = '.btn, .nav__link, .nav__cta, .fab-hub__item, .service-card, a[href]';

        document.addEventListener('click', function(e) {
            var el = e.target;
            for (var depth = 0; depth < 5; depth++) {
                if (!el || el === document.body) return;
                if (el.matches && el.matches(selectors)) break;
                el = el.parentElement;
            }
            if (!el || !el.matches || !el.matches(selectors)) return;

            var text = (el.textContent || '').trim().slice(0, 100);
            var cls = (el.className || '');
            if (typeof cls === 'object') cls = '';
            cls = cls.split(/\s+/).filter(function(c) { return c.length > 0; }).slice(0, 3).join('.');
            var identifier = text || cls || el.tagName;

            var data = basePayload();
            data.event_type = 'click';
            data.element_clicked = identifier.slice(0, 255);
            sendEvent(data);
        }, true);
    }

    // Time on page
    function trackTimeOnPage() {
        function sendTime() {
            var seconds = Math.round((Date.now() - PAGE_START) / 1000);
            if (seconds < 2) return;
            var data = basePayload();
            data.event_type = 'time_on_page';
            data.time_on_page = seconds;
            sendEvent(data);
        }

        window.addEventListener('beforeunload', sendTime);
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') sendTime();
        });
    }

    // Form submission tracking
    function trackForms() {
        document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || form.tagName !== 'FORM') return;

            var data = basePayload();
            data.event_type = 'form_submit';
            data.is_lead_submit = 1;

            var action = form.getAttribute('action') || '';
            if (action.indexOf('calculator') > -1 || location.pathname.indexOf('calculator') > -1) {
                data.is_calculator_complete = 1;
            }
            sendEvent(data);
        }, true);
        /* Не перехватываем window.fetch — иначе в консоли все GET/POST «ссылаются» на analytics.js
           и возможны лишние побочные эффекты. Калькулятор: см. calculator.js → abAnalytics.track */
    }

    window.abAnalytics.track = function(extra) {
        try {
            var data = basePayload();
            if (extra && typeof extra === 'object') {
                for (var k in extra) {
                    if (Object.prototype.hasOwnProperty.call(extra, k)) data[k] = extra[k];
                }
            }
            sendEvent(data);
            // Yandex Metrika goal
            if (extra && extra.event_type && window.ym && window._abYmId) {
                var goalMap = {
                    'lead_submit': 'lead_submit',
                    'form_submit': 'form_submit',
                    'calculator_start': 'calculator_start',
                    'calculator_complete': 'calculator_complete',
                    'cta_click': 'cta_click',
                    'phone_click': 'phone_click',
                    'email_click': 'email_click'
                };
                var goal = goalMap[extra.event_type];
                if (goal) {
                    try { window.ym(window._abYmId, 'reachGoal', goal); } catch(e) {}
                }
            }
        } catch (e) { /* ignore */ }
    };

    // Initialize
    trackPageview();
    trackScroll();
    trackClicks();
    trackTimeOnPage();
    trackForms();

    /* ── Yandex Metrika Auto-Init ───────────────────── */
    (function initYandexMetrika() {
        fetch('/api/metrika-id').then(function(r) { return r.json(); }).then(function(d) {
            var cid = d && d.counter_id;
            if (!cid) return;
            cid = parseInt(cid, 10);
            if (!cid) return;
            window._abYmId = cid;
            // Inject Yandex Metrika script
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(cid, "init", {
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                webvisor: true,
                trackHash: true
            });
            // Auto-goals: phone/email clicks
            document.addEventListener('click', function(e) {
                var link = e.target.closest ? e.target.closest('a[href]') : null;
                if (!link) return;
                var href = link.getAttribute('href') || '';
                if (href.indexOf('tel:') === 0) {
                    try { ym(cid, 'reachGoal', 'phone_click'); } catch(ex) {}
                } else if (href.indexOf('mailto:') === 0) {
                    try { ym(cid, 'reachGoal', 'email_click'); } catch(ex) {}
                }
            }, true);
            // Auto-goal: CTA button clicks  
            document.addEventListener('click', function(e) {
                var el = e.target.closest ? e.target.closest('.nav__cta, .hero__cta, .mobile-menu__cta, .fab-hub__item') : null;
                if (el) { try { ym(cid, 'reachGoal', 'cta_click'); } catch(ex) {} }
            }, true);
        }).catch(function() {});
    })();
})();
