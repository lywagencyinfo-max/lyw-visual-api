import type { Review } from "@/lib/types";
import { classifySentiment, requiresMandatoryReview } from "@/lib/reviews/sentiment";

/**
 * Avis d'exemple — 100 % fictifs. Sert de source par défaut quand le Google
 * Business Profile n'est pas connecté (GOOGLE_BUSINESS_ACCOUNT_ID /
 * GOOGLE_BUSINESS_LOCATION_ID absents, ou OAuth Google non complété).
 * Remplacé automatiquement dès que /api/reviews/sync répond avec des vraies
 * données GBP.
 */

interface RawMockReview {
  id: string;
  auteur: string;
  note: 1 | 2 | 3 | 4 | 5;
  texte: string;
  date: string;
  reponsePublieeSurGoogle: boolean;
  statutReponse: Review["statutReponse"];
  brouillonReponse: string | null;
  dateReponsePubliee: string | null;
}

const RAW: RawMockReview[] = [
  {
    id: "rev-001",
    auteur: "Camille B.",
    note: 5,
    texte:
      "Accueil incroyable ! L'équipe nous a super bien conseillés pour choisir notre gâteau d'anniversaire, et le résultat était magnifique et délicieux. Merci encore pour votre patience avec nos 100 questions 😄",
    date: "2026-09-18",
    reponsePublieeSurGoogle: true,
    statutReponse: "publiee",
    brouillonReponse:
      "Bonjour Camille, merci beaucoup pour ce message qui nous touche énormément ! Ravis que le gâteau ait fait plaisir pour l'anniversaire — et vos questions ne nous ont jamais dérangés, c'est justement pour ça qu'on est là 😊 Au plaisir de vous revoir bientôt !",
    dateReponsePubliee: "2026-09-19",
  },
  {
    id: "rev-002",
    auteur: "Julien M.",
    note: 3,
    texte:
      "Correct sans plus. Le service était un peu lent un samedi midi, mais les produits sont bons. Rien à redire sur la qualité, juste l'attente qui a été longue.",
    date: "2026-09-15",
    reponsePublieeSurGoogle: false,
    statutReponse: "aucune",
    brouillonReponse: null,
    dateReponsePubliee: null,
  },
  {
    id: "rev-003",
    auteur: "Sarah K.",
    note: 1,
    texte:
      "Très déçue. J'ai attendu 45 minutes pour être servie alors qu'il n'y avait que 3 clients avant moi, et quand j'ai fait la remarque on m'a répondu sèchement. Je ne reviendrai pas.",
    date: "2026-09-20",
    reponsePublieeSurGoogle: false,
    statutReponse: "brouillon",
    brouillonReponse:
      "Bonjour Sarah, nous sommes sincèrement désolés pour cette attente et pour la façon dont l'échange s'est déroulé — ce n'est pas le niveau de service que nous voulons offrir. Nous aimerions comprendre ce qui s'est passé ce jour-là : pourriez-vous nous contacter directement au [téléphone] ou par email à [BUSINESS_CONTACT_EMAIL] ? Nous tenons à en discuter avec vous. Merci de nous donner l'occasion de faire mieux.",
    dateReponsePubliee: null,
  },
  {
    id: "rev-004",
    auteur: "Thomas R.",
    note: 2,
    texte:
      "Produit périmé retrouvé dans mon sachet, c'est dangereux niveau hygiène. Ça fait 2 fois que je constate un problème ici.",
    date: "2026-09-21",
    reponsePublieeSurGoogle: false,
    statutReponse: "brouillon",
    brouillonReponse:
      "Bonjour Thomas, merci de nous avoir signalé ce problème — un produit périmé n'a évidemment pas sa place chez nous et nous prenons cela très au sérieux. Nous souhaitons vérifier ce qui s'est passé au plus vite : pourriez-vous nous appeler au [téléphone] ou nous écrire à [BUSINESS_CONTACT_EMAIL] avec la date d'achat ? Nous reviendrons vers vous personnellement.",
    dateReponsePubliee: null,
  },
  {
    id: "rev-005",
    auteur: "Nadia F.",
    note: 4,
    texte:
      "Très bon rapport qualité-prix, le personnel est sympa. Juste le parking pas évident le week-end, sinon rien à dire.",
    date: "2026-09-10",
    reponsePublieeSurGoogle: false,
    statutReponse: "aucune",
    brouillonReponse: null,
    dateReponsePubliee: null,
  },
];

export const MOCK_REVIEWS: Review[] = RAW.map((r) => {
  const sentiment = classifySentiment(r.note, r.texte);
  return {
    id: r.id,
    auteur: r.auteur,
    note: r.note,
    texte: r.texte,
    date: r.date,
    reponsePublieeSurGoogle: r.reponsePublieeSurGoogle,
    statutReponse: r.statutReponse,
    brouillonReponse: r.brouillonReponse,
    dateReponsePubliee: r.dateReponsePubliee,
    sentiment,
    relectureObligatoire: requiresMandatoryReview(r.note, r.texte),
  };
});

/**
 * Notes de la "période précédente" (fictives, démo uniquement) — utilisées
 * pour illustrer l'alerte de baisse de note moyenne dans le livrable mock,
 * sans jamais être présentées comme de vraies données.
 */
export const MOCK_PREVIOUS_PERIOD_RATINGS: number[] = [5, 4, 5, 5, 4, 5, 4, 5];
