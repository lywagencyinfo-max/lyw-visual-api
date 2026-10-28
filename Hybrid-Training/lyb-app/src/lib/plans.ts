import type { Billing, PlanId } from "./program/types";

export const TRIAL_DAYS = 3;

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  /** Prix annuel (≈ 2 mois offerts). Absent = formule mensuelle uniquement. */
  yearly?: number;
  perWeek: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    price: 12.99,
    yearly: 129,
    perWeek: 2,
    tagline: "Pour se lancer ou compléter un autre sport.",
    features: [
      "2 séances complètes / semaine",
      "Force + WOD cross-training",
      "Séance Hyrox stations & course compromise",
      "Échauffement RAMP et mobilité à chaque séance",
      "Cycle de 12 semaines + simulation",
    ],
  },
  {
    id: "build",
    name: "Build",
    price: 17.99,
    yearly: 179,
    perWeek: 3,
    tagline: "L'équilibre force, moteur et spécifique Hyrox.",
    highlight: true,
    badge: "Le plus choisi",
    features: [
      "3 séances complètes / semaine",
      "Tout Start, plus :",
      "Une séance Engine dédiée (course & ergos)",
      "Progression d'allure seuil → allure Hyrox",
      "Récupération active les jours off",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 22.99,
    yearly: 229,
    perWeek: 4,
    tagline: "Pour progresser vite et performer.",
    features: [
      "4 séances complètes / semaine",
      "Tout Build, plus :",
      "Force bas du corps et haut du corps séparées",
      "WOD gymnique & haltéro",
      "Volume de stations progressif jusqu'aux charges de course",
    ],
  },
  {
    id: "race",
    name: "Race Prep",
    price: 29.99,
    perWeek: 5,
    tagline: "Tu as une date de course ? On cale tout dessus.",
    badge: "Objectif course",
    features: [
      "5 séances complètes / semaine",
      "Tout Pro, plus :",
      "Programme calé sur ta date de course",
      "Sortie longue d'endurance hebdomadaire",
      "Répétition générale 2 semaines avant + affûtage",
      "Séance d'activation la veille et plan du jour J",
    ],
  },
];

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

export const formatPrice = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Libellé de prix selon la facturation choisie (retombe sur le mensuel si pas d'annuel). */
export function priceFor(plan: Plan, billing: Billing) {
  if (billing === "yearly" && plan.yearly) {
    return {
      main: formatPrice(plan.yearly),
      period: "/ an",
      sub: `soit ${formatPrice(plan.yearly / 12)} / mois · ${Math.round((1 - plan.yearly / (plan.price * 12)) * 100)} % d'économie`,
    };
  }
  return {
    main: formatPrice(plan.price),
    period: "/ mois",
    sub: billing === "yearly" && !plan.yearly ? "Mensuel uniquement, sans engagement" : "Sans engagement",
  };
}
