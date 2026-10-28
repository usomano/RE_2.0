/* REINCANTAMENTO — theme bootstrap and single-layer adaptive home text. */
(() => {
  'use strict';
  try {
    if (localStorage.getItem('reinc-theme') === 'acid') {
      document.documentElement.setAttribute('data-theme', 'acid');
    }
  } catch (_) {}

  if (!location.pathname.endsWith('/home-video-test.html')) return;

  const init = () => {
    const video = document.getElementById('background-video');
    const statement = document.querySelector('.home-statement');
    const container = document.querySelector('.plugin-home__video');
    if (!video || !statement || !container) return;

    // Older versions built three independent copies of the text.
    statement.querySelectorAll('.home-statement__light-overlay').forEach(el => el.remove());

    const words = [];
    const walker = document.createTreeWalker(statement, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      if (!node.nodeValue.trim()) continue;
      const frag = document.createDocumentFragment();
      const pieces = node.nodeValue.match(/\s+|\S+/g) || [];
      for (const piece of pieces) {
        if (/^\s+$/.test(piece)) {
          frag.appendChild(document.createTextNode(piece));
        } else {
          const word = document.createElement('span');
          word.className = 'home-adaptive-word';
          word.textContent = piece;
          frag.appendChild(word);
          words.push(word);
        }
      }
      node.replaceWith(frag);
    }

    // Sample the already-displayed video once per update, then sample each
    // word in the SAME DOM layout. No duplicate text or independent wrapping.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const width = 320;
    let lastPaint = -Infinity;
    let disabled = false;
    const light = '#f5f5f5';
    const dark = '#1010ff';

    function update(now = performance.now()) {
      if (disabled || !video.videoWidth || video.readyState < 2) return;
      if (now - lastPaint < 90) return;
      lastPaint = now;

      const vr = container.getBoundingClientRect();
      if (vr.width <= 0 || vr.height <= 0) return;
      const scale = Math.max(vr.width / video.videoWidth, vr.height / video.videoHeight);
      const shownW = video.videoWidth * scale;
      const shownH = video.videoHeight * scale;
      const excessX = shownW - vr.width;
      const excessY = shownH - vr.height;
      const posY = matchMedia('(min-width:769px)').matches ? 0.4 : 0.5;
      const h = Math.max(1, Math.round(width * vr.height / vr.width));
      if (canvas.width !== width || canvas.height !== h) {
        canvas.width = width;
        canvas.height = h;
      }
      try {
        ctx.clearRect(0, 0, width, h);
        const sx = excessX * .5 / scale;
        const sy = excessY * posY / scale;
        ctx.drawImage(video, sx, sy, vr.width / scale, vr.height / scale, 0, 0, width, h);
        const pixels = ctx.getImageData(0, 0, width, h).data;
        for (const word of words) {
          const rects = word.getClientRects();
          if (!rects.length) continue;
          const rect = rects[0];
          const x = Math.max(0, Math.min(width - 1, Math.floor((rect.left + rect.width / 2 - vr.left) / vr.width * width)));
          const y = Math.max(0, Math.min(h - 1, Math.floor((rect.top + rect.height / 2 - vr.top) / vr.height * h)));
          const i = (y * width + x) * 4;
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const blue = b - (r + g) / 2;
          word.style.color = blue > 32 && luminance < 0.64 ? light : dark;
        }
      } catch (_) {
        disabled = true;
        words.forEach(word => { word.style.color = ''; });
      }
    }

    let handle = 0;
    if ('requestVideoFrameCallback' in video) {
      const onFrame = (_, metadata) => {
        update(metadata?.expectedDisplayTime);
        handle = video.requestVideoFrameCallback(onFrame);
      };
      handle = video.requestVideoFrameCallback(onFrame);
    } else {
      const onFrame = (now) => {
        if (!document.hidden) update(now);
        requestAnimationFrame(onFrame);
      };
      requestAnimationFrame(onFrame);
    }
    video.addEventListener('loadeddata', () => update());
    video.addEventListener('seeked', () => update());
    window.addEventListener('resize', () => { lastPaint = -Infinity; update(); });
    if (document.fonts?.ready) document.fonts.ready.then(() => update());
    update();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
