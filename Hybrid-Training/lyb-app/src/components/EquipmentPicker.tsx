"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { EQUIPMENT_GROUPS, EQUIPMENT_PRESETS, type Equip } from "@/lib/program/equipment";

const sameSet = (a: Equip[], b: Equip[]) => a.length === b.length && a.every((x) => b.includes(x));

export function EquipmentPicker({ value, onChange }: { value: Equip[]; onChange: (v: Equip[]) => void }) {
  const toggle = (id: Equip) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div>
      <p className="mb-2 text-sm text-ink-dim">Raccourcis</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EQUIPMENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange([...p.items])}
            className={clsx(
              "rounded-xl border p-3 text-left text-sm transition",
              sameSet(value, p.items) ? "border-mint bg-mint/10" : "border-line bg-bg-soft hover:border-ink-dim",
            )}
          >
            <span className="block font-bold">{p.label}</span>
            <span className="text-xs text-ink-dim">{p.text}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {EQUIPMENT_GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-dim">{g.title}</legend>
            <div className="grid gap-1.5">
              {g.items.map((it) => {
                const on = value.includes(it.id);
                return (
                  <label
                    key={it.id}
                    htmlFor={`eq-${it.id}`}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                      on ? "border-mint/60 bg-mint/10" : "border-line bg-bg-soft hover:border-ink-dim",
                    )}
                  >
                    <input id={`eq-${it.id}`} type="checkbox" className="sr-only" checked={on} onChange={() => toggle(it.id)} />
                    <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded border", on ? "border-mint bg-mint text-bg" : "border-ink-dim")}>
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{it.label}</span>
                      {it.hint && <span className="block text-xs text-ink-dim">{it.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-dim">
        La course se fait dehors ou sur tapis. Les mouvements qui demandent du matériel non coché sont remplacés automatiquement par une alternative
        équivalente.
      </p>
    </div>
  );
}
