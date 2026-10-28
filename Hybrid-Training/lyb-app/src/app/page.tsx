import Link from "next/link";
import clsx from "clsx";
import { Activity, Dumbbell, Flame, Move, Timer, TrendingUp } from "lucide-react";
import { PricingCards } from "@/components/PricingCards";
import { IntensityDots, Logo } from "@/components/ui";
import { PHASE_LABEL, WEEKS } from "@/lib/program/cycle";
import { generateWeek } from "@/lib/program/generator";

const PHASE_COLOR = { base: "bg-mint", build: "bg-jaune", peak: "bg-rose", taper: "bg-ink-soft" } as const;

const PILLARS = [
  { icon: Flame, title: "Échauffement RAMP", text: "Raise, Activate, Mobilise, Potentiate : 15 minutes ciblées sur la séance du jour, jamais les mêmes d'une semaine à l'autre." },
  { icon: Dumbbell, title: "Force & cross-training", text: "Squat, deadlift, press, tractions en progression, puis des WODs variés : AMRAP, EMOM, For Time, Tabata, chippers." },
  { icon: Activity, title: "Hyrox spécifique", text: "Les 8 stations en rotation, la course compromise et des charges qui montent jusqu'aux standards Open ou Pro." },
  { icon: Move, title: "Mobilité à chaque séance", text: "12 minutes de mobilité ciblée sur les zones travaillées : hanches, chaîne postérieure, chevilles, épaules." },
  { icon: TrendingUp, title: "Périodisation 12 semaines", text: "Base, développement, spécifique, affûtage. 3 semaines de charge et 1 de décharge, puis une simulation pour mesurer tes progrès." },
  { icon: Timer, title: "Adapté à ton niveau", text: "Débutant, intermédiaire ou avancé : volumes, variantes de mouvements et charges s'ajustent automatiquement." },
];

const FAQ = [
  { q: "De quel matériel ai-je besoin ?", a: "Une salle de cross-training ou une salle équipée Hyrox est idéale (rameur, SkiErg, sled, wall balls, kettlebells). Chaque station propose une alternative si le matériel manque." },
  { q: "Je n'ai jamais fait d'Hyrox, est-ce pour moi ?", a: "Oui. Le niveau débutant réduit les volumes, remplace les mouvements techniques (goblet squat, ring rows…) et termine le cycle par un demi-Hyrox." },
  { q: "Comment fonctionne l'essai gratuit ?", a: "Tu as 3 jours pour tester ta formule avec de vraies séances. Tu peux annuler à tout moment pendant l'essai, sans être prélevé." },
  { q: "J'ai une course Hyrox de prévue, quelle formule choisir ?", a: "Race Prep : indique ta date de course, le programme se cale pour qu'elle tombe en fin de cycle, avec une répétition générale 2 semaines avant, un affûtage et un plan pour le jour J." },
  { q: "Que se passe-t-il après 12 semaines ?", a: "Un nouveau cycle démarre avec des WODs et des lifts différents. Tu repars de tes temps de simulation pour viser +2 à 5 %." },
  { q: "Puis-je changer de formule ?", a: "À tout moment. Ta progression est conservée et la nouvelle répartition des séances s'applique dès la semaine suivante." },
];

export default function Home() {
  const preview = generateWeek(
    { plan: "pro", level: "intermediaire", sex: "homme", division: "open", days: [0, 1, 3, 5], startDate: "2026-01-05" },
    6,
  );

  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          <a href="#formules" className="hidden text-ink-soft hover:text-ink sm:inline">Formules</a>
          <Link href="/app" className="text-ink-soft hover:text-ink">Mon espace</Link>
          <Link href="/demarrer" className="rounded-lg bg-mint px-3 py-2 font-bold text-bg">Commencer</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-mint">Hyrox · Cross-training · Hybride</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
          Ta séance du jour.<br />
          <span className="text-jaune">Pensée pour demain.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Des programmes d&apos;entraînement Hyrox et cross-training qui s&apos;enchaînent avec logique, jour après jour : échauffement,
          bloc principal et mobilité, dans un cycle de 12 semaines qui fait varier les mouvements, l&apos;intensité et les formats.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demarrer" className="rounded-xl bg-mint px-5 py-3 font-bold text-bg hover:brightness-110">Essayer 3 jours gratuits</Link>
          <a href="#formules" className="rounded-xl border border-line px-5 py-3 font-bold hover:bg-bg-soft">Voir les formules</a>
        </div>
      </section>

      <section className="border-y border-line bg-bg-soft">
        <div className="mx-auto grid max-w-6xl gap-px px-4 py-12 md:grid-cols-3">
          {[
            ["15'", "Échauffement RAMP", "Spécifique à la séance"],
            ["30-60'", "Bloc principal", "Force, WOD, engine ou Hyrox"],
            ["12'", "Mobilité", "Ciblée sur les zones travaillées"],
          ].map(([t, l, s]) => (
            <div key={l} className="p-4">
              <p className="text-4xl font-black text-mint">{t}</p>
              <p className="mt-1 font-bold">{l}</p>
              <p className="text-sm text-ink-dim">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-black">Une méthode, pas une liste de WODs</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-bg-soft p-5">
              <Icon className="h-6 w-6 text-jaune" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-3xl font-black">Le cycle de 12 semaines</h2>
        <p className="mt-2 text-ink-soft">Chaque semaine a un rôle. La hauteur des barres représente l&apos;intensité.</p>
        <div className="mt-8 flex h-40 items-end gap-1.5">
          {WEEKS.map((w) => (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-2" title={`S${w.week} · ${w.name} — ${w.focus}`}>
              <div className={clsx("w-full rounded-t-md", PHASE_COLOR[w.phase], w.deload && "opacity-40")} style={{ height: `${w.intensity * 20}%` }} />
              <span className="text-xs text-ink-dim">S{w.week}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(Object.keys(PHASE_LABEL) as (keyof typeof PHASE_LABEL)[]).map((p) => (
            <span key={p} className="flex items-center gap-2">
              <span className={clsx("h-3 w-3 rounded-sm", PHASE_COLOR[p])} /> {PHASE_LABEL[p]}
            </span>
          ))}
          <span className="flex items-center gap-2 text-ink-dim"><span className="h-3 w-3 rounded-sm bg-ink-soft opacity-40" /> Décharge</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-black">Exemple : semaine 6, formule Pro</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {preview.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-line bg-bg-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">{["Lundi", "Mardi", "Jeudi", "Samedi"][i]}</p>
              <h3 className="mt-1 font-bold">{s.title}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-ink-dim">
                <IntensityDots value={s.intensity} /> {s.minutes}&apos;
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                <li>· Échauffement RAMP</li>
                {s.main.map((b) => <li key={b.title}>· {b.title}</li>)}
                <li>· {s.mobility.title}</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="formules" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16">
        <h2 className="text-3xl font-black">Les formules</h2>
        <p className="mt-2 mb-8 text-ink-soft">Sans engagement. Chaque séance est complète : échauffement, entraînement, mobilité.</p>
        <PricingCards />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-black">Questions fréquentes</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-bold">{f.q}</summary>
              <p className="mt-2 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-dim">
        Lift Your Body · Programmes indicatifs : consulte un professionnel de santé avant de reprendre une activité intense.
        <br />HYROX est une marque de son propriétaire ; cette application n&apos;y est pas affiliée.
      </footer>
    </main>
  );
}
