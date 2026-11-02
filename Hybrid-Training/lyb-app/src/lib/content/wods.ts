import type { ProgramExtras, WodFn } from "../program/generator";
import { doseFor, type CustomWod } from "./types";

/** Transforme un WOD de l'espace admin en bloc de séance, au même format que les WODs du programme. */
export function wodToFn(wod: CustomWod): WodFn {
  return (level) => ({
    label: wod.kind === "finisher" ? "C" : "B",
    title: wod.kind === "finisher" ? `Finisher — ${wod.title}` : wod.kind === "flush" ? wod.title : `WOD — ${wod.title}`,
    format: wod.format,
    minutes: wod.minutes,
    items: wod.items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), dose: doseFor(i, level) })),
    note: wod.note || undefined,
  });
}

/** Lundi (ISO) de la semaine qui suit l'ajout : le WOD y est programmé pour tous les abonnés. */
export function debutWeek(createdAt: string): string {
  const d = new Date(createdAt);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  day.setUTCDate(day.getUTCDate() + 7 - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function toExtras(wods: CustomWod[]): ProgramExtras {
  const active = wods.filter((w) => w.active && w.items.some((i) => i.name.trim()));
  const of = (kind: CustomWod["kind"]) => active.filter((w) => w.kind === kind).map((w) => ({ fn: wodToFn(w), debut: debutWeek(w.createdAt) }));
  return { wods: of("wod"), flush: of("flush"), finishers: of("finisher") };
}
