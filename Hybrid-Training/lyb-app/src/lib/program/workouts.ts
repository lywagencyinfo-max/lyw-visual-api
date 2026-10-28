import { scale as s } from "./cycle";
import type { Block, Level } from "./types";

type W = (lvl: Level) => Block;

const gym = (lvl: Level, rx: string, scaled: string) => (lvl === "debutant" ? scaled : rx);

/**
 * WODs cross-training : formats variés (AMRAP, EMOM, For Time, intervalles,
 * chipper, Tabata), couplets / triplets, domaines de temps courts, moyens et
 * longs — la rotation M / G / W du template CrossFit.
 */
export const WODS: W[] = [
  (l) => ({
    label: "B", title: "WOD — Triplet gymnique", format: "AMRAP 16'", minutes: 16,
    items: [
      { name: gym(l, "Pull-ups", "Ring rows"), dose: `${s(5, l)}` },
      { name: gym(l, "Push-ups", "Pompes inclinées"), dose: `${s(10, l)}` },
      { name: "Air squats", dose: `${s(15, l)}` },
    ],
    note: "Rythme régulier : vise le même temps par tour du début à la fin.",
  }),
  (l) => ({
    label: "B", title: "WOD — EMOM machines & wall balls", format: "EMOM 20' (5 tours)", minutes: 20,
    items: [
      { name: "Min 1 · Rameur", dose: `${s(14, l)} cal` },
      { name: "Min 2 · Wall balls", dose: `${s(12, l)}` },
      { name: "Min 3 · Burpees", dose: `${s(8, l)}` },
      { name: "Min 4 · Kettlebell swings", dose: `${s(15, l)}` },
    ],
    note: "Garde 15 à 20 s de repos à chaque minute. Sinon, réduis les reps.",
  }),
  (l) => ({
    label: "B", title: "WOD — 21-15-9", format: "For Time · cap 12'", minutes: 12,
    items: [
      { name: gym(l, "Thrusters 43/30 kg", "Thrusters haltères 2 × 12,5/7,5 kg"), dose: "21-15-9" },
      { name: gym(l, "Burpees over the bar", "Burpees"), dose: "21-15-9" },
    ],
    note: "Court et intense : casse les thrusters tôt (ex. 11-10) plutôt que de t'arrêter longtemps.",
  }),
  (l) => ({
    label: "B", title: "WOD — Chipper hybride", format: "For Time · cap 25'", minutes: 25,
    items: [
      { name: "Course", dose: `${s(800, l, 100)} m` },
      { name: "Kettlebell swings", dose: `${s(40, l, 5)}` },
      { name: "Walking lunges", dose: `${s(30, l, 2)} pas` },
      { name: gym(l, "Toes-to-bar", "Knee raises"), dose: `${s(20, l)}` },
      { name: "Box jump overs", dose: `${s(20, l)}` },
      { name: "Course", dose: `${s(800, l, 100)} m` },
    ],
  }),
  (l) => ({
    label: "B", title: "WOD — Intervalles 4 × 4'", format: "4 tours : 4' travail / 2' repos", minutes: 24,
    items: [
      { name: "SkiErg", dose: `${s(12, l)} cal` },
      { name: "Goblet squats", dose: `${s(12, l)}` },
      { name: "Max burpees broad jumps", dose: "jusqu'à la fin des 4'" },
    ],
    note: "Score = total de burpees broad jumps. Les 4 tours doivent être ±2 reps.",
  }),
  (l) => ({
    label: "B", title: "WOD — Tabata ×3", format: "3 × Tabata (8 × 20\"/10\") · 1' entre chaque", minutes: 14,
    items: [
      { name: "Air bike / rameur", dose: "Tabata 1 — max calories" },
      { name: gym(l, "Hand release push-ups", "Pompes sur genoux"), dose: "Tabata 2" },
      { name: "Jumping lunges", dose: "Tabata 3" },
    ],
    note: "Score = la plus faible série de chaque Tabata.",
  }),
  (l) => ({
    label: "B", title: "WOD — Haltérophilie & cardio", format: "5 rounds For Time · cap 18'", minutes: 18,
    items: [
      { name: gym(l, "Power cleans 60/40 kg", "Hang power cleans haltères"), dose: `${s(5, l)}` },
      { name: "Rameur", dose: `${s(250, l, 50)} m` },
      { name: gym(l, "Chest-to-bar pull-ups", "Jumping pull-ups"), dose: `${s(8, l)}` },
    ],
  }),
  (l) => ({
    label: "B", title: "WOD — Long aérobie", format: "AMRAP 30'", minutes: 30,
    items: [
      { name: "Course", dose: `${s(400, l, 100)} m` },
      { name: "Wall balls", dose: `${s(15, l)}` },
      { name: "Farmers carry (kettlebells lourdes)", dose: "50 m" },
    ],
    note: "Allure conversationnelle à modérée : c'est un travail de moteur, pas un sprint.",
  }),
  (l) => ({
    label: "B", title: "WOD — Couplet ascendant", format: "AMRAP 12' · 3-6-9-12…", minutes: 12,
    items: [
      { name: gym(l, "Dumbbell snatch 22,5/15 kg", "Dumbbell snatch 15/10 kg"), dose: "3, 6, 9, 12… (alterné)" },
      { name: "Box jumps", dose: "3, 6, 9, 12…" },
    ],
  }),
  (l) => ({
    label: "B", title: "WOD — Partner-style solo", format: "For Time · cap 20'", minutes: 20,
    items: [
      { name: "Rameur", dose: `${s(1000, l, 100)} m` },
      { name: "Sandbag / kettlebell front-rack lunges", dose: `${s(40, l, 2)} pas` },
      { name: "SkiErg", dose: `${s(1000, l, 100)} m` },
      { name: "Burpees broad jumps", dose: `${s(30, l)} m` },
    ],
  }),
  (l) => ({
    label: "B", title: "WOD — EMOM gymnique", format: "EMOM 18' (6 tours)", minutes: 18,
    items: [
      { name: gym(l, "Toes-to-bar", "Hanging knee raises"), dose: `${s(8, l)}` },
      { name: gym(l, "Handstand push-ups (ou pike push-ups)", "Pike push-ups"), dose: `${s(6, l)}` },
      { name: "Double-unders (ou 3× sauts simples)", dose: `${s(40, l, 5)}` },
    ],
  }),
  (l) => ({
    label: "B", title: "WOD — Le Hyrox mini", format: "3 rounds For Time · cap 24'", minutes: 24,
    items: [
      { name: "Course", dose: `${s(500, l, 100)} m` },
      { name: "Kettlebell goblet lunges", dose: `${s(20, l, 2)} pas` },
      { name: "Wall balls", dose: `${s(20, l)}` },
      { name: "Devil press (haltères)", dose: `${s(8, l)}` },
    ],
  }),
];

