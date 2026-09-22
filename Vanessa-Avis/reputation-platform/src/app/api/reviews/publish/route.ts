import { NextResponse } from "next/server";
import { getReviewById, publishReply } from "@/lib/reviews/store";

export const runtime = "nodejs";

/**
 * SEULE route de toute l'application qui publie réellement une réponse sur
 * Google Business Profile (via lib/reviews/store.publishReply →
 * lib/integrations/googleBusinessProfile.replyToReview). Elle ne doit JAMAIS
 * être appelée automatiquement par /sync, /draft ou /alert : uniquement par
 * un clic explicite sur le bouton "Publier" côté UI (src/app/avis/page.tsx).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const reviewId: string | undefined = body.reviewId;
  const comment: string | undefined = body.comment;

  if (!reviewId || !comment || !comment.trim()) {
    return NextResponse.json({ error: "reviewId et comment (non vide) sont requis" }, { status: 400 });
  }

  const review = await getReviewById(reviewId);
  if (!review) {
    return NextResponse.json({ error: `Avis "${reviewId}" introuvable` }, { status: 404 });
  }

  try {
    const result = await publishReply(reviewId, comment.trim());
    return NextResponse.json({ ok: true, publishedAt: result.publishedAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de la publication sur Google" },
      { status: 500 }
    );
  }
}
