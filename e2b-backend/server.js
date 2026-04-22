// Discoverse E2B Backend — runs on Render (or any Node host)
// Bridges the Lovable app to E2B sandboxes for code execution AND live desktop.

import express from "express";
import cors from "cors";
import { Sandbox as CodeSandbox } from "@e2b/code-interpreter";
import { Sandbox as DesktopSandbox } from "@e2b/desktop";

const app = express();
const PORT = process.env.PORT || 8080;
const TOKEN = process.env.BACKEND_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

if (!process.env.E2B_API_KEY) {
  console.error("Missing E2B_API_KEY env var");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Missing BACKEND_TOKEN env var");
  process.exit(1);
}

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "4mb" }));

// Bearer auth — all endpoints except /health
function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "discoverse-e2b-backend", version: "0.2.0" });
});

// =====================================================================
// CODE EXECUTION (Atlas)
// =====================================================================
app.post("/run-code", requireAuth, async (req, res) => {
  const { code, language = "python" } = req.body || {};
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "code is required" });
  }

  let sandbox;
  try {
    sandbox = await CodeSandbox.create();
    const exec = await sandbox.runCode(code, { language });
    res.json({
      stdout: exec.logs.stdout.join("\n"),
      stderr: exec.logs.stderr.join("\n"),
      results: exec.results.map((r) => ({
        text: r.text ?? null,
        html: r.html ?? null,
      })),
      error: exec.error ? { name: exec.error.name, value: exec.error.value } : null,
    });
  } catch (err) {
    console.error("run-code failed", err);
    res.status(500).json({ error: err?.message || "run-code failed" });
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {}
    }
  }
});

// =====================================================================
// LIVE DESKTOP (Kite)
// =====================================================================
// Active desktop sessions kept in memory. Single-instance only —
// if you scale Render to >1 replica, move this to Redis or a DB.
const desktops = new Map(); // sandboxId -> { sandbox, createdAt, lastUsed }

const DESKTOP_TIMEOUT_MS = 15 * 60 * 1000; // 15 min idle
const MAX_DESKTOP_LIFETIME_MS = 60 * 60 * 1000; // 1hr hard cap

// Reaper — kills idle/expired desktops every minute
setInterval(async () => {
  const now = Date.now();
  for (const [id, session] of desktops.entries()) {
    const idle = now - session.lastUsed > DESKTOP_TIMEOUT_MS;
    const tooOld = now - session.createdAt > MAX_DESKTOP_LIFETIME_MS;
    if (idle || tooOld) {
      console.log(`Reaping desktop ${id} (idle=${idle}, tooOld=${tooOld})`);
      try {
        await session.sandbox.kill();
      } catch {}
      desktops.delete(id);
    }
  }
}, 60_000);

function getDesktop(sandboxId) {
  const session = desktops.get(sandboxId);
  if (!session) return null;
  session.lastUsed = Date.now();
  return session.sandbox;
}

// Start a fresh desktop sandbox. Returns sandboxId + the noVNC stream URL
// that the frontend embeds in an <iframe>.
app.post("/desktop/start", requireAuth, async (_req, res) => {
  try {
    const sandbox = await DesktopSandbox.create({
      timeoutMs: MAX_DESKTOP_LIFETIME_MS,
    });

    // Start the visual stream — required before getStreamUrl works.
    await sandbox.stream.start();
    const streamUrl = sandbox.stream.getUrl();
    const sandboxId = sandbox.sandboxId;

    desktops.set(sandboxId, {
      sandbox,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    });

    console.log(`Desktop started: ${sandboxId}`);
    res.json({ sandboxId, streamUrl });
  } catch (err) {
    console.error("desktop/start failed", err);
    res.status(500).json({ error: err?.message || "Failed to start desktop" });
  }
});

// Kill a desktop sandbox.
app.post("/desktop/stop", requireAuth, async (req, res) => {
  const { sandboxId } = req.body || {};
  if (!sandboxId) return res.status(400).json({ error: "sandboxId required" });

  const session = desktops.get(sandboxId);
  if (!session) return res.json({ ok: true, alreadyGone: true });

  try {
    await session.sandbox.stream.stop().catch(() => {});
    await session.sandbox.kill();
  } catch (err) {
    console.warn("desktop/stop kill error (non-fatal)", err?.message);
  }
  desktops.delete(sandboxId);
  res.json({ ok: true });
});

// Take a screenshot — used by the agent vision loop.
app.post("/desktop/screenshot", requireAuth, async (req, res) => {
  const { sandboxId } = req.body || {};
  const sandbox = getDesktop(sandboxId);
  if (!sandbox) return res.status(404).json({ error: "Desktop not found" });

  try {
    const buf = await sandbox.screenshot();
    res.json({ image: Buffer.from(buf).toString("base64"), mime: "image/png" });
  } catch (err) {
    console.error("screenshot failed", err);
    res.status(500).json({ error: err?.message || "Screenshot failed" });
  }
});

// Perform a single action on the desktop. The agent calls this in a loop.
//
// Supported actions:
//   { type: "navigate", url }
//   { type: "left_click", x, y }
//   { type: "right_click", x, y }
//   { type: "double_click", x, y }
//   { type: "move", x, y }
//   { type: "scroll", direction: "up"|"down", amount: number }
//   { type: "type", text }
//   { type: "key", key }   // e.g. "Return", "Tab", "ctrl+l"
//   { type: "wait", ms }
app.post("/desktop/action", requireAuth, async (req, res) => {
  const { sandboxId, action } = req.body || {};
  const sandbox = getDesktop(sandboxId);
  if (!sandbox) return res.status(404).json({ error: "Desktop not found" });
  if (!action || typeof action !== "object") {
    return res.status(400).json({ error: "action object required" });
  }

  try {
    switch (action.type) {
      case "navigate": {
        if (typeof action.url !== "string") throw new Error("url required");
        // Open Firefox to the URL. If it's already running this will open a new tab.
        await sandbox.launch("firefox", [action.url]);
        // Give the page a moment so the next screenshot shows real content.
        await new Promise((r) => setTimeout(r, 2500));
        break;
      }
      case "left_click":
        await sandbox.leftClick(action.x, action.y);
        break;
      case "right_click":
        await sandbox.rightClick(action.x, action.y);
        break;
      case "double_click":
        await sandbox.doubleClick(action.x, action.y);
        break;
      case "move":
        await sandbox.moveMouse(action.x, action.y);
        break;
      case "scroll":
        await sandbox.scroll(action.direction || "down", action.amount || 3);
        break;
      case "type":
        if (typeof action.text !== "string") throw new Error("text required");
        await sandbox.write(action.text);
        break;
      case "key":
        if (typeof action.key !== "string") throw new Error("key required");
        await sandbox.press(action.key);
        break;
      case "wait":
        await new Promise((r) => setTimeout(r, Math.min(action.ms || 500, 10_000)));
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("action failed", err);
    res.status(500).json({ error: err?.message || "Action failed" });
  }
});

app.listen(PORT, () => {
  console.log(`E2B backend v0.2.0 listening on :${PORT}`);
});
