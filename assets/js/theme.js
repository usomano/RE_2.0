/* REINCANTAMENTO — palette bootstrap and pixel-accurate adaptive home text. */
(() => {
  'use strict';
  try {
    if (localStorage.getItem('reinc-theme') === 'acid') {
      document.documentElement.setAttribute('data-theme', 'acid');
    }
  } catch (_) {}

  if (!location.pathname.endsWith('/home-video-test.html')) return;

  function init() {
    const video = document.getElementById('background-video');
    const statement = document.querySelector('.home-statement');
    const videoBox = document.querySelector('.plugin-home__video');
    if (!video || !statement || !videoBox) return;
    statement.querySelectorAll('.home-statement__light-overlay').forEach(el => el.remove());

    // Paint colour through the original glyphs: no duplicate markup or text layout.
    const paragraphs = Array.from(statement.children).filter(el => el.tagName === 'P');
    const style = document.createElement('style');
    style.textContent = `
      .home-video-test .home-statement > p {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        background-repeat: no-repeat;
        background-size: 100% 100%;
        background-clip: text;
        -webkit-background-clip: text;
      }
      .home-video-test .home-statement > p * {
        color: inherit !important;
        -webkit-text-fill-color: inherit !important;
      }
    `;
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    if (!ctx) return;
    let previous = -Infinity;
    let failed = false;
    const smoothed = new WeakMap();
    function paint(timestamp = 0) {
      if (failed || video.readyState < 2 || !video.videoWidth) return;
      if (timestamp - previous < 50) return;
      previous = timestamp;
      const bounds = videoBox.getBoundingClientRect();
      const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
      const renderedW = video.videoWidth * scale;
      const renderedH = video.videoHeight * scale;
      const offsetX = (bounds.width - renderedW) * .5;
      const offsetY = (bounds.height - renderedH) * (matchMedia('(min-width:769px)').matches ? .4 : .5);
      try {
        for (const p of paragraphs) {
          const rect = p.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          const w = Math.min(640, Math.max(1, Math.round(rect.width * .7)));
          const h = Math.max(1, Math.round(w * rect.height / rect.width));
          canvas.width = w; canvas.height = h;
          ctx.clearRect(0,0,w,h);
          // Map the displayed background video exactly to this paragraph rectangle.
          ctx.drawImage(video,
            (bounds.left + offsetX - rect.left) * w / rect.width,
            (bounds.top + offsetY - rect.top) * h / rect.height,
            renderedW * w / rect.width, renderedH * h / rect.height);
          const frame = ctx.getImageData(0,0,w,h);
          const data = frame.data;
          const old = smoothed.get(p);
          const prev = old && old.w === w && old.h === h ? old.pixels : null;
          const next = new Uint8ClampedArray(data.length);
          for (let i=0; i<data.length; i+=4) {
            const r=data[i], g=data[i+1], b=data[i+2];
            const blue = Math.min(b-(r+g)*.5,Math.max(r,g,b)-Math.min(r,g,b));
            // Smoothly transition from saturated cobalt text to light lettering on blue.
            const t=Math.max(0,Math.min(1,(blue-37)/39));
            const eased=t*t*(3-2*t);
            const alpha = prev ? 0.28 : 1;
            const rgb = [16 + 229 * eased, 16 + 229 * eased, 255 - 10 * eased];
            for (let k=0;k<3;k++) next[i+k] = Math.round(rgb[k]*alpha + (prev ? prev[i+k]*(1-alpha) : 0));
            next[i+3]=255;
          }
          frame.data.set(next);
          smoothed.set(p,{w,h,pixels:next});
          ctx.putImageData(frame,0,0);
          p.style.backgroundImage='url("'+canvas.toDataURL('image/png')+'")';
        }
      } catch (error) {
        failed=true;
        paragraphs.forEach(p => {p.style.backgroundImage='none';});
        style.remove();
      }
    }
    if ('requestVideoFrameCallback' in video) {
      const onFrame = (now) => { if (!document.hidden) paint(now); video.requestVideoFrameCallback(onFrame); };
      video.requestVideoFrameCallback(onFrame);
    } else {
      const onFrame=(now)=>{if(!document.hidden)paint(now);requestAnimationFrame(onFrame);};
      requestAnimationFrame(onFrame);
    }
    window.addEventListener('resize',()=>{previous=0;paint(performance.now());});
    if (document.fonts?.ready) document.fonts.ready.then(()=>{previous=0;paint(performance.now());});
    video.addEventListener('loadeddata',()=>paint(performance.now()));
    paint(performance.now());
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
