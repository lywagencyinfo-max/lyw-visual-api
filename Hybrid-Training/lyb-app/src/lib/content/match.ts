import type { Exercise } from "./types";

/** Normalise un nom d'exercice : sans préfixe « Min 2 · », sans parenthèses, sans charge, en minuscules. */
export function normalizeName(name: string): string {
  return name
    .replace(/^.*? · /, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+([,.]\d+)?(\/\d+([,.]\d+)?)? ?kg\b/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Fiche correspondant à un nom de séance : nom exact, alias, ou nom qui commence par la fiche (la plus longue gagne). */
export function findExercise(name: string, library: Exercise[]): Exercise | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  let best: { ex: Exercise; len: number } | undefined;
  for (const ex of library) {
    for (const key of [ex.name, ...ex.aliases].map(normalizeName)) {
      if (!key) continue;
      if (n === key || n.startsWith(key + " ") || n.endsWith(" " + key)) {
        if (!best || key.length > best.len) best = { ex, len: key.length };
      }
    }
  }
  return best?.ex;
}
