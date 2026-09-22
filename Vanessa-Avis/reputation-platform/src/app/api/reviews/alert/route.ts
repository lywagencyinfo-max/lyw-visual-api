import { NextResponse } from "next/server";
import { getReviewById, computeRatingDropAlert } from "@/lib/reviews/store";
import { isGoogleConfigured } from "@/lib/integrations/google";
import { sendEmail, buildNegativeReviewAlertEmail, buildRatingDropAlertEmail } from "@/lib/integrations/gmailSend";
import { isRatingAlertWorthy } from "@/lib/reviews/sentiment";

export const runtime = "nodejs";

/**
 * Envoie l'alerte email ReputAuto™ : soit pour un avis ≤ seuil
 * (NEGATIVE_REVIEW_ALERT_THRESHOLD), soit pour une baisse significative de la
 * note moyenne (RATING_DROP_ALERT_THRESHOLD). N'appelle jamais
 * lib/integrations/googleBusinessProfile.replyToReview — l'alerte notifie,
 * elle ne publie rien sur Google.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type: "nouvel-avis" | "baisse-note" | undefined = body.type;
  const reviewId: string | undefined = body.reviewId;

  const alertTo = process.env.ALERT_EMAIL_TO;
  if (!alertTo) {
    return NextResponse.json(
      { error: "ALERT_EMAIL_TO non configuré dans .env.local — impossible d'envoyer l'alerte." },
      { status: 400 }
    );
  }

  const businessName = process.env.BUSINESS_NAME || "Mon Établissement";
  const canSend = isGoogleConfigured();

  let subject: string;
  let emailBody: string;

  if (type === "baisse-note") {
    const alert = await computeRatingDropAlert();
    if (!alert.triggered) {
      return NextResponse.json({ sent: false, reason: "Aucune baisse significative détectée actuellement." });
    }
    const draft = buildRatingDropAlertEmail({
      businessName,
      averageRecent: alert.averageRecent,
      averagePrevious: alert.averagePrevious,
      dropFraction: alert.dropFraction,
    });
    subject = draft.subject;
    emailBody = draft.body;
  } else {
    if (!reviewId) {
      return NextResponse.json({ error: "reviewId requis pour une alerte de type nouvel-avis" }, { status: 400 });
    }
    const review = await getReviewById(reviewId);
    if (!review) {
      return NextResponse.json({ error: `Avis "${reviewId}" introuvable` }, { status: 404 });
    }
    if (!isRatingAlertWorthy(review.note)) {
      return NextResponse.json({ sent: false, reason: `Note ${review.note}★ au-dessus du seuil d'alerte configuré.` });
    }
    const draft = buildNegativeReviewAlertEmail(review, businessName);
    subject = draft.subject;
    emailBody = draft.body;
  }

  if (!canSend) {
    return NextResponse.json({ sent: false, draft: { to: alertTo, subject, body: emailBody }, reason: "Google non connecté — email non envoyé, brouillon fourni (mode démo)." });
  }

  try {
    const result = await sendEmail({ to: alertTo, subject, body: emailBody });
    return NextResponse.json({ sent: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { sent: false, draft: { to: alertTo, subject, body: emailBody }, reason: e instanceof Error ? e.message : "Échec de l'envoi" },
      { status: 200 }
    );
  }
}
