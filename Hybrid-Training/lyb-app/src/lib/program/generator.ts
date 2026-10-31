import { CYCLE_LENGTH, STRENGTH_SCHEME, pick, scale, weekMeta } from "./cycle";
import { ALL_EQUIPMENT, adaptBlock, adaptLabel, type Equip } from "./equipment";
import { buildMobility, type MobilityFocus } from "./mobility";
import { RACE_ORDER, STATIONS, STATION_PAIRS, stationItem, type StationId } from "./stations";
import type { Block, Item, Level, PlanId, Profile, Session, SessionKind, WeekMeta } from "./types";
import { buildWarmup } from "./warmup";
import { ENGINE, FINISHERS, FLUSH_WODS, WODS } from "./workouts";

/** Ordre des séances dans la semaine pour chaque formule. */
export const PLAN_SLOTS: Record<PlanId, SessionKind[]> = {
  start: ["force-wod", "hyrox"],
  build: ["force-wod", "engine", "hyrox"],
  pro: ["force-lower", "engine", "force-upper", "hyrox"],
  race: ["force-lower", "engine", "hyrox", "force-upper", "long"],
};

/** Race Prep : répétition générale en S10 (2 semaines avant la course), activation la veille en S12. */
const REHEARSAL_WEEK = 10;

interface Lift {
  name: string;
  beginner: string;
}

// Mouvement principal par phase : on garde le même lift 4 semaines pour pouvoir progresser en charge.
const LOWER_MAIN: Record<WeekMeta["phase"], [Lift, Lift]> = {
  base: [{ name: "Back squat", beginner: "Goblet squat" }, { name: "Romanian deadlift", beginner: "RDL haltères" }],
  build: [{ name: "Deadlift", beginner: "Deadlift kettlebell" }, { name: "Front squat", beginner: "Goblet squat tempo" }],
  peak: [{ name: "Back squat", beginner: "Box squat barre" }, { name: "Trap bar deadlift", beginner: "Deadlift kettlebell lourd" }],
  taper: [{ name: "Back squat", beginner: "Box squat barre" }, { name: "Trap bar deadlift", beginner: "Deadlift kettlebell lourd" }],
};

const UPPER_MAIN: Record<WeekMeta["phase"], [Lift, Lift]> = {
  base: [{ name: "Strict press", beginner: "Développé haltères assis" }, { name: "Strict pull-ups", beginner: "Ring rows" }],
  build: [{ name: "Bench press", beginner: "Développé couché haltères" }, { name: "Bent-over row", beginner: "Rowing haltère unilatéral" }],
  peak: [{ name: "Push press", beginner: "Push press haltères" }, { name: "Weighted pull-ups", beginner: "Tractions élastique" }],
  taper: [{ name: "Push press", beginner: "Push press haltères" }, { name: "Strict pull-ups", beginner: "Tractions élastique" }],
};

const LOWER_ACCESSORIES: Item[][] = [
  [{ name: "Bulgarian split squat", dose: "3 × 8 / jambe" }, { name: "Nordic curl (ou leg curl)", dose: "3 × 5" }],
  [{ name: "Step-ups lestés", dose: "3 × 10 / jambe" }, { name: "Hip thrust", dose: "3 × 10" }],
  [{ name: "Walking lunges lestées", dose: "3 × 12 pas" }, { name: "RDL unilatéral", dose: "3 × 8 / jambe" }],
  [{ name: "Fentes arrière déficit", dose: "3 × 8 / jambe" }, { name: "Copenhagen plank", dose: "3 × 20 s / côté" }],
];

const UPPER_ACCESSORIES: Item[][] = [
  [{ name: "Développé haltères incliné", dose: "3 × 10" }, { name: "Rowing poitrine appuyée", dose: "3 × 12" }],
  [{ name: "Landmine press", dose: "3 × 8 / bras" }, { name: "Face pull", dose: "3 × 15" }],
  [{ name: "Dips (ou pompes déclinées)", dose: "3 × 8-10" }, { name: "Curl marteau", dose: "3 × 12" }],
];

const liftName = (lift: Lift, level: Level) => (level === "debutant" ? lift.beginner : lift.name);

