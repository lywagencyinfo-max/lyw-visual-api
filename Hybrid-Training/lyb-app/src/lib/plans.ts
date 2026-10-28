import type { PlanId } from "./program/types";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  perWeek: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    price: 12.99,
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
    id: "found",
    name: "Found",
    price: 17.99,
    perWeek: 3,
    tagline: "L'équilibre force, moteur et spécifique Hyrox.",
    highlight: true,
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
    perWeek: 4,
    tagline: "Pour préparer une course Hyrox sérieusement.",
    features: [
      "4 séances complètes / semaine",
      "Tout Found, plus :",
      "Force bas du corps et haut du corps séparées",
      "WOD gymnique & haltéro",
      "Volume de stations progressif jusqu'aux charges de course",
    ],
  },
];

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

export const formatPrice = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
