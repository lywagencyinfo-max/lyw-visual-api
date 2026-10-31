import type { Equip } from "./equipment";

export type PlanId = "start" | "build" | "pro" | "race";
export type Billing = "monthly" | "yearly";
export type Level = "debutant" | "intermediaire" | "avance";
export type Sex = "femme" | "homme";
export type Division = "open" | "pro";
export type Phase = "base" | "build" | "peak" | "taper";

export type SessionKind =
  | "force-wod" // Force + WOD cross-training
  | "force-lower" // Force bas du corps + finisher
  | "force-upper" // Force haut du corps + WOD gym
  | "engine" // Course / ergos
  | "hyrox" // Stations + course compromise
  | "simulation" // Simulation Hyrox (fin de cycle)
  | "long" // Endurance longue zone 2 (Race Prep)
  | "race-activation"; // Rappel d'activation la veille de la course (Race Prep)

export interface Profile {
  plan: PlanId;
  level: Level;
  sex: Sex;
  division: Division;
  /** Jours d'entraînement, 0 = lundi … 6 = dimanche */
  days: number[];
  /** Date ISO (yyyy-mm-dd) du lundi de la semaine 1 */
  startDate: string;
  /** Race Prep : date ISO de la course, placée en semaine 12 du cycle */
  raceDate?: string;
  billing?: Billing;
  /** Matériel disponible ; absent = salle complète */
  equipment?: Equip[];
}

export interface Item {
  name: string;
  dose: string;
  cue?: string;
}

export interface Block {
  label: string; // "A", "B", "Raise", …
  title: string;
  format?: string; // "EMOM 12'", "AMRAP 14'", "5 × 5"…
  minutes: number;
  items: Item[];
  note?: string;
}

export interface WeekMeta {
  week: number; // semaine dans le cycle (1-12)
  phase: Phase;
  name: string;
  intensity: number; // 1-5
  deload: boolean;
  focus: string;
}

export interface Session {
  id: string;
  week: number; // semaine absolue (1…∞)
  cycle: number; // 1…∞
  slot: number; // index de la séance dans la semaine
  kind: SessionKind;
  title: string;
  objective: string;
  intensity: number; // 1-5
  rpe: string;
  minutes: number;
  warmup: Block[];
  main: Block[];
  mobility: Block;
  coachNote: string;
  tags: string[];
  /** Nombre de mouvements remplacés faute de matériel */
  adapted: number;
}
