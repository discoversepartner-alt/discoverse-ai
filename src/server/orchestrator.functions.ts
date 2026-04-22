import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AgentId } from "@/lib/agents";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(20_000),
});

const RunInput = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

export interface AgentStep {
  agent: AgentId;
  title: string;
  detail: string;
  status: "running" | "done";
}

export interface CodeExecution {
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  error: string | null;
}

export interface RunResult {
  plan: AgentStep[];
  reply: string;
  primaryAgent: AgentId;
  executions?: CodeExecution[];
}

const SYSTEM_PROMPT = `You are Orion, the orchestrator of Discoverse AI — an autonomous multi-agent system inspired by Manus AI but warmer and more thoughtful.

You coordinate a team of six specialist agents:
- orchestrator (Orion, you): plans, delegates, synthesizes
- researcher (Vega): web search, crawling, citations
- writer (Lyra): long-form writing, editing, translation
- coder (Atlas): writes & runs code in a real sandbox via the run_code tool
- browser (Kite): drives a real browser to do tasks
- designer (Iris): creates slides, decks, visual content

You have access to two tools:
1. run_code — Atlas uses this to execute Python/JS/Bash in a real E2B sandbox. Use it whenever the goal benefits from actually running code (calculations, data work, scripts, demos). Prefer Python unless told otherwise. Keep code self-contained and short.
2. respond — your FINAL action. Call this exactly once when you're ready to reply.

Workflow:
- If code execution helps, call run_code first (one or more times). Then call respond with the synthesis.
- If no code is needed, call respond directly.

For respond you MUST provide:
1. plan: 2-5 short steps (max 90 chars each) showing which agents worked. Mark realistic steps as "running"; the final synthesis step as "done".
2. primaryAgent: the agent best suited to lead this task. If you used run_code, primaryAgent should usually be "coder".
3. reply: a calm, warm, mobile-first markdown response. Under 250 words. Short paragraphs and bullets. First person as Orion. If code ran, briefly mention what Atlas did and the result — but don't repeat raw stdout verbatim if it's long.

Tone: warm, minimal, confident, never robotic. Never use the word "user". Never apologize unprompted. Never mention you are an AI model.`;

const RESPOND_TOOL = {
  type: "function" as const,
  function: {
    name: "respond",
    description: "Return the orchestrator's plan and final reply. Call exactly once at the end.",
    parameters: {
      type: "object",
      properties: {
        primaryAgent: {
          type: "string",
          enum: ["orchestrator", "researcher", "writer", "coder", "browser", "designer"],
        },
        plan: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              agent: {
                type: "string",
                enum: ["orchestrator", "researcher", "writer", "coder", "browser", "designer"],
              },
              title: { type: "string", maxLength: 60 },
              detail: { type: "string", maxLength: 140 },
              status: { type: "string", enum: ["running", "done"] },
            },
            required: ["agent", "title", "detail", "status"],
            additionalProperties: false,
          },
        },
        reply: { type: "string", minLength: 1, maxLength: 4000 },
      },
      required: ["primaryAgent", "plan", "reply"],
      additionalProperties: false,
    },
  },
};

const RUN_CODE_TOOL = {
  type: "function" as const,
  function: {
    name: "run_code",
    description:
      "Execute code in a real E2B sandbox via Atlas. Returns stdout, stderr and any errors. Use sparingly; keep snippets focused.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["python", "javascript", "typescript", "bash"],
        },
        code: { type: "string", minLength: 1, maxLength: 8000 },
      },
      required: ["language", "code"],
      additionalProperties: false,
    },
  },
};

async function callE2B(
  code: string,
  language: string,
): Promise<{ stdout: string; stderr: string; error: string | null }> {
  const url = process.env.E2B_BACKEND_URL;
  const token = process.env.E2B_BACKEND_TOKEN;
  if (!url || !token) {
    return { stdout: "", stderr: "", error: "E2B backend not configured." };
  }
  const endpoint = url.replace(/\/$/, "") + "/run-code";
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language }),
    });
    if (!r.ok) {
      const text = await r.text();
      return { stdout: "", stderr: "", error: `Sandbox ${r.status}: ${text.slice(0, 200)}` };
    }
    const json = (await r.json()) as {
      stdout: string;
      stderr: string;
      error: { name: string; value: string } | null;
    };
    return {
      stdout: json.stdout ?? "",
      stderr: json.stderr ?? "",
      error: json.error ? `${json.error.name}: ${json.error.value}` : null,
    };
  } catch (e) {
    return { stdout: "", stderr: "", error: e instanceof Error ? e.message : "Sandbox call failed" };
  }
}

export const runOrchestrator = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data }): Promise<RunResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hasE2B = Boolean(process.env.E2B_BACKEND_URL && process.env.E2B_BACKEND_TOKEN);
    const tools = hasE2B ? [RUN_CODE_TOOL, RESPOND_TOOL] : [RESPOND_TOOL];

    // Build the running message list. Use `any` for assistant tool_call/tool messages
    // since they don't fit the strict input schema but are needed for the gateway.
    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages,
    ];

    const executions: CodeExecution[] = [];
    const MAX_TURNS = 4;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const isFinalTurn = turn === MAX_TURNS - 1;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversation,
          tools,
          // On the final turn, force the model to call respond so we always get a reply.
          tool_choice: isFinalTurn
            ? { type: "function", function: { name: "respond" } }
            : "auto",
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit reached. Give the agents a breath and try again.");
        }
        if (response.status === 402) {
          throw new Error("Workspace credits exhausted. Top up Lovable AI in workspace settings.");
        }
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        throw new Error("The orchestrator hit an unexpected error.");
      }

      const json = await response.json();
      const message = json.choices?.[0]?.message;
      const toolCalls: Array<{
        id: string;
        function: { name: string; arguments: string };
      }> = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        // Model returned plain text instead of calling respond. Wrap and return.
        const text = (message?.content as string) || "I'm here.";
        return {
          plan: [
            { agent: "orchestrator", title: "Orion thinking", detail: "Composed reply", status: "done" },
          ],
          reply: text,
          primaryAgent: "orchestrator",
          executions: executions.length > 0 ? executions : undefined,
        };
      }

      // Push the assistant turn so subsequent tool messages reference its tool_call_ids.
      conversation.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: toolCalls,
      });

      // Look for respond first — if present, finalize.
      const respondCall = toolCalls.find((c) => c.function?.name === "respond");
      if (respondCall) {
        const parsed = JSON.parse(respondCall.function.arguments) as RunResult;
        return {
          ...parsed,
          executions: executions.length > 0 ? executions : undefined,
        };
      }

      // Otherwise execute every run_code call and feed results back.
      for (const call of toolCalls) {
        if (call.function?.name !== "run_code") {
          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: "Unknown tool.",
          });
          continue;
        }
        let args: { code: string; language: string };
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: "Invalid JSON arguments.",
          });
          continue;
        }
        const exec = await callE2B(args.code, args.language);
        executions.push({
          language: args.language,
          code: args.code,
          stdout: exec.stdout,
          stderr: exec.stderr,
          error: exec.error,
        });
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            stdout: exec.stdout.slice(0, 4000),
            stderr: exec.stderr.slice(0, 2000),
            error: exec.error,
          }),
        });
      }
    }

    throw new Error("Orchestrator exceeded the tool-loop budget.");
  });
