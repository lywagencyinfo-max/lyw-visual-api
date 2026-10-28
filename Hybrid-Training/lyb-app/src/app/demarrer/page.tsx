"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { BillingToggle } from "@/components/PricingCards";
import { CYCLE_LENGTH } from "@/lib/program/cycle";
import { Logo } from "@/components/ui";
import { PLANS, TRIAL_DAYS, priceFor } from "@/lib/plans";
import { DAY_LABELS, DAY_NAMES, DEFAULT_DAYS, daysUntil, mondayOf, parseISODate, raceStartDate, toISODate } from "@/lib/program/schedule";
import type { Billing, Division, Level, PlanId, Sex } from "@/lib/program/types";
import { saveProfile } from "@/lib/store";

const LEVELS: { id: Level; label: string; text: string }[] = [
  { id: "debutant", label: "Débutant", text: "Moins d'un an de pratique, ou reprise. Variantes simplifiées." },
  { id: "intermediaire", label: "Intermédiaire", text: "1-3 ans de cross-training / course régulière." },
  { id: "avance", label: "Avancé", text: "Hyrox déjà couru, pull-ups et barre maîtrisés." },
];

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("rounded-xl border p-4 text-left transition", active ? "border-mint bg-mint/10" : "border-line bg-bg-soft hover:border-ink-dim")}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPlan = (PLANS.find((p) => p.id === params.get("plan"))?.id ?? "build") as PlanId;

  const [plan, setPlanState] = useState<PlanId>(initialPlan);
  const [level, setLevel] = useState<Level>("intermediaire");
  const [sex, setSex] = useState<Sex>("femme");
  const [division, setDivision] = useState<Division>("open");
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS[initialPlan]);
  const [start, setStart] = useState<"this" | "next">("this");
  const [billing, setBilling] = useState<Billing>(params.get("billing") === "yearly" ? "yearly" : "monthly");
  const [raceDate, setRaceDate] = useState("");

  const current = PLANS.find((p) => p.id === plan)!;
  const perWeek = current.perWeek;
  const isRace = plan === "race";
  const raceIn = raceDate ? daysUntil(raceDate, new Date()) : null;
  const raceValid = !isRace || (raceIn !== null && raceIn >= 7);

  const setPlan = (id: PlanId) => {
    setPlanState(id);
    setDays(DEFAULT_DAYS[id]);
  };

  const toggleDay = (d: number) => {
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= perWeek) return [...prev.slice(1), d].sort((a, b) => a - b);
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const consecutive = days.some((d) => days.includes(d + 1));

  const submit = () => {
    const monday = mondayOf(new Date());
    if (start === "next") monday.setDate(monday.getDate() + 7);
    const startDate = isRace ? raceStartDate(raceDate, new Date()) : toISODate(monday);
    saveProfile({ plan, level, sex, division, days, startDate, billing: current.yearly ? billing : "monthly", ...(isRace && { raceDate }) });
    router.push("/app");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Logo />
      <h1 className="mt-10 text-3xl font-black">Crée ton programme</h1>
      <p className="mt-2 text-ink-soft">2 minutes pour adapter les séances à ton niveau et ton planning.</p>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">1. Ta formule</h2>
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLANS.map((p) => (
            <Choice key={p.id} active={plan === p.id} onClick={() => setPlan(p.id)}>
              <p className="font-black">{p.name}</p>
              <p className="text-sm text-ink-soft">{p.perWeek} séances / sem.</p>
              <p className="mt-1 text-sm font-semibold text-mint">{priceFor(p, billing).main} {priceFor(p, billing).period}</p>
            </Choice>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-bold">2. Ton niveau</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <Choice key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>
              <p className="font-bold">{l.label}</p>
              <p className="text-sm text-ink-soft">{l.text}</p>
            </Choice>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-bold">3. Charges de référence Hyrox</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Choice active={sex === "femme"} onClick={() => setSex("femme")}>Femme</Choice>
          <Choice active={sex === "homme"} onClick={() => setSex("homme")}>Homme</Choice>
          <Choice active={division === "open"} onClick={() => setDivision("open")}>Division Open</Choice>
          <Choice active={division === "pro"} onClick={() => setDivision("pro")}>Division Pro</Choice>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 font-bold">4. Tes jours d&apos;entraînement</h2>
        <p className="mb-3 text-sm text-ink-dim">Choisis {perWeek} jours ({days.length}/{perWeek}).</p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((label, d) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(d)}
              className={clsx("rounded-xl border py-3 text-sm font-bold", days.includes(d) ? "border-mint bg-mint text-bg" : "border-line bg-bg-soft")}
            >
              {label}
            </button>
          ))}
        </div>
        {consecutive && perWeek < 4 && (
          <p className="mt-2 text-sm text-jaune">Conseil : laisse au moins un jour de repos entre deux séances quand c&apos;est possible.</p>
        )}
      </section>

      <section className="mt-8">
        {isRace ? (
          <>
            <h2 className="mb-1 font-bold">5. Date de ta course</h2>
            <p className="mb-3 text-sm text-ink-dim">
              Le programme est calé pour que la course tombe en semaine 12 : répétition générale 2 semaines avant, affûtage la dernière semaine.
            </p>
            <input
              type="date"
              value={raceDate}
              min={toISODate(new Date())}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg-soft p-4 text-ink [color-scheme:dark]"
            />
            {raceIn !== null && raceIn < 7 && <p className="mt-2 text-sm text-rose-soft">Ta course doit être dans au moins 7 jours.</p>}
            {raceIn !== null && raceIn >= 7 && (
              <p className="mt-2 text-sm text-ink-soft">
                Course dans {raceIn} jours ({Math.ceil(raceIn / 7)} semaines).
                {raceIn < 77 && ` Préparation courte : tu démarres directement en semaine ${CYCLE_LENGTH - Math.round((mondayOf(parseISODate(raceDate)).getTime() - mondayOf(new Date()).getTime()) / (7 * 86_400_000))} du cycle.`}
                {" "}Idéalement, ta dernière séance de la semaine tombe la veille ({DAY_NAMES[(parseISODate(raceDate).getDay() + 5) % 7]}).
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-3 font-bold">5. Démarrage</h2>
            <div className="grid grid-cols-2 gap-3">
              <Choice active={start === "this"} onClick={() => setStart("this")}>Cette semaine</Choice>
              <Choice active={start === "next"} onClick={() => setStart("next")}>Lundi prochain</Choice>
            </div>
          </>
        )}
      </section>

      <button
        type="button"
        disabled={days.length !== perWeek || !raceValid}
        onClick={submit}
        className="mt-10 w-full rounded-xl bg-mint px-5 py-4 text-lg font-black text-bg disabled:opacity-40"
      >
        Commencer mes {TRIAL_DAYS} jours gratuits
      </button>
      <p className="mt-3 text-center text-sm text-ink-soft">
        Puis {priceFor(current, current.yearly ? billing : "monthly").main} {priceFor(current, current.yearly ? billing : "monthly").period}{" · "}annulable à tout moment pendant l&apos;essai.
      </p>
      <p className="mt-1 text-center text-xs text-ink-dim">Démo : le paiement n&apos;est pas encore branché, aucun prélèvement n&apos;est effectué.</p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
