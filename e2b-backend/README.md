# Discoverse E2B Backend

Node service that bridges the Lovable app to **E2B sandboxes** — both code execution (Atlas) and the live desktop with Firefox (Kite).

This runs **separately from Lovable** on Render (or any Node host) and the Lovable app calls it over HTTPS.

```
[Lovable app]
   │  HTTPS
   ▼
[This backend on Render]
   │  E2B SDK
   ▼
[E2B code sandbox]   [E2B desktop sandbox + noVNC]
                              │
                         <iframe stream URL>
                              │
                         back to user's browser
```

---

## Why this exists

E2B's desktop sandbox runs Firefox + a noVNC server inside an isolated VM. The Lovable Worker can't host the Express + WebSocket session needed to keep that alive between requests — so this small Node service does it.

## Endpoints

All endpoints (except `/health`) require `Authorization: Bearer <BACKEND_TOKEN>`.

### Code execution (Atlas)
- `POST /run-code` `{ code, language }` → `{ stdout, stderr, results, error }`

### Live desktop (Kite)
- `POST /desktop/start` → `{ sandboxId, streamUrl }`
- `POST /desktop/stop` `{ sandboxId }` → `{ ok }`
- `POST /desktop/screenshot` `{ sandboxId }` → `{ image: base64, mime }`
- `POST /desktop/action` `{ sandboxId, action }` → `{ ok }`

Action shapes:
```jsonc
{ "type": "navigate",     "url": "https://chatgpt.com" }
{ "type": "left_click",   "x": 100, "y": 200 }
{ "type": "double_click", "x": 100, "y": 200 }
{ "type": "right_click",  "x": 100, "y": 200 }
{ "type": "move",         "x": 100, "y": 200 }
{ "type": "scroll",       "direction": "down", "amount": 3 }
{ "type": "type",         "text": "hello" }
{ "type": "key",          "key": "Return" }
{ "type": "wait",         "ms": 1000 }
```

### Health
- `GET /health` → `{ ok: true }`

## Session lifecycle

- Desktops idle for **15 minutes** are auto-killed.
- Hard cap: **60 minutes** per session.
- Sessions are stored in memory → **only run 1 Render replica**. If you need to scale, move `desktops` into Redis.

## Deploy to Render

1. Push the repo to GitHub.
2. New Web Service → connect repo → set:
   - **Root Directory**: `e2b-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Environment variables:

   | Name | Value |
   |------|-------|
   | `E2B_API_KEY` | from [e2b.dev/dashboard](https://e2b.dev/dashboard) |
   | `BACKEND_TOKEN` | random string (`openssl rand -hex 32`) |
   | `ALLOWED_ORIGIN` | `*` (or your Lovable URL) |

4. Generate a public domain.
5. Test: `curl https://<your-domain>/health` → `{"ok":true,...,"version":"0.2.0"}`

## Cost notes

- Code sandboxes: ~free tier friendly, kill after each call.
- **Desktop sandboxes are paid** — make sure your E2B plan supports them. Each idle desktop costs you while it lives, so the 15-minute reaper matters.
