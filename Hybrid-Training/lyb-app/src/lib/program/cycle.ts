import type { Level, WeekMeta } from "./types";

/**
 * Macrocycle de 12 semaines, inspiré des plans Hyrox publiés (base aérobie →
 * spécifique → affûtage) et d'une périodisation ondulante 3 semaines de charge /
 * 1 semaine de décharge.
 */
export const CYCLE_LENGTH = 12;

export const WEEKS: WeekMeta[] = [
  { week: 1, phase: "base", name: "Fondations", intensity: 3, deload: false, focus: "Technique des stations et volume aérobie" },
  { week: 2, phase: "base", name: "Fondations", intensity: 3, deload: false, focus: "Construire le moteur en zone 2-3" },
  { week: 3, phase: "base", name: "Fondations", intensity: 4, deload: false, focus: "Premiers efforts au seuil" },
  { week: 4, phase: "base", name: "Décharge", intensity: 2, deload: true, focus: "Assimiler : volume -40 %, technique propre" },
  { week: 5, phase: "build", name: "Développement", intensity: 3, deload: false, focus: "Force 5×5 et course compromise" },
  { week: 6, phase: "build", name: "Développement", intensity: 4, deload: false, focus: "Allure Hyrox sous fatigue" },
  { week: 7, phase: "build", name: "Développement", intensity: 4, deload: false, focus: "Densité : moins de repos, même qualité" },
  { week: 8, phase: "build", name: "Décharge", intensity: 2, deload: true, focus: "Récupérer et consolider les acquis" },
  { week: 9, phase: "peak", name: "Spécifique", intensity: 4, deload: false, focus: "Stations aux charges de course" },
  { week: 10, phase: "peak", name: "Spécifique", intensity: 5, deload: false, focus: "Blocs longs, transitions rapides" },
  { week: 11, phase: "peak", name: "Spécifique", intensity: 5, deload: false, focus: "Semaine la plus dure du cycle" },
  { week: 12, phase: "taper", name: "Affûtage & test", intensity: 3, deload: false, focus: "Fraîcheur puis simulation chronométrée" },
];

export const PHASE_LABEL: Record<WeekMeta["phase"], string> = {
  base: "Base",
  build: "Développement",
  peak: "Spécifique",
  taper: "Affûtage",
};

export function weekMeta(absWeek: number): WeekMeta & { cycle: number } {
  const w = ((absWeek - 1) % CYCLE_LENGTH) + 1;
  const cycle = Math.floor((absWeek - 1) / CYCLE_LENGTH) + 1;
  return { ...WEEKS[w - 1], cycle };
}

/** Schéma de force par semaine du cycle. */
export const STRENGTH_SCHEME: { sets: number; reps: string; rpe: number; rest: string; note?: string }[] = [
  { sets: 4, reps: "8", rpe: 7, rest: "2'", note: "Tempo 3-1-1 : 3 s de descente" },
  { sets: 4, reps: "8", rpe: 7.5, rest: "2'", note: "Même charge que S1 +2,5 à 5 kg" },
  { sets: 5, reps: "6", rpe: 8, rest: "2'30" },
  { sets: 3, reps: "6", rpe: 6, rest: "2'", note: "Décharge : charge de S1, vitesse d'exécution" },
  { sets: 5, reps: "5", rpe: 7.5, rest: "2'30" },
  { sets: 5, reps: "5", rpe: 8, rest: "2'30" },
  { sets: 6, reps: "4", rpe: 8, rest: "3'" },
  { sets: 3, reps: "5", rpe: 6, rest: "2'", note: "Décharge" },
  { sets: 5, reps: "3", rpe: 8, rest: "3'" },
  { sets: 5, reps: "3", rpe: 8.5, rest: "3'" },
  { sets: 4, reps: "2", rpe: 9, rest: "3'", note: "Puis 2 × 5 à -15 % (back-off)" },
  { sets: 3, reps: "3", rpe: 7, rest: "2'30", note: "Affûtage : rapide et propre, aucune répétition grindée" },
];

const LEVEL_FACTOR: Record<Level, number> = { debutant: 0.7, intermediaire: 1, avance: 1.25 };

/** Met à l'échelle un volume selon le niveau, arrondi au pas donné. */
export function scale(n: number, level: Level, step = 1, min = step): number {
  const v = Math.round((n * LEVEL_FACTOR[level]) / step) * step;
  return Math.max(min, v);
}

/** Choix déterministe dans une liste (variété sans aléatoire : même séance pour tous les abonnés). */
export function pick<T>(pool: T[], index: number): T {
  return pool[((index % pool.length) + pool.length) % pool.length];
}
