/* REINCANTAMENTO — theme bootstrap.
   Loaded SYNCHRONOUSLY in <head> (no defer) so the stored choice is applied
   before first paint and the page never flashes the other palette. Kept apart
   from site.js for exactly that reason. */
(() => {
    'use strict';
    try {
        if (localStorage.getItem('reinc-theme') === 'acid') {
            document.documentElement.setAttribute('data-theme', 'acid');
        }
    } catch (err) {
        /* Private mode / blocked storage — the default palette is correct. */
    }

    /* Home video test — use the real Redaction 20 Regular + Italic files.
       The page's earlier CSS only registered the regular cut, so <em> could be
       browser-synthesised. This override disables synthesis and uses the real
       italic file. It also lets the statement wrap naturally on mobile. */
    if (location.pathname.endsWith('/home-video-test.html') || location.pathname.endsWith('home-video-test.html')) {
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'Redaction20 Home';
                src: url('assets/fonts/Redaction20-Regular.woff') format('woff');
                font-weight: 400;
                font-style: normal;
                font-display: swap;
            }
            @font-face {
                font-family: 'Redaction20 Home';
                src: url('assets/fonts/Redaction20-Italic.woff') format('woff');
                font-weight: 400;
                font-style: italic;
                font-display: swap;
            }
            .home-video-test .home-statement {
                font-family: 'Redaction20 Home', Georgia, serif !important;
                font-size: 24px;
                line-height: 26px;
                font-weight: 400;
                font-style: normal;
                font-synthesis: none;
                letter-spacing: 0;
            }
            .home-video-test .home-statement em {
                font-family: 'Redaction20 Home', Georgia, serif !important;
                font-weight: 400;
                font-style: italic;
                font-synthesis: none;
            }
            .home-video-test .home-statement .home-break {
                display: block;
                height: 0;
            }
            @media (max-width: 768px) {
                .home-video-test .home-statement {
                    top: 44%;
                    width: 86%;
                    max-width: 350px;
                    font-size: clamp(17px, 4.6vw, 19px);
                    line-height: 1.08;
                    text-wrap: balance;
                }
                .home-video-test .home-statement p + p {
                    margin-top: 20px;
                }
                .home-video-test .home-statement .home-break {
                    display: inline;
                    height: auto;
                    white-space: normal;
                }
            }
        `;
        document.head.appendChild(style);

        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.home-statement br').forEach((br) => {
                const spacer = document.createElement('span');
                spacer.className = 'home-break';
                spacer.textContent = ' ';
                br.replaceWith(spacer);
            });
        });
    }
})();
