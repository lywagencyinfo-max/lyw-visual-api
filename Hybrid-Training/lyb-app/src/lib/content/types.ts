import type { Level } from "../program/types";

export type MediaKind = "image" | "video" | "youtube";

export interface Media {
  kind: MediaKind;
  url: string;
}

/** Fiche d'un mouvement de la bibliothèque : démo affichée sous l'exercice dans les séances. */
export interface Exercise {
  id: string;
  name: string;
  /** Autres noms sous lesquels le mouvement apparaît dans les séances */
  aliases: string[];
  cues: string;
  media: Media[];
  updatedAt: string;
}

export type WodKind = "wod" | "flush" | "finisher";

export interface WodItem {
  name: string;
  dose: string;
  /** Dose spécifique débutant / avancé ; sinon `dose` pour tous */
  doseDebutant?: string;
  doseAvance?: string;
}

/** WOD ajouté depuis l'espace admin ; entre dans la rotation des séances. */
export interface CustomWod {
  id: string;
  kind: WodKind;
  title: string;
  format: string;
  minutes: number;
  items: WodItem[];
  note?: string;
  active: boolean;
  createdAt: string;
}

export const WOD_KIND_LABEL: Record<WodKind, string> = {
  wod: "WOD cross-training",
  flush: "WOD léger (décharge)",
  finisher: "Finisher (6-10')",
};

export function doseFor(item: WodItem, level: Level): string {
  if (level === "debutant" && item.doseDebutant) return item.doseDebutant;
  if (level === "avance" && item.doseAvance) return item.doseAvance;
  return item.dose;
}
