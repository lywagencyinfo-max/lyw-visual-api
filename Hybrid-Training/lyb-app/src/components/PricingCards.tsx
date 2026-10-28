import Link from "next/link";
import clsx from "clsx";
import { Check } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/plans";

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLANS.map((p) => (
        <div
          key={p.id}
          className={clsx(
            "relative flex flex-col rounded-2xl border p-6",
            p.highlight ? "border-mint bg-card shadow-[0_0_0_1px_var(--color-mint)]" : "border-line bg-bg-soft",
          )}
        >
          {p.highlight && (
            <span className="absolute -top-3 left-6 rounded-full bg-mint px-3 py-0.5 text-xs font-bold text-bg">Le plus choisi</span>
          )}
          <h3 className="text-2xl font-black">{p.name}</h3>
          <p className="mt-1 text-sm text-ink-soft">{p.tagline}</p>
          <p className="mt-5">
            <span className="text-4xl font-black">{formatPrice(p.price)}</span>
            <span className="text-ink-dim"> / mois</span>
          </p>
          <p className="mt-1 text-sm text-ink-dim">
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
            href={`/demarrer?plan=${p.id}`}
            className={clsx(
              "mt-6 rounded-xl px-4 py-3 text-center font-bold transition",
              p.highlight ? "bg-mint text-bg hover:brightness-110" : "bg-line hover:bg-ink-dim/40",
            )}
          >
            Choisir {p.name}
          </Link>
        </div>
      ))}
    </div>
  );
}
