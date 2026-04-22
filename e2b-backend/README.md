# Discoverse E2B Backend

A small Node.js service that bridges your Lovable app to **E2B sandboxes** (live desktop, code execution, browser control).

This is **NOT part of the Lovable app**. It runs separately on Railway (or any Node host) and your Lovable app calls it over HTTPS.

---

## Why this exists

E2B's live desktop streaming uses **WebSockets** that need a long-lived server. Lovable's serverless Workers can't host that, so this tiny backend does it for us.

```
[Lovable app] ──HTTPS──> [This backend on Railway] ──WebSocket──> [E2B Sandbox]
```

---

## Deploy to Railway in 5 minutes

### 1. Push this folder to GitHub

The easiest way:

1. Connect your Lovable project to GitHub (top-right → GitHub → Connect)
2. The whole project (including this `e2b-backend/` folder) lands in your repo
3. We'll point Railway at this subfolder

### 2. Sign up at Railway

Go to [railway.com](https://railway.com) → Sign in with GitHub → **New Project** → **Deploy from GitHub repo** → pick your Discoverse repo.

### 3. Configure the service

In the Railway service settings:

- **Root Directory**: `e2b-backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Add environment variables

In Railway → Variables, add:

| Name | Value | Where to get it |
|------|-------|------------------|
| `E2B_API_KEY` | `e2b_...` | [e2b.dev/dashboard](https://e2b.dev/dashboard) → API Keys |
| `BACKEND_TOKEN` | any long random string | Generate one yourself, e.g. `openssl rand -hex 32` |
| `ALLOWED_ORIGIN` | your Lovable URL | e.g. `https://discoverse.lovable.app` (or `*` while testing) |

### 5. Generate a public URL

In Railway → Settings → Networking → **Generate Domain**.

You'll get something like `discoverse-e2b-production.up.railway.app`.

### 6. Test it

Open in your browser:

```
https://your-railway-url.up.railway.app/health
```

You should see `{"ok":true}`.

### 7. Tell Lovable

Come back to Lovable chat and paste:

> Railway URL: `https://your-railway-url.up.railway.app`
> Backend token: `the-token-you-generated`

I'll then wire it into the orchestrator and add the live desktop panel.

---

## Endpoints (for reference)

- `GET /health` — health check
- `POST /run-code` — run code in a sandbox, returns stdout/files
- `POST /desktop/start` — start a desktop sandbox, returns a stream URL
- `WS /desktop/:id` — WebSocket stream of the live desktop

All endpoints require `Authorization: Bearer <BACKEND_TOKEN>`.
