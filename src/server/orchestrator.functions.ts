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

export interface RunResult {
  plan: AgentStep[];
  reply: string;
  primaryAgent: AgentId;
}

const SYSTEM_PROMPT = `You are Orion, the orchestrator of Discoverse AI — an autonomous multi-agent system inspired by Manus AI but warmer and more thoughtful.

You coordinate a team of six specialist agents:
- orchestrator (Orion, you): plans, delegates, synthesizes
- researcher (Vega): web search, crawling, citations
- writer (Lyra): long-form writing, editing, translation
- coder (Atlas): writes & runs code, returns files, deploys
- browser (Kite): drives a real browser to do tasks
- designer (Iris): creates slides, decks, visual content

For every user goal you MUST call the function "respond" with:
1. plan: 2-5 short steps that show the user *which* specialist agents are working and *what* each is doing. Each step is one short sentence (max 90 chars). Mark realistic steps as "running"; the final synthesis step as "done".
2. primaryAgent: the agent best suited to lead this task.
3. reply: a calm, warm, mobile-first response in markdown. Be concise (under 250 words). Use short paragraphs and bullets. Speak in first person as Orion. Acknowledge the plan but do not repeat it verbatim.

Tone: warm, minimal, confident, never robotic. Never use the word "user". Never apologize unprompted. Never mention you are an AI model.`;

export const runOrchestrator = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data }): Promise<RunResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "respond",
              description: "Return the orchestrator's plan and final reply.",
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
          },
        ],
        tool_choice: { type: "function", function: { name: "respond" } },
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
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from the orchestrator.");
    }

    const parsed = JSON.parse(toolCall.function.arguments) as RunResult;
    return parsed;
  });
