import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =====================================================================
// Validators
// =====================================================================
const StartInput = z.object({}).optional();
const StopInput = z.object({ sandboxId: z.string().min(1) });
const RunKiteInput = z.object({
  sandboxId: z.string().min(1),
  goal: z.string().min(1).max(2000),
});

// =====================================================================
// Types
// =====================================================================
export interface DesktopSession {
  sandboxId: string;
  streamUrl: string;
}

export type KiteAction =
  | { type: "navigate"; url: string }
  | { type: "left_click"; x: number; y: number }
  | { type: "right_click"; x: number; y: number }
  | { type: "double_click"; x: number; y: number }
  | { type: "move"; x: number; y: number }
  | { type: "scroll"; direction: "up" | "down"; amount: number }
  | { type: "type"; text: string }
  | { type: "key"; key: string }
  | { type: "wait"; ms: number };

export interface KiteStep {
  index: number;
  thought: string;
  action: KiteAction | null;
  done: boolean;
}

export interface KiteRunResult {
  steps: KiteStep[];
  summary: string;
  reachedLimit: boolean;
}

// =====================================================================
// Backend helpers
// =====================================================================
function backendConfig() {
  const url = process.env.E2B_BACKEND_URL;
  const token = process.env.E2B_BACKEND_TOKEN;
  if (!url || !token) {
    throw new Error("E2B backend is not configured. Set E2B_BACKEND_URL and E2B_BACKEND_TOKEN.");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function backendFetch<T>(path: string, body?: unknown): Promise<T> {
  const { url, token } = backendConfig();
  const r = await fetch(url + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Backend ${path} ${r.status}: ${text.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

// =====================================================================
// Server functions — start / stop
// =====================================================================
export const startDesktop = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StartInput.parse(input))
  .handler(async (): Promise<DesktopSession> => {
    return backendFetch<DesktopSession>("/desktop/start");
  });

export const stopDesktop = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StopInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    return backendFetch("/desktop/stop", { sandboxId: data.sandboxId });
  });

// =====================================================================
// Kite vision-agent loop
// =====================================================================
//
// Each step:
//   1. take a screenshot of the desktop
//   2. send to GPT-5 vision with the goal + history
//   3. model returns either an action or "done" with a summary
//   4. execute the action on the desktop
//   5. repeat (max 10 steps)
//
const MAX_STEPS = 10;
const RESOLUTION_HINT = "The desktop is 1024x768. Coordinates are pixel positions from the top-left.";

const KITE_SYSTEM_PROMPT = `You are Kite, the browser-automation agent of Discoverse AI.

You see real screenshots of a Linux desktop with Firefox. Your job is to accomplish the user's goal by clicking, typing and navigating — one action at a time.

${RESOLUTION_HINT}

For each step, look at the screenshot and call EXACTLY ONE tool:
- "act" → perform a single action (navigate / click / type / scroll / key / wait)
- "finish" → declare the goal complete with a short summary

Tactics:
- The first step for a fresh desktop should usually be navigate to a URL.
- After navigate, ALWAYS take stock — pages need a moment.
- Click search bars before typing. Click "Search" buttons or press "Return" after typing.
- Use "key": "ctrl+l" then "type" + "key": "Return" for clean URL bar navigation.
- Don't repeat the same action endlessly. If something didn't work, try a different approach.
- Be ruthless about finishing. As soon as the goal is visibly accomplished, call "finish".`;

const KITE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "act",
      description: "Perform a single action on the desktop.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string", maxLength: 280, description: "One-sentence reasoning for this action." },
          action: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["navigate", "left_click", "right_click", "double_click", "move", "scroll", "type", "key", "wait"],
              },
              url: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              direction: { type: "string", enum: ["up", "down"] },
              amount: { type: "number" },
              text: { type: "string" },
              key: { type: "string" },
              ms: { type: "number" },
            },
            required: ["type"],
          },
        },
        required: ["thought", "action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finish",
      description: "Mark the goal as complete and provide a short summary.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string", maxLength: 280 },
          summary: { type: "string", maxLength: 600 },
        },
        required: ["thought", "summary"],
        additionalProperties: false,
      },
    },
  },
];

async function takeScreenshot(sandboxId: string): Promise<string> {
  const { image } = await backendFetch<{ image: string; mime: string }>("/desktop/screenshot", { sandboxId });
  return image;
}

async function performAction(sandboxId: string, action: KiteAction): Promise<void> {
  await backendFetch("/desktop/action", { sandboxId, action });
}

export const runKite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunKiteInput.parse(input))
  .handler(async ({ data }): Promise<KiteRunResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const steps: KiteStep[] = [];
    // Conversation kept on server side — vision messages get big, no need to round-trip.
    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: KITE_SYSTEM_PROMPT },
      { role: "user", content: `Goal: ${data.goal}` },
    ];

    let finishedSummary: string | null = null;

    for (let i = 0; i < MAX_STEPS; i++) {
      // 1. Screenshot
      let screenshot: string;
      try {
        screenshot = await takeScreenshot(data.sandboxId);
      } catch (e) {
        steps.push({
          index: i,
          thought: `Couldn't grab screenshot: ${e instanceof Error ? e.message : "unknown error"}`,
          action: null,
          done: true,
        });
        return { steps, summary: "Lost connection to the desktop.", reachedLimit: false };
      }

      // 2. Ask GPT-5 with vision
      conversation.push({
        role: "user",
        content: [
          { type: "text", text: `Step ${i + 1}/${MAX_STEPS}. Look at the screen and choose your next action — or finish if the goal is done.` },
          { type: "image_url", image_url: { url: `data:image/png;base64,${screenshot}` } },
        ],
      });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: conversation,
          tools: KITE_TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
        if (response.status === 402) throw new Error("Workspace credits exhausted.");
        const text = await response.text();
        console.error("Kite gateway error:", response.status, text);
        throw new Error("Kite hit an unexpected gateway error.");
      }

      const json = await response.json();
      const message = json.choices?.[0]?.message;
      const toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        // Model just talked — treat as finish.
        finishedSummary = (message?.content as string) || "Done.";
        steps.push({ index: i, thought: finishedSummary, action: null, done: true });
        break;
      }

      const call = toolCalls[0];
      // Push assistant turn so subsequent tool message threading works (we don't actually
      // send a tool reply because each step we send a fresh screenshot instead).
      conversation.push({ role: "assistant", content: message.content ?? "", tool_calls: [call] });
      // Acknowledge tool call so OpenAI-style threading stays valid.
      conversation.push({ role: "tool", tool_call_id: call.id, content: "ok" });

      let parsed: { thought: string; action?: KiteAction; summary?: string };
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        steps.push({ index: i, thought: "Model returned invalid JSON arguments.", action: null, done: true });
        break;
      }

      if (call.function.name === "finish") {
        finishedSummary = parsed.summary || parsed.thought || "Done.";
        steps.push({ index: i, thought: parsed.thought, action: null, done: true });
        break;
      }

      // act
      const action = parsed.action;
      if (!action) {
        steps.push({ index: i, thought: parsed.thought, action: null, done: true });
        break;
      }

      try {
        await performAction(data.sandboxId, action);
        steps.push({ index: i, thought: parsed.thought, action, done: false });
      } catch (e) {
        steps.push({
          index: i,
          thought: `${parsed.thought} (failed: ${e instanceof Error ? e.message : "unknown"})`,
          action,
          done: true,
        });
        break;
      }
    }

    return {
      steps,
      summary: finishedSummary ?? "I made progress but ran out of steps. Open the desktop to continue manually.",
      reachedLimit: !finishedSummary && steps.length === MAX_STEPS,
    };
  });