function strengthBlock(label: string, lift: Lift, level: Level, w: WeekMeta): Block {
  const sc = STRENGTH_SCHEME[w.week - 1];
  const rpe = level === "debutant" ? Math.min(sc.rpe, 7.5) : sc.rpe;
  return {
    label,
    title: `Force — ${liftName(lift, level)}`,
    format: `${sc.sets} × ${sc.reps} @ RPE ${rpe}`,
    minutes: sc.sets * 3,
    items: [{ name: liftName(lift, level), dose: `${sc.sets} × ${sc.reps} · repos ${sc.rest}`, cue: sc.note }],
    note: "RPE 8 = il te reste 2 répétitions en réserve. Note ta charge pour la semaine suivante.",
  };
}

function rampUp(lift: string): Item[] {
  return [
    { name: `Montée en charge ${lift}`, dose: "barre vide × 8 · 50 % × 5 · 70 % × 3 · 85 % × 1" },
    { name: "Box jumps", dose: "2 × 3 explosifs" },
  ];
}

function wodFor(w: WeekMeta & { cycle: number }, level: Level, offset: number): Block {
  const idx = w.week - 1 + (w.cycle - 1) * 5 + offset;
  return w.deload || w.phase === "taper" ? pick(FLUSH_WODS, idx)(level) : pick(WODS, idx)(level);
}

function phaseFraction(w: WeekMeta): number {
  if (w.deload) return 0.3;
  return { base: 0.4, build: 0.6, peak: 0.85, taper: 0.5 }[w.phase] + (w.week % 4 === 3 ? 0.1 : 0);
}

function runDistance(level: Level, w: WeekMeta): number {
  if (level === "debutant") return 500;
  if (level === "intermediaire") return w.phase === "base" || w.deload ? 800 : 1000;
  return 1000;
}

function hyroxStations(idx: number, level: Level, w: WeekMeta): StationId[] {
  const pairs = [pick(STATION_PAIRS, idx), pick(STATION_PAIRS, idx + 1)];
  if (level === "avance" && !w.deload && w.phase !== "base") pairs.push(pick(STATION_PAIRS, idx + 2));
  const list = pairs.flat();
  return level === "debutant" ? list.slice(0, 3) : list;
}

interface Built {
  title: string;
  objective: string;
  warmupFocus: "lower" | "upper" | "run" | "hyrox";
  potentiate: Item[];
  main: Block[];
  mobility: MobilityFocus;
  tags: string[];
}

