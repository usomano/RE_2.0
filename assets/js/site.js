/* REINCANTAMENTO — section pages (Writing / Publishing / Artworks).
   Progressive enhancement: the pages render and navigate fine without this.
   Three jobs: keep the grid module on whole columns, collapse the nav on
   mobile, and switch acid mode. */
(() => {
    'use strict';

    const root = document.documentElement;
    root.classList.add('js');

    /* ---- Grid module ----
       The Figma frames are 1440 wide on a 90px module → 16 columns, and the
       layout leans on that count: two empty columns each side, twelve of
       content, three equal cards. Any column count with (N - 4) divisible by 3
       preserves that, so we pick the closest such N to width / 90 and divide the
       viewport by it — cells stay square and every painted block still lands on
       a real grid line at any window size. Mobile is fixed at the 13 columns of
       the 390px frame. We measure clientWidth, not 100vw, so a visible
       scrollbar doesn't push the columns out of alignment. */
    const TARGET_CELL = 90;
    const MOBILE_BP = 768;
    const MOBILE_COLS = 13;
    const MIN_COLS = 13;        // the nav alone needs five columns

    const nearestValidCols = (raw) => {
        // Valid counts are 13, 16, 19, 22 … — step 3 from 13.
        const steps = Math.max(0, Math.round((raw - MIN_COLS) / 3));
        return MIN_COLS + steps * 3;
    };

    let queued = false;

    const fitGrid = () => {
        queued = false;
        const w = root.clientWidth;
        const cols = w <= MOBILE_BP ? MOBILE_COLS : nearestValidCols(w / TARGET_CELL);
        const cell = w / cols;
        root.style.setProperty('--cols', String(cols));
        root.style.setProperty('--cell', cell + 'px');
        snapBlocks(cell);
    };

    /* ---- Snap text blocks to whole grid rows ----
       Every filled text block in the Figma frames covers an exact number of grid
       squares (89px, 179px, 269px …) whatever the copy inside it. CSS can only
       set a floor, so once the real text has laid out we round each block up to
       the next whole row (minus the 1px that keeps its leading grid line
       visible). Without JS the CSS min-heights still give a sane layout — only
       the bottom edge of an unusually long block falls off the grid. */
    const SNAP = '.blk, .card__body, .title-band, .next-band';
    const CLEARANCE = 4;    // px of breathing room required under the last line

    const snapBlocks = (cell) => {
        const blocks = document.querySelectorAll(SNAP);
        if (!blocks.length) return;
        // Measure every block first, then write — one reflow instead of N.
        blocks.forEach((el) => { el.style.height = 'auto'; });
        const rows = [];
        blocks.forEach((el) => {
            // The copy is top-aligned in the snapped box, so the block only has
            // to fit its top padding + text + a little clearance. Counting the
            // bottom padding too would tip blocks whose text nearly fills a row
            // into a second one — Figma keeps them at one.
            const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
            const needed = el.getBoundingClientRect().height
                - padBottom + Math.min(padBottom, CLEARANCE) + 1;
            rows.push(Math.max(1, Math.ceil(needed / cell)));
        });
        blocks.forEach((el, i) => { el.style.height = (rows[i] * cell - 1) + 'px'; });
    };

    const scheduleFit = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(fitGrid);
    };

    fitGrid();
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);
    // Web fonts change how the copy wraps — re-snap once they have loaded.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleFit);
    }

    /* ---- Mobile navigation ---- */
    const menuBtn = document.querySelector('.grid-header__menu');
    const nav = document.querySelector('.grid-nav');

    if (menuBtn && nav) {
        const setOpen = (open) => {
            menuBtn.setAttribute('aria-expanded', String(open));
            nav.dataset.open = String(open);
        };

        setOpen(false);

        menuBtn.addEventListener('click', () => {
            setOpen(menuBtn.getAttribute('aria-expanded') !== 'true');
        });

        nav.addEventListener('click', (e) => {
            if (e.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
                setOpen(false);
                menuBtn.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
            if (!e.target.closest('.grid-header')) setOpen(false);
        });
    }

    /* ---- Reading progress ----
       How far through the article body, not the document: the footer and the
       next-drop band are not part of the read. */
    const rail = document.querySelector('.reading-progress');
    const article = document.querySelector('.article');

    if (rail && article) {
        const fill = rail.querySelector('span');
        let pending = false;

        const drawProgress = () => {
            pending = false;
            const box = article.getBoundingClientRect();
            const run = box.height - window.innerHeight;
            const done = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : (box.top <= 0 ? 1 : 0);
            fill.style.width = (done * 100) + '%';
            rail.setAttribute('aria-valuenow', String(Math.round(done * 100)));
        };

        const queueProgress = () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(drawProgress);
        };

        drawProgress();
        window.addEventListener('scroll', queueProgress, { passive: true });
        window.addEventListener('resize', queueProgress, { passive: true });
    }

    /* ---- Figure lightbox ----
       Every figure is cut to a whole number of grid rows, so a tall image is
       only ever partly on show. Clicking it lifts the whole thing out. */
    const figures = document.querySelectorAll('.blk-figure--auto img');

    if (figures.length) {
        let box = null;

        const close = () => {
            if (!box) return;
            box.close();
            box.remove();
            box = null;
        };

        const open = (img) => {
            close();
            box = document.createElement('dialog');
            box.className = 'lightbox';
            const close_btn = document.createElement('button');
            close_btn.className = 'lightbox__close';
            close_btn.type = 'button';
            close_btn.setAttribute('aria-label', 'Close');
            close_btn.innerHTML = '&#215;';
            const full = document.createElement('img');
            full.src = img.currentSrc || img.src;
            full.alt = img.alt;
            box.append(close_btn, full);
            document.body.appendChild(box);
            box.showModal();
            box.addEventListener('click', (e) => {
                // the backdrop and the button close; the picture itself does not
                if (e.target !== full) close();
            });
            box.addEventListener('close', close);
        };

        figures.forEach((img) => {
            img.addEventListener('click', () => open(img));
        });
    }

    /* ---- Writing: one year at a time ----
       Every card is in the page; the band decides which year is on show, so the
       list works untouched without JS. The two halves of the timeline live on
       two pages (drops from 2023, archive before it), and the last cell of the
       band carries the crossing — including the year to land on. */
    const band = document.querySelector('.year-nav');
    const cardGrid = document.getElementById('card-grid');

    if (band && cardGrid) {
        const links = Array.from(band.querySelectorAll('.year-nav__year'));
        const years = links.map((a) => a.dataset.year);
        const steps = Array.from(band.querySelectorAll('.year-nav__step'));
        const other = band.querySelector('.year-nav__other');
        const otherYear = other && (other.getAttribute('href').split('#')[1] || '');
        // which direction the other page lies in: older years, or newer ones
        const otherDir = otherYear && otherYear < years[0] ? -1 : 1;
        const cards = Array.from(cardGrid.querySelectorAll('.card'));

        let shown = years[years.length - 1];

        const render = () => {
            links.forEach((a) => {
                if (a.dataset.year === shown) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
            cards.forEach((c) => { c.hidden = c.dataset.year !== shown; });
            const i = years.indexOf(shown);
            // The end of the whole timeline (2026 forward, 2020 back): that
            // arrow is dropped rather than greyed out, and the band records
            // which side it lost so the year block can take the empty cell.
            let end = '';
            steps.forEach((btn) => {
                const dir = Number(btn.dataset.step);
                const stays = years[i + dir] !== undefined;
                const crosses = dir === otherDir && !!other;
                const dead = !stays && !crosses;
                if (dead) end = dir > 0 ? 'next' : 'prev';
                btn.setAttribute('aria-disabled', String(dead));
                btn.setAttribute('href', stays ? '#' + years[i + dir]
                                               : (crosses ? other.getAttribute('href') : '#'));
            });
            if (end) band.dataset.end = end;
            else band.removeAttribute('data-end');
        };

        const show = (year) => {
            if (!years.includes(year)) return;
            shown = year;
            render();
            try { history.replaceState(null, '', '#' + year); } catch (e) { /* file:// */ }
        };

        band.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a || a === other) return;
            const href = a.getAttribute('href') || '';
            // an arrow at the end of the run points at the other page: let it go
            if (!href.startsWith('#')) return;
            e.preventDefault();
            show(href.slice(1));
        });

        const fromHash = (location.hash || '').slice(1);
        show(years.includes(fromHash) ? fromHash : shown);
        window.addEventListener('hashchange', () => {
            const y = (location.hash || '').slice(1);
            if (years.includes(y)) show(y);
        });
    }

    /* ---- Acid mode ----
       theme.js has already applied the stored choice; here we only wire the
       switch and persist what the reader picks. */
    const toggle = document.querySelector('.theme-toggle');

    if (toggle) {
        const sync = () => {
            const on = root.getAttribute('data-theme') === 'acid';
            toggle.setAttribute('aria-pressed', String(on));
        };

        sync();

        toggle.addEventListener('click', () => {
            const on = root.getAttribute('data-theme') === 'acid';
            if (on) {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', 'acid');
            }
            try {
                localStorage.setItem('reinc-theme', on ? 'default' : 'acid');
            } catch (err) {
                /* Storage unavailable — the switch still works for this visit. */
            }
            sync();
        });
    }
})();
