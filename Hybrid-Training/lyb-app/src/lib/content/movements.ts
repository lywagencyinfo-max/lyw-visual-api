import { EQUIPMENT_PRESETS } from "../program/equipment";
import { PLAN_SLOTS, generateWeek, type ProgramExtras } from "../program/generator";
import type { Level, PlanId, Profile } from "../program/types";
import { findExercise, normalizeName } from "./match";
import type { Exercise } from "./types";

/**
 * Tous les mouvements que le programme peut afficher (toutes formules, niveaux et profils de matériel
 * sur un cycle), avec le nombre de séances où ils apparaissent. Sert à repérer ceux qui n'ont pas de démo.
 */
export function programMovements(extras?: ProgramExtras): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; count: number }>();
  const plans = Object.keys(PLAN_SLOTS) as PlanId[];
  const levels: Level[] = ["debutant", "intermediaire", "avance"];
  for (const preset of EQUIPMENT_PRESETS) for (const plan of plans) for (const level of levels) {
    const profile: Profile = { plan, level, sex: "femme", division: "open", days: [0, 1, 3, 4, 5], startDate: "2026-01-05", equipment: preset.items };
    for (let week = 1; week <= 12; week++) {
      for (const s of generateWeek(profile, week, extras)) {
        for (const b of [...s.warmup, ...s.main, s.mobility]) {
          for (const it of b.items) {
            const display = it.name.replace(/^.*? · /, "");
            const key = normalizeName(display);
            if (!key || /^(course|footing)/.test(key)) continue;
            const entry = counts.get(key) ?? { name: display, count: 0 };
            entry.count++;
            counts.set(key, entry);
          }
        }
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function missingDemos(library: Exercise[], extras?: ProgramExtras) {
  return programMovements(extras).filter((m) => !findExercise(m.name, library)?.media.length);
}
