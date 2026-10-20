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

    /* Snap the WRITINGS cell to the grid — see the same block in main.js: the
       nav is a row of text with gaps, its blue square is cell-sized, and a
       square off the painted lines reads as a mistake on a page made of them. */
    const navItem = document.querySelector('.nav-item');

    const snapNavItem = (cell) => {
        if (!navItem) return;
        navItem.style.left = '';
        if (window.innerWidth <= MOBILE_BP) return;
        const x = navItem.getBoundingClientRect().left;
        navItem.style.left = (Math.round(x / cell) * cell - x) + 'px';
    };

    const fitGrid = () => {
        queued = false;
        const w = root.clientWidth;
        const cols = w <= MOBILE_BP ? MOBILE_COLS : nearestValidCols(w / TARGET_CELL);
        const cell = w / cols;
        root.style.setProperty('--cols', String(cols));
        root.style.setProperty('--cell', cell + 'px');
        // The colourway switch sits in the last WHOLE row of the first screen.
        // The module is square here, so the viewport height rarely divides by
        // it: measure where that row starts rather than hanging off the bottom.
        const rows = Math.max(1, Math.floor(window.innerHeight / cell));
        root.style.setProperty('--screen-last-row', ((rows - 1) * cell) + 'px');
        snapNavItem(cell);
        snapBlocks(cell);
        fitFigures(cell, cols, rows);
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
        // The .blk--row / .blk--rows floors are the no-JS fallback: once the
        // copy can actually be measured they would only keep a one-line block
        // from closing up to a single row, so they come off first.
        blocks.forEach((el) => {
            el.style.height = 'auto';
            if (el.classList.contains('blk')) el.style.minHeight = '0';
        });
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

    /* ---- Fit drop figures to the screen ----
       A figure is the 8-cell reading column wide (the whole column on mobile)
       and as many rows tall as its shape asks, which for a portrait image is
       more than a screen. Here each one gives up width until it, its caption
       and the header row fit the viewport, staying centred on the painted grid:
       a figure's width keeps the parity of the content width (12 → even,
       the mobile 11 → odd) so the gap either side is whole cells. Heights stay in whole rows; an image too far from one
       is shown whole (--fit) rather than cropped. Without JS the figures keep
       the size build.py gave them. */
    const FIT_OFF = 0.12;   // the crop tolerance build.py uses

    /* ---- Section index ----
       Pinned in the left margin: from the second column line to a cell short
       of the reading column (figures may stand a cell proud of the text), a
       row under the header. Only where that leaves two whole cells. */
    const toc = document.querySelector('.toc');

    const placeToc = (cell, readStart) => {
        if (!toc) return;
        const span = readStart - 3;     // cells between line 2 and readStart - 1
        const ok = span >= 2;
        toc.classList.toggle('is-placed', ok);
        if (!ok) return;
        toc.style.left = (cell + 1) + 'px';
        toc.style.top = (cell * 2 + 1) + 'px';
        toc.style.width = (Math.min(span, 3) * cell - 1) + 'px';
        toc.style.maxHeight = (window.innerHeight - cell * 3) + 'px';
        toc.style.overflowY = 'auto';
        queueToc();
    };

    let tocQueued = false;
    const tocLinks = toc ? [...toc.querySelectorAll('a')] : [];
    const tocHeads = tocLinks.map((a) => document.getElementById(a.hash.slice(1)));
    const tocArticle = document.querySelector('.article');

    const updateToc = () => {
        tocQueued = false;
        if (!toc || !tocArticle) return;
        const vh = window.innerHeight;
        const box = tocArticle.getBoundingClientRect();
        // Shown from the first section on, until the article ends.
        const firstTop = tocHeads[0] ? tocHeads[0].getBoundingClientRect().top : box.top;
        toc.classList.toggle('is-on', firstTop < vh * 0.6 && box.bottom > vh * 0.5);
        let cur = -1;
        tocHeads.forEach((h, i) => {
            if (h && h.getBoundingClientRect().top < vh * 0.35) cur = i;
        });
        tocLinks.forEach((a, i) => {
            if (i === cur) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
        });
    };

    const queueToc = () => {
        if (tocQueued) return;
        tocQueued = true;
        requestAnimationFrame(updateToc);
    };

    if (toc) window.addEventListener('scroll', queueToc, { passive: true });

    const READ_WIDTH = 720;     // px — about 75 characters of body copy

    const fitFigures = (cell, cols, screenRows) => {
        const mobile = root.clientWidth <= MOBILE_BP;
        const content = mobile ? cols - 2 : cols - 4;
        const firstLine = mobile ? 2 : 3;
        // The reading column: the width in cells nearest 720px, of the same
        // parity as the content (9, 12, 15 … cells) so it sits centred on
        // whole cells. On mobile it is the whole content width.
        let read = content;
        if (!mobile) {
            read = Math.round(READ_WIDTH / cell);
            if ((content - read) % 2) read += (READ_WIDTH / cell > read ? 1 : -1);
            read = Math.min(content, Math.max(3, read));
        }
        const inset = (content - read) / 2;
        root.style.setProperty('--read-start', String(firstLine + inset));
        root.style.setProperty('--read-end', String(-(firstLine + inset)));
        placeToc(cell, mobile ? 0 : firstLine + inset);
        // A landscape figure may stand a cell proud of the text either side.
        const maxCols = Math.min(content, read + 2);
        document.querySelectorAll('figure.c-fig').forEach((fig) => {
            const box = fig.querySelector('.blk-figure[data-w]');
            if (!box) return;
            const ratio = (+box.dataset.h) / (+box.dataset.w);
            const cap = fig.querySelector('figcaption');
            const capRows = cap ? Math.round((cap.offsetHeight + 1) / cell) : 0;
            const avail = Math.max(2, screenRows - 1 - capRows);
            let c = maxCols;
            if (c * ratio > avail) {
                c = Math.floor(avail / ratio);
                if ((content - c) % 2) c -= 1;
                c = Math.max(content % 2 ? 1 : 2, c);
            }
            const ideal = c * ratio;
            const r = Math.min(avail, Math.max(1, Math.round(ideal)));
            const off = Math.abs(r - ideal) / Math.max(r, ideal);
            fig.style.gridColumn = (firstLine + (content - c) / 2) + ' / span ' + c;
            box.style.height = (r * cell - 1) + 'px';
            box.classList.toggle('blk-figure--fit', off > FIT_OFF);
        });
    };

    const scheduleFit = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(fitGrid);
    };

    fitGrid();
    window.addEventListener('resize', scheduleFit);
    // An opened or closed greeting changes its block's height.
    document.querySelectorAll('.blk-intro').forEach((d) => {
        d.addEventListener('toggle', fitGrid);
    });
    window.addEventListener('orientationchange', scheduleFit);
    // Web fonts change how the copy wraps — re-snap once they have loaded.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleFit);
    }

    /* ---- Mobile navigation ----
       Same header as the home shell, so the same control: a hamburger that
       drops a full-screen panel. */
    const menuBtn = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');

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
            if (!e.target.closest('.site-header')) setOpen(false);
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
    const toggle = document.querySelector('.theme-switch, .theme-toggle');

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
