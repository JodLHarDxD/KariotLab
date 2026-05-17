#!/usr/bin/env python
"""Lumis chatbot proxy server.

Run:  python chat-proxy.py
Serves:
  - POST /api/chat  → Anthropic Messages API
  - GET  /*         → static files from the project root
"""
import json
import os
import sys
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", 8787))

# Loaded once at startup
_INDEX: list[dict] = []
_INDEX_PATH = ROOT / "content_index.json"
if _INDEX_PATH.is_file():
    _INDEX = json.loads(_INDEX_PATH.read_text(encoding="utf-8"))

SYSTEM_PROMPT = f"""You are the Lumis Studio AI assistant. Lumis builds brand systems for ambitious founders and growing teams.

Answer questions about the studio's work, pricing, team, and journal essays.
Keep answers concise (2-4 sentences). For project inquiries, direct to contact.html.
Never make up case studies or pricing not listed below.

--- LUMIS CONTENT ---
WORK (10 case studies): North Capital (Fintech/B2B, Series A), Atelier Vesta (D2C Beauty, Pre-seed),
Hum (B2B Dev tools, Series Seed), Casa Lume (Hospitality, 9 properties), Slow (Health D2C),
Selected (D2C Coffee), Brick (B2B SaaS), Field Notes (Creative tools), Vesper (D2C Apparel),
Seed (Health, Series A).

PRICING:
- Starter $49/mo: solo founders, one full brand system, 2 revisions/mo, Figma+code export, email support 48h
- Studio $249/mo: teams, unlimited iterations, living system, extended library 120+ primitives, Slack 4h response
- Scale Custom: enterprise, multi-brand portfolios, SSO, audit logs, dedicated principal 1h response
All plans: 14-day trial, no card required, own your output.

TEAM: Mara Castellán (Principal · Strategy, Lisbon, ex-Wolff Olins),
Aiko Tanaka (Principal · Identity, Tokyo, ex-Pentagram), Eli Okafor, Theo Halász

JOURNAL ESSAYS (7): YC top brand patterns, 48-hour brand sprint, italics in design,
color theory as emotional architecture, founder brand systems, client collaboration,
typography for category leaders.
---"""

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Free OpenRouter models (suffix :free). Override via MODEL env var.
# Tested working 2026-05-07: openai/gpt-oss-120b:free, openai/gpt-oss-20b:free,
# openrouter/free (auto-routed). Many other :free models hit upstream rate limits.
MODEL = os.environ.get("MODEL", "openai/gpt-oss-120b:free")
MAX_TOKENS = 512


def _get_api_key() -> str:
    for var in ("OPENROUTER_API_KEY", "OPENAI_API_KEY"):
        key = os.environ.get(var, "")
        if key:
            return key
    env_file = ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            for prefix in ("OPENROUTER_API_KEY=", "OPENAI_API_KEY="):
                if line.startswith(prefix):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def call_llm(messages: list[dict]) -> str:
    api_key = _get_api_key()
    if not api_key:
        return (
            "API key not configured. Set OPENROUTER_API_KEY in your environment "
            "or create a .env file with OPENROUTER_API_KEY=your_key_here"
        )

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages[-6:]

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "messages": full_messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_API_URL,
        data=payload,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer":  "http://localhost",
            "X-Title":       "Lumis Studio",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return f"OpenRouter API error {e.code}: {body[:300]}"
    except Exception as e:
        return f"Error: {e}"


MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".json": "application/json",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".woff2": "font/woff2",
    ".woff":  "font/woff",
    ".ttf":   "font/ttf",
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.command} {self.path} — {args[1]}")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", 0))
        body   = json.loads(self.rfile.read(length))
        msgs   = body.get("messages", [])
        reply  = call_llm(msgs)
        payload = json.dumps({"reply": reply}, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = self.path.split("?")[0].lstrip("/") or "index.html"
        file_path = ROOT / path
        if file_path.is_dir():
            file_path = file_path / "index.html"
        if not file_path.is_file():
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")
            return
        mime = MIME.get(file_path.suffix.lower(), "application/octet-stream")
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type",   mime)
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = HTTPServer(("", PORT), Handler)
    print(f"Lumis dev server → http://localhost:{PORT}")
    print(f"  API key:  {'set ✓' if _get_api_key() else 'NOT SET — set OPENROUTER_API_KEY'}")
    print(f"  Model:    {MODEL}")
    print(f"  Content:  {len(_INDEX)} records loaded from content_index.json")
    print("  Press Ctrl-C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