/** WODs « flush » pour les semaines de décharge : aérobie, technique, faible impact. */
export const FLUSH_WODS: W[] = [
  (l) => ({
    label: "B", title: "Flush aérobie", format: "EMOM 20' — facile", minutes: 20,
    items: [
      { name: "Min 1 · Rameur", dose: `${s(10, l)} cal` },
      { name: "Min 2 · Air squats", dose: "12" },
      { name: "Min 3 · SkiErg", dose: `${s(10, l)} cal` },
      { name: "Min 4 · Planche", dose: "40 s" },
    ],
    note: "RPE 5-6 maximum. Respiration nasale si possible.",
  }),
  (l) => ({
    label: "B", title: "Flush technique", format: "3 tours qualité, sans chrono", minutes: 18,
    items: [
      { name: "Course facile", dose: `${s(400, l, 100)} m` },
      { name: "Wall balls (technique parfaite)", dose: "10" },
      { name: gym(l, "Strict pull-ups", "Ring rows"), dose: `${s(5, l)}` },
      { name: "Turkish get-up léger", dose: "1 / côté" },
    ],
  }),
];

/** Finishers courts (6-10') pour les séances de force. */
export const FINISHERS: W[] = [
  (l) => ({ label: "C", title: "Finisher — sled & carry", format: "4 tours", minutes: 8, items: [{ name: "Sled push (charge moyenne)", dose: "20 m" }, { name: "Farmers carry lourd", dose: "40 m" }], note: "Repos 45 s entre les tours." }),
  (l) => ({ label: "C", title: "Finisher — EMOM 8'", format: "EMOM 8'", minutes: 8, items: [{ name: "Impair · Wall balls", dose: `${s(12, l)}` }, { name: "Pair · Burpees", dose: `${s(8, l)}` }] }),
  (l) => ({ label: "C", title: "Finisher — sprint machine", format: "6 × 30\" / 30\"", minutes: 6, items: [{ name: "Air bike ou SkiErg", dose: "max effort" }] }),
  (l) => ({ label: "C", title: "Finisher — fentes", format: "AMRAP 7'", minutes: 7, items: [{ name: "Sandbag / KB walking lunges", dose: `${s(20, l, 2)} pas` }, { name: "Rameur", dose: `${s(10, l)} cal` }] }),
  (l) => ({ label: "C", title: "Finisher — core", format: "3 tours", minutes: 7, items: [{ name: gym(l, "Toes-to-bar", "Knee raises"), dose: `${s(10, l)}` }, { name: "Hollow rocks", dose: "15" }, { name: "Gainage latéral", dose: "30 s / côté" }] }),
];

