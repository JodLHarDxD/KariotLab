/* Lumis AI Chatbot Widget — fixed-bottom viewport widget */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const API_ENDPOINT = '/api/chat';
  const MAX_HISTORY  = 6;  // messages kept in context (reduces tokens)

  // Condensed content context (generated from content_index.json)
  const LUMIS_CONTEXT = `Lumis is a brand systems studio. Key facts:

WORK (10 case studies): North Capital (Fintech/B2B), Atelier Vesta (D2C Beauty), Hum (B2B Dev tools), Casa Lume (Hospitality), Slow (Health), Selected (D2C Coffee), Brick (B2B SaaS), Field Notes (Creative tools), Vesper (D2C Apparel), Seed (Health).

PRICING:
- Starter $49/mo: solo founders, one brand system, 2 revisions/mo, Figma+code export
- Studio $249/mo: teams, unlimited iterations, living system, Slack channel, 4h response
- Scale Custom: enterprise, multi-brand portfolios, SSO, dedicated principal

TEAM: Mara Castellán (Principal · Strategy, Lisbon), Aiko Tanaka (Principal · Identity, Tokyo), Eli Okafor, Theo Halász

JOURNAL ESSAYS: YC brands analysis, 48h brand sprint, italics in design, color theory, founder brand systems, client collaboration, typography for category leaders.

Contact: contact.html | Work archive: work.html | Pricing: pricing.html`;

  // ── State ─────────────────────────────────────────────────────────────────
  let state    = 'bar';       // 'bar' | 'panel' | 'fullscreen'
  let history  = [];          // [{role, content}]
  let busy     = false;

  // ── DOM ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
#lumis-chat {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 9000;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  --lc-ink: #0A0908; --lc-paper: #F2EBDA; --lc-signal: #FF4D2E;
  --lc-rule: rgba(242,235,218,0.15); --lc-bg: rgba(10,9,8,0.92);
  --lc-mono: 'JetBrains Mono', 'Courier New', monospace;
}
#lumis-chat * { box-sizing: border-box; margin: 0; padding: 0; }

/* BAR */
#lc-bar {
  height: 56px; display: flex; align-items: center;
  background: var(--lc-bg); backdrop-filter: blur(20px) saturate(150%);
  border-top: 1px solid var(--lc-rule); padding: 0 20px;
  gap: 12px; cursor: pointer; transition: background 0.2s;
}
#lc-bar:hover { background: rgba(15,13,11,0.96); }
#lc-bar-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--lc-signal); flex-shrink: 0;
  box-shadow: 0 0 0 0 rgba(255,77,46,0.7);
  animation: lc-pulse 2.4s ease-in-out infinite;
}
@keyframes lc-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,77,46,0.7), 0 0 10px rgba(255,77,46,0.4); }
  60%      { box-shadow: 0 0 0 8px rgba(255,77,46,0), 0 0 10px rgba(255,77,46,0.4); }
}
#lc-bar-label {
  font-size: 13px; color: var(--lc-paper); opacity: 0.85; flex: 1;
  font-family: var(--lc-mono); letter-spacing: 0.08em;
}
#lc-bar-open {
  font-family: var(--lc-mono); font-size: 10px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--lc-signal); opacity: 0.9;
  background: rgba(255,77,46,0.1); border: 1px solid rgba(255,77,46,0.3);
  padding: 6px 14px; border-radius: 999px; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
#lc-bar-open:hover { background: rgba(255,77,46,0.2); border-color: var(--lc-signal); }

/* PANEL */
#lc-panel {
  display: none; flex-direction: column;
  background: var(--lc-bg); backdrop-filter: blur(24px) saturate(150%);
  border-top: 1px solid var(--lc-rule);
  height: 420px; transition: height 0.4s cubic-bezier(0.16,1,0.3,1);
}
#lc-panel.lc-fullscreen {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100vh !important;
  border-top: none;
}

