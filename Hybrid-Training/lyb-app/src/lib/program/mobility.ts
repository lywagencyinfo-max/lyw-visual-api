import { pick } from "./cycle";
import type { Block, Item } from "./types";

/**
 * Sessions de mobilité de fin de séance (10-12'), ciblées sur les zones
 * sollicitées par la séance du jour. Plusieurs variantes par zone, en rotation.
 */
export type MobilityFocus = "hips" | "posterior" | "ankles" | "shoulders" | "fullbody";

const FLOWS: Record<MobilityFocus, { title: string; items: Item[] }[]> = {
  hips: [
    {
      title: "Hanches & adducteurs",
      items: [
        { name: "Couch stretch", dose: "90 s / côté", cue: "Rétroversion du bassin, fessier serré" },
        { name: "Pigeon", dose: "90 s / côté" },
        { name: "Frog stretch", dose: "2'", cue: "Bascule doucement d'avant en arrière" },
        { name: "90/90 avec rotation active", dose: "8 / côté" },
        { name: "Respiration ventrale au sol", dose: "1'" },
      ],
    },
    {
      title: "Hanches — flow au sol",
      items: [
        { name: "Fente basse + rotation thoracique", dose: "60 s / côté" },
        { name: "Squat profond tenu (talons au sol)", dose: "2'", cue: "Coudes qui poussent les genoux" },
        { name: "Pigeon couché (figure 4)", dose: "60 s / côté" },
        { name: "Papillon assis", dose: "90 s" },
        { name: "Enfant (child's pose) bras tendus", dose: "1'" },
      ],
    },
  ],
  posterior: [
    {
      title: "Chaîne postérieure",
      items: [
        { name: "Ischios à l'élastique, allongé", dose: "90 s / jambe" },
        { name: "Jefferson curl très léger", dose: "2 × 6 lents", cue: "Vertèbre par vertèbre, charge ≤ 5 kg" },
        { name: "Pigeon", dose: "60 s / côté" },
        { name: "Chat-vache", dose: "10 lents" },
        { name: "Suspension passive à la barre", dose: "2 × 30 s" },
      ],
    },
    {
      title: "Dos & ischios",
      items: [
        { name: "Pancake assis", dose: "2'" },
        { name: "Torsion couchée", dose: "60 s / côté" },
        { name: "Good morning élastique", dose: "2 × 10 lents" },
        { name: "Enfant (child's pose) latéral", dose: "45 s / côté" },
        { name: "Respiration 90/90 pieds au mur", dose: "1'30" },
      ],
    },
  ],
  ankles: [
    {
      title: "Mollets, chevilles & fléchisseurs de hanche",
      items: [
        { name: "Étirement mollet au mur (jambe tendue / fléchie)", dose: "45 s × 2 / côté" },
        { name: "Mobilité cheville genou au mur", dose: "15 / côté" },
        { name: "Couch stretch", dose: "90 s / côté" },
        { name: "Rouleau mollets et quadriceps", dose: "2'" },
        { name: "Jambes au mur", dose: "2'", cue: "Retour au calme cardiaque" },
      ],
    },
    {
      title: "Récupération coureur",
      items: [
        { name: "Rouleau quadriceps, TFL, mollets", dose: "3'" },
        { name: "Fente basse (psoas)", dose: "60 s / côté" },
        { name: "Squat profond tenu", dose: "90 s" },
        { name: "Étirement fessier assis", dose: "60 s / côté" },
        { name: "Respiration 4-6 (inspire 4 s, expire 6 s)", dose: "2'" },
      ],
    },
  ],
  shoulders: [
    {
      title: "Épaules & thoracique",
      items: [
        { name: "Étirement dorsaux au banc (prière)", dose: "60 s × 2" },
        { name: "Open book", dose: "10 / côté" },
        { name: "Étirement pectoral à l'angle du mur", dose: "60 s / côté" },
        { name: "Thread the needle", dose: "8 / côté" },
        { name: "Suspension passive à la barre", dose: "2 × 30 s" },
      ],
    },
    {
      title: "Ceinture scapulaire",
      items: [
        { name: "Rouleau thoracique (extensions)", dose: "2'" },
        { name: "Sleeper stretch", dose: "45 s / côté" },
        { name: "Wall slides", dose: "2 × 10" },
        { name: "Étirement triceps / dorsal au mur", dose: "45 s / côté" },
        { name: "Enfant (child's pose) bras tendus", dose: "1'" },
      ],
    },
  ],
  fullbody: [
    {
      title: "Flow complet post-Hyrox",
      items: [
        { name: "Marche + respiration nasale", dose: "3'", cue: "Ramener la FC sous 110" },
        { name: "World's greatest stretch lent", dose: "5 / côté" },
        { name: "Couch stretch", dose: "60 s / côté" },
        { name: "Étirement dorsaux au banc", dose: "60 s" },
        { name: "Étirement mollet au mur", dose: "45 s / côté" },
      ],
    },
    {
      title: "Reset global",
      items: [
        { name: "Vélo très facile", dose: "3'" },
        { name: "Squat profond + rotation thoracique", dose: "6 / côté" },
        { name: "Pigeon", dose: "60 s / côté" },
        { name: "Thread the needle", dose: "6 / côté" },
        { name: "Jambes au mur", dose: "2'" },
      ],
    },
  ],
};

export function buildMobility(focus: MobilityFocus, index: number): Block {
  const flow = pick(FLOWS[focus], index);
  return { label: "MOB", title: `Mobilité — ${flow.title}`, minutes: 12, items: flow.items };
}

/** Séance de récupération active pour les jours sans entraînement. */
export function recoveryDay(index: number): Block[] {
  const focuses: MobilityFocus[] = ["hips", "shoulders", "ankles", "posterior"];
  return [
    {
      label: "Z1",
      title: "Récupération active",
      minutes: 25,
      items: [{ name: "Marche, vélo ou natation très facile", dose: "20-30'", cue: "Tu dois pouvoir parler sans effort" }],
    },
    buildMobility(pick(focuses, index), index + 1),
  ];
}
