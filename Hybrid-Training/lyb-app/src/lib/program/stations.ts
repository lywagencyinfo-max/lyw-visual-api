import type { Division, Item, Level, Sex } from "./types";

export type StationId =
  | "ski"
  | "sledPush"
  | "sledPull"
  | "bbj"
  | "row"
  | "farmers"
  | "lunges"
  | "wallBalls";

interface Station {
  id: StationId;
  name: string;
  /** Distance ou répétitions en course */
  race: number;
  unit: "m" | "reps";
  /** Charges approximatives [femme open, homme open, femme pro, homme pro] — à vérifier avec le rulebook de la saison */
  loads?: [string, string, string, string];
  cue: string;
  /** Alternative si le matériel manque */
  sub: string;
}

/** Les 8 stations Hyrox, dans l'ordre de course (chacune précédée d'1 km de course). */
export const STATIONS: Record<StationId, Station> = {
  ski: { id: "ski", name: "SkiErg", race: 1000, unit: "m", cue: "Hanches en charnière, bras tendus, tire avec les dorsaux", sub: "Rameur ou 40 slams ball" },
  sledPush: { id: "sledPush", name: "Sled push", race: 50, unit: "m", loads: ["102 kg", "152 kg", "152 kg", "202 kg"], cue: "Bras tendus, buste à 45°, petits pas rapides", sub: "Prowler / tapis non motorisé poussé" },
  sledPull: { id: "sledPull", name: "Sled pull", race: 50, unit: "m", loads: ["78 kg", "103 kg", "103 kg", "153 kg"], cue: "Recule en marchant, tire main sur main, corde au sol", sub: "Tirage corde lesté ou rowing haltère lourd" },
  bbj: { id: "bbj", name: "Burpee broad jumps", race: 80, unit: "m", cue: "Pieds larges à la réception, rythme régulier > sprint", sub: "Burpees + fentes sautées" },
  row: { id: "row", name: "Rameur", race: 1000, unit: "m", cue: "Jambes – buste – bras, 24-28 coups/min", sub: "SkiErg ou vélo (calories ×1,2)" },
  farmers: { id: "farmers", name: "Farmers carry", race: 200, unit: "m", loads: ["2 × 16 kg", "2 × 24 kg", "2 × 24 kg", "2 × 32 kg"], cue: "Gainage serré, pas courts, ne pose pas les poids", sub: "Haltères ou kettlebells" },
  lunges: { id: "lunges", name: "Sandbag lunges", race: 100, unit: "m", loads: ["10 kg", "20 kg", "20 kg", "30 kg"], cue: "Genou arrière touche le sol, sac sur les épaules", sub: "Fentes marchées avec barre ou kettlebell" },
  wallBalls: { id: "wallBalls", name: "Wall balls", race: 100, unit: "reps", loads: ["4 kg", "6 kg", "6 kg", "9 kg"], cue: "Squat complet, lancer dans le mouvement, séries cassées tôt", sub: "Thrusters haltères légers" },
};

export const RACE_ORDER: StationId[] = ["ski", "sledPush", "sledPull", "bbj", "row", "farmers", "lunges", "wallBalls"];

/** Paires de stations utilisées en rotation sur les séances Hyrox. */
export const STATION_PAIRS: [StationId, StationId][] = [
  ["ski", "wallBalls"],
  ["sledPush", "sledPull"],
  ["bbj", "row"],
  ["farmers", "lunges"],
];

function loadIndex(sex: Sex, division: Division) {
  return (division === "pro" ? 2 : 0) + (sex === "homme" ? 1 : 0);
}

/** Charge recommandée. Les débutants s'entraînent un cran en dessous des charges de course. */
export function stationLoad(id: StationId, sex: Sex, division: Division, level: Level): string | undefined {
  const loads = STATIONS[id].loads;
  if (!loads) return undefined;
  const race = loads[loadIndex(sex, division)];
  if (level === "debutant") return `${race} en course · commence à ~70 %`;
  return race;
}

/** Volume d'une station en fraction de la distance de course, arrondi proprement. */
export function stationDose(id: StationId, fraction: number): string {
  const s = STATIONS[id];
  const raw = s.race * fraction;
  const step = s.unit === "reps" ? 5 : s.race >= 500 ? 50 : s.race >= 100 ? 10 : 5;
  const v = Math.max(step, Math.round(raw / step) * step);
  return s.unit === "reps" ? `${v} reps` : `${v} m`;
}

export function stationItem(id: StationId, fraction: number, sex: Sex, division: Division, level: Level): Item {
  const s = STATIONS[id];
  const load = stationLoad(id, sex, division, level);
  return {
    name: s.name,
    dose: stationDose(id, fraction) + (load ? ` · ${load}` : ""),
    cue: `${s.cue}. Sans matériel : ${s.sub}.`,
  };
}
