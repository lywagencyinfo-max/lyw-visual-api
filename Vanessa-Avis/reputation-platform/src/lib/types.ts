export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type ReviewSentiment = "positif" | "neutre" | "crise";

export type ReviewReplyStatus = "aucune" | "brouillon" | "publiee";

export interface Review {
  /** Identifiant interne stable, utilisé par l'UI et les routes API. */
  id: string;
  /**
   * Nom de ressource Google Business Profile (ex. "accounts/123/locations/456/reviews/abc").
   * Présent uniquement pour les avis synchronisés depuis l'API réelle — absent en mode démo.
   */
  reviewName?: string;
  auteur: string;
  note: ReviewRating;
  texte: string;
  date: string; // ISO
  /** true si une réponse est déjà visible publiquement sur Google (avant même l'usage de Vanessa). */
  reponsePublieeSurGoogle: boolean;
  statutReponse: ReviewReplyStatus;
  brouillonReponse: string | null;
  dateReponsePubliee: string | null; // ISO, rempli une fois publiée depuis l'app
  sentiment: ReviewSentiment;
  /** Un avis "crise" ou ≤ seuil doit systématiquement passer par une relecture humaine avant publication. */
  relectureObligatoire: boolean;
}

export interface AgentMeta {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  model: string;
  tools: string[];
  systemPrompt: string;
}

export interface RatingDropAlert {
  triggered: boolean;
  averageRecent: number;
  averagePrevious: number;
  dropFraction: number; // 0.3 = -30 %
  threshold: number;
}
