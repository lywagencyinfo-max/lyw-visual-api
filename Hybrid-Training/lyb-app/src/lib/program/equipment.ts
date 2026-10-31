import type { Block, Item } from "./types";

/**
 * Matériel disponible et adaptation des séances.
 *
 * Les séances sont écrites pour une salle complète, puis chaque mouvement est
 * remplacé s'il demande du matériel que l'athlète n'a pas coché. Les règles sont
 * appliquées dans l'ordre ; une alternative ne propose jamais que du matériel
 * coché (ou rien), donc une règle suivante ne la remplace pas à nouveau.
 * La course se fait dehors ou sur tapis : elle n'est jamais remplacée.
 */
export type Equip =
  | "rower"
  | "ski"
  | "bike"
  | "sled"
  | "barbell"
  | "dumbbells"
  | "kettlebells"
  | "medball"
  | "sandbag"
  | "pullup"
  | "rings"
  | "box"
  | "rope"
  | "bands"
  | "roller";

export const EQUIPMENT_GROUPS: { title: string; items: { id: Equip; label: string; hint?: string }[] }[] = [
  {
    title: "Machines",
    items: [
      { id: "rower", label: "Rameur" },
      { id: "ski", label: "SkiErg" },
      { id: "bike", label: "Air bike / vélo", hint: "Assault, Echo, vélo d'appartement" },
      { id: "sled", label: "Sled (traîneau)" },
    ],
  },
  {
    title: "Charges",
    items: [
      { id: "barbell", label: "Barre + disques", hint: "avec rack pour les squats" },
      { id: "dumbbells", label: "Haltères" },
      { id: "kettlebells", label: "Kettlebells" },
      { id: "medball", label: "Wall ball / médecine-ball" },
      { id: "sandbag", label: "Sandbag" },
    ],
  },
  {
    title: "Gymnastique & accessoires",
    items: [
      { id: "pullup", label: "Barre de traction" },
      { id: "rings", label: "Anneaux / TRX" },
      { id: "box", label: "Box / plinth" },
      { id: "rope", label: "Corde à sauter" },
      { id: "bands", label: "Élastiques" },
      { id: "roller", label: "Rouleau de massage" },
    ],
  },
];

export const ALL_EQUIPMENT: Equip[] = EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.id));

export const EQUIPMENT_PRESETS: { id: string; label: string; text: string; items: Equip[] }[] = [
  { id: "box", label: "Box / salle Hyrox", text: "Tout le matériel", items: ALL_EQUIPMENT },
  {
    id: "gym",
    label: "Salle de musculation",
    text: "Machines cardio, barres, haltères",
    items: ["rower", "bike", "barbell", "dumbbells", "kettlebells", "medball", "pullup", "box", "bands", "roller"],
  },
  { id: "home", label: "Home gym", text: "Haltères, kettlebell, élastiques", items: ["dumbbells", "kettlebells", "pullup", "rope", "bands"] },
  { id: "bodyweight", label: "Poids du corps", text: "Aucun matériel", items: [] },
];

type DoseFn = (dose: string) => string;

interface Sub {
  /** Matériel requis par l'alternative (au moins un) ; vide = poids du corps */
  needs: Equip[];
  name: string;
  dose?: DoseFn;
  cue?: string;
}

interface Rule {
  match: RegExp;
  /** Le mouvement d'origine est conservé si l'un de ces matériels est coché */
  needs: Equip[];
  subs: Sub[];
  /** Condition supplémentaire sur la dose (ex. ne viser que les distances) */
  when?: (dose: string) => boolean;
}

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

/** Retire les charges de course (« · 102 kg ») qui n'ont plus de sens après remplacement. */
const dropLoad: DoseFn = (d) => d.split(" · ").filter((p) => !/kg/.test(p)).join(" · ");

/** Ergomètre → course : 1 000 m de rameur ≈ 800 m de course, 1 cal ≈ 12 m ; les durées restent identiques. */
const ergToRun: DoseFn = (d) =>
  dropLoad(d)
    .replace(/(\d+) m\b/g, (_, m) => `${round(Number(m) * 0.8, 50)} m`)
    .replace(/(\d+) cal\b/g, (_, c) => `${round(Number(c) * 12, 25)} m`);

