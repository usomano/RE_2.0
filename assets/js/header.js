/* Shared header interaction: identical blink on each page. */
(() => {
    const video = document.getElementById('blink-source');
    const canvas = document.getElementById('blink-logo');
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const scratch = document.createElement('canvas');
    const sourceCtx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sourceCtx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timeoutId = 0;
    let frameId = 0;
    let playing = false;

    function renderFrame() {
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      // More than enough resolution for the small header mark, without
      // processing a full-size video frame on every blink.
      const w = Math.min(320, video.videoWidth);
      const h = Math.max(1, Math.round(video.videoHeight * w / video.videoWidth));
      if (scratch.width !== w || scratch.height !== h) {
        scratch.width = canvas.width = w;
        scratch.height = canvas.height = h;
      }
      sourceCtx.drawImage(video, 0, 0, w, h);
      const frame = sourceCtx.getImageData(0, 0, w, h);
      const pixels = frame.data;
      // A flat opaque video background is keyed against four sampled corners.
      // Soft alpha edges preserve anti-aliasing around the moving symbol.
      const corners = [0, (w - 1) * 4, ((h - 1) * w) * 4, (w * h - 1) * 4];
      const bg = [0, 0, 0];
      for (const offset of corners) {
        for (let c = 0; c < 3; c++) bg[c] += pixels[offset + c] / 4;
      }
      for (let i = 0; i < pixels.length; i += 4) {
        const dr = pixels[i] - bg[0];
        const dg = pixels[i + 1] - bg[1];
        const db = pixels[i + 2] - bg[2];
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        const alpha = Math.max(0, Math.min(1, (distance - 9) / 48));
        if (alpha < 0.005) {
          pixels[i + 3] = 0;
        } else {
          // Recover the original foreground color from its background blend.
          for (let c = 0; c < 3; c++) {
            pixels[i + c] = Math.max(0, Math.min(255,
              (pixels[i + c] - (1 - alpha) * bg[c]) / alpha));
          }
          pixels[i + 3] = Math.round(255 * alpha);
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.putImageData(frame, 0, 0);
      canvas.closest('.plugin-logo')?.classList.add('is-animated');
    }

    function onFrame() {
      renderFrame();
      if (playing && video.requestVideoFrameCallback) {
        frameId = video.requestVideoFrameCallback(onFrame);
      }
    }

    function stopFrameTracking() {
      playing = false;
      if (frameId && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameId);
        frameId = 0;
      }
    }

    function scheduleBlink() {
      clearTimeout(timeoutId);
      if (reducedMotion.matches || document.hidden) return;
      // Random rest between single blinks, rather than a regular video loop.
      timeoutId = setTimeout(() => {
        if (document.hidden || reducedMotion.matches) return;
        video.currentTime = 0;
        const attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(() => scheduleBlink());
      }, 1800 + Math.random() * 5600);
    }

    video.addEventListener('loadeddata', () => {
      video.pause();
      renderFrame();
      scheduleBlink();
    }, { once: true });
    video.addEventListener('seeked', renderFrame);
    video.addEventListener('play', () => {
      stopFrameTracking();
      playing = true;
      if (video.requestVideoFrameCallback) {
        frameId = video.requestVideoFrameCallback(onFrame);
      } else {
        const fallback = () => {
          if (!playing) return;
          renderFrame();
          frameId = requestAnimationFrame(fallback);
        };
        frameId = requestAnimationFrame(fallback);
      }
    });
    video.addEventListener('ended', () => {
      stopFrameTracking();
      video.currentTime = 0;
      scheduleBlink();
    });
    document.addEventListener('visibilitychange', () => {
      clearTimeout(timeoutId);
      if (document.hidden) {
        video.pause();
        stopFrameTracking();
      } else {
        video.currentTime = 0;
        scheduleBlink();
      }
    });
    reducedMotion.addEventListener?.('change', () => {
      clearTimeout(timeoutId);
      if (reducedMotion.matches) {
        video.pause();
        stopFrameTracking();
        video.currentTime = 0;
      } else scheduleBlink();
    });
    if (video.readyState >= 2) {
      video.pause();
      renderFrame();
      scheduleBlink();
    }
  })();
document.addEventListener('DOMContentLoaded', () => {
 if (document.body.classList.contains('home-video-test')) return; // homepage already binds its menu
 const menu=document.getElementById('plugin-menu');
 const panel=document.getElementById('plugin-mobile-panel');
 if(!menu||!panel)return;
 menu.addEventListener('click',()=>{
   const open=menu.getAttribute('aria-expanded')==='true';
   menu.setAttribute('aria-expanded',String(!open));
   panel.dataset.open=String(!open);
 });
 panel.addEventListener('click',event=>{
   if(event.target.closest('a')){
     menu.setAttribute('aria-expanded','false'); panel.dataset.open='false';
   }
 });
});

/* Shared responsive footer: replaces older generated footers without changing
   article content, and adds the footer to the home/about pages. */
document.addEventListener('DOMContentLoaded', () => {
  const oldFooter = document.querySelector('footer.site-footer');
  if (oldFooter?.classList.contains('site-footer--redesign')) return;
  const nested = /\/(?:writing|publishing|artworks)\//.test(location.pathname);
  const assetRoot = nested ? '../' : '';
  const el = document.createElement('footer');
  el.className = 'site-footer site-footer--redesign';
  el.setAttribute('aria-label', 'Reincantamento footer');
  el.innerHTML = `
    <nav class="footer-redesign__social" aria-label="Social media">
      <a href="https://www.instagram.com/re.incantamento/" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
      <span aria-hidden="true">-</span>
      <a href="https://t.me/+C1fjM6yVcdJmYzI0" target="_blank" rel="noopener noreferrer">TELEGRAM</a>
      <span aria-hidden="true">-</span>
      <a href="https://www.are.na/reincantamento/channels/" target="_blank" rel="noopener noreferrer">ARE.NA</a>
    </nav>
    <img class="footer-redesign__eye" src="${assetRoot}assets/images/REINC-LOGO-2026.svg" alt="" aria-hidden="true">
    <a class="footer-redesign__subscribe" href="https://reincantamentox.substack.com/subscribe" target="_blank" rel="noopener noreferrer">SUBSCRIBE TO DROPS</a>
  `;
  if (oldFooter) oldFooter.replaceWith(el);
  else {
    // The homepage is a fixed-height, clipped screen. Insert the footer
    // outside that screen, not beside a switcher nested inside it.
    document.body.append(el);
  }
});
