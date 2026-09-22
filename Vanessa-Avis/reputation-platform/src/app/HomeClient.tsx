"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentChat } from "@/components/AgentChat";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  {
    key: "detection",
    title: "1. Détection",
    subtitle: "Surveillance du Google Business Profile",
    description: "Surveille la fiche Google Business Profile pour tout nouvel avis : note, texte, auteur, date, réponse déjà publiée ou non.",
  },
  {
    key: "analyse",
    title: "2. Analyse",
    subtitle: "Sentiment + signaux de crise",
    description: "Classe chaque avis (positif / neutre / négatif), détecte les signaux de crise (mots-clés graves) et calcule l'évolution de la note moyenne récente.",
  },
  {
    key: "reponse",
    title: "3. Réponse personnalisée",
    subtitle: "Brouillon, jamais publié seul",
    description: "Prépare un brouillon adapté : remerciement chaleureux avec un détail précis pour un avis positif, réponse empathique et contact direct hors-ligne pour un avis négatif.",
  },
  {
    key: "alerte",
    title: "4. Alerte",
    subtitle: "Email immédiat si besoin",
    description: "Envoie une alerte email dès qu'un avis ≤ 2 étoiles arrive, ou que la note moyenne baisse significativement — pour réagir vite.",
  },
];

type Tab = "chat" | "pipeline";

export function HomeClient({
  agentSlug,
  agentName,
  agentRole,
  model,
  tagline,
}: {
  agentSlug: string;
  agentName: string;
  agentRole: string;
  model: string;
  tagline: string;
}) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-black tracking-tight">
              <span className="text-[var(--color-accent)]">ReputAuto™</span>
              <span className="text-[var(--color-ink-dim)] font-normal text-sm">· {tagline}</span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/avis" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Avis
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-black">
                  {agentName.slice(0, 1)}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-bg)] bg-emerald-500"
                    aria-label="En ligne"
                    title="En ligne"
                  />
                </div>
                <div>
                  <div className="font-bold">{agentName}</div>
                  <div className="text-xs text-[var(--color-ink-soft)]">{agentRole}</div>
                </div>
              </div>
              <div className="mt-3">
                <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)]">
                  Modèle : {model}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[var(--color-bg-soft)] py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">Livrables</dt>
                  <dd className="text-sm font-bold">0</dd>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-soft)] py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">Tokens</dt>
                  <dd className="text-sm font-bold">0</dd>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-soft)] py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">Coût</dt>
                  <dd className="text-sm font-bold">0,00 €</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] p-2">
              <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
                💬 Chat
              </TabButton>
              <TabButton active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
                🔁 Pipeline
              </TabButton>
              <Link
                href="/avis"
                className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                ⭐ Avis
              </Link>
            </div>
          </aside>

          <section className="min-h-[70vh]">
            {tab === "chat" ? (
              <AgentChat agentSlug={agentSlug} agentName={agentName} agentRole={agentRole} model={model} />
            ) : (
              <PipelinePanel />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors",
        active ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
      )}
    >
      {children}
    </button>
  );
}

function PipelinePanel() {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] p-6">
      <h2 className="text-lg font-bold">Pipeline ReputAuto™</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        De l&apos;avis publié à la réponse envoyée, 100 % automatisé — sauf les avis sensibles, toujours validés par
        vous. Pour agir sur vos avis (générer un brouillon, publier, alerter), rendez-vous dans l&apos;onglet{" "}
        <Link href="/avis" className="underline text-[var(--color-accent)]">Avis</Link>.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PIPELINE_STEPS.map((step) => (
          <div key={step.key} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-soft)] p-4">
            <div className="text-sm font-black text-[var(--color-accent)]">{step.title}</div>
            <div className="mt-0.5 text-xs font-semibold text-[var(--color-ink-dim)]">{step.subtitle}</div>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{step.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠️ Vanessa ne publie <strong>jamais</strong> une réponse sur Google Business Profile de façon autonome. Chaque
        brouillon attend une action humaine explicite (bouton « Publier ») — et pour un avis négatif ou classé
        « crise », la relecture est obligatoire, sans exception.
      </div>
    </div>
  );
}
