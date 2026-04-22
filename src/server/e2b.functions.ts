import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RunCodeInput = z.object({
  code: z.string().min(1).max(20_000),
  language: z.enum(["python", "javascript", "typescript", "bash", "r"]).default("python"),
});

export interface RunCodeResult {
  stdout: string;
  stderr: string;
  results: Array<{ text: string | null; html: string | null }>;
  error: { name: string; value: string } | null;
}

/**
 * Proxy to the self-hosted E2B backend (Render).
 * Atlas (the coder agent) calls this to actually run code in a real sandbox.
 */
export const runCodeInSandbox = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunCodeInput.parse(input))
  .handler(async ({ data }): Promise<RunCodeResult> => {
    const url = process.env.E2B_BACKEND_URL;
    const token = process.env.E2B_BACKEND_TOKEN;

    if (!url || !token) {
      throw new Error("E2B backend is not configured.");
    }

    const endpoint = url.replace(/\/$/, "") + "/run-code";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: data.code, language: data.language }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("E2B backend error:", response.status, text);
      throw new Error(`Sandbox returned ${response.status}.`);
    }

    return (await response.json()) as RunCodeResult;
  });
