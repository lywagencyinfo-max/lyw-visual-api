import { getValidAccessToken } from "./google";
import type { Review, ReviewRating } from "@/lib/types";
import { classifySentiment, requiresMandatoryReview } from "@/lib/reviews/sentiment";

/**
 * Google Business Profile — avis clients (lecture + réponse).
 *
 * Utilise l'API "Google My Business" v4 (mybusiness.googleapis.com), qui reste
 * à ce jour le point d'entrée documenté par Google pour lister les avis d'un
 * établissement et publier une réponse (reviews.list / reviews.updateReply).
 * Scope OAuth requis : https://www.googleapis.com/auth/business.manage
 * (voir src/lib/integrations/google.ts).
 *
 * Pré-requis pour que ces appels fonctionnent réellement :
 *   1. Activer "Google Business Profile API" (et son accès, soumis à
 *      validation par Google) sur le projet Google Cloud.
 *   2. Se connecter via /api/integrations/google/start (OAuth).
 *   3. Renseigner GOOGLE_BUSINESS_ACCOUNT_ID et GOOGLE_BUSINESS_LOCATION_ID
 *      dans .env.local (visibles via l'API Account Management / Business
 *      Information, ou dans l'URL de business.google.com).
 */

const MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

export interface GbpRawReview {
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: "STAR_RATING_UNSPECIFIED" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment: string; updateTime: string };
  name: string; // "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}"
}

interface ListReviewsResponse {
  reviews?: GbpRawReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

const STAR_TO_NUMBER: Record<string, ReviewRating> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export function isGoogleBusinessConfigured(): boolean {
  return Boolean(process.env.GOOGLE_BUSINESS_ACCOUNT_ID && process.env.GOOGLE_BUSINESS_LOCATION_ID);
}

function mapRawReview(raw: GbpRawReview): Review {
  const note = STAR_TO_NUMBER[raw.starRating ?? "FIVE"] ?? 5;
  const texte = raw.comment?.trim() || "(avis sans commentaire écrit)";
  const sentiment = classifySentiment(note, texte);
  return {
    id: raw.reviewId,
    reviewName: raw.name,
    auteur: raw.reviewer?.isAnonymous ? "Utilisateur Google" : raw.reviewer?.displayName || "Utilisateur Google",
    note,
    texte,
    date: raw.createTime ?? new Date().toISOString(),
    reponsePublieeSurGoogle: Boolean(raw.reviewReply?.comment),
    statutReponse: raw.reviewReply?.comment ? "publiee" : "aucune",
    brouillonReponse: null,
    dateReponsePubliee: raw.reviewReply?.updateTime ?? null,
    sentiment,
    relectureObligatoire: requiresMandatoryReview(note, texte),
  };
}

/**
 * Liste les avis d'un établissement Google Business Profile. Appel réel à
 * l'API — nécessite un token OAuth valide (business.manage) et les
 * identifiants de compte/établissement.
 */
export async function listReviews(accountId: string, locationId: string): Promise<Review[]> {
  const token = await getValidAccessToken();
  const url = `${MYBUSINESS_BASE}/accounts/${accountId}/locations/${locationId}/reviews`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Business Profile reviews.list ${res.status} : ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as ListReviewsResponse;
  return (data.reviews ?? []).map(mapRawReview);
}

/**
 * Publie (ou remplace) la réponse publique à un avis Google. C'EST LA SEULE
 * fonction qui écrit réellement sur Google Business Profile — elle ne doit
 * jamais être appelée automatiquement : uniquement depuis
 * /api/reviews/publish, déclenchée par un clic explicite "Publier" côté UI.
 *
 * @param reviewName Nom de ressource complet de l'avis (ex.
 *   "accounts/123/locations/456/reviews/abc"), tel que renvoyé par listReviews.
 * @param comment Texte de la réponse à publier publiquement.
 */
export async function replyToReview(reviewName: string, comment: string): Promise<{ comment: string; updateTime: string }> {
  const token = await getValidAccessToken();
  const url = `${MYBUSINESS_BASE}/${reviewName}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Business Profile reviews.updateReply ${res.status} : ${body.slice(0, 400)}`);
  }

  return (await res.json()) as { comment: string; updateTime: string };
}
