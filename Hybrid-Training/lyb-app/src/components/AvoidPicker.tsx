"use client";

import clsx from "clsx";
import { Ban } from "lucide-react";
import { AVOID_OPTIONS, type AvoidId } from "@/lib/program/avoid";

export function AvoidPicker({ value, onChange }: { value: AvoidId[]; onChange: (v: AvoidId[]) => void }) {
  const toggle = (id: AvoidId) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {AVOID_OPTIONS.map((o) => {
        const on = value.includes(o.id);
        return (
          <label
            key={o.id}
            htmlFor={`avoid-${o.id}`}
            className={clsx(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
              on ? "border-rose/70 bg-rose/10" : "border-line bg-bg-soft hover:border-ink-dim",
            )}
          >
            <input id={`avoid-${o.id}`} type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.id)} />
            <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded border", on ? "border-rose-soft bg-rose-soft text-bg" : "border-ink-dim")}>
              {on && <Ban className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-ink-dim">{o.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
