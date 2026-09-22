import type { UIMessage } from "ai";
import { simulateReadableStream } from "ai";

/**
 * Mock response : utilisé si DEMO_MOCK=1 ou si ANTHROPIC_API_KEY absente.
 * Produit un livrable **complet et crédible** pour l'agent, avec des données
 * clairement fictives (démo uniquement).
 *
 * IMPORTANT (bug évité) : la clé "avis" ci-dessous DOIT exister, sinon le
 * chat en mode démo affiche un message générique "non configuré" au lieu
 * d'un vrai livrable de démonstration.
 */

const DEFAULT_REPLIES: Record<string, string> = {
  avis: `# Pipeline ReputAuto™ — détection du jour

**Exemple de démonstration** — données 100 % fictives, remplacées dès que votre Google Business Profile est connecté (\`GOOGLE_BUSINESS_ACCOUNT_ID\` / \`GOOGLE_BUSINESS_LOCATION_ID\` + OAuth Google).

## 1. DÉTECTION — 3 nouveaux avis repérés

| # | Auteur | Note | Extrait | Réponse déjà publiée ? |
|---|---|---|---|---|
| 1 | Camille B. | ⭐⭐⭐⭐⭐ (5) | « Accueil incroyable ! L'équipe nous a super bien conseillés… » | Non |
| 2 | Julien M. | ⭐⭐⭐ (3) | « Correct sans plus. Le service était un peu lent… » | Non |
| 3 | Sarah K. | ⭐ (1) | « Très déçue. J'ai attendu 45 minutes… » | Non |

## 2. ANALYSE — classification du sentiment

| Avis | Sentiment | Signal de crise détecté | Relecture humaine obligatoire |
|---|---|---|---|
| Camille B. (5★) | 🟢 Positif | Non | Non |
| Julien M. (3★) | 🟡 Neutre | Non | Non |
| Sarah K. (1★) | 🔴 Crise | Note ≤ 2 (accusation d'accueil sec) | **Oui — obligatoire** |

*(règle : note ≤ 2 OU mot-clé de crise détecté → classement "crise" → relecture humaine non négociable avant publication)*

## 3. RÉPONSE PERSONNALISÉE — brouillons prêts

### Brouillon — remerciement (Camille B., 5★)

> Bonjour Camille, merci infiniment pour ce message qui nous fait très plaisir ! Nous sommes ravis que l'accueil et nos conseils pour votre gâteau d'anniversaire vous aient marquée — c'est exactement ce qu'on cherche à offrir. Au plaisir de vous accueillir de nouveau bientôt !
>
> — L'équipe [BUSINESS_NAME]

*(cite un détail précis de l'avis — le gâteau d'anniversaire — ton chaleureux, pas de promesse commerciale)*

### Brouillon — réponse empathique (Sarah K., 1★ — CRISE)

> Bonjour Sarah, nous sommes sincèrement désolés pour cette attente et pour la façon dont l'échange s'est déroulé — ce n'est pas le niveau de service que nous voulons offrir. Nous aimerions comprendre ce qui s'est passé ce jour-là : pourriez-vous nous contacter directement au [téléphone] ou par email à [BUSINESS_CONTACT_EMAIL] ? Nous tenons à en discuter avec vous. Merci de nous donner l'occasion de faire mieux.
>
> **⚠️ Brouillon à relire et valider avant toute publication — aucune publication automatique, même pour un avis positif.**

*(jamais défensif, ne nie aucun fait rapporté, propose un contact direct hors-ligne, aucune donnée personnelle du client exposée publiquement)*

## 4. ALERTE — exemple de notification envoyée

**Déclencheur** : nouvel avis ≤ 2 étoiles (Sarah K., 1★) → seuil \`NEGATIVE_REVIEW_ALERT_THRESHOLD=2\` atteint.

> **Objet** : ⚠️ Nouvel avis 1★ sur Google — [BUSINESS_NAME]
>
> Un nouvel avis nécessitant votre attention vient d'être publié sur votre fiche Google Business Profile.
>
> Auteur : Sarah K. · Note : 1/5 · Date : 20/09/2026
>
> « Très déçue. J'ai attendu 45 minutes… »
>
> Vanessa a préparé un brouillon de réponse empathique dans l'onglet **Avis** — il doit être relu et validé avant toute publication.

**Exemple d'alerte "chute de réputation"** (illustratif — pas la situation actuelle) :

> **Objet** : ⚠️ Baisse de la note moyenne Google — [BUSINESS_NAME]
>
> Note moyenne période précédente : 4,6/5 → Note moyenne période récente : 3,0/5 (**-35 %**, au-delà du seuil de -30 % configuré).
>
> Nous vous recommandons de consulter les derniers avis dans l'onglet **Avis** pour identifier la cause et répondre rapidement.

## Rappel garde-fou

Vanessa ne publie **jamais** une réponse sur Google Business Profile de façon autonome. Chaque brouillon ci-dessus attend un clic explicite sur **« Publier »** dans l'onglet Avis — et pour un avis classé crise, une relecture humaine est obligatoire, sans exception.

## Hypothèses

- Les 3 avis, notes et statuts ci-dessus sont des exemples fictifs pour cette démo.
- Lancez une synchronisation dans l'onglet **Avis** pour remplacer ces données par vos vrais avis Google Business Profile.
- Aucun chiffre réel n'est inventé : en usage réel, notes, dates et statuts viennent uniquement de votre fiche Google connectée.`,
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
  const reply = DEFAULT_REPLIES[agentSlug] ?? DEFAULT_REPLIES.avis;
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
