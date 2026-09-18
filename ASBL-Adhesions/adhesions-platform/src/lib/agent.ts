import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { PATHS } from "./paths";
import type { AgentMeta } from "./types";

export const AGENT_SLUG = "adhesions";

const FALLBACK_SYSTEM_PROMPT = `Tu es Julie, l'agent adhésions & cotisations de l'ASBL. Sois brève, en français, vouvoiement, et utile.`;

async function loadPersonaMarkdown(): Promise<{ systemPrompt: string; model: string; tools: string[] } | null> {
  const filePath = path.join(PATHS.agents, `${AGENT_SLUG}.md`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    const tools =
      typeof data.tools === "string"
        ? data.tools.split(",").map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(data.tools)
        ? data.tools
        : [];
    return {
      systemPrompt: content.trim(),
      model: (data.model as string) ?? "sonnet",
      tools,
    };
  } catch {
    return null;
  }
}

export async function getAgent(): Promise<AgentMeta> {
  const data = await loadPersonaMarkdown();
  return {
    slug: AGENT_SLUG,
    name: "Julie",
    role: "Agent adhésions & cotisations",
    tagline: "Détecte les échéances, relance et suit les paiements — pipeline CotisAuto™.",
    model: data?.model ?? "sonnet",
    tools: data?.tools ?? ["Read", "Write", "WebSearch", "WebFetch"],
    systemPrompt: data?.systemPrompt || FALLBACK_SYSTEM_PROMPT,
  };
}
