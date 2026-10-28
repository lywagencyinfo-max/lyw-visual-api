"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check } from "lucide-react";
import { PLANS, TRIAL_DAYS, formatPrice, priceFor } from "@/lib/plans";
import type { Billing } from "@/lib/program/types";

export function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-bg-soft p-1 text-sm font-bold">
      {(["monthly", "yearly"] as const).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(b)}
          className={clsx("rounded-lg px-4 py-2 transition", billing === b ? "bg-mint text-bg" : "text-ink-soft hover:text-ink")}
        >
          {b === "monthly" ? "Mensuel" : "Annuel · 2 mois offerts"}
        </button>
      ))}
    </div>
  );
}

export function PricingCards() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <BillingToggle billing={billing} onChange={setBilling} />
        <p className="text-sm font-semibold text-jaune">{TRIAL_DAYS} jours d&apos;essai gratuit sur toutes les formules</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const price = priceFor(p, billing);
          return (
            <div
              key={p.id}
              className={clsx(
                "relative flex flex-col rounded-2xl border p-6",
                p.highlight ? "border-mint bg-card shadow-[0_0_0_1px_var(--color-mint)]" : p.id === "race" ? "border-rose bg-bg-soft" : "border-line bg-bg-soft",
              )}
            >
              {p.badge && (
                <span className={clsx("absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-bold text-bg", p.id === "race" ? "bg-rose-soft" : "bg-mint")}>
                  {p.badge}
                </span>
              )}
              <h3 className="text-2xl font-black">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{p.tagline}</p>
              <p className="mt-5">
                <span className="text-4xl font-black">{price.main}</span>
                <span className="text-ink-dim"> {price.period}</span>
              </p>
              <p className="mt-1 text-sm text-ink-dim">{price.sub}</p>
              <p className="text-sm text-ink-dim">
                {p.perWeek} séances / semaine · {formatPrice(p.price / (p.perWeek * 4.33))} la séance
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/demarrer?plan=${p.id}&billing=${p.yearly ? billing : "monthly"}`}
                className={clsx(
                  "mt-6 rounded-xl px-4 py-3 text-center font-bold transition",
                  p.highlight ? "bg-mint text-bg hover:brightness-110" : "bg-line hover:bg-ink-dim/40",
                )}
              >
                Essayer {TRIAL_DAYS} jours gratuits
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
