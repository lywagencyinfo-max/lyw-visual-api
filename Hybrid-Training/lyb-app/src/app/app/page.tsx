"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Flag, Settings, Trophy } from "lucide-react";
import { BlockCard, SessionView } from "@/components/SessionView";
import { IntensityDots, Logo, Pill } from "@/components/ui";
import { CYCLE_LENGTH, PHASE_LABEL, weekMeta } from "@/lib/program/cycle";
import { generateSession, generateWeek } from "@/lib/program/generator";
import { recoveryDay } from "@/lib/program/mobility";
import { DAY_LABELS, DAY_NAMES, dateOfSlot, dayPlan, daysUntil, parseISODate, toISODate } from "@/lib/program/schedule";
import { planById } from "@/lib/plans";
import { useAthlete } from "@/lib/store";

const fmtDay = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const RACE_DAY_PLAN = [
  { name: "Réveil", dose: "3 h avant le départ", cue: "Petit-déjeuner testé à l'entraînement : glucides simples, peu de fibres et de graisses" },
  { name: "Hydratation", dose: "500 ml dans les 2 h", cue: "Puis quelques gorgées jusqu'au départ" },
  { name: "Échauffement", dose: "20'", cue: "Le même que pour ta répétition générale : footing, mobilité, 2 × 200 m allure course, quelques wall balls" },
  { name: "1er km", dose: "5-10 s plus lent que ton allure cible", cue: "L'adrénaline te fera partir trop vite : retiens-toi" },
  { name: "Stations", dose: "Régularité > vitesse", cue: "Casse les wall balls tôt (ex. séries de 15-20), respire dans les transitions" },
  { name: "Roxzone", dose: "Transitions en courant", cue: "Le temps perdu entre les stations est le plus facile à gagner" },
  { name: "Après la course", dose: "Mobilité full body 15' + repas complet", cue: "Note ton temps et tes splits dans l'app" },
];

