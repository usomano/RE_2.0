/* REINCANTAMENTO — theme bootstrap + adaptive home statement contrast. */
(() => {
    'use strict';

    try {
        if (localStorage.getItem('reinc-theme') === 'acid') {
            document.documentElement.setAttribute('data-theme', 'acid');
        }
    } catch (err) {}

    const isHomeVideoTest = location.pathname.endsWith('/home-video-test.html') || location.pathname.endsWith('home-video-test.html');
    if (!isHomeVideoTest) return;

    const style = document.createElement('style');
    style.textContent = `
        @font-face {
            font-family: 'Redaction20 Adaptive';
            src: url('assets/fonts/Redaction20-Regular.woff') format('woff');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }
        @font-face {
            font-family: 'Redaction20 Adaptive';
            src: url('assets/fonts/Redaction20-Italic.woff') format('woff');
            font-weight: 400;
            font-style: italic;
            font-display: swap;
        }
        .home-video-test .home-statement {
            font-family: 'Redaction20 Adaptive', 'Redaction20', Georgia, serif !important;
            -webkit-text-stroke: 0 transparent !important;
            text-shadow: none !important;
            paint-order: normal !important;
            font-synthesis: none !important;
        }
        .home-video-test .home-statement em {
            font-family: 'Redaction20 Adaptive', 'Redaction20', Georgia, serif !important;
            font-style: italic !important;
            font-synthesis: none !important;
        }
        .home-statement__adaptive-canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
            pointer-events: none;
            z-index: 2;
        }
        .home-statement.is-adaptive-ready > p {
            color: transparent !important;
        }
        @media (max-width: 768px) {
            .home-video-test .home-statement {
                top: 44% !important;
                width: 86% !important;
                max-width: 350px !important;
                font-size: clamp(17px, 4.6vw, 19px) !important;
                line-height: 1.08 !important;
                text-wrap: balance;
            }
            .home-video-test .home-statement p + p { margin-top: 20px !important; }
            .home-video-test .home-statement .desktop-break { display: none !important; }
        }
    `;
    document.head.appendChild(style);

    function initAdaptiveStatement() {
        const wordmark = document.querySelector('.home-wordmark img');
        if (wordmark) wordmark.src = 'assets/images/reincantamento-wordmark.svg?v=022d6dc6';

        const video = document.getElementById('background-video');
        const statement = document.querySelector('.home-statement');
        const videoBox = document.querySelector('.plugin-home__video');
        if (!video || !statement || !videoBox) return;

        let canvas = statement.querySelector('.home-statement__adaptive-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'home-statement__adaptive-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            statement.appendChild(canvas);
        }

        const mask = document.createElement('canvas');
        const sample = document.createElement('canvas');
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
        const outCtx = canvas.getContext('2d');
        let layout = null;
        let raf = 0;
        let lastPaint = 0;
        let resizeTimer = 0;

        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const smooth = (a, b, x) => {
            const t = clamp((x - a) / (b - a), 0, 1);
            return t * t * (3 - 2 * t);
        };
        const parseRGB = (value) => {
            const m = value.match(/[\d.]+/g) || [];
            return [+(m[0] || 0), +(m[1] || 9), +(m[2] || 255)];
        };

        function collectRuns(root, rootRect, dpr) {
            const runs = [];
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.closest('.home-statement__adaptive-canvas')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            while (walker.nextNode()) {
                const node = walker.currentNode;
                const text = node.nodeValue;
                const computed = getComputedStyle(node.parentElement);
                const fontSize = parseFloat(computed.fontSize);
                const fontStyle = computed.fontStyle === 'italic' ? 'italic' : 'normal';
                const parts = [...text.matchAll(/\S+\s*/g)];

                for (const part of parts) {
                    const visible = part[0].trimEnd();
                    if (!visible) continue;
                    const range = document.createRange();
                    range.setStart(node, part.index);
                    range.setEnd(node, part.index + visible.length);
                    for (const rect of range.getClientRects()) {
                        if (!rect.width || !rect.height) continue;
                        runs.push({
                            text: visible,
                            x: (rect.left - rootRect.left) * dpr,
                            y: (rect.top - rootRect.top) * dpr,
                            h: rect.height * dpr,
                            fontSize: fontSize * dpr,
                            fontStyle
                        });
                    }
                }
            }
            return runs;
        }

        function rebuild() {
            statement.classList.remove('is-adaptive-ready');
            const rect = statement.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(rect.width * dpr));
            const h = Math.max(1, Math.round(rect.height * dpr));

            canvas.width = mask.width = sample.width = w;
            canvas.height = mask.height = sample.height = h;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            maskCtx.clearRect(0, 0, w, h);
            maskCtx.fillStyle = '#fff';
            maskCtx.textBaseline = 'alphabetic';

            const runs = collectRuns(statement, rect, dpr);
            for (const run of runs) {
                maskCtx.font = `${run.fontStyle} 400 ${run.fontSize}px "Redaction20 Adaptive"`;
                const metrics = maskCtx.measureText(run.text);
                const ascent = metrics.actualBoundingBoxAscent || run.fontSize * 0.78;
                const descent = metrics.actualBoundingBoxDescent || run.fontSize * 0.18;
                const baseline = run.y + (run.h + ascent - descent) / 2;
                maskCtx.fillText(run.text, run.x, baseline);
            }

            const maskData = maskCtx.getImageData(0, 0, w, h).data;
            const active = [];
            for (let i = 3; i < maskData.length; i += 4) {
                if (maskData[i]) active.push(i - 3);
            }

            layout = { w, h, active, maskData, out: outCtx.createImageData(w, h) };
        }

        function drawVideoCrop() {
            if (!layout || video.readyState < 2 || !video.videoWidth) return false;

            const vr = videoBox.getBoundingClientRect();
            const sr = statement.getBoundingClientRect();
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const scale = Math.max(vr.width / vw, vr.height / vh);
            const renderedW = vw * scale;
            const renderedH = vh * scale;
            const cropX = (renderedW - vr.width) / 2;
            const cropY = (renderedH - vr.height) / 2;

            const sx = (sr.left - vr.left + cropX) / scale;
            const sy = (sr.top - vr.top + cropY) / scale;
            const sw = sr.width / scale;
            const sh = sr.height / scale;

            sampleCtx.clearRect(0, 0, layout.w, layout.h);
            sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, layout.w, layout.h);
            return true;
        }

        function paint(ts) {
            raf = requestAnimationFrame(paint);
            if (!layout || ts - lastPaint < 33) return;
            lastPaint = ts;
            if (!drawVideoCrop()) return;

            const bg = sampleCtx.getImageData(0, 0, layout.w, layout.h).data;
            const out = layout.out.data;
            const md = layout.maskData;
            out.fill(0);

            const base = parseRGB(getComputedStyle(statement).color);
            const light = [217, 217, 217];

            for (const i of layout.active) {
                const r = bg[i];
                const g = bg[i + 1];
                const b = bg[i + 2];
                const dominance = b - (r + g) * 0.5;
                const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                let t = smooth(42, 120, dominance) * smooth(45, 120, chroma);
                t = smooth(0.08, 0.92, t);

                out[i] = Math.round(base[0] + (light[0] - base[0]) * t);
                out[i + 1] = Math.round(base[1] + (light[1] - base[1]) * t);
                out[i + 2] = Math.round(base[2] + (light[2] - base[2]) * t);
                out[i + 3] = md[i + 3];
            }

            outCtx.putImageData(layout.out, 0, 0);
            statement.classList.add('is-adaptive-ready');
        }

        function scheduleRebuild() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                rebuild();
                if (!raf) raf = requestAnimationFrame(paint);
            }, 80);
        }

        Promise.all([
            document.fonts.load('400 24px "Redaction20 Adaptive"'),
            document.fonts.load('italic 400 24px "Redaction20 Adaptive"')
        ]).then(() => {
            rebuild();
            if (!raf) raf = requestAnimationFrame(paint);
        });

        if (video.readyState < 2) video.addEventListener('loadeddata', scheduleRebuild, { once: true });
        window.addEventListener('resize', scheduleRebuild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdaptiveStatement, { once: true });
    } else {
        initAdaptiveStatement();
    }
})();
