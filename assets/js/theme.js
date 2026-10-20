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
            isolation: isolate;
        }
        .home-video-test .home-statement em {
            font-family: 'Redaction20 Adaptive', 'Redaction20', Georgia, serif !important;
            font-style: italic !important;
            font-weight: 400;
            font-synthesis: none !important;
        }
        .home-statement__light-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            color: #d9d9d9;
            pointer-events: none;
            overflow: visible;
        }
        .home-statement__light-overlay p { margin: 0; }
        .home-statement__light-overlay p + p { margin-top: 28px; }
        .home-statement__light-overlay--soft { opacity: .18; z-index: 2; }
        .home-statement__light-overlay--mid { opacity: .52; z-index: 3; }
        .home-statement__light-overlay--strong { opacity: 1; z-index: 4; }
        @media (max-width: 768px) {
            .home-video-test .home-statement {
                top: 44% !important;
                width: 86% !important;
                max-width: 350px !important;
                font-size: clamp(17px, 4.6vw, 19px) !important;
                line-height: 1.08 !important;
                text-wrap: balance;
            }
            .home-video-test .home-statement p + p,
            .home-statement__light-overlay p + p { margin-top: 20px !important; }
            .home-video-test .home-statement .desktop-break { display: none !important; }
        }
    `;
    document.head.appendChild(style);

    function initAdaptiveStatement() {
        const video = document.getElementById('background-video');
        const statement = document.querySelector('.home-statement');
        const videoBox = document.querySelector('.plugin-home__video');
        if (!video || !statement || !videoBox) return;

        document.querySelectorAll('.home-statement--adaptive, .home-statement__adaptive-canvas, .home-statement__tone, .home-statement__light-overlay').forEach((node) => node.remove());

        const sourceMarkup = Array.from(statement.children)
            .filter((node) => node.tagName === 'P')
            .map((node) => node.outerHTML)
            .join('');

        const makeOverlay = (variant) => {
            const overlay = document.createElement('div');
            overlay.className = `home-statement__light-overlay home-statement__light-overlay--${variant}`;
            overlay.setAttribute('aria-hidden', 'true');
            overlay.innerHTML = sourceMarkup;
            statement.appendChild(overlay);
            return overlay;
        };

        const softOverlay = makeOverlay('soft');
        const midOverlay = makeOverlay('mid');
        const strongOverlay = makeOverlay('strong');

        const sample = document.createElement('canvas');
        const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
        let geometry = null;
        let resizeTimer = 0;
        let videoFrameHandle = 0;
        let rafHandle = 0;

        function rebuildGeometry() {
            const rect = statement.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));
            sample.width = w;
            sample.height = h;
            geometry = { w, h };
        }

        function drawVideoCrop() {
            if (!geometry || video.readyState < 2 || !video.videoWidth) return false;

            const vr = videoBox.getBoundingClientRect();
            const sr = statement.getBoundingClientRect();
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            // Video uses object-fit: cover and object-position: center.
            // Sample the same visible crop so the adaptive text stays synchronized.
            const scale = Math.max(vr.width / vw, vr.height / vh);
            const cropX = (vw * scale - vr.width) / 2;
            const cropY = (vh * scale - vr.height) / 2;

            const sx = (sr.left - vr.left + cropX) / scale;
            const sy = (sr.top - vr.top + cropY) / scale;
            const sw = sr.width / scale;
            const sh = sr.height / scale;

            sampleCtx.clearRect(0, 0, geometry.w, geometry.h);
            sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, geometry.w, geometry.h);
            return true;
        }

        function scoreBlue(r, g, b) {
            const dominance = b - (r + g) * 0.5;
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            return Math.min(dominance, chroma);
        }

        function pathForThreshold(data, threshold) {
            const { w, h } = geometry;
            let d = '';
            for (let y = 0; y < h; y += 1) {
                let start = -1;
                for (let x = 0; x <= w; x += 1) {
                    let on = false;
                    if (x < w) {
                        const i = (y * w + x) * 4;
                        on = scoreBlue(data[i], data[i + 1], data[i + 2]) >= threshold;
                    }
                    if (on && start < 0) start = x;
                    if ((!on || x === w) && start >= 0) {
                        const width = x - start;
                        if (width > 0) d += `M${start} ${y}h${width}v1h-${width}Z`;
                        start = -1;
                    }
                }
            }
            return d || 'M0 0Z';
        }

        function setLocalClip(element, d) {
            const value = `path("${d}")`;
            element.style.clipPath = value;
            element.style.webkitClipPath = value;
        }

        function paintCurrentVideoFrame() {
            if (!geometry || !drawVideoCrop()) return;
            const data = sampleCtx.getImageData(0, 0, geometry.w, geometry.h).data;

            // Three close bands follow the blurred blob edge instead of waiting for fully saturated blue.
            // This removes the perceived lag while keeping the transition local to the moving blue area.
            setLocalClip(softOverlay, pathForThreshold(data, 42));
            setLocalClip(midOverlay, pathForThreshold(data, 58));
            setLocalClip(strongOverlay, pathForThreshold(data, 74));
        }

        function startFrameSync() {
            if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                const onVideoFrame = () => {
                    paintCurrentVideoFrame();
                    videoFrameHandle = video.requestVideoFrameCallback(onVideoFrame);
                };
                if (videoFrameHandle) video.cancelVideoFrameCallback?.(videoFrameHandle);
                videoFrameHandle = video.requestVideoFrameCallback(onVideoFrame);
            } else {
                const fallback = () => {
                    paintCurrentVideoFrame();
                    rafHandle = requestAnimationFrame(fallback);
                };
                cancelAnimationFrame(rafHandle);
                rafHandle = requestAnimationFrame(fallback);
            }
        }

        function scheduleRebuild() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                rebuildGeometry();
                paintCurrentVideoFrame();
            }, 60);
        }

        Promise.all([
            document.fonts.load('400 24px "Redaction20 Adaptive"'),
            document.fonts.load('italic 400 24px "Redaction20 Adaptive"')
        ]).then(() => {
            rebuildGeometry();
            paintCurrentVideoFrame();
            startFrameSync();
        });

        if (video.readyState < 2) video.addEventListener('loadeddata', scheduleRebuild, { once: true });
        video.addEventListener('seeked', paintCurrentVideoFrame);
        video.addEventListener('play', paintCurrentVideoFrame);
        window.addEventListener('resize', scheduleRebuild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdaptiveStatement, { once: true });
    } else {
        initAdaptiveStatement();
    }
})();
