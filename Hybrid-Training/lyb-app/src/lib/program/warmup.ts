import { pick } from "./cycle";
import type { Block, Item } from "./types";

/**
 * Échauffement RAMP (Raise · Activate · Mobilise · Potentiate), le protocole
 * recommandé par l'UKSCA. Les trois premières étapes tournent chaque semaine,
 * la dernière est propre à la séance (montée en charge, accélérations…).
 */
export type WarmupFocus = "lower" | "upper" | "run" | "hyrox";

const RAISE: Item[][] = [
  [{ name: "Rameur", dose: "3' facile → 1' allure modérée" }, { name: "Jumping jacks", dose: "30 s" }],
  [{ name: "Footing", dose: "4' en aisance respiratoire" }, { name: "Talons-fesses / montées de genoux", dose: "2 × 20 m" }],
  [{ name: "SkiErg", dose: "2' facile" }, { name: "Vélo (Assault / Echo)", dose: "2' en progression" }],
  [{ name: "Corde à sauter", dose: "3 × 40 s / 20 s repos" }, { name: "Footing", dose: "2'" }],
];

const ACTIVATE: Record<WarmupFocus, Item[][]> = {
  lower: [
    [{ name: "Glute bridge", dose: "2 × 12", cue: "Pause 2 s en haut" }, { name: "Dead bug", dose: "2 × 8 / côté" }, { name: "Monster walk élastique", dose: "2 × 10 pas / sens" }],
    [{ name: "Hip thrust au sol unilatéral", dose: "2 × 8 / côté" }, { name: "Gainage latéral", dose: "2 × 25 s / côté" }, { name: "Clamshell élastique", dose: "2 × 12 / côté" }],
    [{ name: "Squat isométrique au mur", dose: "2 × 30 s" }, { name: "Bird dog", dose: "2 × 8 / côté" }, { name: "Pont fessier marché", dose: "2 × 10" }],
  ],
  upper: [
    [{ name: "Band pull-apart", dose: "2 × 15" }, { name: "Scapular pull-ups", dose: "2 × 8" }, { name: "Hollow hold", dose: "2 × 20 s" }],
    [{ name: "Face pull élastique", dose: "2 × 15" }, { name: "Pompes scapulaires", dose: "2 × 10" }, { name: "Planche avec touches d'épaule", dose: "2 × 16" }],
    [{ name: "Rotation externe élastique", dose: "2 × 12 / bras" }, { name: "Dead hang actif", dose: "2 × 20 s" }, { name: "Dead bug", dose: "2 × 8 / côté" }],
  ],
  run: [
    [{ name: "Montées sur pointes", dose: "2 × 15" }, { name: "Glute bridge", dose: "2 × 12" }, { name: "Gainage frontal", dose: "2 × 30 s" }],
    [{ name: "Skipping A", dose: "2 × 20 m" }, { name: "Pogo jumps", dose: "2 × 15" }, { name: "Gainage latéral", dose: "2 × 20 s / côté" }],
    [{ name: "Fentes arrière", dose: "2 × 8 / jambe" }, { name: "Équilibre unipodal yeux fermés", dose: "2 × 20 s / pied" }, { name: "Dead bug", dose: "2 × 8 / côté" }],
  ],
  hyrox: [
    [{ name: "Glute bridge", dose: "2 × 12" }, { name: "Band pull-apart", dose: "2 × 15" }, { name: "Bear crawl", dose: "2 × 10 m" }],
    [{ name: "Goblet squat léger", dose: "2 × 10" }, { name: "Farmer hold", dose: "2 × 30 s" }, { name: "Inchworm + pompe", dose: "2 × 5" }],
    [{ name: "Fentes marchées", dose: "2 × 10 pas" }, { name: "Face pull élastique", dose: "2 × 15" }, { name: "Planche", dose: "2 × 30 s" }],
  ],
};

const MOBILISE: Record<WarmupFocus, Item[][]> = {
  lower: [
    [{ name: "World's greatest stretch", dose: "4 / côté" }, { name: "Cossack squat", dose: "6 / côté" }, { name: "Squat profond + ouverture thoracique", dose: "6" }],
    [{ name: "Leg swings avant / latéral", dose: "10 / jambe / sens" }, { name: "90/90 hanches dynamique", dose: "8" }, { name: "Mobilité cheville genou au mur", dose: "10 / côté" }],
  ],
  upper: [
    [{ name: "PVC pass-through", dose: "10" }, { name: "Rotation thoracique quadrupédie", dose: "8 / côté" }, { name: "Cercles de bras", dose: "10 / sens" }],
    [{ name: "Wall slides", dose: "10" }, { name: "Open book", dose: "8 / côté" }, { name: "Chat-vache", dose: "8" }],
  ],
  run: [
    [{ name: "Leg swings avant / latéral", dose: "10 / jambe / sens" }, { name: "Fente + rotation", dose: "5 / côté" }, { name: "Mobilité cheville genou au mur", dose: "10 / côté" }],
    [{ name: "Walking spiderman", dose: "6 / côté" }, { name: "Frankenstein walk", dose: "10 m" }, { name: "Ouverture de hanches marchée", dose: "10 m" }],
  ],
  hyrox: [
    [{ name: "World's greatest stretch", dose: "4 / côté" }, { name: "PVC pass-through", dose: "10" }, { name: "Squat profond tenu", dose: "45 s" }],
    [{ name: "Inchworm", dose: "5" }, { name: "Cossack squat", dose: "6 / côté" }, { name: "Rotation thoracique quadrupédie", dose: "8 / côté" }],
  ],
};

export function buildWarmup(focus: WarmupFocus, index: number, potentiate: Item[]): Block[] {
  return [
    { label: "R", title: "Raise — monter la température", minutes: 5, items: pick(RAISE, index) },
    { label: "A", title: "Activate — réveiller les muscles clés", minutes: 4, items: pick(ACTIVATE[focus], index) },
    { label: "M", title: "Mobilise — amplitude dynamique", minutes: 3, items: pick(MOBILISE[focus], index) },
    { label: "P", title: "Potentiate — préparer l'effort du jour", minutes: 4, items: potentiate },
  ];
}
