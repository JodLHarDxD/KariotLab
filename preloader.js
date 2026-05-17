/* KariotLAB — preloader. Plays once per browser session. */
(function () {
  if (sessionStorage.getItem('kl_loaded')) return;

  /* ── Styles ─────────────────────────────────────────────── */
  var s = document.createElement('style');
  s.textContent = [
    '#kl-pre{position:fixed;inset:0;z-index:99999;background:#0A0908;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'pointer-events:all;}',

    '#kl-pre-inner{text-align:center;user-select:none;}',

    /* word rows — each clips its child */
    '.kl-row{overflow:hidden;line-height:0.92;}',

    /* KARIOT */
    '.kl-k{display:block;',
    'font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:800;font-size:clamp(68px,13.5vw,176px);',
    'letter-spacing:-0.045em;color:#F2EBDA;text-transform:uppercase;',
    'transform:translateY(108%);',
    'transition:transform 1.15s cubic-bezier(0.16,1,0.3,1);}',

    /* LAB */
    '.kl-lab{display:block;',
    'font-family:"JetBrains Mono",ui-monospace,monospace;',
    'font-weight:400;font-size:clamp(26px,5.2vw,68px);',
    'letter-spacing:0.32em;color:#FF4D2E;text-transform:uppercase;',
    'padding-left:0.32em;',       /* compensate letter-spacing on last char */
    'transform:translateY(108%);',
    'transition:transform 1.15s 0.12s cubic-bezier(0.16,1,0.3,1);}',

    /* counter */
    '#kl-count{margin-top:clamp(20px,3vw,40px);',
    'font-family:"JetBrains Mono",monospace;',
    'font-size:10px;letter-spacing:0.26em;text-transform:uppercase;',
    'color:rgba(242,235,218,0.35);}',

    /* exit slide-up */
    '#kl-pre.exit{transform:translateY(-100%);',
    'transition:transform 0.9s cubic-bezier(0.76,0,0.24,1);}',
  ].join('');
  document.head.appendChild(s);

  /* ── DOM ─────────────────────────────────────────────────── */
  var el = document.createElement('div');
  el.id = 'kl-pre';
  el.innerHTML =
    '<div id="kl-pre-inner">' +
      '<div class="kl-row"><span class="kl-k">KARIOT</span></div>' +
      '<div class="kl-row"><span class="kl-lab">LAB</span></div>' +
    '</div>' +
    '<div id="kl-count">loading&hellip;&nbsp;0%</div>';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  /* ── Animation ───────────────────────────────────────────── */
  function run() {
    /* 1. Reveal wordmark */
    el.querySelector('.kl-k').style.transform   = 'translateY(0)';
    el.querySelector('.kl-lab').style.transform = 'translateY(0)';

    /* 2. Counter — non-linear: bursts early, slows mid, sprints at end */
    var counter = document.getElementById('kl-count');
    var n = 0;
    var iv = setInterval(function () {
      if (n < 25)      n += Math.floor(Math.random() * 9) + 4;
      else if (n < 60) n += Math.floor(Math.random() * 5) + 1;
      else if (n < 88) n += Math.floor(Math.random() * 7) + 2;
      else if (n < 99) n += 1;
      n = Math.min(n, 100);
      counter.textContent = 'loading… ' + n + '%';

      if (n >= 100) {
        clearInterval(iv);
        /* 3. Exit after short pause */
        setTimeout(function () {
          el.classList.add('exit');
          document.body.style.overflow = '';
          sessionStorage.setItem('kl_loaded', '1');
          setTimeout(function () { el.remove(); s.remove(); }, 950);
        }, 320);
      }
    }, 38);
  }

  /* Start after fonts are ready (or after 2.5s safety timeout) */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () { setTimeout(run, 60); });
  }

  if (document.fonts && document.fonts.ready) {
    var t = setTimeout(start, 2500);  /* safety timeout */
    document.fonts.ready.then(function () { clearTimeout(t); start(); });
  } else {
    setTimeout(start, 300);
  }
})();
