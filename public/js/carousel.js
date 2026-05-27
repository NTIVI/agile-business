/* ================================================================
   Preview carousel (cover + inner screenshot), keyboard + arrows
   ================================================================ */
(function () {
    'use strict';

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    /** @returns {string[]} все уникальные превью: обложка + галерея без дубликатов */
    function buildPreviewSlides(coverImage, galleryArr) {
        const gal = Array.isArray(galleryArr)
            ? galleryArr.map(u => String(u || '').trim()).filter(Boolean)
            : [];
        const cover = String(coverImage || '').trim();
        const seen = new Set();
        const slides = [];
        if (cover) {
            slides.push(cover);
            seen.add(cover);
        }
        for (const u of gal) {
            if (u && !seen.has(u)) {
                slides.push(u);
                seen.add(u);
            }
        }
        if (!slides.length && gal.length) return [...new Set(gal)];
        return slides;
    }

    /**
     * @param {HTMLElement} root
     * @param {string[]} urls
     * @param {{ alt?: string }} opts
     */
    function mount(root, urls, opts) {
        if (!root) return;
        opts = opts || {};
        const slides = (urls || []).filter(Boolean);
        root.innerHTML = '';
        root.classList.add('ab-carousel');
        if (!slides.length) {
            root.style.display = 'none';
            return;
        }
        root.style.display = '';
        const alt = opts.alt || '';
        const track = document.createElement('div');
        track.className = 'ab-carousel__track';
        let idx = 0;

        slides.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = 'ab-carousel__slide' + (i === 0 ? ' is-active' : '');
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
            slide.innerHTML = `<img src="${esc(url)}" alt="${esc(alt)}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
            track.appendChild(slide);
        });

        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'ab-carousel__btn ab-carousel__btn--prev';
        prev.setAttribute('aria-label', 'Предыдущее фото');
        prev.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'ab-carousel__btn ab-carousel__btn--next';
        next.setAttribute('aria-label', 'Следующее фото');
        next.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';

        const dots = document.createElement('div');
        dots.className = 'ab-carousel__dots';

        function go(i) {
            idx = (i + slides.length) % slides.length;
            track.querySelectorAll('.ab-carousel__slide').forEach((el, j) => {
                el.classList.toggle('is-active', j === idx);
            });
            dots.querySelectorAll('button').forEach((b, j) => {
                b.classList.toggle('is-active', j === idx);
                b.setAttribute('aria-current', j === idx ? 'true' : 'false');
            });
        }

        root.appendChild(track);

        if (slides.length > 1) {
            slides.forEach((_, j) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'ab-carousel__dot' + (j === 0 ? ' is-active' : '');
                b.setAttribute('aria-label', `Слайд ${j + 1}`);
                b.addEventListener('click', () => go(j));
                dots.appendChild(b);
            });
            prev.addEventListener('click', () => go(idx - 1));
            next.addEventListener('click', () => go(idx + 1));
            root.appendChild(prev);
            root.appendChild(next);
            root.appendChild(dots);
        }

        root.addEventListener('keydown', (ev) => {
            if (slides.length < 2) return;
            if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(idx - 1); }
            if (ev.key === 'ArrowRight') { ev.preventDefault(); go(idx + 1); }
        });
        root.tabIndex = slides.length > 1 ? 0 : -1;
    }

    window.abCarousel = { mount, buildPreviewSlides };
})();
