// Discoverse E2B Backend — runs on Railway (or any Node host)
// Bridges the Lovable app to E2B sandboxes for code execution and live desktop.

import express from "express";
import cors from "cors";
import { Sandbox } from "@e2b/code-interpreter";

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
app.use(express.json({ limit: "2mb" }));

// Simple bearer auth
function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "discoverse-e2b-backend" });
});

// Run code in a fresh sandbox and return stdout/stderr/results
app.post("/run-code", requireAuth, async (req, res) => {
  const { code, language = "python" } = req.body || {};
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "code is required" });
  }

  let sandbox;
  try {
    sandbox = await Sandbox.create();
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

// Placeholder: start a desktop sandbox. Wire this up when you're ready for Phase 2.
app.post("/desktop/start", requireAuth, async (_req, res) => {
  res.status(501).json({
    error:
      "Desktop streaming not implemented yet. We'll add it in Phase 2 once the basic backend is live.",
  });
});

app.listen(PORT, () => {
  console.log(`E2B backend listening on :${PORT}`);
});