/** Ergomètre → burpees (efforts courts) : 1 cal ≈ 0,6 burpee. */
const ergToBurpees: DoseFn = (d) =>
  dropLoad(d)
    .replace(/(\d+) cal\b/g, (_, c) => `${round(Number(c) * 0.6, 1)} reps`)
    .replace(/max calories/, "max reps");

/** Charge lourde → poids du corps : on double les répétitions, tempo lent. */
const bodyweightStrength: DoseFn = (d) =>
  d.replace(/(\d+) × (\d+)(?!\d)/, (_, sets, reps) => `${sets} × ${Math.max(8, Number(reps) * 2)}`) + (/×/.test(d) ? " · tempo 3-1-1" : "");

/** Distance de sled → répétitions de tirage. */
const metersToReps = (perRep: number): DoseFn => (d) => dropLoad(d).replace(/(\d+) m\b/, (_, m) => `${round(Number(m) / perRep, 1)} reps`);

const isDistance = (d: string) => /\d m\b/.test(d);

const ERG_BW: Sub = { needs: [], name: "Course", dose: ergToRun, cue: "Allure équivalente à l'effort prévu sur la machine." };
const LOADS: Equip[] = ["dumbbells", "kettlebells"];

const RULES: Rule[] = [
  // Machines (les formulations combinées d'abord)
  { match: /Air bike ou SkiErg/, needs: ["bike", "ski"], subs: [{ needs: ["rower"], name: "Rameur" }, { needs: [], name: "Sprint en côte (ou burpees)" }] },
  { match: /Air bike \/ rameur/, needs: ["bike", "rower"], subs: [{ needs: ["ski"], name: "SkiErg" }, { needs: [], name: "Burpees", dose: ergToBurpees }] },
  { match: /Vélo très facile/, needs: ["bike"], subs: [{ needs: ["rower"], name: "Rameur très facile" }, { needs: [], name: "Marche rapide" }] },
  // Station SkiErg / rameur d'une séance Hyrox : on court déjà entre les stations, donc burpees plutôt que course
  { match: /^SkiErg$/, when: isDistance, needs: ["ski"], subs: [{ needs: ["rower"], name: "Rameur" }, { needs: ["bike"], name: "Air bike", dose: dropLoad }, { needs: [], name: "Burpees", dose: metersToReps(20) }] },
  { match: /^Rameur$/, when: isDistance, needs: ["rower"], subs: [{ needs: ["ski"], name: "SkiErg" }, { needs: ["bike"], name: "Air bike", dose: dropLoad }, { needs: [], name: "Burpees", dose: metersToReps(20) }] },
  { match: /SkiErg/, needs: ["ski"], subs: [{ needs: ["rower"], name: "Rameur" }, { needs: ["bike"], name: "Air bike" }, ERG_BW] },
  { match: /Rameur|rameur/, needs: ["rower"], subs: [{ needs: ["ski"], name: "SkiErg" }, { needs: ["bike"], name: "Air bike" }, ERG_BW] },
  { match: /Air bike|Vélo \(Assault \/ Echo\)/, needs: ["bike"], subs: [{ needs: ["rower"], name: "Rameur" }, { needs: ["ski"], name: "SkiErg" }, ERG_BW] },

  // Stations Hyrox
  {
    match: /Sled push/i,
    needs: ["sled"],
    subs: [
      { needs: ["barbell", "dumbbells", "kettlebells", "sandbag"], name: "Fentes marchées lourdes", dose: dropLoad, cue: "Remplace la poussée de sled : charge lourde, pas courts." },
      { needs: [], name: "Sprint en côte (ou bear crawl)", dose: dropLoad, cue: "Remplace la poussée de sled : jambes qui poussent fort, buste penché." },
    ],
  },
  {
    match: /Sled pull/i,
    needs: ["sled"],
    subs: [
      { needs: ["rings"], name: "Ring rows", dose: metersToReps(2.5) },
      { needs: LOADS, name: "Rowing lourd (haltère ou kettlebell)", dose: metersToReps(2.5), cue: "Par bras." },
      { needs: ["bands"], name: "Tirage élastique", dose: metersToReps(2) },
      { needs: [], name: "Rowing inversé sous une table", dose: metersToReps(4) },
    ],
  },
  { match: /Farmers? (carry|hold)|Suitcase carry/i, needs: LOADS, subs: [{ needs: ["sandbag"], name: "Sandbag carry" }, { needs: [], name: "Port de bidons d'eau ou sacs chargés", dose: dropLoad }] },
  {
    match: /Sandbag lunges|Sandbag \/ (KB|kettlebell)[a-z -]*lunges/i,
    needs: ["sandbag"],
    subs: [
      { needs: ["kettlebells"], name: "Fentes marchées kettlebell", dose: dropLoad },
      { needs: ["dumbbells"], name: "Fentes marchées haltères", dose: dropLoad },
      { needs: ["barbell"], name: "Fentes marchées barre sur le dos", dose: dropLoad },
      { needs: [], name: "Fentes marchées sac à dos lesté", dose: dropLoad },
    ],
  },
  {
    match: /Wall balls?/i,
    needs: ["medball"],
    subs: [
      { needs: ["dumbbells"], name: "Thrusters haltère", dose: dropLoad },
      { needs: ["kettlebells"], name: "Thrusters kettlebell", dose: dropLoad },
      { needs: ["sandbag"], name: "Thrusters sandbag", dose: dropLoad },
      { needs: [], name: "Squats sautés", dose: dropLoad },
    ],
  },

  // Barre olympique
  { match: /Box squat barre/, needs: ["barbell"], subs: [{ needs: LOADS, name: "Goblet box squat" }, { needs: [], name: "Squat sur chaise", dose: bodyweightStrength }] },
  { match: /Back squat|Front squat/, needs: ["barbell"], subs: [{ needs: LOADS, name: "Goblet squat lourd" }, { needs: ["sandbag"], name: "Squat sandbag" }, { needs: [], name: "Bulgarian split squat", dose: bodyweightStrength }] },
  {
    match: /Trap bar deadlift|Romanian deadlift|Deadlift(?! kettlebell| haltères)/,
    needs: ["barbell"],
    subs: [{ needs: LOADS, name: "Soulevé de terre roumain haltères / kettlebell" }, { needs: ["sandbag"], name: "Soulevé de terre sandbag" }, { needs: [], name: "RDL unilatéral", dose: bodyweightStrength }],
  },
  { match: /Bench press/, needs: ["barbell"], subs: [{ needs: ["dumbbells"], name: "Développé couché haltères" }, { needs: [], name: "Pompes", dose: bodyweightStrength }] },
  { match: /Strict press|Push press(?! haltères)/, needs: ["barbell"], subs: [{ needs: ["dumbbells"], name: "Développé militaire haltères" }, { needs: ["kettlebells"], name: "Développé kettlebell" }, { needs: [], name: "Pike push-ups", dose: bodyweightStrength }] },
  { match: /Bent-over row/, needs: ["barbell"], subs: [{ needs: LOADS, name: "Rowing unilatéral haltère / kettlebell" }, { needs: ["rings"], name: "Ring rows" }, { needs: [], name: "Rowing inversé sous une table", dose: bodyweightStrength }] },
  { match: /Thrusters \d/, needs: ["barbell"], subs: [{ needs: ["dumbbells"], name: "Thrusters haltères" }, { needs: ["kettlebells"], name: "Thrusters kettlebell" }, { needs: [], name: "Squats sautés" }] },
  { match: /Power cleans \d/, needs: ["barbell"], subs: [{ needs: ["dumbbells"], name: "Hang power cleans haltères" }, { needs: ["kettlebells"], name: "Kettlebell cleans" }, { needs: [], name: "Burpees" }] },
  { match: /Landmine press/, needs: ["barbell"], subs: [{ needs: LOADS, name: "Développé unilatéral haltère / kettlebell" }, { needs: [], name: "Pike push-ups" }] },
  { match: /Hip thrust(?! au sol| unilatéral| explosif)/, needs: ["barbell", "dumbbells", "kettlebells", "sandbag"], subs: [{ needs: [], name: "Hip thrust unilatéral" }] },

  // Haltères / kettlebells
  { match: /Développé (couché )?haltères( assis| incliné)?/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Développé kettlebell" }, { needs: [], name: "Pompes déclinées", dose: bodyweightStrength }] },
  { match: /Push press haltères/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Développé poussé kettlebell" }, { needs: [], name: "Pike push-ups", dose: bodyweightStrength }] },
  { match: /Thrusters haltères/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Thrusters kettlebell" }, { needs: [], name: "Squats sautés" }] },
  { match: /Hang power cleans haltères/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Kettlebell cleans" }, { needs: [], name: "Burpees" }] },
  { match: /Rowing haltère unilatéral|Rowing poitrine appuyée/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Rowing kettlebell" }, { needs: ["rings"], name: "Ring rows" }, { needs: [], name: "Rowing inversé sous une table", dose: bodyweightStrength }] },
  { match: /RDL haltères/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "RDL kettlebell" }, { needs: [], name: "RDL unilatéral", dose: bodyweightStrength }] },
  { match: /Dumbbell snatch[^,]*?kg|Dumbbell snatch/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Kettlebell snatch" }, { needs: [], name: "Burpees" }] },
  { match: /Devil press \(haltères\)|Devil press/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Kettlebell swing + burpee" }, { needs: [], name: "Burpees" }] },
  { match: /Deadlift kettlebell( lourd)?/, needs: ["kettlebells"], subs: [{ needs: ["dumbbells"], name: "Deadlift haltères" }, { needs: [], name: "RDL unilatéral", dose: bodyweightStrength }] },
  { match: /Kettlebell swings?/, needs: ["kettlebells"], subs: [{ needs: ["dumbbells"], name: "Swings haltère" }, { needs: [], name: "Broad jumps" }] },
  { match: /Kettlebell goblet lunges/, needs: ["kettlebells"], subs: [{ needs: ["dumbbells"], name: "Fentes goblet haltère" }, { needs: [], name: "Fentes marchées" }] },
  { match: /Goblet (box )?squats?( tempo| léger| lourd)?/, needs: LOADS, subs: [{ needs: ["sandbag"], name: "Squat sandbag" }, { needs: [], name: "Air squats tempo 3-1-1" }] },
  { match: /Turkish get-up léger|Turkish get-up/, needs: LOADS, subs: [{ needs: [], name: "Get-up sans charge" }] },
  { match: /Jefferson curl très léger/, needs: LOADS, subs: [{ needs: [], name: "Enroulé vertébral debout" }] },
  { match: /Curl marteau/, needs: ["dumbbells"], subs: [{ needs: ["kettlebells"], name: "Curl kettlebell" }, { needs: ["bands"], name: "Curl élastique" }, { needs: [], name: "Rowing inversé prise supination" }] },

  // Barre de traction / anneaux
  { match: /Toes-to-bar|Hanging knee raises/, needs: ["pullup"], subs: [{ needs: [], name: "V-ups" }] },
  { match: /Scapular pull-ups/, needs: ["pullup"], subs: [{ needs: [], name: "Pompes scapulaires" }] },
  { match: /Dead hang actif/, needs: ["pullup"], subs: [{ needs: [], name: "Superman hold" }] },
  { match: /Suspension passive à la barre/, needs: ["pullup"], subs: [{ needs: [], name: "Étirement dorsaux au sol (prière)" }] },
  { match: /Strict pull-ups \/ ring rows/, needs: ["pullup", "rings"], subs: [{ needs: [], name: "Rowing inversé sous une table" }] },
  {
    match: /Weighted pull-ups|Chest-to-bar pull-ups|Jumping pull-ups|Strict pull-ups|Tractions élastique|Pull-ups/,
    needs: ["pullup"],
    subs: [{ needs: ["rings"], name: "Ring rows" }, { needs: [], name: "Rowing inversé sous une table" }],
  },
  { match: /Ring rows/, needs: ["rings", "pullup"], subs: [{ needs: LOADS, name: "Rowing unilatéral haltère / kettlebell" }, { needs: [], name: "Rowing inversé sous une table" }] },

  // Accessoires
  { match: /Box jump overs|Box jumps/, needs: ["box"], subs: [{ needs: [], name: "Tuck jumps" }] },
  { match: /Double-unders \(ou 3× sauts simples\)/, needs: ["rope"], subs: [{ needs: [], name: "Sauts pieds joints (3 par double-under)" }] },
  { match: /Corde à sauter/, needs: ["rope"], subs: [{ needs: [], name: "Jumping jacks" }] },
  { match: /Band pull-apart/, needs: ["bands"], subs: [{ needs: [], name: "Y-T-W allongé au sol" }] },
  { match: /Face pull( élastique)?/, needs: ["bands"], subs: [{ needs: [], name: "Y-T-W allongé au sol" }] },
  { match: /Monster walk élastique/, needs: ["bands"], subs: [{ needs: [], name: "Pas chassés en demi-squat" }] },
  { match: /Clamshell élastique/, needs: ["bands"], subs: [{ needs: [], name: "Clamshell" }] },
  { match: /Rotation externe élastique/, needs: ["bands"], subs: [{ needs: [], name: "Rotation externe allongé sur le côté" }] },
  { match: /Good morning élastique/, needs: ["bands"], subs: [{ needs: [], name: "Good morning mains derrière la tête" }] },
  { match: /Ischios à l'élastique/, needs: ["bands"], subs: [{ needs: [], name: "Ischios avec une serviette" }] },
  { match: /Pallof press/, needs: ["bands"], subs: [{ needs: [], name: "Gainage latéral avec rotation" }] },
  { match: /Rouleau thoracique \(extensions\)/, needs: ["roller"], subs: [{ needs: [], name: "Extensions thoraciques sur une chaise" }] },
  { match: /Rouleau [a-zA-Z ,]+/, needs: ["roller"], subs: [{ needs: [], name: "Auto-massage avec une balle ou les mains" }] },
];

export interface Adaptation {
  item: Item;
  changed: boolean;
}

function adaptText(text: string, have: Set<Equip>, dose = ""): { text: string; sub?: Sub; original?: string } {
  let out = text;
  let first: { sub: Sub; original: string } | undefined;
  for (const rule of RULES) {
    const m = out.match(rule.match);
    if (!m || rule.needs.some((e) => have.has(e)) || (rule.when && !rule.when(dose))) continue;
    const sub = rule.subs.find((s) => s.needs.length === 0 || s.needs.some((e) => have.has(e)));
    if (!sub) continue;
    out = out.replace(rule.match, sub.name);
    if (!first) first = { sub, original: m[0] };
  }
  return { text: out, ...first };
}

export function adaptItem(item: Item, have: Set<Equip>): Adaptation {
  const r = adaptText(item.name, have, item.dose);
  if (!r.sub) return { item, changed: false };
  return {
    changed: true,
    item: {
      name: r.text,
      dose: r.sub.dose ? r.sub.dose(item.dose) : item.dose,
      cue: `Remplace « ${r.original} » (matériel non coché).${r.sub.cue ? " " + r.sub.cue : ""}`,
    },
  };
}

/** Adapte un bloc au matériel ; renvoie le bloc et le nombre de mouvements remplacés. */
export function adaptBlock(block: Block, have: Set<Equip>): { block: Block; changes: number } {
  let changes = 0;
  const items = block.items.map((it) => {
    const a = adaptItem(it, have);
    if (a.changed) changes++;
    return a.item;
  });
  return { block: { ...block, title: adaptText(block.title, have).text, items }, changes };
}

export function adaptLabel(text: string, have: Set<Equip>): string {
  return adaptText(text, have).text;
}

/** Pour les tests : vrai si le texte demande encore du matériel absent. */
export function needsMissing(text: string, have: Set<Equip>): boolean {
  return RULES.some((r) => !r.when && r.match.test(text) && !r.needs.some((e) => have.has(e)) && r.subs.some((s) => s.needs.length === 0 || s.needs.some((e) => have.has(e))));
}
