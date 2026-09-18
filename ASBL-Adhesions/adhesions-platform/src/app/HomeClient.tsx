"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentChat } from "@/components/AgentChat";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  {
    key: "detection",
    title: "1. Détection",
    subtitle: "Échéances à venir",
    description: "Repère les adhésions qui arrivent à échéance (J-30, J-15, J-0) et les cotisations impayées après échéance.",
  },
  {
    key: "relance",
    title: "2. Relance",
    subtitle: "Email de renouvellement",
    description: "Email de rappel personnalisé avec une cadence J-30 doux, J-15 direct, J+7 après échéance ferme mais courtois.",
  },
  {
    key: "suivi",
    title: "3. Suivi paiement",
    subtitle: "Google Sheets / Airtable",
    description: "Synchronisation bidirectionnelle du statut payé/impayé, de la date de paiement et du montant.",
  },
  {
    key: "attestation",
    title: "4. Attestation fiscale",
    subtitle: "PDF brouillon",
    description: "Génère un PDF d'attestation dès qu'une cotisation est marquée payée — brouillon à valider par le trésorier.",
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
              <span className="text-[var(--color-accent)]">CotisAuto™</span>
              <span className="text-[var(--color-ink-dim)] font-normal text-sm">· {tagline}</span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/membres" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Membres
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white font-black">
                  {agentName.slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold">{agentName}</div>
                  <div className="text-xs text-[var(--color-ink-soft)]">{agentRole}</div>
                </div>
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
                href="/membres"
                className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                👥 Membres
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
      <h2 className="text-lg font-bold">Pipeline CotisAuto™</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        De l&apos;adhérent oublié à la cotisation payée, 100 % automatisé. Pour agir sur vos membres (relancer, marquer
        payé, générer une attestation), rendez-vous dans l&apos;onglet <Link href="/membres" className="underline text-[var(--color-accent)]">Membres</Link>.
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
        ⚠️ Les attestations fiscales générées sont des <strong>brouillons à valider par le trésorier/comptable</strong> de
        l&apos;ASBL avant tout envoi. Les formats et seuils légaux varient et changent régulièrement.
      </div>
    </div>
  );
}