export default function Dashboard() {
  const { ready, profile, done, toggleDone, results, saveResult } = useAthlete();
  const today = useMemo(() => new Date(), []);
  const todayPlan = profile ? dayPlan(profile, today) : null;
  const currentWeek = Math.max(1, todayPlan?.week ?? 1);

  const [week, setWeek] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  if (!ready) return <main className="p-8 text-ink-dim">Chargement…</main>;

  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-10 text-3xl font-black">Pas encore de programme</h1>
        <p className="mt-2 text-ink-soft">Choisis ta formule et ton niveau pour générer tes séances.</p>
        <Link href="/demarrer" className="mt-8 inline-block rounded-xl bg-mint px-5 py-3 font-bold text-bg">Créer mon programme</Link>
      </main>
    );
  }

  const shownWeek = week ?? currentWeek;
  const shownDay = day ?? (shownWeek === todayPlan?.week ? todayPlan.weekday : [...profile.days].sort()[0]);
  const meta = weekMeta(shownWeek);
  const plan = planById(profile.plan);
  const sessions = generateWeek(profile, shownWeek);
  const monday = parseISODate(profile.startDate);
  monday.setDate(monday.getDate() + (shownWeek - 1) * 7);
  const selectedDate = new Date(monday);
  selectedDate.setDate(monday.getDate() + shownDay);
  const sel = dayPlan(profile, selectedDate);
  const session = sel.slot !== null ? generateSession(profile, shownWeek, sel.slot) : null;

  // Prochaine séance après un jour de repos
  const next = (() => {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      const p = dayPlan(profile, d);
      if (p.slot !== null) return { date: d, session: generateSession(profile, p.week, p.slot) };
    }
    return null;
  })();

  const cycleStart = (meta.cycle - 1) * CYCLE_LENGTH + 1;
  let doneInCycle = 0;
  for (let w = cycleStart; w < cycleStart + CYCLE_LENGTH; w++) {
    for (let s = 0; s < plan.perWeek; s++) if (done[`w${w}-s${s}`]) doneInCycle++;
  }
  const notStarted = (todayPlan?.week ?? 1) < 1;
  const raceIn = profile.raceDate ? daysUntil(profile.raceDate, today) : null;
  const isRaceDay = !!profile.raceDate && toISODate(selectedDate) === profile.raceDate;
  const lastResult = Object.entries(results).sort(([a], [b]) => Number(b.slice(1).split("-")[0]) - Number(a.slice(1).split("-")[0]))[0];

  const goWeek = (w: number) => {
    setWeek(Math.max(1, w));
    setDay(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <header className="no-print flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {raceIn !== null && raceIn >= 0 && <Pill tone="rose">{raceIn === 0 ? "Jour J" : `J-${raceIn}`}</Pill>}
          <Pill tone="mint">{plan.name} · {plan.perWeek}/sem.</Pill>
          <Link href={`/demarrer?plan=${profile.plan}`} className="rounded-lg p-2 text-ink-soft hover:bg-card" aria-label="Modifier mon programme">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {raceIn !== null && raceIn < 0 && (
        <p className="no-print mt-6 rounded-xl border border-rose/50 bg-rose/10 p-3 text-sm text-rose-soft">
          Ta course est passée — bravo ! Le programme continue sur un nouveau cycle.{" "}
          <Link href="/demarrer?plan=race" className="font-bold underline">Indique ta prochaine course</Link> pour recaler la préparation.
        </p>
      )}
      {lastResult && (
        <p className="no-print mt-6 flex items-center gap-2 text-sm text-ink-soft">
          <Trophy className="h-4 w-4 text-jaune" /> Dernière simulation (semaine {lastResult[0].slice(1).split("-")[0]}) :{" "}
          <span className="font-bold text-ink">{lastResult[1]}</span>
        </p>
      )}
      {notStarted && (
        <p className="no-print mt-6 rounded-xl border border-jaune/40 bg-jaune/10 p-3 text-sm text-jaune">
          Ton programme démarre le {fmtDay(parseISODate(profile.startDate))}. Voici un aperçu de ta première semaine.
        </p>
      )}

      <section className="no-print mt-6 rounded-2xl border border-line bg-bg-soft p-5">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => goWeek(shownWeek - 1)} disabled={shownWeek <= 1} className="rounded-lg p-2 hover:bg-card disabled:opacity-30" aria-label="Semaine précédente">
            <ChevronLeft />
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-ink-dim">Cycle {meta.cycle} · {PHASE_LABEL[meta.phase]}</p>
            <p className="text-xl font-black">Semaine {meta.week} — {meta.name}</p>
            <p className="text-sm text-ink-soft">{meta.focus}</p>
          </div>
          <button type="button" onClick={() => goWeek(shownWeek + 1)} className="rounded-lg p-2 hover:bg-card" aria-label="Semaine suivante">
            <ChevronRight />
          </button>
        </div>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: CYCLE_LENGTH }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goWeek(cycleStart + i)}
              className={clsx("h-2 flex-1 rounded-full", i + 1 === meta.week ? "bg-mint" : cycleStart + i < currentWeek ? "bg-mint/40" : "bg-line")}
              aria-label={`Semaine ${i + 1}`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-ink-dim">
          <span className="flex items-center gap-2">Intensité <IntensityDots value={meta.intensity} /></span>
          <span>{doneInCycle} / {CYCLE_LENGTH * plan.perWeek} séances faites ce cycle</span>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((label, d) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + d);
            const p = dayPlan(profile, date);
            const s = p.slot !== null ? sessions[p.slot] : null;
            const isToday = date.toDateString() === today.toDateString();
            return (
              <button
                key={label}
                type="button"
                onClick={() => setDay(d)}
                className={clsx(
                  "flex min-h-20 flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs",
                  d === shownDay ? "border-mint bg-mint/10" : "border-line bg-card hover:border-ink-dim",
                )}
              >
                <span className={clsx("font-bold", isToday && "text-mint")}>{label}</span>
                <span className="text-ink-dim">{date.getDate()}</span>
                {profile.raceDate === toISODate(date) ? (
                  <span className="mt-auto text-[10px] font-bold text-rose-soft">course</span>
                ) : s ? (
                  <span className={clsx("mt-auto h-2 w-2 rounded-full", done[s.id] ? "bg-mint" : "bg-jaune")} title={s.title} />
                ) : (
                  <span className="mt-auto text-[10px] text-ink-dim">repos</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-ink-dim">
          {selectedDate.toDateString() === today.toDateString() ? "Aujourd'hui" : fmtDay(selectedDate)}
          {session && ` · séance ${session.slot + 1}/${plan.perWeek}`}
        </p>
        {isRaceDay ? (
          <div>
            <h2 className="flex items-center gap-3 text-3xl font-black"><Flag className="h-7 w-7 text-rose-soft" /> Jour de course</h2>
            <p className="mt-2 text-ink-soft">12 semaines de travail pour aujourd&apos;hui. Rien de nouveau, suis ton plan.</p>
            <div className="mt-5">
              <BlockCard block={{ label: "J", title: "Ton plan du jour J", minutes: 0, items: RACE_DAY_PLAN }} tone="rose" />
            </div>
          </div>
        ) : session ? (
          <SessionView
            session={session}
            done={!!done[session.id]}
            onToggleDone={() => toggleDone(session.id)}
            result={results[session.id]}
            onSaveResult={(time) => saveResult(session.id, time)}
          />
        ) : (
          <div>
            <h2 className="text-2xl font-black">Jour de récupération</h2>
            <p className="mt-2 text-ink-soft">La progression se fait pendant le repos. Bouge un peu, sans intensité, et prends soin de tes tissus.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {recoveryDay(shownWeek * 7 + shownDay).map((b) => <BlockCard key={b.title} block={b} tone="rose" />)}
            </div>
            {next && (
              <button
                type="button"
                onClick={() => {
                  const p = dayPlan(profile, next.date);
                  setWeek(p.week);
                  setDay(p.weekday);
                }}
                className="mt-6 w-full rounded-xl border border-line bg-bg-soft p-4 text-left hover:border-mint"
              >
                <p className="text-xs uppercase tracking-widest text-ink-dim">Prochaine séance · {DAY_NAMES[(next.date.getDay() + 6) % 7]}</p>
                <p className="mt-1 font-bold">{next.session.title}</p>
                <p className="text-sm text-ink-soft">~{next.session.minutes}&apos; · {next.session.rpe}</p>
              </button>
            )}
          </div>
        )}
      </div>

      <section className="no-print mt-12 border-t border-line pt-6">
        <h3 className="font-bold">Cette semaine</h3>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {sessions.map((s) => {
            const d = dateOfSlot(profile, shownWeek, s.slot);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setDay((d.getDay() + 6) % 7)}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-bg-soft p-3 text-left text-sm hover:border-ink-dim"
                >
                  <span>
                    <span className="text-ink-dim">{DAY_LABELS[(d.getDay() + 6) % 7]} · </span>
                    <span className="font-semibold">{s.title}</span>
                  </span>
                  <span className={clsx("text-xs", done[s.id] ? "text-mint" : "text-ink-dim")}>{done[s.id] ? "✓ faite" : `${s.minutes}'`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
