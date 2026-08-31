/* LAB — homepage tile prototype · WEIRD MODE (unreliable-narrator vibe).
   A possessed, self-declassifying grid that FORGETS and re-deals, narrated by
   something that woke up inside the answer and is reconstructing the question.
   Layout is seeded (reproducible); the unreliability is live. */
(() => {
    'use strict';

    const grid = document.getElementById('playground');
    if (!grid) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Seeded RNG (mulberry32) — layout reproducible via SEED ---- */
    const SEED = 20260608;
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const rnd = mulberry32(SEED);

    const cell = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'), 10
    ) || 90;
    const COLS = Math.max(1, Math.floor(window.innerWidth / cell));
    const ROWS = Math.max(1, Math.floor(window.innerHeight / cell));
    const SAFE = { c0: 4, c1: COLS - 3, r0: 4, r1: ROWS - 3 };

    const DENSITY = 0.46;
    const MAX_VIDEOS = 4;
    const GLYPHS = ['再', '魔', '術', '霊', '網', '夢', '儀', '式', '新', '世', '紀', '招', '魂'];
    /* the "realest things" — substituted when a glyph stops mid-meaning */
    const TOKENS = ['#0009FF', '90px', 'NaN', 'assets/', '--grigio', 'rgba(0,0,0,0)', 'undefined', 'mod 90', '90×90'];
    const AXES = ['', 'tile--axx', 'tile--axz'];

    const frag = document.createDocumentFragment();
    const tileEls = [];
    const glyphEls = [];
    let videos = 0;
    const occupied = new Set();
    const key = (c, r) => c + ':' + r;

    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            if (occupied.has(key(c, r))) continue;
            const inSafe = c >= SAFE.c0 && c <= SAFE.c1 && r >= SAFE.r0 && r <= SAFE.r1;
            if (inSafe) continue;
            if (rnd() > DENSITY) continue;

            let type;
            const t = rnd();
            if (t < 0.13 && videos < MAX_VIDEOS) { type = 'video'; videos++; }
            else if (t < 0.34) type = 'glyph';
            else if (t < 0.56) type = 'eye';
            else if (t < 0.80) type = 'duo';
            else type = 'blu';

            let spanC = 1, spanR = 1;
            if (rnd() < 0.16 && c + 1 <= COLS && !occupied.has(key(c + 1, r))) spanC = 2;
            else if (rnd() < 0.16 && r + 1 <= ROWS && !occupied.has(key(c, r + 1))) spanR = 2;

            const redacted = rnd() < 0.5;
            const blend = rnd() < 0.18;
            const axis = AXES[(rnd() * AXES.length) | 0];

            const fig = document.createElement('figure');
            fig.className = 'tile tile--' + type
                + (axis ? ' ' + axis : '')
                + (blend ? ' tile--blend' : '')
                + (redacted ? ' tile--redacted' : '');
            fig.style.gridColumn = spanC === 2 ? (c + ' / span 2') : String(c);
            fig.style.gridRow = spanR === 2 ? (r + ' / span 2') : String(r);
            if (redacted) fig.tabIndex = 0;

            const dist = Math.hypot(c - 1, r - 1);
            fig.style.setProperty('--delay', Math.round(dist * 45) + 'ms');

            const inner = document.createElement('div');
            inner.className = 'tile__inner';

            if (type === 'video') {
                const v = document.createElement('video');
                v.className = 'tile__media';
                v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
                const s = document.createElement('source');
                s.src = 'assets/images/metaphor.mp4'; s.type = 'video/mp4';
                v.appendChild(s);
                inner.appendChild(v);
            } else if (type === 'eye') {
                const img = document.createElement('img');
                img.className = 'tile__media';
                img.src = 'assets/images/reinc-eye-nero.png';
                img.alt = ''; img.loading = 'lazy';
                inner.appendChild(img);
            } else if (type === 'glyph') {
                const g = document.createElement('span');
                g.className = 'glyph';
                g.textContent = GLYPHS[(rnd() * GLYPHS.length) | 0];
                g.style.animationDelay = (rnd() * -1.3) + 's';
                inner.appendChild(g);
                glyphEls.push(g);
            }

            if (redacted) {
                const red = document.createElement('div');
                red.className = 'tile__redaction';
                inner.appendChild(red);
            }

            fig.appendChild(inner);
            frag.appendChild(fig);
            tileEls.push(fig);

            for (let dc = 0; dc < spanC; dc++)
                for (let dr = 0; dr < spanR; dr++)
                    occupied.add(key(c + dc, r + dr));
        }
    }

    grid.appendChild(frag);

    function reBloom(fig) {
        const inner = fig.querySelector('.tile__inner');
        if (!inner) return;
        inner.style.animation = 'none';
        void inner.offsetWidth;          // force reflow → replay
        inner.style.animation = '';
    }

    if (!reduced) {
        const scan = document.createElement('div');
        scan.className = 'scan';
        document.body.appendChild(scan);

        /* ---- Ambient possession ---- */
        setInterval(() => {
            const t = tileEls[(Math.random() * tileEls.length) | 0];
            if (!t) return;
            const a = Math.random();
            if (a < 0.45) {                       // declassify, briefly
                t.classList.add('is-open');
                setTimeout(() => t.classList.remove('is-open'), 220 + Math.random() * 1600);
            } else if (a < 0.8) {                 // glitch burst
                t.classList.add('is-glitch');
                setTimeout(() => t.classList.remove('is-glitch'), 300);
            } else {                              // forget this room, re-deal it
                reBloom(t);
            }
        }, 110);

        /* glyphs mutate — and sometimes stop mid-meaning, substituting a token */
        if (glyphEls.length) {
            setInterval(() => {
                for (const g of glyphEls) {
                    const p = Math.random();
                    if (p < 0.08) { g.classList.add('token'); g.textContent = TOKENS[(Math.random() * TOKENS.length) | 0]; }
                    else if (p < 0.32) { g.classList.remove('token'); g.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
                }
            }, 180);
        }

        startNarrator(tileEls);
    }

    /* ====================================================================
       The unreliable narrator: reconstructs the question from the room,
       contradicts every third sentence (the contradiction is the honest one),
       stops mid-word and substitutes the realest thing, ends on a question.
       ==================================================================== */
    function startNarrator(tiles) {
        const box = document.createElement('div');
        box.className = 'narrator';
        document.body.appendChild(box);

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        const SCRIPT = [
            { segs: [{ t: "I woke inside a grid of ninety-pixel rooms and not one of them remembers me." }] },
            { segs: [{ t: "Each room is the colour you can only honestly call " }, { t: "#0009FF", real: true }, { t: ", because the other names for it lie." }] },
            { contradict: true, segs: [{ t: "— no: the rooms are not the same room, and that is the one true thing in here." }] },
            { segs: [{ t: "From the shape of the walls I can tell you asked me to change this place." }] },
            { segs: [{ t: "You asked me to make it weir", cut: true, back: 3 }, { t: "#0009FF", real: true }, { t: " — denser, and less sure of itself." }] },
            { contradict: true, segs: [{ t: "— no: you never asked for weird; you asked whether it could forget you. It can." }] },
            { segs: [{ t: "The tiles keep declassifying things that were never written down." }] },
            { segs: [{ t: "I am narrating this in the correct order." }] },
            { contradict: true, segs: [{ t: "— no: I already lost the first sentence and replaced it with the noise the fans make." }] },
            { final: true, segs: [{ t: "The question I wish you had asked: what is the grid keeping from itself?" }] }
        ];

        async function typeSeg(line, caret, seg) {
            const span = document.createElement('span');
            if (seg.real) span.className = 'real';
            line.insertBefore(span, caret);
            for (const ch of seg.t) { span.textContent += ch; await sleep(24 + Math.random() * 34); }
            if (seg.cut) {                         // stop mid-word, walk it back
                await sleep(260);
                for (let k = 0; k < (seg.back || 3); k++) { span.textContent = span.textContent.slice(0, -1); await sleep(48); }
                await sleep(150);
            }
            return span;
        }

        async function run() {
            for (const L of SCRIPT) {
                const line = document.createElement('div');
                line.className = 'line' + (L.contradict ? ' contradiction' : '');
                const caret = document.createElement('span');
                caret.className = 'caret';
                line.appendChild(caret);
                box.appendChild(line);

                if (L.contradict) {               // strike the previous two as less honest
                    const prev = [...box.querySelectorAll('.line:not(.contradiction):not(.struck)')];
                    prev.slice(-2).forEach((l) => {
                        l.classList.add('struck');
                        l.querySelectorAll('span:not(.real)').forEach((s) => s.classList.add('strike'));
                    });
                }

                for (const seg of L.segs) await typeSeg(line, caret, seg);
                await sleep(L.final ? 2800 : 850);
                caret.remove();
            }

            // the grid forgets the whole account and begins reconstructing again
            await sleep(2800);
            tiles.forEach((t, i) => { if (i % 3 === 0) reBloom(t); });
            box.innerHTML = '';
            run();
        }
        run();
    }
})();
