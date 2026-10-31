"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Circle, Clock, Printer, Trophy } from "lucide-react";
import type { Block, Session } from "@/lib/program/types";
import { IntensityDots, Pill } from "./ui";

export function BlockCard({ block, tone }: { block: Block; tone: "mint" | "jaune" | "rose" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            "grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-xs font-black text-bg",
            tone === "mint" && "bg-mint",
            tone === "jaune" && "bg-jaune",
            tone === "rose" && "bg-rose-soft",
          )}
        >
          {block.label}
        </span>
        <h4 className="font-bold">{block.title}</h4>
        {block.minutes > 0 && <span className="ml-auto text-xs text-ink-dim">{block.minutes}&apos;</span>}
      </div>
      {block.format && <p className="mt-2 text-sm font-semibold text-jaune">{block.format}</p>}
      <ul className="mt-3 space-y-2">
        {block.items.map((it, i) => (
          <li key={i} className="text-sm">
            <div className="flex flex-wrap justify-between gap-x-4">
              <span className="font-medium">{it.name}</span>
              <span className="text-ink-soft">{it.dose}</span>
            </div>
            {it.cue && <p className="text-xs text-ink-dim">{it.cue}</p>}
          </li>
        ))}
      </ul>
      {block.note && <p className="mt-3 border-t border-line pt-2 text-xs text-ink-soft">{block.note}</p>}
    </div>
  );
}

function Section({ n, title, minutes, children }: { n: number; title: string; minutes: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 flex items-baseline gap-2 text-lg font-black">
        <span className="text-ink-dim">{n}.</span> {title}
        <span className="text-sm font-normal text-ink-dim">· {minutes}&apos;</span>
      </h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

const sum = (blocks: Block[]) => blocks.reduce((s, b) => s + b.minutes, 0);

const TIME_RE = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;

function ResultInput({ value, onSave }: { value?: string; onSave: (time: string) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  const valid = draft === "" || TIME_RE.test(draft.trim());
  return (
    <div className="no-print mt-3 rounded-xl border border-jaune/40 bg-jaune/10 p-4">
      <label className="flex items-center gap-2 text-sm font-bold text-jaune" htmlFor="sim-time">
        <Trophy className="h-4 w-4" /> Ton temps de simulation
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="sim-time"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="h:mm:ss ou mm:ss"
          inputMode="numeric"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg p-2.5 text-ink"
        />
        <button
          type="button"
          disabled={!valid || draft.trim() === (value ?? "")}
          onClick={() => onSave(draft.trim())}
          className="rounded-lg bg-jaune px-4 font-bold text-bg disabled:opacity-40"
        >
          Enregistrer
        </button>
      </div>
      {!valid && <p className="mt-1 text-xs text-rose-soft">Format attendu : 1:12:30 ou 58:40</p>}
      {value && valid && <p className="mt-1 text-xs text-ink-soft">Enregistré : {value}. Il sert de référence pour ton prochain cycle.</p>}
    </div>
  );
}

interface Props {
  session: Session;
  done?: boolean;
  onToggleDone?: () => void;
  result?: string;
  onSaveResult?: (time: string) => void;
}

export function SessionView({ session, done, onToggleDone, result, onSaveResult }: Props) {
  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black md:text-3xl">{session.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ~{session.minutes}&apos;</span>
            <span className="flex items-center gap-2"><IntensityDots value={session.intensity} /> {session.rpe}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {session.adapted > 0 && (
              <Pill tone="jaune">
                {session.adapted} mouvement{session.adapted > 1 ? "s" : ""} adapté{session.adapted > 1 ? "s" : ""} à ton profil
              </Pill>
            )}
            {session.tags.map((t) => <Pill key={t}>{t}</Pill>)}
          </div>
        </div>
        <div className="no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-line p-3 hover:bg-card" aria-label="Imprimer">
            <Printer className="h-5 w-5" />
          </button>
          {onToggleDone && (
            <button
              type="button"
              onClick={onToggleDone}
              className={clsx("flex items-center gap-2 rounded-xl px-4 py-3 font-bold", done ? "bg-mint text-bg" : "bg-line hover:bg-ink-dim/40")}
            >
              {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              {done ? "Séance faite" : "Marquer comme faite"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-bg-soft p-4 text-sm">
        <p><span className="font-bold text-mint">Objectif · </span>{session.objective}</p>
        <p className="mt-2 text-ink-soft"><span className="font-bold text-jaune">Coach · </span>{session.coachNote}</p>
      </div>

      <Section n={1} title="Échauffement RAMP" minutes={sum(session.warmup)}>
        <div className="grid gap-3 md:grid-cols-2">
          {session.warmup.map((b) => <BlockCard key={b.label} block={b} tone="mint" />)}
        </div>
      </Section>
      <Section n={2} title="Entraînement" minutes={sum(session.main)}>
        {session.main.map((b) => <BlockCard key={b.label + b.title} block={b} tone="jaune" />)}
        {session.kind === "simulation" && onSaveResult && <ResultInput key={session.id} value={result} onSave={onSaveResult} />}
      </Section>
      <Section n={3} title="Mobilité" minutes={session.mobility.minutes}>
        <BlockCard block={session.mobility} tone="rose" />
      </Section>
    </article>
  );
}
