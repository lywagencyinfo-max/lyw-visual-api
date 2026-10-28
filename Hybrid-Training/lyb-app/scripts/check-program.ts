// Vérifie que le moteur génère des séances valides et variées pour toutes les combinaisons.
import { generateSession, generateWeek, PLAN_SLOTS } from "../src/lib/program/generator";
import type { Level, PlanId, Profile } from "../src/lib/program/types";

const plans: PlanId[] = ["start", "build", "pro", "race"];
const levels: Level[] = ["debutant", "intermediaire", "avance"];
let errors = 0;
const fail = (msg: string) => { errors++; console.error("✗", msg); };

for (const plan of plans) for (const level of levels) for (const sex of ["femme", "homme"] as const) for (const division of ["open", "pro"] as const) {
  const profile: Profile = { plan, level, sex, division, days: [0, 1, 3, 4, 5], startDate: "2026-11-02" };
  for (let week = 1; week <= 36; week++) {
    for (let slot = 0; slot < PLAN_SLOTS[plan].length; slot++) {
      const s = generateSession(profile, week, slot);
      const where = `${plan}/${level}/${sex}/${division} S${week} #${slot}`;
      if (s.warmup.length !== 4) fail(`${where}: échauffement RAMP incomplet`);
      if (!s.mobility.items.length) fail(`${where}: mobilité vide`);
      if (!s.main.length) fail(`${where}: aucun bloc principal`);
      const text = JSON.stringify(s);
      if (/undefined|NaN/.test(text)) fail(`${where}: valeur manquante → ${text.match(/.{40}(undefined|NaN).{20}/)?.[0]}`);
      if (s.minutes < 35 || s.minutes > 130) fail(`${where}: durée ${s.minutes}'`);
    }
  }
  // Variété : deux semaines consécutives ne doivent pas être identiques.
  for (let week = 1; week < 24; week++) {
    const a = generateWeek(profile, week).map((s) => s.main.map((b) => b.title).join("|")).join("/");
    const b = generateWeek(profile, week + 1).map((s) => s.main.map((b) => b.title).join("|")).join("/");
    if (a === b) fail(`${plan}/${level}: semaines ${week} et ${week + 1} identiques`);
  }
}

// Race Prep : répétition générale en S10, activation la veille en S12
const race: Profile = { plan: "race", level: "avance", sex: "homme", division: "pro", days: [0, 1, 3, 4, 5], startDate: "2026-11-02", raceDate: "2027-01-24" };
if (generateSession(race, 10, 4).kind !== "simulation") fail("Race Prep : pas de répétition générale en S10");
if (generateSession(race, 12, 4).kind !== "race-activation") fail("Race Prep : pas d'activation en S12");
if (generateWeek(race, 12).some((s) => s.kind === "simulation")) fail("Race Prep : simulation pendant la semaine de course");
// Course en cycle 2 : le cycle 1 est un cycle de préparation classique (simulation en S12, pas d'activation)
const race2: Profile = { ...race, raceDate: "2027-04-18" };
if (generateSession(race2, 12, 4).kind !== "simulation") fail("Race Prep cycle 1 : simulation attendue en S12");
if (generateSession(race2, 24, 4).kind !== "race-activation") fail("Race Prep cycle 2 : activation attendue en S24");

const sample: Profile = { plan: "build", level: "intermediaire", sex: "femme", division: "open", days: [0, 2, 5], startDate: "2026-11-02" };
for (const w of [1, 6, 12]) {
  console.log(`\n=== Build · intermédiaire · semaine ${w} ===`);
  for (const s of generateWeek(sample, w)) {
    console.log(`- ${s.title} (${s.minutes}', ${s.rpe}) → ${s.main.map((b) => `${b.title} [${b.format ?? ""}]`).join(" + ")} · ${s.mobility.title}`);
  }
}
console.log(errors ? `\n${errors} erreur(s)` : "\n✓ toutes les combinaisons sont valides");
process.exit(errors ? 1 : 0);
