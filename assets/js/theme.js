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
    .home-video-test .home-statement {
      -webkit-text-stroke: 0 transparent !important;
      text-shadow: none !important;
      paint-order: normal !important;
      font-synthesis: none !important;
      isolation: isolate;
    }
    .home-video-test .home-statement__tone {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      color: #d9d9d9;
      font: inherit;
      line-height: inherit;
      letter-spacing: inherit;
      text-align: inherit;
      font-synthesis: none;
      overflow: visible;
    }
    .home-video-test .home-statement__tone em {
      font-family: inherit;
      font-style: italic;
      font-weight: 400;
      font-synthesis: none;
    }
    .home-video-test .home-statement__tone p + p { margin-top: inherit; }
    .home-video-test .home-statement__tone--edge { opacity: .14; z-index: 2; }
    .home-video-test .home-statement__tone--strong { opacity: 1; z-index: 3; }
  `;
  document.head.appendChild(style);

  function initAdaptiveStatement() {
    const video = document.getElementById('background-video');
    const statement = document.querySelector('.home-statement');
    const videoBox = document.querySelector('.plugin-home__video');
    if (!video || !statement || !videoBox) return;

    statement.querySelectorAll('.home-statement__adaptive-canvas,.home-statement__tone').forEach(n => n.remove());

    const sourceHTML = Array.from(statement.children)
      .filter(el => el.matches('p'))
      .map(el => el.outerHTML)
      .join('');

    const makeTone = (kind) => {
      const layer = document.createElement('div');
      layer.className = `home-statement__tone home-statement__tone--${kind}`;
      layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = sourceHTML;
      statement.appendChild(layer);
      return layer;
    };

    const edgeLayer = makeTone('edge');
    const strongLayer = makeTone('strong');

    const sample = document.createElement('canvas');
    const ctx = sample.getContext('2d', { willReadFrequently: true });
    let geo = null;
    let frameHandle = 0;
    let rafHandle = 0;
    let resizeTimer = 0;

    function rebuild() {
      const rect = statement.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const step = 2;
      const w = Math.max(1, Math.ceil(rect.width / step));
      const h = Math.max(1, Math.ceil(rect.height / step));
      sample.width = w;
      sample.height = h;
      geo = { rect, w, h, step };
      paint();
    }

    function drawVideoRegion() {
      if (!geo || video.readyState < 2 || !video.videoWidth) return false;
      const vr = videoBox.getBoundingClientRect();
      const sr = statement.getBoundingClientRect();
      const scale = Math.max(vr.width / video.videoWidth, vr.height / video.videoHeight);
      const renderedW = video.videoWidth * scale;
      const renderedH = video.videoHeight * scale;
      const cropX = (renderedW - vr.width) / 2;
      const cropY = (renderedH - vr.height) / 2;
      const sx = (sr.left - vr.left + cropX) / scale;
      const sy = (sr.top - vr.top + cropY) / scale;
      const sw = sr.width / scale;
      const sh = sr.height / scale;
      ctx.clearRect(0, 0, geo.w, geo.h);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, geo.w, geo.h);
      return true;
    }

    function blueScore(r, g, b) {
      const dominance = b - Math.max(r, g);
      const saturation = b - Math.min(r, g);
      return Math.min(dominance * 1.15, saturation);
    }

    function pathFor(data, threshold) {
      const { w, h, step } = geo;
      let d = '';
      for (let y = 0; y < h; y++) {
        let start = -1;
        for (let x = 0; x <= w; x++) {
          let on = false;
          if (x < w) {
            const i = (y * w + x) * 4;
            on = blueScore(data[i], data[i + 1], data[i + 2]) >= threshold;
          }
          if (on && start < 0) start = x;
          if ((!on || x === w) && start >= 0) {
            const px = start * step;
            const py = y * step;
            const pw = (x - start) * step;
            d += `M${px} ${py}h${pw}v${step}h-${pw}Z`;
            start = -1;
          }
        }
      }
      return d || 'M0 0';
    }

    function paint() {
      if (!geo || !drawVideoRegion()) return;
      const data = ctx.getImageData(0, 0, geo.w, geo.h).data;
      const edgePath = pathFor(data, 72);
      const strongPath = pathFor(data, 80);
      const edgeClip = `path('${edgePath}')`;
      const strongClip = `path('${strongPath}')`;
      edgeLayer.style.clipPath = edgeClip;
      edgeLayer.style.webkitClipPath = edgeClip;
      strongLayer.style.clipPath = strongClip;
      strongLayer.style.webkitClipPath = strongClip;
    }

    function startSync() {
      if ('requestVideoFrameCallback' in video) {
        const tick = () => {
          paint();
          frameHandle = video.requestVideoFrameCallback(tick);
        };
        frameHandle = video.requestVideoFrameCallback(tick);
      } else {
        const tick = () => {
          paint();
          rafHandle = requestAnimationFrame(tick);
        };
        rafHandle = requestAnimationFrame(tick);
      }
    }

    const schedule = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 50);
    };

    Promise.all([
      document.fonts.load('400 24px "Redaction20 Exact"'),
      document.fonts.load('italic 400 24px "Redaction20 Exact"')
    ]).finally(() => {
      rebuild();
      startSync();
    });

    if (video.readyState < 2) video.addEventListener('loadeddata', rebuild, { once: true });
    video.addEventListener('seeked', paint);
    window.addEventListener('resize', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdaptiveStatement, { once: true });
  } else {
    initAdaptiveStatement();
  }
})();
