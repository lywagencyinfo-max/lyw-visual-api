import type { UIMessage } from "ai";
import { simulateReadableStream } from "ai";

/**
 * Mock response : utilisé si DEMO_MOCK=1 ou si ANTHROPIC_API_KEY absente.
 * Produit un livrable **complet et crédible** pour l'agent, avec des données
 * clairement fictives (démo uniquement).
 */

const DEFAULT_REPLIES: Record<string, string> = {
  adhesions: `# Pipeline CotisAuto™ — détection du jour

**Exemple de démonstration** — données 100 % fictives, remplacées dès que Google Sheets ou Airtable est connecté (\`MEMBERS_BACKEND\`).

## 1. DÉTECTION — 3 membres à traiter

| # | Membre | Échéance | Montant | Statut |
|---|---|---|---|---|
| 1 | Isabelle Dupont | 18/10/2026 (J-30) | 35 € | 🟡 Proche échéance |
| 2 | Marc Lefèvre | 03/10/2026 (J-15) | 35 € | 🟠 Proche échéance, relance déjà envoyée |
| 3 | Sophie Nguyen | 05/09/2026 (J+13, dépassée) | 50 € | 🔴 En retard |

## 2. RELANCE — brouillon d'email personnalisé (Isabelle Dupont, J-30)

**Objet** : Votre cotisation 2026 arrive bientôt à échéance

> Bonjour Madame Dupont,
>
> Votre cotisation annuelle de **35 €** arrive à échéance le **18 octobre 2026**. Pas d'inquiétude, c'est juste un petit rappel amical.
>
> Vous pouvez la régler par virement sur le compte de l'ASBL (RIB disponible sur simple demande) ou via le lien de paiement habituel.
>
> Si vous avez déjà réglé, merci d'ignorer ce message — le suivi se met à jour automatiquement dès réception.
>
> Vous ne souhaitez plus recevoir ces rappels ? Répondez simplement "stop relances" et nous en tiendrons compte.
>
> Bien à vous,
> L'équipe de l'ASBL

*(ton J-30 : doux, informatif — cadence complète : J-30 doux → J-15 direct → J+7 après échéance, ferme mais courtois)*

## 3. SUIVI PAIEMENT — état de la synchronisation

| Membre | Statut tableur | Dernière sync | Action |
|---|---|---|---|
| Isabelle Dupont | Impayé | il y a 2 min (démo) | Relance J-30 prête à l'envoi |
| Marc Lefèvre | Impayé | il y a 2 min (démo) | Relance J-15 déjà envoyée le 18/09 |
| Amine Belkacem | **Payé** ✅ | il y a 2 min (démo) | Attestation à générer |

*(source de vérité : Google Sheets ou Airtable selon \`MEMBERS_BACKEND\` — ici, exemple de démo)*

## 4. ATTESTATION FISCALE — exemple pour Amine Belkacem (cotisation payée)

**⚠️ Brouillon — à valider par le trésorier/comptable de l'ASBL avant tout envoi.**

- Membre : Amine Belkacem
- ASBL : Mon ASBL (BE0000.000.000)
- Montant : 35 €
- Date de paiement : 22/01/2026
- Année fiscale : 2026

> Cette attestation est générée automatiquement à partir des informations du tableur. Les formats et seuils légaux d'attestation fiscale varient et changent régulièrement — elle doit être relue et validée avant tout envoi au membre.

## Hypothèses

- Échéances, montants et statuts de paiement sont des exemples fictifs pour cette démo.
- Lancez une synchronisation dans l'onglet **Pipeline** pour remplacer ces données par vos vrais membres (Google Sheets ou Airtable).
- Aucun chiffre réel n'est inventé : en usage réel, tous les montants et dates viennent de votre tableur connecté.`,
};

// ------------------------- DÉTECTION D'INTENTION (très simple) -------------------------

function extractLastUserText(messages: UIMessage[] | undefined): string {
  if (!messages) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      .map((p) => (p.type === "text" && "text" in p && typeof p.text === "string" ? p.text : ""))
      .join("");
    if (text) return text;
  }
  return "";
}

// ------------------------- SSE BUILDER -------------------------

function textToChunks(text: string): string[] {
  const chunks: string[] = [];
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length > 8) {
      chunks.push(buf);
      buf = "";
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function buildMockResponse(agentSlug: string, messages?: UIMessage[]): Response {
  const userText = extractLastUserText(messages).toLowerCase();
  const reply =
    DEFAULT_REPLIES[agentSlug] ??
    DEFAULT_REPLIES.adhesions ??
    "Livrable de démonstration non configuré pour cet agent.";
  void userText;

  const chunks = textToChunks(reply);
  const messageId = `msg-mock-${Date.now()}`;
  const encoder = new TextEncoder();
  const events: string[] = [
    `data: ${JSON.stringify({ type: "start", messageId })}\n\n`,
    `data: ${JSON.stringify({ type: "start-step" })}\n\n`,
    `data: ${JSON.stringify({ type: "text-start", id: "text-0" })}\n\n`,
    ...chunks.map(
      (c) => `data: ${JSON.stringify({ type: "text-delta", id: "text-0", delta: c })}\n\n`
    ),
    `data: ${JSON.stringify({ type: "text-end", id: "text-0" })}\n\n`,
    `data: ${JSON.stringify({ type: "finish-step" })}\n\n`,
    `data: ${JSON.stringify({ type: "finish" })}\n\n`,
    `data: [DONE]\n\n`,
  ];

  const stream = new ReadableStream({
    async start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(e));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}

export { simulateReadableStream };