/**
 * Séances « engine » (course et ergos) par semaine du cycle : base aérobie,
 * seuil, VMA courte, puis allure Hyrox en phase spécifique.
 */
export const ENGINE: W[] = [
  (l) => ({ label: "A", title: "Intervalles courts", format: `${s(6, l)} × 400 m · r 90"`, minutes: 25, items: [{ name: "Course", dose: `${s(6, l)} × 400 m à allure 5 km`, cue: "RPE 8. Récup en marche/trot" }, { name: "Puis rameur", dose: `3 × 500 m · r 1'`, cue: "Allure régulière, 26 coups/min" }] }),
  (l) => ({ label: "A", title: "Seuil", format: `${s(4, l)} × 1 km · r 2'`, minutes: 30, items: [{ name: "Course", dose: `${s(4, l)} × 1 km au seuil`, cue: "Allure « confortablement difficile » : phrases courtes possibles" }] }),
  (l) => ({ label: "A", title: "Fartlek", format: "30' continu", minutes: 30, items: [{ name: "Course", dose: `${s(10, l)} × (2' soutenu / 1' facile)` }, { name: "Puis SkiErg", dose: "5' zone 2" }] }),
  (l) => ({ label: "A", title: "Zone 2 + lignes droites", format: "Décharge", minutes: 35, items: [{ name: "Footing zone 2", dose: `${s(30, l, 5)}'`, cue: "Respiration nasale possible" }, { name: "Lignes droites", dose: "6 × 80 m relâchées" }] }),
  (l) => ({ label: "A", title: "Seuil long", format: `${s(5, l)} × 1 km · r 90"`, minutes: 32, items: [{ name: "Course", dose: `${s(5, l)} × 1 km au seuil` }] }),
  (l) => ({ label: "A", title: "VMA + ski", format: "2 blocs", minutes: 32, items: [{ name: "Course", dose: `${s(8, l)} × 400 m · r 75"`, cue: "Un peu plus vite que l'allure 5 km" }, { name: "SkiErg", dose: "4 × 250 m · r 1'" }] }),
  (l) => ({ label: "A", title: "Allure Hyrox", format: `${s(3, l)} × 2 km · r 2'`, minutes: 35, items: [{ name: "Course", dose: `${s(3, l)} × 2 km à allure course Hyrox`, cue: "L'allure que tu tiens entre les stations le jour J" }] }),
  (l) => ({ label: "A", title: "Zone 2 longue", format: "Décharge", minutes: 40, items: [{ name: "Footing zone 2", dose: `${s(35, l, 5)}'` }, { name: "Mobilité de foulée", dose: "Skipping, talons-fesses 2 × 20 m" }] }),
  (l) => ({ label: "A", title: "VMA courte", format: `${s(10, l)} × 400 m · r 60"`, minutes: 30, items: [{ name: "Course", dose: `${s(10, l)} × 400 m`, cue: "Récup courte : la régularité prime sur la vitesse" }] }),
  (l) => ({ label: "A", title: "Run + row compromis", format: `${s(4, l)} tours · r 1'30`, minutes: 36, items: [{ name: "Course", dose: "1 km allure Hyrox" }, { name: "Rameur", dose: "500 m allure course" }] }),
  (l) => ({ label: "A", title: "800 m à allure 10 km", format: `${s(6, l)} × 800 m · r 90"`, minutes: 34, items: [{ name: "Course", dose: `${s(6, l)} × 800 m` }] }),
  (l) => ({ label: "A", title: "Activation pré-test", format: "Affûtage", minutes: 25, items: [{ name: "Footing", dose: "15' facile" }, { name: "Course", dose: "3 × 1 km allure course · r 2'" }, { name: "Lignes droites", dose: "4 × 80 m" }] }),
];
