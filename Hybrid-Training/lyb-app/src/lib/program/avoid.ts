import type { Equip } from "./equipment";
import type { Block, Item } from "./types";

/**
 * Mouvements à éviter (gêne, blessure, préférence).
 *
 * Appliqué après l'adaptation au matériel : chaque mouvement d'une famille
 * cochée est remplacé par la première alternative dont le matériel est coché
 * et qui n'appartient à aucune autre famille à éviter.
 */
export type AvoidId = "burpees" | "lunges" | "jumps" | "running" | "overhead" | "pull" | "push" | "hinge";

export const AVOID_OPTIONS: { id: AvoidId; label: string; hint: string }[] = [
  { id: "burpees", label: "Burpees & mountain climbers", hint: "burpees, burpee broad jumps" },
  { id: "lunges", label: "Fentes", hint: "fentes, split squat, step-ups, étirements en fente" },
  { id: "jumps", label: "Sauts & impacts", hint: "box jumps, corde à sauter, squats sautés" },
  { id: "running", label: "Course à pied", hint: "remplacée par une machine ou de la marche" },
  { id: "overhead", label: "Charges au-dessus de la tête", hint: "press, thrusters, wall balls, snatch" },
  { id: "pull", label: "Tractions & suspension", hint: "pull-ups, toes-to-bar, suspension à la barre" },
  { id: "push", label: "Pompes & dips", hint: "appui sur les mains" },
  { id: "hinge", label: "Soulevé de terre & swings", hint: "deadlift, RDL, kettlebell swings" },
];

type DoseFn = (dose: string) => string;

interface Sub {
  /** Matériel requis (au moins un) ; vide = poids du corps */
  needs: Equip[];
  name: string;
  dose?: DoseFn;
}

interface Rule {
  match: RegExp;
  subs: Sub[];
  /** Remplace tout le nom de l'exercice (en gardant un préfixe « Min 2 · ») */
  whole?: boolean;
}

const LOADS: Equip[] = ["dumbbells", "kettlebells"];
const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
const bw = (name: string, dose?: DoseFn): Sub => ({ needs: [], name, dose });

/** Distance de fente → répétitions de squat. */
const lungeDose: DoseFn = (d) =>
  d
    .replace(/(\d+) m\b/, (_, m) => `${round(Number(m) / 2.5, 1)} reps`)
    .replace(/(\d+) pas\b/, "$1 reps")
    .replace(/ \/ jambe/, "");

/** Distance de burpee broad jumps → répétitions. */
const bbjDose: DoseFn = (d) => d.replace(/(\d+) m\b/, (_, m) => `${round(Number(m) / 2, 1)} reps`);

const runToRower: DoseFn = (d) => d.replace(/(\d+) m\b/g, (_, m) => `${round(Number(m) * 1.25, 50)} m`);
const runToBike: DoseFn = (d) => d.replace(/(\d+) m\b/g, (_, m) => `${round(Number(m) / 15, 1)} cal`);

const SQUAT_SUBS: Sub[] = [{ needs: LOADS, name: "Goblet squat" }, { needs: ["sandbag"], name: "Squat sandbag" }, bw("Air squats")];
const SWING_SUBS: Sub[] = [{ needs: ["kettlebells"], name: "Kettlebell swings" }, { needs: ["dumbbells"], name: "Swings haltère" }];

