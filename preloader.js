/* KariotLAB — preloader. Liquid fill with wave surface. Once per session. */
(function () {
  if (sessionStorage.getItem('kl_loaded')) return;

  /* Playfair Display italic 900 — not loaded by site pages */
  var lnk = document.createElement('link');
  lnk.rel = 'stylesheet';
  lnk.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap';
  document.head.appendChild(lnk);

  /* ── Styles ─────────────────────────────────────────────── */
  var s = document.createElement('style');
  s.textContent = [
    '#kl-pre{position:fixed;inset:0;z-index:99999;background:#0F0F0F;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'user-select:none;pointer-events:none;}',

    /* Word wrapper — base + fill layer stacked */
    '#kl-words{position:relative;}',

    /* Shared text style */
    '.kl-text{font-size:clamp(56px,12vw,160px);line-height:1;',
    'letter-spacing:-0.05em;text-transform:uppercase;white-space:nowrap;}',

    /* Base layer — dim grey */
    '.kl-k-dim{font-family:"Playfair Display",Georgia,serif;',
    'font-style:italic;font-weight:900;color:#252525;}',
    '.kl-l-dim{font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:900;color:#252525;}',

    /* Fill overlay — clips from the top; reveals bottom-up */
    '#kl-fill{position:absolute;inset:0;clip-path:inset(100% 0 0 0);}',

    /* Wave surface container — JS drives top */
    '#kl-wave-wrap{position:absolute;left:0;width:100%;}',

    /* Wave SVG: 200% wide, scrolls left→right for seamless loop */
    '#kl-wave-svg{position:absolute;left:0;top:-30px;',
    'width:200%;height:60px;',
    'fill:white;opacity:0.3;',
    'animation:kl-wv 3s linear infinite;}',
    '@keyframes kl-wv{from{transform:translateX(-50%);}to{transform:translateX(0%);}}',

    /* Filled text */
    '.kl-k-fill{font-family:"Playfair Display",Georgia,serif;',
    'font-style:italic;font-weight:900;color:#ffffff;}',
    '.kl-l-fill{font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:900;color:#f97316;}',

    /* Bottom-right metadata footer */
    '#kl-meta{position:absolute;bottom:2.5rem;right:2.5rem;',
    'display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;}',

    '.kl-node{font-family:"JetBrains Mono",monospace;',
    'font-size:10px;letter-spacing:0.28em;text-transform:uppercase;',
    'color:rgba(255,255,255,0.2);}',

    '#kl-sync-row{display:flex;align-items:baseline;gap:1rem;',
    'border-left:1px solid rgba(255,255,255,0.1);padding-left:1.75rem;margin-top:0.2rem;}',

    '#kl-sync-label{font-family:"JetBrains Mono",monospace;',
    'font-size:10px;letter-spacing:0.28em;text-transform:uppercase;',
    'color:rgba(255,255,255,0.4);}',

    '#kl-pct,#kl-pct-sym{font-family:"JetBrains Mono",monospace;',
    'font-size:14px;font-weight:700;color:#f97316;}',
    '#kl-pct{min-width:3ch;text-align:right;}',

    /* Exit — fade out (matches AnimatePresence exit in source) */
    '#kl-pre.exit{transition:opacity 0.8s ease;opacity:0;}',
  ].join('');
  document.head.appendChild(s);

  /* ── DOM ─────────────────────────────────────────────────── */
  var el = document.createElement('div');
  el.id = 'kl-pre';
  el.innerHTML =
    '<div id="kl-words">' +
      /* Dim base layer */
      '<div class="kl-text">' +
        '<span class="kl-k-dim">Kariot</span>' +
        '<span class="kl-l-dim">LAB</span>' +
      '</div>' +
      /* Liquid fill overlay */
      '<div id="kl-fill">' +
        '<div id="kl-wave-wrap">' +
          '<svg id="kl-wave-svg" viewBox="0 0 500 100" preserveAspectRatio="none">' +
            '<path d="M0,50 C150,100 350,0 500,50 L500,100 L0,100 Z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="kl-text">' +
          '<span class="kl-k-fill">Kariot</span>' +
          '<span class="kl-l-fill">LAB</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    /* Metadata footer */
    '<div id="kl-meta">' +
      '<div class="kl-node">Entry Node: SS-207</div>' +
      '<div class="kl-node">Exit Node: SS-216</div>' +
      '<div id="kl-sync-row">' +
        '<span id="kl-sync-label">Syncing Stream…</span>' +
        '<span id="kl-pct">0</span>' +
        '<span id="kl-pct-sym">%</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  /* ── Spring animation ────────────────────────────────────── */
  var fillEl   = document.getElementById('kl-fill');
  var waveWrap = document.getElementById('kl-wave-wrap');
  var pctEl    = document.getElementById('kl-pct');

  var target  = 0;   /* stochastic counter target */
  var current = 0;   /* spring-smoothed display value */

  /* Stochastic counter — ~5s average to reach 100 (matches React source) */
  var iv = setInterval(function () {
    if (target >= 100) { clearInterval(iv); return; }
    target += Math.random() * 2;
    if (target > 100) target = 100;
  }, 50);

  function tick() {
    /* Spring: current chases target with damping */
    current += (target - current) * 0.07;
    var pct = Math.min(current, 100);
    var top = Math.max(0, 100 - pct);

    fillEl.style.clipPath  = 'inset(' + top.toFixed(2) + '% 0 0 0)';
    waveWrap.style.top     = top.toFixed(2) + '%';
    pctEl.textContent      = Math.round(pct);

    if (pct < 99.9) {
      requestAnimationFrame(tick);
    } else {
      /* Snap complete */
      fillEl.style.clipPath = 'inset(0% 0 0 0)';
      waveWrap.style.top    = '0%';
      pctEl.textContent     = '100';
      setTimeout(function () {
        el.classList.add('exit');
        document.body.style.overflow = '';
        sessionStorage.setItem('kl_loaded', '1');
        setTimeout(function () { el.remove(); s.remove(); lnk.remove(); }, 850);
      }, 800);
    }
  }

  /* Start after fonts are ready (or 2.5s safety timeout) */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(tick);
  }

  if (document.fonts && document.fonts.ready) {
    var t = setTimeout(start, 2500);
    document.fonts.ready.then(function () { clearTimeout(t); start(); });
  } else {
    setTimeout(start, 300);
  }
})();
