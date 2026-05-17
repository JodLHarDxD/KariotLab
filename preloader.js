/* KariotLAB — preloader. Counter-driven wipe-up reveal (NeoLeaf-style). */
(function () {
  if (sessionStorage.getItem('kl_loaded')) return;

  var s = document.createElement('style');
  s.textContent = [
    '#kl-pre{',
    'position:fixed;inset:0;z-index:99999;background:#0A0908;',
    'display:flex;align-items:center;justify-content:center;',
    '--wipe:0%;}',

    '#kl-pre-inner{position:relative;user-select:none;}',

    '.kl-word{display:block;line-height:0.86;}',

    /* KARIOT — Inter 800, cream wipe from dim to bright */
    '.kl-word--kariot{',
    'font-family:"Inter",-apple-system,sans-serif;',
    'font-weight:800;font-size:clamp(72px,14vw,188px);',
    'letter-spacing:-0.045em;text-transform:uppercase;',
    'background:linear-gradient(to top,',
    '#F2EBDA var(--wipe),rgba(242,235,218,0.14) var(--wipe));',
    '-webkit-background-clip:text;background-clip:text;',
    '-webkit-text-fill-color:transparent;}',

    /* LAB — JetBrains Mono, signal-red wipe */
    '.kl-word--lab{',
    'font-family:"JetBrains Mono",ui-monospace,monospace;',
    'font-weight:400;font-size:clamp(28px,5.5vw,72px);',
    'letter-spacing:0.32em;text-transform:uppercase;padding-left:0.32em;',
    'background:linear-gradient(to top,',
    '#FF4D2E var(--wipe),rgba(255,77,46,0.15) var(--wipe));',
    '-webkit-background-clip:text;background-clip:text;',
    '-webkit-text-fill-color:transparent;}',

    /* counter — bottom-right of wordmark block */
    '#kl-count{',
    'position:absolute;right:0;bottom:-2.4em;',
    'font-family:"JetBrains Mono",monospace;',
    'font-size:11px;letter-spacing:0.18em;text-transform:uppercase;',
    'color:rgba(242,235,218,0.35);}',

    /* exit — full overlay slides up */
    '#kl-pre.exit{',
    'transform:translateY(-100%);',
    'transition:transform 0.85s cubic-bezier(0.76,0,0.24,1);}',
  ].join('');
  document.head.appendChild(s);

  var el = document.createElement('div');
  el.id = 'kl-pre';
  el.innerHTML =
    '<div id="kl-pre-inner">' +
      '<div class="kl-word kl-word--kariot">KARIOT</div>' +
      '<div class="kl-word kl-word--lab">LAB</div>' +
      '<div id="kl-count">loading… 0%</div>' +
    '</div>';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  function run() {
    var counter = el.querySelector('#kl-count');
    var n = 0;

    var iv = setInterval(function () {
      if (n < 25)      n += Math.floor(Math.random() * 9) + 4;
      else if (n < 60) n += Math.floor(Math.random() * 5) + 1;
      else if (n < 88) n += Math.floor(Math.random() * 7) + 2;
      else if (n < 99) n += 1;
      n = Math.min(n, 100);

      el.style.setProperty('--wipe', n + '%');
      counter.textContent = 'loading… ' + n + '%';

      if (n >= 100) {
        clearInterval(iv);
        setTimeout(function () {
          el.classList.add('exit');
          document.body.style.overflow = '';
          sessionStorage.setItem('kl_loaded', '1');
          setTimeout(function () { el.remove(); s.remove(); }, 900);
        }, 300);
      }
    }, 38);
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () { setTimeout(run, 60); });
  }

  if (document.fonts && document.fonts.ready) {
    var t = setTimeout(start, 2500);
    document.fonts.ready.then(function () { clearTimeout(t); start(); });
  } else {
    setTimeout(start, 300);
  }
})();