const FAMILIES: Record<AvoidId, Rule[]> = {
  burpees: [
    { match: /Sprint en côte \(ou burpees\)/, subs: [bw("Sprint en côte")] },
    { match: /Kettlebell swing \+ burpee/, subs: [{ needs: ["kettlebells"], name: "Kettlebell swings" }, ...SQUAT_SUBS] },
    { match: /Max burpees broad jumps|Burpees? broad jumps|Burpees?( over the bar)?|burpees/, subs: [...SWING_SUBS, ...SQUAT_SUBS.map((s) => ({ ...s, dose: bbjDose }))] },
    { match: /Mountain climbers/, subs: [bw("Hollow rocks")] },
  ],
  lunges: [
    { match: /World's greatest stretch( lent)?/, subs: [bw("Inchworm + rotation thoracique")] },
    { match: /Couch stretch|Fente basse \(psoas\)/, subs: [bw("Étirement quadriceps allongé sur le côté")] },
    { match: /Fente basse \+ rotation thoracique|Fente \+ rotation/, subs: [bw("Rotation thoracique quadrupédie")] },
    { match: /Cossack squat/, subs: [bw("Squat sumo tenu")] },
    { match: /Walking spiderman/, subs: [bw("Inchworm")] },
    { match: /Finisher — fentes/, subs: [bw("Finisher — jambes")] },
    {
      match: /Sandbag \/ (KB|kettlebell) [a-z -]*lunges|Kettlebell goblet lunges|Walking lunges( lestées)?|Jumping lunges|Sandbag lunges|Fentes [^·]*|Bulgarian split squat|Step-ups[^·]*/,
      subs: [
        { needs: LOADS, name: "Goblet squat", dose: lungeDose },
        { needs: ["sandbag"], name: "Squat sandbag", dose: lungeDose },
        { needs: ["barbell"], name: "Back squat", dose: lungeDose },
        bw("Air squats", lungeDose),
      ],
    },
  ],
  jumps: [
    { match: /Box jump overs|Box jumps/, subs: [{ needs: ["box"], name: "Step-ups sur box" }, ...SQUAT_SUBS] },
    { match: /Burpees? broad jumps/, subs: [...SWING_SUBS, ...SQUAT_SUBS.map((s) => ({ ...s, dose: bbjDose }))] },
    { match: /Tuck jumps|Squats sautés|Broad jumps|Jumping lunges/, subs: SQUAT_SUBS },
    { match: /Pogo jumps/, subs: [bw("Montées sur pointes")] },
    { match: /Jumping pull-ups/, subs: [{ needs: ["rings"], name: "Ring rows" }, bw("Rowing inversé sous une table")] },
    {
      match: /Jumping jacks|Corde à sauter|Double-unders \(ou 3× sauts simples\)|Sauts pieds joints \(3 par double-under\)/,
      subs: [bw("Montées de genoux marchées rapides")],
    },
  ],
  running: [
    {
      match:
        /^((?:Min \d+|Impair|Pair) · )?(Course( zone 2| facile| allure course)?|Footing( zone 2| très progressif)?|Lignes droites( progressives)?|Skipping A|Talons-fesses \/ montées de genoux|Sprint en côte( \([^)]*\))?|\d+ × \d+ m à allure course)$/,
      whole: true,
      subs: [
        { needs: ["rower"], name: "Rameur", dose: runToRower },
        { needs: ["ski"], name: "SkiErg", dose: runToRower },
        { needs: ["bike"], name: "Air bike", dose: runToBike },
        bw("Marche rapide en côte (ou montée d'escaliers)"),
      ],
    },
  ],
  overhead: [
    {
      match: /Strict press|Push press( haltères)?|Développé (militaire haltères|haltères assis|poussé kettlebell|unilatéral haltère \/ kettlebell)|Landmine press|Handstand push-ups \(ou pike push-ups\)|Pike push-ups/,
      subs: [{ needs: ["dumbbells"], name: "Développé couché haltères" }, { needs: ["kettlebells"], name: "Floor press kettlebell" }, bw("Pompes")],
    },
    { match: /Thrusters( \d+\/\d+ kg| haltères?| kettlebell| sandbag)?|Wall balls?( \(technique parfaite\))?|wall balls/, subs: SQUAT_SUBS },
    { match: /(Dumbbell|Kettlebell) snatch( [\d,]+\/[\d,]+ kg)?/, subs: [...SWING_SUBS, bw("Glute bridge")] },
    { match: /Turkish get-up( léger)?|Get-up sans charge/, subs: [bw("Dead bug")] },
    { match: /PVC pass-through/, subs: [{ needs: ["bands"], name: "Band pull-apart" }, bw("Rotation thoracique quadrupédie")] },
  ],
  pull: [
    {
      match: /Strict pull-ups \/ ring rows|Weighted pull-ups|Chest-to-bar pull-ups|Jumping pull-ups|Strict pull-ups|Tractions élastique|Pull-ups/,
      subs: [
        { needs: ["rings"], name: "Ring rows" },
        { needs: LOADS, name: "Rowing unilatéral haltère / kettlebell" },
        { needs: ["bands"], name: "Tirage élastique" },
        bw("Rowing inversé sous une table"),
      ],
    },
    { match: /Toes-to-bar|Hanging knee raises|Knee raises/, subs: [bw("V-ups")] },
    { match: /Scapular pull-ups/, subs: [bw("Pompes scapulaires")] },
    { match: /Dead hang actif|Suspension passive à la barre/, subs: [bw("Étirement dorsaux au sol (prière)")] },
  ],
  push: [
    { match: /Inchworm \+ pompe/, subs: [bw("Inchworm")] },
    {
      match: /Hand release push-ups|Push-ups|Pompes( déclinées| scapulaires| sur genoux| inclinées)?|Dips \(ou pompes déclinées\)/,
      subs: [
        { needs: ["dumbbells"], name: "Développé couché haltères" },
        { needs: ["kettlebells"], name: "Floor press kettlebell" },
        { needs: ["bands"], name: "Développé élastique" },
        bw("Planche"),
      ],
    },
  ],
  hinge: [
    { match: /Kettlebell swings?|Swings haltère/, subs: SQUAT_SUBS },
    { match: /Jefferson curl très léger|Enroulé vertébral debout/, subs: [bw("Chat-vache")] },
    {
      match: /Trap bar deadlift|Romanian deadlift|Deadlift( haltères| kettlebell( lourd)?)?|RDL( haltères| kettlebell| unilatéral)?|Soulevé de terre( roumain haltères \/ kettlebell| sandbag)?|Good morning( élastique| mains derrière la tête)?/,
      subs: [{ needs: ["barbell", "sandbag", ...LOADS], name: "Hip thrust lesté" }, bw("Glute bridge")],
    },
  ],
};

