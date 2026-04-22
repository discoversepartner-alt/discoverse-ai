export type AgentId =
  | "orchestrator"
  | "researcher"
  | "writer"
  | "coder"
  | "browser"
  | "designer";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  icon: string; // emoji-as-icon for warm aesthetic
  capabilities: string[];
}

export const AGENTS: Agent[] = [
  {
    id: "orchestrator",
    name: "Orion",
    role: "Orchestrator",
    description:
      "The conductor. Plans the work, delegates to specialists, and brings the answers back to you.",
    icon: "◉",
    capabilities: ["Task planning", "Delegation", "Memory", "Self-critique"],
  },
  {
    id: "researcher",
    name: "Vega",
    role: "Researcher",
    description:
      "Reads the open web at speed. Crawls, summarizes, fact-checks and cites everything.",
    icon: "✦",
    capabilities: ["Web search", "Crawling", "Summaries", "Citations"],
  },
  {
    id: "writer",
    name: "Lyra",
    role: "Writer",
    description:
      "Drafts essays, emails, posts and reports in your voice. Edits until it sings.",
    icon: "✎",
    capabilities: ["Long-form", "Tone control", "Editing", "Translation"],
  },
  {
    id: "coder",
    name: "Atlas",
    role: "Engineer",
    description:
      "Writes, runs and ships code in an isolated VM. Returns files, deploys to Netlify.",
    icon: "⌘",
    capabilities: ["Codegen", "Sandbox exec", "File output", "Deploy"],
  },
  {
    id: "browser",
    name: "Kite",
    role: "Browser pilot",
    description:
      "Drives a real browser to fill forms, scrape dashboards, and complete tasks for you.",
    icon: "◈",
    capabilities: ["Navigate", "Click & type", "Extract", "Screenshots"],
  },
  {
    id: "designer",
    name: "Iris",
    role: "Designer",
    description:
      "Creates slides, decks and visual content. Turns ideas into presentations you can present.",
    icon: "◐",
    capabilities: ["Slides", "Layouts", "Imagery", "Export"],
  },
];

export const AGENT_BY_ID: Record<AgentId, Agent> = AGENTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AgentId, Agent>,
);