/* HEADER */
#lc-header {
  display: flex; align-items: center; padding: 14px 20px;
  border-bottom: 1px solid var(--lc-rule); gap: 10px; flex-shrink: 0;
}
#lc-header-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lc-signal); box-shadow: 0 0 8px var(--lc-signal); }
#lc-header-title {
  font-family: var(--lc-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--lc-paper); opacity: 0.9; flex: 1;
}
.lc-btn-icon {
  background: none; border: 1px solid var(--lc-rule); border-radius: 6px;
  color: var(--lc-paper); opacity: 0.5; cursor: pointer; padding: 5px 8px;
  font-size: 14px; line-height: 1; transition: all 0.2s;
}
.lc-btn-icon:hover { opacity: 1; border-color: rgba(242,235,218,0.4); }

/* MESSAGES */
#lc-messages {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 12px;
  scroll-behavior: smooth;
}
#lc-messages::-webkit-scrollbar { width: 4px; }
#lc-messages::-webkit-scrollbar-thumb { background: rgba(242,235,218,0.15); border-radius: 2px; }
.lc-msg {
  max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 14px;
  line-height: 1.55; animation: lc-fadein 0.2s ease;
}
@keyframes lc-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.lc-msg.user {
  align-self: flex-end; background: var(--lc-signal); color: #fff; border-bottom-right-radius: 4px;
}
.lc-msg.assistant {
  align-self: flex-start;
  background: rgba(242,235,218,0.07); color: rgba(242,235,218,0.9);
  border: 1px solid var(--lc-rule); border-bottom-left-radius: 4px;
}
.lc-msg.thinking {
  align-self: flex-start; opacity: 0.45;
  background: rgba(242,235,218,0.04); color: rgba(242,235,218,0.6);
  border: 1px solid var(--lc-rule); border-bottom-left-radius: 4px;
  font-family: var(--lc-mono); font-size: 12px; letter-spacing: 0.05em;
}
.lc-welcome {
  align-self: center; text-align: center; padding: 20px 0;
  font-size: 13px; color: rgba(242,235,218,0.4);
  font-family: var(--lc-mono); letter-spacing: 0.06em;
}

/* INPUT */
#lc-input-row {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-top: 1px solid var(--lc-rule); flex-shrink: 0;
}
#lc-input {
  flex: 1; background: rgba(242,235,218,0.06); border: 1px solid var(--lc-rule);
  border-radius: 10px; color: var(--lc-paper); font-size: 14px;
  padding: 10px 14px; outline: none; font-family: inherit;
  transition: border-color 0.2s; resize: none; max-height: 100px;
  line-height: 1.4;
}
#lc-input::placeholder { opacity: 0.35; }
#lc-input:focus { border-color: rgba(255,77,46,0.5); }
#lc-send {
  background: var(--lc-signal); color: #fff; border: none; border-radius: 10px;
  width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; transition: all 0.2s;
}
#lc-send:hover { background: #ff3a1a; transform: translateY(-1px); }
#lc-send:disabled { opacity: 0.35; cursor: default; transform: none; }
#lc-send svg { pointer-events: none; }

/* FULLSCREEN BACK LINK */
#lc-back {
  display: none; font-family: var(--lc-mono); font-size: 10px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--lc-paper); opacity: 0.5;
  background: none; border: 1px solid var(--lc-rule); border-radius: 999px;
  padding: 5px 12px; cursor: pointer; transition: all 0.2s;
}
#lc-back:hover { opacity: 0.9; border-color: rgba(242,235,218,0.4); }
`;
    document.head.appendChild(s);
  }

  function injectHTML() {
    const wrap = document.createElement('div');
    wrap.id = 'lumis-chat';
    wrap.innerHTML = `
<div id="lc-bar" role="button" aria-label="Open Lumis AI chat">
  <div id="lc-bar-dot"></div>
  <span id="lc-bar-label">// Ask Lumis — work, pricing, methodology</span>
  <button id="lc-bar-open" aria-label="Open chat">Open →</button>
