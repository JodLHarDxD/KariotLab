/* KariotLAB AI Chatbot Widget — cinematic floating glassmorphism panel */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const API_ENDPOINT = '/api/chat';
  const MAX_HISTORY  = 6;

  const KARIOTLAB_CONTEXT = `KariotLAB is a brand systems studio. Key facts:

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
  let history  = [];
  let busy     = false;

  // ── DOM ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
#lumis-chat {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  z-index: 9000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --lc-paper: rgba(255,255,255,0.92);
  --lc-paper-dim: rgba(255,255,255,0.45);
  --lc-paper-faint: rgba(255,255,255,0.06);
  --lc-rule: rgba(255,255,255,0.08);
  --lc-rule-2: rgba(255,255,255,0.14);
  --lc-surface: rgba(28,24,22,0.62);
  --lc-surface-deep: rgba(18,16,16,0.82);
  --lc-glow: rgba(255,120,60,0.18);
  --lc-glow-soft: rgba(255,120,60,0.08);
  --lc-glow-edge: rgba(255,120,60,0.45);
  --lc-accent: #FF7A3D;
  --lc-mono: 'JetBrains Mono', 'Courier New', monospace;
  pointer-events: none;
  width: min(440px, calc(100vw - 32px));
}
#lumis-chat * { box-sizing: border-box; margin: 0; padding: 0; }
#lumis-chat > * { pointer-events: auto; }

/* ── BAR (floating pill) ─────────────────────────────────────────────────── */
#lc-bar {
  position: relative;
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px;
  min-height: 72px;
  padding: 10px 12px 10px 14px;
  background:
    radial-gradient(circle at 8% 50%, rgba(255,114,48,0.22), transparent 32%),
    linear-gradient(90deg, rgba(24,20,19,0.84), rgba(43,34,30,0.76));
  backdrop-filter: blur(22px) saturate(170%);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 18px;
  box-shadow:
    0 8px 32px rgba(0,0,0,0.45),
    0 0 40px var(--lc-glow-soft),
    inset 0 0 0 1px rgba(255,255,255,0.02);
  cursor: pointer;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out;
  overflow: hidden;
  animation: lc-rise 600ms cubic-bezier(0.4,0,0.2,1) both;
}
#lc-bar::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(90deg, transparent, rgba(255,120,60,0.22), transparent),
    linear-gradient(180deg, rgba(255,255,255,0.06), transparent 56%);
  opacity: 0.68; pointer-events: none; mix-blend-mode: screen;
  animation: lc-drift 9s ease-in-out infinite;
}
#lc-bar:hover {
  transform: translateY(-3px);
  border-color: rgba(255,255,255,0.14);
  box-shadow:
    0 12px 40px rgba(0,0,0,0.55),
    0 0 60px var(--lc-glow),
    inset 0 0 0 1px rgba(255,255,255,0.04);
}
@keyframes lc-rise {
  from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes lc-drift {
  0%,100% { background-position: 0% 50%; }
  50%     { background-position: 100% 50%; }
}

/* lift on top of background gradient layer */
#lc-bar > * { position: relative; z-index: 1; }

#lc-bar-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background:
    radial-gradient(circle at 30% 38%, rgba(255,180,104,0.95) 0 9%, transparent 10%),
    radial-gradient(circle at 60% 50%, rgba(255,85,38,0.62), transparent 50%),
    linear-gradient(135deg, rgba(255,120,60,0.36), rgba(255,255,255,0.05));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; position: relative;
}
#lc-bar-icon::before {
  content: ''; position: absolute; inset: auto 8px 9px 8px; height: 3px;
  border-radius: 999px; background: rgba(255,255,255,0.54);
  box-shadow: 0 0 14px rgba(255,120,60,0.7), 0 0 26px rgba(255,120,60,0.4);
  animation: lc-pulse 2.6s ease-in-out infinite;
}
@keyframes lc-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.65; transform: scale(0.85); }
}

#lc-bar-label {
  display: grid; gap: 6px;
  font-size: 11px; color: var(--lc-paper);
  font-family: var(--lc-mono); letter-spacing: 0.04em;
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#lc-bar-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#lc-bar-label .lc-dim { color: var(--lc-paper-dim); }

#lc-bar-open {
  width: 38px; height: 38px; border-radius: 12px;
  background: rgba(255,255,255,0.075);
  border: 1px solid var(--lc-rule-2);
  color: var(--lc-paper); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 200ms ease-out;
}
#lc-bar-open:hover {
  background: rgba(255,140,80,0.16);
  border-color: rgba(255,140,80,0.35);
  box-shadow: 0 0 18px rgba(255,120,60,0.25);
  transform: translateY(-1px);
}
#lc-bar-open svg { width: 14px; height: 14px; }

/* ── PANEL (floating glass) ──────────────────────────────────────────────── */
#lc-panel {
  display: none; flex-direction: column;
  height: 236px;
  background:
    radial-gradient(circle at 13% 86%, rgba(255,120,60,0.18), transparent 32%),
    linear-gradient(135deg, rgba(30,24,23,0.90), rgba(12,12,13,0.88) 62%, rgba(39,31,28,0.82));
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px;
  box-shadow:
    0 24px 70px rgba(0,0,0,0.62),
    0 0 76px rgba(255,120,60,0.10),
    inset 0 0 0 1px rgba(255,255,255,0.02);
  overflow: hidden;
  animation: lc-panel-rise 400ms cubic-bezier(0.4,0,0.2,1) both;
  position: relative;
}
#lc-panel::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--lc-glow-edge), transparent);
  pointer-events: none;
}
@keyframes lc-panel-rise {
  from { opacity: 0; transform: translateY(20px); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

#lc-panel.lc-fullscreen {
  position: relative; inset: auto; height: min(300px, calc(100vh - 96px)) !important; width: 100% !important;
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.10);
  animation: none;
}
#lumis-chat.lc-panel-mode {
  position: fixed; left: 50%; bottom: 26px; top: auto; transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px));
}
#lumis-chat.lc-fs-mode {
  position: fixed; left: 50%; bottom: 26px; top: auto; transform: translateX(-50%);
  width: min(560px, calc(100vw - 48px));
}

/* HEADER */
#lc-header {
  display: flex; align-items: center; padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  gap: 10px; flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255,120,60,0.04), transparent);
}
#lc-header-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--lc-accent);
  box-shadow: 0 0 10px rgba(255,120,60,0.7);
  animation: lc-pulse 2.6s ease-in-out infinite;
}
#lc-header-title {
  font-family: var(--lc-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--lc-paper); flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.lc-btn-icon {
  background: rgba(255,255,255,0.04); border: 1px solid var(--lc-rule);
  border-radius: 8px;
  color: var(--lc-paper); opacity: 0.6; cursor: pointer;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; line-height: 1;
  transition: all 180ms ease-out;
}
.lc-btn-icon:hover {
  opacity: 1; background: rgba(255,140,80,0.1);
  border-color: rgba(255,140,80,0.3);
}

/* MESSAGES */
#lc-messages {
  flex: 1; overflow-y: auto; padding: 12px 16px 8px;
  display: flex; flex-direction: column; gap: 10px;
  scroll-behavior: smooth;
}
#lc-messages::-webkit-scrollbar { width: 4px; }
#lc-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.lc-msg {
  max-width: 90%; padding: 8px 11px;
  font-size: 12px; line-height: 1.45;
  animation: lc-msg-in 280ms cubic-bezier(0.4,0,0.2,1);
  border-radius: 18px;
}
@keyframes lc-msg-in {
  from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.lc-msg.user {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--lc-accent), #E5651C);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 16px rgba(255,120,60,0.25);
}
.lc-msg.assistant {
  align-self: flex-start;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.92);
  border: 1px solid var(--lc-rule);
  border-bottom-left-radius: 6px;
  backdrop-filter: blur(12px);
}
.lc-msg.thinking {
  align-self: flex-start; opacity: 0.55;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.6);
  border: 1px solid var(--lc-rule);
  border-bottom-left-radius: 6px;
  font-family: var(--lc-mono); font-size: 12px; letter-spacing: 0.05em;
  display: inline-flex; align-items: center; gap: 8px;
}
.lc-msg.thinking::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--lc-accent);
  box-shadow: 0 0 8px rgba(255,120,60,0.7);
  animation: lc-pulse 1.2s ease-in-out infinite;
}
.lc-welcome {
  align-self: stretch; text-align: center; padding: 8px 10px 2px;
  font-size: 12px; color: var(--lc-paper-dim);
  font-family: var(--lc-mono); letter-spacing: 0.06em;
}
.lc-welcome em {
  display: block; margin-top: 6px;
  color: var(--lc-paper); font-style: normal;
  font-family: 'Inter', sans-serif; font-size: 14px; letter-spacing: 0;
}

/* INPUT */
#lc-input-row {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  margin: 10px 12px 12px;
  padding: 8px 8px 8px 14px;
  border: 1px solid rgba(255,255,255,0.10); flex-shrink: 0;
  border-radius: 18px;
  background:
    radial-gradient(circle at 28% 50%, rgba(255,120,60,0.16), transparent 34%),
    rgba(255,255,255,0.055);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,120,60,0.10), 0 12px 26px rgba(0,0,0,0.22);
}
#lc-input-row::before {
  content: ''; position: absolute; left: 80px; right: 58px; top: 50%; height: 20px;
  transform: translateY(-50%);
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 8px),
    linear-gradient(90deg, transparent, rgba(255,120,60,0.24), transparent);
  filter: blur(5px); opacity: 0.38; pointer-events: none;
}
#lc-input-row:focus-within {
  border-color: rgba(255,140,80,0.34);
  box-shadow:
    inset 0 0 0 1px rgba(255,120,60,0.16),
    0 0 0 4px rgba(255,120,60,0.08),
    0 12px 26px rgba(0,0,0,0.22);
}
#lc-input {
  position: relative; z-index: 1;
  flex: 1; background: transparent;
  border: 0;
  border-radius: 12px;
  color: var(--lc-paper); font-size: 12px; font-weight: 500;
  padding: 4px 0;
  outline: none; font-family: inherit;
  resize: none; max-height: 56px; min-height: 32px;
  line-height: 1.4;
  overflow-y: auto;
  scrollbar-width: none;
  transition: border-color 180ms ease-out, background 180ms ease-out;
}
#lc-input::-webkit-scrollbar { width: 0; height: 0; }
#lc-input::placeholder { color: var(--lc-paper-dim); }
#lc-input:focus {
  box-shadow: none;
}

#lc-send {
  position: relative; z-index: 1;
  background: rgba(255,255,255,0.075);
  border: 1px solid var(--lc-rule-2);
  border-radius: 12px;
  width: 36px; height: 36px;
  color: var(--lc-paper);
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 200ms ease-out;
}
#lc-send:hover:not(:disabled) {
  background: var(--lc-accent);
  border-color: var(--lc-accent);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255,120,60,0.35), 0 0 18px rgba(255,120,60,0.25);
}
#lc-send:disabled { opacity: 0.35; cursor: default; }
#lc-send svg { pointer-events: none; }

/* FULLSCREEN BACK */
#lc-back {
  display: none; font-family: var(--lc-mono); font-size: 10px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--lc-paper); opacity: 0.65;
  background: rgba(255,255,255,0.04); border: 1px solid var(--lc-rule); border-radius: 999px;
  padding: 6px 14px; cursor: pointer; transition: all 180ms ease-out;
}
#lc-back:hover { opacity: 1; border-color: rgba(255,140,80,0.3); background: rgba(255,140,80,0.1); }

/* RESPONSIVE */
@media (max-width: 640px) {
  #lumis-chat { width: min(360px, calc(100vw - 24px)); bottom: 14px; }
  #lumis-chat.lc-panel-mode { width: min(360px, calc(100vw - 24px)); bottom: 14px; }
  #lumis-chat.lc-fs-mode { width: min(390px, calc(100vw - 24px)); bottom: 14px; }
  #lc-bar { min-height: 64px; padding: 9px 10px 9px 12px; border-radius: 18px; }
  #lc-bar-label { font-size: 10px; }
  #lc-bar-icon { width: 36px; height: 36px; }
  #lc-panel { height: min(236px, calc(100vh - 56px)); border-radius: 18px; }
  #lc-panel.lc-fullscreen { height: min(300px, calc(100vh - 56px)) !important; }
}
@media (prefers-reduced-motion: reduce) {
  #lc-bar, #lc-panel { animation: none !important; }
  #lc-bar-icon::before, #lc-header-dot, .lc-msg.thinking::before { animation: none !important; }
  #lc-bar::before { animation: none !important; }
}
`;
    document.head.appendChild(s);
  }

  function injectHTML() {
    const wrap = document.createElement('div');
    wrap.id = 'lumis-chat';
    wrap.innerHTML = `
<div id="lc-bar" role="button" aria-label="Open KariotLAB AI chat" tabindex="0">
  <div id="lc-bar-icon" aria-hidden="true"></div>
  <span id="lc-bar-label"><span>Ask KariotLAB</span><span class="lc-dim">Work, pricing, methodology</span></span>
  <button id="lc-bar-open" aria-label="Open chat">
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13L13 3M13 3H6M13 3V10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>
<div id="lc-panel" role="dialog" aria-label="KariotLAB AI Chat">
  <div id="lc-header">
    <div id="lc-header-dot"></div>
    <span id="lc-header-title">KariotLAB AI</span>
    <button id="lc-back" aria-label="Back to page">← Page</button>
    <button class="lc-btn-icon" id="lc-expand" title="Expand chat" aria-label="Expand chat">⤢</button>
    <button class="lc-btn-icon" id="lc-minimize" title="Minimize" aria-label="Minimize chat">−</button>
    <button class="lc-btn-icon" id="lc-close" title="Close" aria-label="Close chat">×</button>
  </div>
  <div id="lc-messages">
    <div class="lc-welcome">// KariotLAB AI<em>What would you like to know?</em></div>
  </div>
  <div id="lc-input-row">
    <textarea id="lc-input" rows="1" placeholder="Ask KariotLAB..." aria-label="Chat message"></textarea>
    <button id="lc-send" aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 8L14 2L9 14L7.5 9L2 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
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
    el('lumis-chat').classList.remove('lc-panel-mode');
    el('lumis-chat').classList.remove('lc-fs-mode');
    el('lc-back').style.display  = 'none';
  }

  function toPanel() {
    state = 'panel';
    el('lc-bar').style.display   = 'none';
    el('lc-panel').style.display = 'flex';
    el('lc-panel').classList.remove('lc-fullscreen');
    el('lumis-chat').classList.add('lc-panel-mode');
    el('lumis-chat').classList.remove('lc-fs-mode');
    el('lc-back').style.display  = 'none';
    el('lc-panel').style.height  = '236px';
    el('lc-input').focus();
  }

  function toFullscreen() {
    state = 'fullscreen';
    el('lc-bar').style.display   = 'none';
    el('lc-panel').style.display = 'flex';
    el('lc-panel').classList.add('lc-fullscreen');
    el('lumis-chat').classList.remove('lc-panel-mode');
    el('lumis-chat').classList.add('lc-fs-mode');
    el('lc-back').style.display  = 'none';
    el('lc-input').focus();
  }

  function growPanel() {
    if (state === 'panel') {
      el('lc-panel').style.height = '270px';
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  function wireEvents() {
    el('lc-bar').addEventListener('click', () => toPanel());
    el('lc-bar').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toPanel(); }
    });
    el('lc-bar-open').addEventListener('click', e => { e.stopPropagation(); toPanel(); });
    el('lc-close').addEventListener('click',    () => toBar());
    el('lc-minimize').addEventListener('click', () => toBar());
    el('lc-expand').addEventListener('click',   () => state === 'fullscreen' ? toPanel() : toFullscreen());
    el('lc-back').addEventListener('click',     () => toBar());

    el('lc-input').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 56) + 'px';
    });

    el('lc-send').addEventListener('click', sendMessage);
    el('lc-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (state === 'fullscreen') toPanel();
        else if (state === 'panel') toBar();
      }
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

    growPanel();

    const thinking = appendMsg('thinking', 'thinking');

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