function build(kind: SessionKind, profile: Profile, w: WeekMeta & { cycle: number }, idx: number): Built {
  const { level, sex, division } = profile;
  switch (kind) {
    case "force-wod":
    case "force-lower": {
      const [main, secondary] = LOWER_MAIN[w.phase];
      const swap = w.cycle % 2 === 0; // cycle pair : on inverse les deux lifts pour varier le stimulus
      const lead = swap ? secondary : main;
      const second = swap ? main : secondary;
      const blocks: Block[] = [strengthBlock("A", lead, level, w)];
      if (kind === "force-lower") {
        blocks.push({
          label: "B", title: "Accessoires unilatéraux", format: "Superset · 3 tours", minutes: 12,
          items: [{ name: liftName(second, level), dose: "3 × 8 @ RPE 7" }, ...pick(LOWER_ACCESSORIES, idx)],
        });
        blocks.push(pick(FINISHERS, idx)(level));
      } else {
        blocks[0].items.push({ name: liftName(second, level), dose: "3 × 8 @ RPE 7 en superset", cue: "Enchaîné après chaque série principale, repos inchangé" });
        blocks.push(wodFor(w, level, 0));
      }
      const isSquat = /squat/i.test(lead.name);
      return {
        title: kind === "force-wod" ? "Force & WOD" : "Force bas du corps",
        objective: `Développer la force de ${isSquat ? "squat" : "tirage du sol"} puis ${kind === "force-wod" ? "un WOD cross-training" : "une capacité de travail spécifique"}.`,
        warmupFocus: "lower",
        potentiate: rampUp(liftName(lead, level)),
        main: blocks,
        mobility: isSquat ? "hips" : "posterior",
        tags: ["Force", kind === "force-wod" ? "Cross-training" : "Finisher", isSquat ? "Squat" : "Hinge"],
      };
    }
    case "force-upper": {
      const [press, pull] = UPPER_MAIN[w.phase];
      const sc = STRENGTH_SCHEME[w.week - 1];
      const strength = strengthBlock("A", press, level, w);
      strength.title = `Force — ${liftName(press, level)} + ${liftName(pull, level)}`;
      strength.items.push({ name: liftName(pull, level), dose: `${sc.sets} × ${level === "debutant" ? "8-10" : sc.reps} en superset`, cue: "Lesté si les reps sont faciles" });
      return {
        title: "Haut du corps & gym",
        objective: "Force de poussée/tirage, puis WOD gymnique ou haltéro pour la variété cross-training.",
        warmupFocus: "upper",
        potentiate: [{ name: `Montée en charge ${liftName(press, level)}`, dose: "3 séries progressives × 5-3-1" }, { name: "Strict pull-ups / ring rows", dose: "2 × 3" }],
        main: [
          strength,
          wodFor(w, level, 6),
          { label: "C", title: "Accessoires", format: "2-3 tours", minutes: 8, items: pick(UPPER_ACCESSORIES, idx) },
        ],
        mobility: "shoulders",
        tags: ["Force", "Gymnastique", "Cross-training"],
      };
    }
    case "engine": {
      const main = pick(ENGINE, w.week - 1)(level);
      const blocks = [main];
      if (profile.plan === "pro" && !w.deload) {
        blocks.push({ label: "B", title: "Gainage anti-rotation", format: "3 tours", minutes: 6, items: [{ name: "Pallof press", dose: "10 / côté" }, { name: "Suitcase carry", dose: "20 m / côté" }] });
      }
      return {
        title: "Engine — course & ergos",
        objective: "Développer le moteur aérobie : la course représente environ la moitié du temps d'un Hyrox.",
        warmupFocus: "run",
        potentiate: [{ name: "Lignes droites progressives", dose: "4 × 80 m" }, { name: "Pogo jumps", dose: "2 × 10" }],
        main: blocks,
        mobility: "ankles",
        tags: ["Course", w.deload ? "Zone 2" : "Intervalles", "Engine"],
      };
    }
    case "hyrox": {
      const stations = hyroxStations(idx, level, w);
      const run = runDistance(level, w);
      const fraction = phaseFraction(w);
      const tech: Block = {
        label: "A", title: "Technique stations", format: "EMOM 10' — léger", minutes: 10,
        items: [
          { name: `Impair · ${STATIONS[stations[0]].name}`, dose: "30-40 s fluide", cue: STATIONS[stations[0]].cue },
          { name: `Pair · ${STATIONS[stations[1]].name}`, dose: "30-40 s fluide", cue: STATIONS[stations[1]].cue },
        ],
      };
      const items: Item[] = stations.flatMap((id) => [
        { name: "Course", dose: `${run} m à allure Hyrox` },
        stationItem(id, fraction, sex, division, level),
      ]);
      const compromised: Block = {
        label: "B", title: "Course compromise", format: "For Time · transitions comprises", minutes: Math.round(stations.length * (run / 1000) * 6 + stations.length * 3),
        items,
        note: "Apprends à relancer la course dès la sortie de station : les 200 premiers mètres décident de ton allure.",
      };
      return {
        title: "Hyrox — stations & course compromise",
        objective: `Enchaîner ${stations.length} stations à ${Math.round(fraction * 100)} % du volume de course, sans perdre l'allure de course.`,
        warmupFocus: "hyrox",
        potentiate: [{ name: "Passage léger de chaque station du jour", dose: "20-30 s chacune" }],
        main: [tech, compromised],
        mobility: "fullbody",
        tags: ["Hyrox", "Course compromise", ...stations.map((id) => STATIONS[id].name)],
      };
    }
    case "simulation": {
      const rehearsal = profile.plan === "race" && w.week === REHEARSAL_WEEK && w.cycle === raceCycle(profile);
      const cfg = {
        debutant: { run: 500, fraction: 0.5, label: "Demi-Hyrox" },
        intermediaire: { run: 1000, fraction: 0.75, label: "Hyrox à 75 %" },
        avance: { run: 1000, fraction: 1, label: "Hyrox complet" },
      }[level];
      const items: Item[] = RACE_ORDER.flatMap((id) => [
        { name: "Course", dose: `${cfg.run} m` },
        stationItem(id, cfg.fraction, sex, division, level),
      ]);
      return {
        title: `${rehearsal ? "Répétition générale" : "Simulation"} — ${cfg.label}`,
        objective: rehearsal
          ? "Répéter la course 2 semaines avant le jour J, dans l'ordre exact des stations, pour valider allures, transitions et nutrition."
          : "Tester ta forme en fin de cycle, dans l'ordre exact des stations, et fixer tes allures pour le cycle suivant.",
        warmupFocus: "hyrox",
        potentiate: [{ name: "2 × 200 m à allure course", dose: "r 1'" }, { name: "5 wall balls + 10 m sled push léger", dose: "1 tour" }],
        main: [{
          label: "A", title: cfg.label, format: "For Time · chrono complet", minutes: level === "debutant" ? 45 : level === "intermediaire" ? 70 : 85,
          items,
          note: "Note ton temps total et tes splits run / station : ils serviront de référence au prochain cycle.",
        }],
        mobility: "fullbody",
        tags: ["Hyrox", "Simulation", "Test"],
      };
    }
    case "long": {
      const base = w.deload ? 40 : { base: 45, build: 55, peak: 65, taper: 30 }[w.phase];
      const total = scale(base, level, 5);
      const hybrid = w.week % 2 === 0;
      const items: Item[] = hybrid
        ? [
            { name: "Course zone 2", dose: `${Math.round(total * 0.4)}'` },
            { name: w.week % 4 === 0 ? "SkiErg zone 2" : "Rameur zone 2", dose: `${Math.round(total * 0.2)}'`, cue: "Enchaîne sans pause, comme une transition" },
            { name: "Course zone 2", dose: `${Math.round(total * 0.4)}'` },
          ]
        : [
            { name: "Course zone 2", dose: `${total}'`, cue: "Tu dois pouvoir tenir une conversation" },
            { name: "Lignes droites", dose: "4 × 80 m relâchées" },
          ];
      return {
        title: hybrid ? "Endurance longue hybride" : "Sortie longue",
        objective: "Construire la base aérobie qui permet de récupérer entre les stations et de tenir l'allure jusqu'au 8e km.",
        warmupFocus: "run",
        potentiate: [{ name: "Footing très progressif", dose: "les 5 premières minutes du bloc" }],
        main: [{ label: "A", title: hybrid ? "Zone 2 course + ergo" : "Zone 2 continue", format: `${total}' continu`, minutes: total, items }],
        mobility: "ankles",
        tags: ["Endurance", "Zone 2", "Race Prep"],
      };
    }
    case "race-activation": {
      return {
        title: "Activation pré-course",
        objective: "Garder du tonus sans fatigue : la séance se fait idéalement la veille de la course.",
        warmupFocus: "hyrox",
        potentiate: [{ name: "Lignes droites", dose: "3 × 80 m" }],
        main: [{
          label: "A", title: "Rappel allure & stations", format: "Très léger · RPE 5", minutes: 15,
          items: [
            { name: "Footing", dose: "8' facile" },
            { name: "Course allure course", dose: "3 × 200 m · r 1'" },
            { name: "SkiErg, wall balls, sled push, rameur", dose: "20 s chacun, technique parfaite" },
          ],
          note: "Prépare ton sac ce soir : chaussures, gants, ceinture, gels, eau, tenue, pièce d'identité.",
        }],
        mobility: "hips",
        tags: ["Race Prep", "Activation", "Veille de course"],
      };
    }
  }
}

