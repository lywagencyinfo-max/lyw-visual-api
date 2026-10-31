"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { Logo, Pill } from "@/components/ui";
import { planById } from "@/lib/plans";
import { ALL_EQUIPMENT, type Equip } from "@/lib/program/equipment";
import { DAY_LABELS, parseISODate } from "@/lib/program/schedule";
import type { Division, Level, Profile, Sex } from "@/lib/program/types";
import { saveProfile, useAthlete } from "@/lib/store";

const LEVELS: { id: Level; label: string }[] = [
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "avance", label: "Avancé" },
];

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("rounded-xl border px-4 py-3 text-sm font-semibold transition", active ? "border-mint bg-mint/10" : "border-line bg-bg-soft hover:border-ink-dim")}
    >
      {children}
    </button>
  );
}

function Editor({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>(initial.level);
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [division, setDivision] = useState<Division>(initial.division);
  const [days, setDays] = useState<number[]>(initial.days);
  const [equipment, setEquipment] = useState<Equip[]>(initial.equipment ?? ALL_EQUIPMENT);
  const plan = planById(initial.plan);

  const toggleDay = (d: number) =>
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= plan.perWeek) return [...prev.slice(1), d].sort((a, b) => a - b);
      return [...prev, d].sort((a, b) => a - b);
    });

  const save = () => {
    saveProfile({ ...initial, level, sex, division, days, equipment });
    router.push("/app");
  };

  return (
    <>
      <section className="mt-8 rounded-2xl border border-line bg-bg-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-dim">Ma formule</p>
            <p className="text-xl font-black">{plan.name} · {plan.perWeek} séances / semaine</p>
            <p className="text-sm text-ink-soft">
              Programme démarré le {parseISODate(initial.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              {initial.raceDate && ` · course le ${parseISODate(initial.raceDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
            </p>
          </div>
          <Link href={`/demarrer?plan=${initial.plan}`} className="rounded-xl border border-line px-4 py-2 text-sm font-bold hover:bg-card">
            Changer de formule
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black">Mon matériel</h2>
        <p className="mb-4 text-sm text-ink-soft">Coche tout ce à quoi tu as accès. Toutes tes séances, passées et à venir, sont recalculées.</p>
        <EquipmentPicker value={equipment} onChange={setEquipment} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-black">Mon niveau</h2>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <Toggle key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>{l.label}</Toggle>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-black">Charges de référence Hyrox</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle active={sex === "femme"} onClick={() => setSex("femme")}>Femme</Toggle>
          <Toggle active={sex === "homme"} onClick={() => setSex("homme")}>Homme</Toggle>
          <Toggle active={division === "open"} onClick={() => setDivision("open")}>Division Open</Toggle>
          <Toggle active={division === "pro"} onClick={() => setDivision("pro")}>Division Pro</Toggle>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black">Mes jours d&apos;entraînement</h2>
        <p className="mb-3 text-sm text-ink-dim">{days.length}/{plan.perWeek} jours</p>
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
      </section>

      <button
        type="button"
        onClick={save}
        disabled={days.length !== plan.perWeek}
        className="mt-10 w-full rounded-xl bg-mint px-5 py-4 text-lg font-black text-bg disabled:opacity-40"
      >
        Enregistrer mon profil
      </button>
    </>
  );
}

export default function ProfilPage() {
  const { ready, profile } = useAthlete();

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/app" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Mes séances
        </Link>
      </header>
      <div className="mt-8 flex items-center gap-3">
        <h1 className="text-3xl font-black">Mon profil</h1>
        {profile && <Pill tone="mint">{planById(profile.plan).name}</Pill>}
      </div>
      {!ready ? (
        <p className="mt-8 text-ink-dim">Chargement…</p>
      ) : profile ? (
        <Editor initial={profile} />
      ) : (
        <div className="mt-8">
          <p className="text-ink-soft">Tu n&apos;as pas encore de programme.</p>
          <Link href="/demarrer" className="mt-4 inline-block rounded-xl bg-mint px-5 py-3 font-bold text-bg">Créer mon programme</Link>
        </div>
      )}
    </main>
  );
}
