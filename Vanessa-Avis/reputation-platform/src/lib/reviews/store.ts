import type { Review, RatingDropAlert } from "@/lib/types";
import { MOCK_REVIEWS, MOCK_PREVIOUS_PERIOD_RATINGS } from "@/data/mockReviews";
import { isGoogleConfigured } from "@/lib/integrations/google";
import { isGoogleBusinessConfigured, listReviews as gbpListReviews, replyToReview } from "@/lib/integrations/googleBusinessProfile";
import { computeRatingDrop } from "@/lib/reviews/sentiment";

export type ReviewsBackend = "gbp" | "mock";

/**
 * Copie mutable en mémoire des avis mock — permet à l'onglet Avis de refléter
 * "Publier" / brouillons générés pendant une session de démo locale, sans
 * base de données. Réinitialisée à chaque redémarrage du serveur (normal en
 * mode démo). Aucune persistance n'est nécessaire une fois le vrai Google
 * Business Profile connecté : la source de vérité devient alors Google.
 */
let mockStore: Review[] | null = null;

function getMockStore(): Review[] {
  if (!mockStore) {
    mockStore = MOCK_REVIEWS.map((r) => ({ ...r }));
  }
  return mockStore;
}

export function activeBackend(): ReviewsBackend {
  if (isGoogleConfigured() && isGoogleBusinessConfigured()) return "gbp";
  return "mock";
}

export async function listAllReviews(): Promise<{ reviews: Review[]; backend: ReviewsBackend }> {
  const backend = activeBackend();
  if (backend === "gbp") {
    try {
      const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID!;
      const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID!;
      const reviews = await gbpListReviews(accountId, locationId);
      return { reviews, backend: "gbp" };
    } catch (e) {
      console.error("[reviews] échec de synchronisation Google Business Profile, retour au mode démo :", e);
      return { reviews: getMockStore(), backend: "mock" };
    }
  }
  return { reviews: getMockStore(), backend: "mock" };
}

export async function getReviewById(id: string): Promise<Review | null> {
  const { reviews } = await listAllReviews();
  return reviews.find((r) => r.id === id) ?? null;
}

/** Enregistre un brouillon généré (jamais publié automatiquement). */
export async function saveDraftReply(id: string, draft: string): Promise<Review | null> {
  const backend = activeBackend();
  if (backend === "mock") {
    const store = getMockStore();
    const review = store.find((r) => r.id === id);
    if (!review) return null;
    review.brouillonReponse = draft;
    review.statutReponse = "brouillon";
    return review;
  }
  // Backend GBP : le brouillon n'est pas persisté côté Google (il n'existe pas
  // de "brouillon" natif dans l'API) — il vit côté client jusqu'à publication
  // explicite via /api/reviews/publish.
  return getReviewById(id);
}

/**
 * Publie réellement la réponse — SEULE fonction du store qui écrit sur Google
 * en mode "gbp". Doit être appelée uniquement depuis /api/reviews/publish,
 * jamais depuis sync/draft/alert.
 */
export async function publishReply(id: string, comment: string): Promise<{ ok: boolean; publishedAt: string }> {
  const backend = activeBackend();
  const now = new Date().toISOString();

  if (backend === "gbp") {
    const review = await getReviewById(id);
    if (!review?.reviewName) {
      throw new Error(`Avis "${id}" introuvable ou sans référence Google Business Profile.`);
    }
    await replyToReview(review.reviewName, comment);
    return { ok: true, publishedAt: now };
  }

  const store = getMockStore();
  const review = store.find((r) => r.id === id);
  if (!review) throw new Error(`Avis "${id}" introuvable.`);
  review.brouillonReponse = comment;
  review.statutReponse = "publiee";
  review.reponsePublieeSurGoogle = true;
  review.dateReponsePubliee = now;
  return { ok: true, publishedAt: now };
}

/**
 * Calcule l'alerte de baisse de note moyenne à partir des avis actuellement
 * connus (30 derniers jours) vs. une fenêtre précédente. En mode démo, la
 * fenêtre précédente vient de MOCK_PREVIOUS_PERIOD_RATINGS (données fictives
 * clairement labellisées) ; en mode GBP réel, il n'y a pas assez d'historique
 * exposé par l'API reviews.list pour calculer une vraie fenêtre "précédente"
 * sans stockage — l'alerte reste alors désactivée (triggered: false) plutôt
 * que d'inventer un chiffre.
 */
export async function computeRatingDropAlert(): Promise<RatingDropAlert> {
  const backend = activeBackend();
  const { reviews } = await listAllReviews();
  const recentRatings = reviews.map((r) => r.note);

  if (backend === "mock") {
    const result = computeRatingDrop(recentRatings, MOCK_PREVIOUS_PERIOD_RATINGS);
    return { ...result, threshold: Number(process.env.RATING_DROP_ALERT_THRESHOLD) || 0.3 };
  }

  // Backend GBP réel sans historique stocké : pas de calcul inventé.
  return { triggered: false, averageRecent: 0, averagePrevious: 0, dropFraction: 0, threshold: Number(process.env.RATING_DROP_ALERT_THRESHOLD) || 0.3 };
}
