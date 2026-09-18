import { convertToModelMessages, isToolUIPart, stepCountIs, streamText, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getAgent, AGENT_SLUG } from "@/lib/agent";
import { buildMockResponse } from "@/lib/mockStream";

export const runtime = "nodejs";
export const maxDuration = 60;

const ACTION_ORIENTED_INSTRUCTION = `

---

## Règle de production (priorité absolue)

**Produis DIRECTEMENT le livrable demandé dans ta première réponse.**

- Ne pose PAS de question de clarification si l'intention est raisonnablement claire.
- Commence ta réponse par un titre markdown (\`# ...\`) qui reflète le livrable (ex. \`# Email de relance — Isabelle Dupont\`, \`# Détection des échéances du jour\`).
- Si un détail manque, fais une **hypothèse raisonnable** et note-la clairement à la fin dans une section "## Hypothèses" — plutôt que de demander.
- Livre un produit fini : un email prêt à copier, un tableau de suivi, un résumé d'attestation — pas une promesse.
- Ne pose une question QUE si la demande est réellement ambiguë (ex. "aide-moi", "fais un truc").
`;

const WEB_ACCESS_INSTRUCTION = `

---

## Accès web (recherche + fetch)

Tu disposes de deux outils natifs Anthropic : \`web_search\` et \`web_fetch\`. Utilise-les seulement si une question porte sur une règle fiscale, une actualité associative ou une information publique que tu ne connais pas avec certitude — jamais pour inventer des données sur les membres de l'ASBL (celles-ci viennent uniquement du tableur connecté). Cite toujours tes sources avec leur URL. Si l'information n'est pas trouvée, dis-le explicitement plutôt que d'inventer.
`;

async function buildSystemPrompt(): Promise<string> {
  const agent = await getAgent();
  return agent.systemPrompt + ACTION_ORIENTED_INSTRUCTION + WEB_ACCESS_INSTRUCTION;
}

/**
 * Retire les tool parts (web_search / web_fetch) dont l'exécution n'a pas abouti.
 * Sinon l'API Anthropic rejette l'historique avec "tool_use found without
 * corresponding tool_result" (cas typique : stream interrompu par l'utilisateur).
 */
function sanitizeOrphanToolParts(messages: UIMessage[]): UIMessage[] {
  return (Array.isArray(messages) ? messages : [])
    .map((m) => ({
      ...m,
      parts: (Array.isArray(m?.parts) ? m.parts : []).filter((p) => {
        if (!isToolUIPart(p)) return true;
        return p.state === "output-available" || p.state === "output-error";
      }),
    }))
    .filter((m) => m.parts.length > 0);
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body.messages as UIMessage[] | undefined;
  const agentSlug = (body.agentSlug as string | undefined) ?? AGENT_SLUG;

  if (!messages) {
    return new Response("Missing `messages`", { status: 400 });
  }

  const sanitizedMessages = sanitizeOrphanToolParts(messages);

  const useMock = process.env.DEMO_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
  if (useMock) {
    return buildMockResponse(agentSlug, sanitizedMessages);
  }

  const systemPrompt = await buildSystemPrompt();
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const modelId = "claude-sonnet-5";

  const cachedSystemMessage = {
    role: "system" as const,
    content: systemPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" as const } },
    },
  };
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const result = streamText({
    model: anthropic(modelId),
    messages: [cachedSystemMessage, ...modelMessages],
    maxOutputTokens: 16000,
    maxRetries: 2,
    tools: {
      web_search: anthropic.tools.webSearch_20260209({ maxUses: 3 }),
      web_fetch: anthropic.tools.webFetch_20260209({ maxUses: 3 }),
    },
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse({
    onError: (err) => {
      console.error("[api/chat]", err);
      return err instanceof Error ? err.message : "Erreur inconnue";
    },
  });
}
