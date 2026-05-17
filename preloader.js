/* KariotLAB — preloader. Liquid fill + aurora. First visit + reload only. */
(function () {
  /* Show on: first visit OR explicit reload. Skip: internal navigation. */
  var navType = '';
  if (performance.getEntriesByType) {
    var nav = performance.getEntriesByType('navigation')[0];
    navType = nav ? nav.type : '';
  } else if (performance.navigation) {
    navType = performance.navigation.type === 1 ? 'reload' : 'navigate';
  }
  if (navType !== 'reload' && sessionStorage.getItem('kl_loaded')) return;

  /* ── Font ───────────────────────────────────────────────── */
  var lnk = document.createElement('link');
  lnk.rel = 'stylesheet';
  lnk.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap';
  document.head.appendChild(lnk);

  /* ── Styles ──────────────────────────────────────────────── */
  var s = document.createElement('style');
  s.textContent = [
    /* Fade in on mount */
    '@keyframes kl-enter{from{opacity:0;}to{opacity:1;}}',

    /* Aurora drift */
    '@keyframes kl-drift{from{transform:translate(0,0)scale(1);}',
    'to{transform:translate(28px,18px)scale(1.1);}}',

    /* Three wave scroll loops at different speeds */
    '@keyframes kl-w1{from{transform:translateX(-50%);}to{transform:translateX(0);}}',
    '@keyframes kl-w2{from{transform:translateX(0);}to{transform:translateX(-50%);}}',
    '@keyframes kl-w3{from{transform:translateX(-50%);}to{transform:translateX(0);}}',

    /* Respect reduced motion */
    '@media(prefers-reduced-motion:reduce){',
    '#kl-aurora,#kl-wave-inner *{animation:none!important;}}',

    /* ── Overlay ── */
    '#kl-pre{position:fixed;inset:0;z-index:99999;background:#0A0908;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'overflow:hidden;user-select:none;pointer-events:none;',
    'animation:kl-enter 0.4s ease-out both;}',

    /* ── Aurora ── */
    '#kl-aurora{position:absolute;inset:0;overflow:hidden;pointer-events:none;}',
    '.kl-glow{position:absolute;border-radius:50%;filter:blur(100px);}',
    '#kl-g1{width:680px;height:680px;top:-20%;left:-15%;',
    'background:rgba(255,77,46,0.15);',
    'animation:kl-drift 9s ease-in-out infinite alternate;}',
    '#kl-g2{width:540px;height:540px;bottom:-25%;right:-8%;',
    'background:rgba(255,77,46,0.10);',
    'animation:kl-drift 12s ease-in-out infinite alternate-reverse;}',
    '#kl-g3{width:380px;height:380px;top:38%;left:52%;',
    'background:rgba(242,235,218,0.05);',
    'animation:kl-drift 7s ease-in-out infinite alternate;}',

    /* ── Wordmark block ── */
    '#kl-wm{position:relative;}',

    /* Shared text style */
    '.kl-t{font-size:clamp(56px,12vw,160px);line-height:1;',
    'letter-spacing:-0.05em;text-transform:uppercase;white-space:nowrap;}',

    /* Dim base layer */
    '.kl-kd{font-family:"Playfair Display",Georgia,serif;',
    'font-style:italic;font-weight:900;color:#221E18;}',
    '.kl-ld{font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:900;color:#221E18;}',

    /* Fill layer — clip-path rises from bottom, JS driven */
    '#kl-fill{position:absolute;inset:0;',
    'clip-path:inset(100% 0 0 0);}',

    /* Filled text */
    '.kl-kf{font-family:"Playfair Display",Georgia,serif;',
    'font-style:italic;font-weight:900;color:#F2EBDA;}',
    '.kl-lf{font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:900;color:#FF4D2E;}',

    /* Wave container — fixed at BOTTOM of wordmark (does not move) */
    '#kl-wave{position:absolute;bottom:0;left:-6%;width:112%;',
    'height:72px;overflow:hidden;pointer-events:none;}',

    /* Three wave SVGs — each 200% wide, animated left-to-right */
    '#kl-wave-inner{position:relative;width:100%;height:100%;}',
    '.kl-ws{position:absolute;bottom:0;left:0;',
    'width:200%;height:72px;}',

    '.kl-w1{fill:rgba(242,235,218,0.20);',
    'animation:kl-w1 4.2s linear infinite;}',
    '.kl-w2{fill:rgba(242,235,218,0.13);',
    'animation:kl-w2 5.8s linear infinite;}',
    '.kl-w3{fill:rgba(255,77,46,0.11);',
    'animation:kl-w3 3s linear infinite;}',

    /* Progress track — inline just below wordmark */
    '#kl-track{width:100%;height:1px;',
    'background:rgba(242,235,218,0.07);',
    'margin-top:clamp(16px,2.4vw,26px);',
    'border-radius:1px;overflow:hidden;}',
    '#kl-bar{height:100%;width:0%;background:#FF4D2E;}',

    /* Counter row */
    '#kl-ctr{margin-top:10px;display:flex;align-items:baseline;gap:0.5rem;}',
    '#kl-lbl{font-family:"JetBrains Mono",monospace;',
    'font-size:10px;letter-spacing:0.28em;text-transform:uppercase;',
    'color:rgba(242,235,218,0.28);}',
    '#kl-pct,#kl-sym{font-family:"JetBrains Mono",monospace;',
    'font-size:12px;font-weight:700;color:#FF4D2E;}',
    '#kl-pct{min-width:3ch;text-align:right;}',

    /* Exit — ease-in (use for exits per UX guidelines) + zoom into site */
    '#kl-pre.exit{',
    'transition:opacity 0.65s cubic-bezier(0.4,0,1,1),',
    'transform 0.65s cubic-bezier(0.4,0,1,1);',
    'opacity:0;transform:scale(1.04);}',
  ].join('');
  document.head.appendChild(s);

  /* ── Wave paths — large amplitude for dramatic fluid look ─ */
  /* viewBox 0 0 900 72. Wave centres at y=40, amplitude ±24px */
  var p1 = 'M0,40 C56,16 112,64 168,40 C224,16 280,64 337,40' +
           ' C393,16 449,64 506,40 C562,16 618,64 675,40' +
           ' C731,16 787,64 843,40 C900,16 900,64 900,40' +
           ' L900,72 L0,72 Z';
  /* Offset phase, gentler slope */
  var p2 = 'M0,34 C75,14 150,54 225,34 C300,14 375,54 450,34' +
           ' C525,14 600,54 675,34 C750,14 825,54 900,34' +
           ' L900,72 L0,72 Z';
  /* Fast, low amplitude accent wave */
  var p3 = 'M0,54 C112,44 225,64 337,54 C450,44 562,64 675,54' +
           ' C787,44 900,64 900,54 L900,72 L0,72 Z';

  function mkSVG(cls, path) {
    return '<svg class="kl-ws" viewBox="0 0 900 72" preserveAspectRatio="none">' +
           '<path class="' + cls + '" d="' + path + '"/></svg>';
  }

  /* ── DOM ─────────────────────────────────────────────────── */
  var el = document.createElement('div');
  el.id  = 'kl-pre';
  el.innerHTML =
    '<div id="kl-aurora">' +
      '<div class="kl-glow" id="kl-g1"></div>' +
      '<div class="kl-glow" id="kl-g2"></div>' +
      '<div class="kl-glow" id="kl-g3"></div>' +
    '</div>' +
    '<div id="kl-wm">' +
      '<div class="kl-t">' +
        '<span class="kl-kd">Kariot</span><span class="kl-ld">LAB</span>' +
      '</div>' +
      '<div id="kl-fill">' +
        '<div class="kl-t">' +
          '<span class="kl-kf">Kariot</span><span class="kl-lf">LAB</span>' +
        '</div>' +
        /* Wave fixed at bottom — stays put, fill rises above it */
        '<div id="kl-wave">' +
          '<div id="kl-wave-inner">' +
            mkSVG('kl-w1', p1) +
            mkSVG('kl-w2', p2) +
            mkSVG('kl-w3', p3) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    /* Progress track + counter — just below brand name */
    '<div id="kl-track"><div id="kl-bar"></div></div>' +
    '<div id="kl-ctr">' +
      '<span id="kl-lbl">Syncing…</span>' +
      '<span id="kl-pct">0</span>' +
      '<span id="kl-sym">%</span>' +
    '</div>';

  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  var fillEl = document.getElementById('kl-fill');
  var barEl  = document.getElementById('kl-bar');
  var pctEl  = document.getElementById('kl-pct');
  var target = 0, current = 0;

  /* Stochastic counter — ~5s average to 100 (matches original React source) */
  var iv = setInterval(function () {
    if (target >= 100) { clearInterval(iv); return; }
    target += Math.random() * 2;
    if (target > 100) target = 100;
  }, 50);

  /* Spring physics RAF loop — current chases target with damping */
  function tick() {
    current += (target - current) * 0.07;
    var pct    = Math.min(current, 100);
    var clipTop = Math.max(0, 100 - pct);

    fillEl.style.clipPath = 'inset(' + clipTop.toFixed(2) + '% 0 0 0)';
    barEl.style.width     = pct.toFixed(1) + '%';
    pctEl.textContent     = Math.round(pct);

    if (pct < 99.9) {
      requestAnimationFrame(tick);
    } else {
      fillEl.style.clipPath = 'inset(0% 0 0 0)';
      barEl.style.width     = '100%';
      pctEl.textContent     = '100';
      /* Hold briefly, then zoom-fade into site */
      setTimeout(function () {
        el.classList.add('exit');
        document.body.style.overflow = '';
        sessionStorage.setItem('kl_loaded', '1');
        setTimeout(function () { el.remove(); s.remove(); lnk.remove(); }, 700);
      }, 500);
    }
  }

  /* Start after fonts ready (2.5s safety timeout) */
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