const PHASE_NOTES: Record<WeekMeta["phase"], string> = {
  base: "Phase de base : la qualité de mouvement et la régularité priment. Termine chaque séance en te disant que tu aurais pu en faire un peu plus.",
  build: "Phase de développement : les charges montent et les repos se raccourcissent. Dors 7-9 h et mange assez de protéines (1,6-2 g/kg).",
  peak: "Phase spécifique : on s'approche des conditions de course. Teste ton équipement, tes chaussures et ta nutrition pendant les séances.",
  taper: "Affûtage : moins de volume, autant d'intensité. Tu dois arriver frais à la simulation.",
};

function coachNote(w: WeekMeta & { cycle: number }, kind: SessionKind): string {
  if (kind === "race-activation") return "Dors bien, hydrate-toi, mange des glucides familiers. Rien de nouveau demain : ni chaussures, ni gel, ni petit-déjeuner.";
  if (kind === "simulation" && w.week === REHEARSAL_WEEK) return "Répétition générale : mêmes chaussures, même petit-déjeuner et même échauffement que le jour J. Note tes splits pour fixer ta stratégie de course.";
  if (kind === "simulation") return "Échauffe-toi bien, pars plus lentement que tu ne le penses sur le 1er km et vise des splits réguliers.";
  if (w.deload) return "Semaine de décharge : volume réduit, RPE ≤ 6. C'est ici que ton corps assimile le travail des 3 dernières semaines — ne la saute pas.";
  if (w.cycle > 1 && w.week === 1) return `Cycle ${w.cycle} : reprends tes charges et allures de référence de la simulation, et vise +2 à 5 %. ${PHASE_NOTES.base}`;
  return PHASE_NOTES[w.phase];
}

