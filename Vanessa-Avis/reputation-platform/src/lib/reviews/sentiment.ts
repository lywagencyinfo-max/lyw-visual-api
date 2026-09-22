import type { ReviewRating, ReviewSentiment } from "@/lib/types";

/**
 * Heuristique de classification ReputAuto™ — simple, déterministe, pas d'appel
 * réseau. Utilisée pour décider quels avis nécessitent une relecture humaine
 * obligatoire et pour déclencher les alertes immédiates.
 *
 * Règle (spec agent Vanessa) :
 *   - note ≤ 2 OU présence d'un signal de crise dans le texte → "crise"
 *   - note === 3 → "neutre"
 *   - note ≥ 4 (et pas de signal de crise) → "positif"
 */

// Mots-clés de crise : accusations graves, sécurité, fraude — jamais exhaustif,
// à enrichir au cas par cas. Comparaison insensible à la casse et aux accents.
const CRISIS_KEYWORDS: string[] = [
  "arnaque",
  "arnaqué",
  "escroquerie",
  "escroc",
  "vol",
  "volé",
  "dangereux",
  "danger",
  "insalubre",
  "intoxication",
  "très déçu",
  "tres decu",
  "très décevant",
  "honteux",
  "scandale",
  "scandaleux",
  "plainte",
  "avocat",
  "poursuite",
  "poursuites",
  "harcèlement",
  "harcelement",
  "raciste",
  "racisme",
  "discrimination",
  "agression",
  "a fuir",
  "à fuir",
  "jamais revenir",
  "jamais y retourner",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // retire les accents pour un matching robuste
}

export function detectCrisisKeywords(text: string): string[] {
  const normalized = normalize(text);
  return CRISIS_KEYWORDS.filter((kw) => normalized.includes(normalize(kw)));
}

export function classifySentiment(rating: ReviewRating, text: string): ReviewSentiment {
  const crisisHits = detectCrisisKeywords(text);
  if (rating <= 2 || crisisHits.length > 0) return "crise";
  if (rating === 3) return "neutre";
  return "positif";
}

/**
 * Un avis nécessite une relecture humaine obligatoire avant toute publication
 * s'il est classé "crise" (note basse et/ou signal de crise détecté). Vanessa
 * ne publie jamais seule — mais pour ces avis, la relecture est non-négociable,
 * même après génération d'un brouillon.
 */
export function requiresMandatoryReview(rating: ReviewRating, text: string): boolean {
  return classifySentiment(rating, text) === "crise";
}

/** Seuil configurable (défaut 2) : note à partir de laquelle une alerte email est déclenchée. */
export function negativeReviewThreshold(): number {
  const raw = Number(process.env.NEGATIVE_REVIEW_ALERT_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 2;
}

/** Seuil configurable (défaut 0.3 = -30 %) de baisse de note moyenne déclenchant une alerte. */
export function ratingDropThreshold(): number {
  const raw = Number(process.env.RATING_DROP_ALERT_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 0.3;
}

export function isRatingAlertWorthy(rating: ReviewRating): boolean {
  return rating <= negativeReviewThreshold();
}

/**
 * Calcule si la moyenne "récente" a baissé de façon significative par rapport
 * à la moyenne "précédente" (deux fenêtres de même taille fournies par
 * l'appelant). Ne calcule rien si la fenêtre précédente est vide — jamais de
 * chiffre inventé.
 */
export function computeRatingDrop(
  recentRatings: number[],
  previousRatings: number[]
): { averageRecent: number; averagePrevious: number; dropFraction: number; triggered: boolean } {
  const threshold = ratingDropThreshold();
  if (recentRatings.length === 0 || previousRatings.length === 0) {
    return { averageRecent: 0, averagePrevious: 0, dropFraction: 0, triggered: false };
  }
  const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;
  const averageRecent = avg(recentRatings);
  const averagePrevious = avg(previousRatings);
  const dropFraction = averagePrevious > 0 ? (averagePrevious - averageRecent) / averagePrevious : 0;
  return {
    averageRecent,
    averagePrevious,
    dropFraction,
    triggered: dropFraction >= threshold,
  };
}
