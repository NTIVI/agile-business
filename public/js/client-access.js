/* ================================================================
   AGILE BUSINESS — Client Login/Register
   ================================================================ */
(function () {
    'use strict';

    const $ = (s, p) => (p || document).querySelector(s);

    function show(tab) {
        const login = $('#loginForm');
        const reg = $('#registerForm');
        const tl = $('#tabLogin');
        const tr = $('#tabRegister');
        if (!login || !reg) return;
        const isLogin = tab === 'login';
        login.style.display = isLogin ? '' : 'none';
        reg.style.display = isLogin ? 'none' : '';
        tl && tl.classList.toggle('btn--primary', isLogin);
        tr && tr.classList.toggle('btn--primary', !isLogin);
    }

    async function postJson(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'error');
        return data;
    }

    function toast(msg) {
        if (typeof window.showToast === 'function') return window.showToast(msg);
        alert(msg);
    }

    function init() {
        const tl = $('#tabLogin');
        const tr = $('#tabRegister');
        tl && tl.addEventListener('click', () => show('login'));
        tr && tr.addEventListener('click', () => show('register'));

        const loginForm = $('#loginForm');
        loginForm && loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const d = await postJson('/api/client/login', {
                    email: $('#loginEmail').value,
                    password: $('#loginPassword').value
                });
                toast('OK');
                if (d.slug) window.location.href = `/client/${encodeURIComponent(d.slug)}`;
            } catch (err) {
                toast(err.message || 'Ошибка входа');
            }
        });

        const regForm = $('#registerForm');
        regForm && regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const d = await postJson('/api/client/register', {
                    email: $('#regEmail').value,
                    slug: $('#regSlug').value,
                    password: $('#regPassword').value
                });
                toast('OK');
                if (d.slug) window.location.href = `/client/${encodeURIComponent(d.slug)}`;
            } catch (err) {
                toast(err.message || 'Ошибка регистрации');
            }
        });

        show('login');
    }

    document.addEventListener('DOMContentLoaded', init);
})();

