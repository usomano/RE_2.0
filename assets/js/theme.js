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
        .home-video-test .home-statement--adaptive {
            color: #d9d9d9 !important;
            z-index: 6;
            aria-hidden: true;
        }
        .home-video-test .home-statement--adaptive-edge {
            opacity: .22;
            z-index: 6;
        }
        .home-video-test .home-statement--adaptive-strong {
            opacity: 1;
            z-index: 7;
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
        const statement = document.querySelector('.home-statement:not(.home-statement--adaptive)');
        const videoBox = document.querySelector('.plugin-home__video');
        if (!video || !statement || !videoBox) return;

        // Remove the previous canvas implementation if a stale cached script created it.
        statement.querySelectorAll('.home-statement__adaptive-canvas').forEach((node) => node.remove());

        const makeOverlay = (variant) => {
            const overlay = statement.cloneNode(true);
            overlay.removeAttribute('aria-label');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.add('home-statement--adaptive', `home-statement--adaptive-${variant}`);
            statement.parentNode.insertBefore(overlay, statement.nextSibling);
            return overlay;
        };

        const edgeOverlay = makeOverlay('edge');
        const strongOverlay = makeOverlay('strong');

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';

        const defs = document.createElementNS(svgNS, 'defs');
        const edgeClip = document.createElementNS(svgNS, 'clipPath');
        const strongClip = document.createElementNS(svgNS, 'clipPath');
        edgeClip.setAttribute('id', 'home-statement-blue-edge');
        strongClip.setAttribute('id', 'home-statement-blue-strong');
        edgeClip.setAttribute('clipPathUnits', 'userSpaceOnUse');
        strongClip.setAttribute('clipPathUnits', 'userSpaceOnUse');

        const edgePath = document.createElementNS(svgNS, 'path');
        const strongPath = document.createElementNS(svgNS, 'path');
        edgeClip.appendChild(edgePath);
        strongClip.appendChild(strongPath);
        defs.appendChild(edgeClip);
        defs.appendChild(strongClip);
        svg.appendChild(defs);
        document.body.appendChild(svg);

        edgeOverlay.style.clipPath = 'url(#home-statement-blue-edge)';
        strongOverlay.style.clipPath = 'url(#home-statement-blue-strong)';
        edgeOverlay.style.webkitClipPath = 'url(#home-statement-blue-edge)';
        strongOverlay.style.webkitClipPath = 'url(#home-statement-blue-strong)';

        const sample = document.createElement('canvas');
        const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
        let geometry = null;
        let resizeTimer = 0;
        let videoFrameHandle = 0;
        let rafHandle = 0;

        function rebuildGeometry() {
            const rect = statement.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;

            // One sample per CSS pixel keeps the transition accurate without fuzzy text rendering.
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));
            sample.width = w;
            sample.height = h;
            geometry = { rect, w, h };

            // Keep both DOM overlays exactly on the same box as the original text.
            edgeOverlay.style.width = getComputedStyle(statement).width;
            strongOverlay.style.width = getComputedStyle(statement).width;
        }

        function drawVideoCrop() {
            if (!geometry || video.readyState < 2 || !video.videoWidth) return false;

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

            sampleCtx.clearRect(0, 0, geometry.w, geometry.h);
            sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, geometry.w, geometry.h);
            return true;
        }

        function scoreBlue(r, g, b) {
            const dominance = b - (r + g) * 0.5;
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            // Both must be high: this rejects the pale blue/grey areas of the background.
            return Math.min(dominance, chroma);
        }

        function pathForThreshold(data, threshold) {
            const { w, h } = geometry;
            let d = '';

            for (let y = 0; y < h; y += 1) {
                let runStart = -1;
                for (let x = 0; x <= w; x += 1) {
                    let active = false;
                    if (x < w) {
                        const i = (y * w + x) * 4;
                        active = scoreBlue(data[i], data[i + 1], data[i + 2]) >= threshold;
                    }

                    if (active && runStart < 0) runStart = x;
                    if ((!active || x === w) && runStart >= 0) {
                        const width = x - runStart;
                        if (width > 0) d += `M${runStart} ${y}h${width}v1h-${width}Z`;
                        runStart = -1;
                    }
                }
            }
            return d;
        }

        function paintCurrentVideoFrame() {
            if (!geometry || !drawVideoCrop()) return;
            const data = sampleCtx.getImageData(0, 0, geometry.w, geometry.h).data;

            // Narrow transition band: 64→78. The previous version faded across a much wider range.
            edgePath.setAttribute('d', pathForThreshold(data, 64));
            strongPath.setAttribute('d', pathForThreshold(data, 78));
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
