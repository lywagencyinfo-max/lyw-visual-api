import { CYCLE_LENGTH } from "./cycle";
import { PLAN_SLOTS } from "./generator";
import type { PlanId, Profile } from "./types";

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Jours par défaut : au moins 48 h entre deux séances intenses quand c'est possible. */
export const DEFAULT_DAYS: Record<PlanId, number[]> = {
  start: [1, 4], // mar, ven
  build: [0, 2, 5], // lun, mer, sam
  pro: [0, 1, 3, 5], // lun, mar, jeu, sam
  race: [0, 1, 3, 4, 5], // lun, mar, jeu, ven, sam
};

const DAY_MS = 86_400_000;

/** Lundi (00:00 locale) de la semaine contenant `d`. */
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export interface DayPlan {
  date: Date;
  week: number; // semaine absolue, < 1 si le programme n'a pas commencé
  weekday: number; // 0 = lundi
  slot: number | null; // séance prévue, null = repos
}

export function dayPlan(profile: Profile, date: Date): DayPlan {
  const start = parseISODate(profile.startDate);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((day.getTime() - start.getTime()) / DAY_MS);
  const week = Math.floor(diff / 7) + 1;
  const weekday = (day.getDay() + 6) % 7;
  const days = [...profile.days].sort((a, b) => a - b).slice(0, PLAN_SLOTS[profile.plan].length);
  const i = days.indexOf(weekday);
  return { date: day, week, weekday, slot: week >= 1 && i >= 0 ? i : null };
}

export function dateOfSlot(profile: Profile, week: number, slot: number): Date {
  const days = [...profile.days].sort((a, b) => a - b);
  const d = parseISODate(profile.startDate);
  d.setDate(d.getDate() + (week - 1) * 7 + (days[slot] ?? slot));
  return d;
}

/**
 * Race Prep : lundi de la semaine 1 tel que la course tombe en semaine 12 du cycle.
 * Si la course est à plus de 14 semaines, on ajoute un cycle de préparation avant ;
 * si elle est à moins de 12 semaines, l'athlète entre dans le cycle en cours de route.
 */
export function raceStartDate(raceDate: string, today: Date): string {
  const start = mondayOf(parseISODate(raceDate));
  start.setDate(start.getDate() - (CYCLE_LENGTH - 1) * 7);
  // On accepte de démarrer jusqu'à 2 semaines plus tard plutôt que d'ajouter un cycle presque entier avant
  const latest = mondayOf(today);
  latest.setDate(latest.getDate() + 14);
  while (start.getTime() > latest.getTime()) start.setDate(start.getDate() - CYCLE_LENGTH * 7);
  return toISODate(start);
}

/** Nombre de jours avant la course (négatif si passée). */
export function daysUntil(isoDate: string, today: Date): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(isoDate).getTime() - t.getTime()) / DAY_MS);
}