/** Cycle qui contient la course (les cycles précédents sont des cycles de préparation classiques). */
function raceCycle(profile: Profile): number {
  if (!profile.raceDate) return 1;
  const [y1, m1, d1] = profile.startDate.split("-").map(Number);
  const [y2, m2, d2] = profile.raceDate.split("-").map(Number);
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
  return weekMeta(Math.floor(days / 7) + 1).cycle;
}

export function sessionsPerWeek(plan: PlanId): number {
  return PLAN_SLOTS[plan].length;
}

export function generateSession(profile: Profile, absWeek: number, slot: number): Session {
  const slots = PLAN_SLOTS[profile.plan];
  const w = weekMeta(absWeek);
  let kind = slots[slot];
  if (profile.plan === "race" && w.cycle === raceCycle(profile)) {
    if (w.week === REHEARSAL_WEEK && slot === slots.length - 1) kind = "simulation";
    if (w.week === CYCLE_LENGTH && slot === slots.length - 1) kind = "race-activation";
  } else if (w.week === CYCLE_LENGTH && slot === slots.length - 1) kind = "simulation";
  const idx = w.week - 1 + (w.cycle - 1) * 3 + slot;
  const b = build(kind, profile, w, idx);
  const have = new Set<Equip>(profile.equipment ?? ALL_EQUIPMENT);
  let adapted = 0;
  const adapt = (blk: Block) => {
    const r = adaptBlock(blk, have);
    adapted += r.changes;
    return r.block;
  };
  const warmup = buildWarmup(b.warmupFocus, idx, b.potentiate).map(adapt);
  const main = b.main.map(adapt);
  const mobility = adapt(buildMobility(b.mobility, idx));
  const minutes = [...warmup, ...main, mobility].reduce((sum, blk) => sum + blk.minutes, 0);
  const intensity = kind === "simulation" ? 5 : kind === "race-activation" ? 2 : w.intensity;
  return {
    id: `w${absWeek}-s${slot}`,
    week: absWeek,
    cycle: w.cycle,
    slot,
    kind,
    title: b.title,
    objective: b.objective,
    intensity,
    rpe: w.deload || intensity <= 2 ? "RPE 5-6" : intensity >= 5 ? "RPE 8-9" : intensity >= 4 ? "RPE 7-8" : "RPE 6-7",
    minutes: Math.round(minutes / 5) * 5,
    warmup,
    main,
    mobility,
    coachNote: coachNote(w, kind),
    tags: [...new Set(b.tags.map((tag) => adaptLabel(tag, have)))],
    adapted,
  };
}

export function generateWeek(profile: Profile, absWeek: number): Session[] {
  return PLAN_SLOTS[profile.plan].map((_, slot) => generateSession(profile, absWeek, slot));
}
