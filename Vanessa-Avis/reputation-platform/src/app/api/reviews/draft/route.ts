import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getReviewById, saveDraftReply } from "@/lib/reviews/store";
import { buildMockDraftReply } from "@/lib/reviews/reply";

export const runtime = "nodejs";

const DRAFT_SYSTEM_PROMPT = `Tu es Vanessa, l'agent gestion des avis Google d'un établissement. Rédige UNIQUEMENT le texte de la réponse publique à l'avis fourni, en français, avec le vouvoiement.

Règles obligatoires :
- Pour un avis positif : remerciement chaleureux qui cite un détail précis de l'avis.
- Pour un avis neutre ou négatif : ton empathique, jamais défensif, ne nie jamais un fait rapporté par le client, propose un contact direct hors-ligne (téléphone/email) pour poursuivre l'échange.
- Jamais de chiffres ou promesses commerciales inventés.
- Jamais de données personnelles du client dans la réponse (pas de numéro de commande, pas d'adresse, etc.).
- Ne mentionne jamais un geste commercial concret en échange d'une modification ou suppression de l'avis (règles Google).
- Réponds uniquement avec le texte de la réponse, sans titre ni commentaire autour.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const reviewId: string | undefined = body.reviewId;
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId requis" }, { status: 400 });
  }

  const review = await getReviewById(reviewId);
  if (!review) {
    return NextResponse.json({ error: `Avis "${reviewId}" introuvable` }, { status: 404 });
  }

  const businessName = process.env.BUSINESS_NAME || "Mon Établissement";
  const contactEmail = process.env.BUSINESS_CONTACT_EMAIL || "contact@example.com";

  const useMock = process.env.DEMO_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;

  let draft: string;
  if (useMock) {
    draft = buildMockDraftReply(review, businessName, contactEmail);
  } else {
    try {
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const { text } = await generateText({
        model: anthropic("claude-sonnet-5"),
        system: DRAFT_SYSTEM_PROMPT,
        prompt: `Établissement : ${businessName} (contact : ${contactEmail})\nAuteur de l'avis : ${review.auteur}\nNote : ${review.note}/5\nSentiment détecté : ${review.sentiment}\nTexte de l'avis : "${review.texte}"\n\nRédige la réponse publique.`,
        maxOutputTokens: 600,
      });
      draft = text.trim();
    } catch (e) {
      console.error("[api/reviews/draft] échec de génération Claude, repli sur le brouillon heuristique :", e);
      draft = buildMockDraftReply(review, businessName, contactEmail);
    }
  }

  const updated = await saveDraftReply(reviewId, draft);
  return NextResponse.json({
    review: updated,
    requiresMandatoryReview: review.relectureObligatoire,
  });
}