/** Alternative de dernier recours, hors de toutes les familles. */
const FALLBACK: Sub = bw("Hollow hold");

function hitsAvoided(text: string, avoid: AvoidId[]): boolean {
  return avoid.some((id) => FAMILIES[id].some((r) => r.match.test(text)));
}

const PREFIX = /^((?:Min \d+|Impair|Pair) · )/;

function apply(text: string, dose: string, have: Set<Equip>, avoid: AvoidId[]) {
  let name = text;
  let d = dose;
  let changed = false;
  // Plusieurs passes : une alternative peut toucher une autre famille cochée
  for (let pass = 0; pass < 3 && hitsAvoided(name, avoid); pass++) {
    for (const id of avoid) {
      for (const rule of FAMILIES[id]) {
        if (!rule.match.test(name)) continue;
        const ok = (s: Sub) => (s.needs.length === 0 || s.needs.some((e) => have.has(e))) && !hitsAvoided(s.name, avoid);
        const sub = rule.subs.find(ok) ?? FALLBACK;
        name = rule.whole ? (name.match(PREFIX)?.[1] ?? "") + sub.name : name.replace(rule.match, sub.name);
        if (sub.dose) d = sub.dose(d);
        changed = true;
      }
    }
  }
  return { name, dose: d, changed };
}

export function avoidItem(item: Item, have: Set<Equip>, avoid: AvoidId[]): { item: Item; changed: boolean } {
  if (!avoid.length) return { item, changed: false };
  const r = apply(item.name, item.dose, have, avoid);
  if (!r.changed) return { item, changed: false };
  return { changed: true, item: { name: r.name, dose: r.dose, cue: `Remplace « ${item.name} » (mouvement à éviter).` } };
}

export function avoidBlock(block: Block, have: Set<Equip>, avoid: AvoidId[]): { block: Block; changes: number } {
  if (!avoid.length) return { block, changes: 0 };
  let changes = 0;
  const items = block.items.map((it) => {
    const r = avoidItem(it, have, avoid);
    if (r.changed) changes++;
    return r.item;
  });
  return { block: { ...block, title: avoidLabel(block.title, have, avoid), items }, changes };
}

export function avoidLabel(text: string, have: Set<Equip>, avoid: AvoidId[]): string {
  return avoid.length ? apply(text, "", have, avoid).name : text;
}

/** Pour les tests : vrai si le texte contient encore un mouvement à éviter. */
export function containsAvoided(text: string, avoid: AvoidId[]): boolean {
  return hitsAvoided(text, avoid);
}