</div>
<div id="lc-panel" role="dialog" aria-label="Lumis AI Chat">
  <div id="lc-header">
    <div id="lc-header-dot"></div>
    <span id="lc-header-title">Lumis AI</span>
    <button id="lc-back" aria-label="Back to page">← Page</button>
    <button class="lc-btn-icon" id="lc-expand" title="Full screen" aria-label="Expand to full screen">⤢</button>
    <button class="lc-btn-icon" id="lc-minimize" title="Minimize" aria-label="Minimize chat">−</button>
    <button class="lc-btn-icon" id="lc-close" title="Close" aria-label="Close chat">×</button>
  </div>
  <div id="lc-messages">
    <div class="lc-welcome">What would you like to know about Lumis?</div>
  </div>
  <div id="lc-input-row">
    <textarea id="lc-input" rows="1" placeholder="Ask about our work, pricing, or methodology…" aria-label="Chat message"></textarea>
    <button id="lc-send" aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</div>`;
    document.body.appendChild(wrap);
  }

  // ── State machine ─────────────────────────────────────────────────────────
  const el = id => document.getElementById(id);

  function toBar() {
    state = 'bar';
    el('lc-bar').style.display   = 'flex';
    el('lc-panel').style.display = 'none';
    el('lc-panel').classList.remove('lc-fullscreen');
    el('lc-back').style.display  = 'none';
  }

  function toPanel() {
    state = 'panel';
    el('lc-bar').style.display   = 'none';
    el('lc-panel').style.display = 'flex';
    el('lc-panel').classList.remove('lc-fullscreen');
    el('lc-back').style.display  = 'none';
    el('lc-panel').style.height  = '420px';
    el('lc-input').focus();
  }

  function toFullscreen() {
    state = 'fullscreen';
    el('lc-bar').style.display   = 'none';
    el('lc-panel').style.display = 'flex';
    el('lc-panel').classList.add('lc-fullscreen');
    el('lc-back').style.display  = 'inline-block';
    el('lc-input').focus();
  }

  function growPanel() {
    if (state === 'panel') {
      el('lc-panel').style.height = '520px';
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  function wireEvents() {
    el('lc-bar').addEventListener('click', e => {
      if (e.target === el('lc-bar-open') || e.currentTarget === el('lc-bar')) toPanel();
    });
    el('lc-bar-open').addEventListener('click', e => { e.stopPropagation(); toPanel(); });
    el('lc-close').addEventListener('click',    () => toBar());
    el('lc-minimize').addEventListener('click', () => toBar());
    el('lc-expand').addEventListener('click',   () => state === 'fullscreen' ? toPanel() : toFullscreen());
    el('lc-back').addEventListener('click',     () => toBar());

    // Auto-resize textarea
    el('lc-input').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    el('lc-send').addEventListener('click', sendMessage);
    el('lc-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Esc closes fullscreen → panel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state === 'fullscreen') toPanel();
    });
  }

  // ── Chat logic ────────────────────────────────────────────────────────────
  function appendMsg(role, text) {
    const msgs = el('lc-messages');
    const div  = document.createElement('div');
    div.className = `lc-msg ${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const input = el('lc-input');
    const text  = input.value.trim();
    if (!text || busy) return;

    busy = true;
    el('lc-send').disabled = true;
    input.value = '';
    input.style.height = 'auto';

    appendMsg('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    // First message → grow panel
    growPanel();

    const thinking = appendMsg('thinking', '// thinking…');

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || '(empty response)';

      thinking.remove();
      appendMsg('assistant', reply);
      history.push({ role: 'assistant', content: reply });
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    } catch (err) {
      thinking.remove();
      const isConnErr = err.message.includes('fetch') || err.message.includes('Failed');
      appendMsg('assistant',
        isConnErr
          ? 'AI backend not running. Start chat-proxy.py to enable responses.'
          : `Error: ${err.message}`
      );
    }

    busy = false;
    el('lc-send').disabled = false;
    input.focus();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectHTML();
    wireEvents();
    toBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
