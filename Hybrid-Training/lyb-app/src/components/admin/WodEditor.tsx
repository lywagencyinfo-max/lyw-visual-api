"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BlockCard } from "@/components/SessionView";
import { contentRepo, newId } from "@/lib/content/repo";
import { WOD_KIND_LABEL, type CustomWod, type WodItem, type WodKind } from "@/lib/content/types";
import { wodToFn } from "@/lib/content/wods";
import type { Level } from "@/lib/program/types";
import { Button, Field, inputCls } from "./fields";

const EMPTY_ITEM: WodItem = { name: "", dose: "" };

export function WodEditor({ initial, onDone }: { initial?: CustomWod; onDone: (saved: boolean) => void }) {
  const [kind, setKind] = useState<WodKind>(initial?.kind ?? "wod");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [format, setFormat] = useState(initial?.format ?? "");
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? 15));
  const [items, setItems] = useState<WodItem[]>(initial?.items ?? [{ ...EMPTY_ITEM }, { ...EMPTY_ITEM }, { ...EMPTY_ITEM }]);
  const [note, setNote] = useState(initial?.note ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [preview, setPreview] = useState<Level>("intermediaire");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setItem = (i: number, patch: Partial<WodItem>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const wod: CustomWod = {
    id: initial?.id ?? newId(),
    kind,
    title: title.trim(),
    format: format.trim(),
    minutes: Math.max(1, Number(minutes) || 1),
    items: items.map((it) => ({
      name: it.name.trim(),
      dose: it.dose.trim(),
      ...(it.doseDebutant?.trim() && { doseDebutant: it.doseDebutant.trim() }),
      ...(it.doseAvance?.trim() && { doseAvance: it.doseAvance.trim() }),
    })).filter((it) => it.name),
    note: note.trim() || undefined,
    active,
    createdAt: initial?.createdAt ?? new Date().toISOString(),
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await contentRepo().saveWod(wod);
      onDone(true);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-5 rounded-2xl border border-line bg-bg-soft p-5">
        <h2 className="text-xl font-black">{initial ? "Modifier le WOD" : "Nouveau WOD"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="wod-kind" hint="Détermine où il apparaît dans les séances.">
            <select id="wod-kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as WodKind)}>
              {(Object.keys(WOD_KIND_LABEL) as WodKind[]).map((k) => (
                <option key={k} value={k}>
                  {WOD_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nom" htmlFor="wod-title">
            <input id="wod-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Le Sled Lover" />
          </Field>
          <Field label="Format" htmlFor="wod-format" hint="AMRAP 15', EMOM 12', For Time · cap 20'…">
            <input id="wod-format" className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)} placeholder="AMRAP 15'" />
          </Field>
          <Field label="Durée (minutes)" htmlFor="wod-minutes">
            <input id="wod-minutes" type="number" min={1} max={90} className={inputCls} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Mouvements</p>
          <p className="mb-3 text-xs text-ink-dim">
            La dose « tous niveaux » s&apos;applique si tu ne précises pas de dose débutant ou avancé. Les mouvements connus du programme sont adaptés
            automatiquement au matériel et aux mouvements à éviter de chaque abonné.
          </p>
          <div className="grid gap-3">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                <input aria-label={`Mouvement ${i + 1}`} className={inputCls} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Kettlebell swings" />
                <input aria-label={`Dose tous niveaux ${i + 1}`} className={inputCls} value={it.dose} onChange={(e) => setItem(i, { dose: e.target.value })} placeholder="Tous niveaux : 15" />
                <input aria-label={`Dose débutant ${i + 1}`} className={inputCls} value={it.doseDebutant ?? ""} onChange={(e) => setItem(i, { doseDebutant: e.target.value })} placeholder="Débutant : 10" />
                <input aria-label={`Dose avancé ${i + 1}`} className={inputCls} value={it.doseAvance ?? ""} onChange={(e) => setItem(i, { doseAvance: e.target.value })} placeholder="Avancé : 20" />
                <button type="button" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="rounded-lg p-2 text-ink-dim hover:bg-card hover:text-rose-soft" aria-label="Retirer ce mouvement">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button onClick={() => setItems((l) => [...l, { ...EMPTY_ITEM }])}>
              <Plus className="h-4 w-4" /> Ajouter un mouvement
            </Button>
          </div>
        </div>

        <Field label="Note du coach (facultatif)" htmlFor="wod-note">
          <textarea id="wod-note" rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rythme régulier, vise des tours constants." />
        </Field>

        <label htmlFor="wod-active" className="flex items-center gap-2 text-sm">
          <input id="wod-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--color-mint)]" />
          Actif : intégré à la rotation des séances
        </label>

        {error && <p className="rounded-lg bg-rose/15 p-3 text-sm text-rose-soft">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" onClick={save} disabled={busy || !wod.title || wod.items.length === 0}>
            Enregistrer
          </Button>
          <Button onClick={() => onDone(false)}>Annuler</Button>
        </div>
      </div>

      <aside>
        <p className="mb-2 text-sm font-semibold">Aperçu dans une séance</p>
        <div className="mb-3 flex gap-1 text-xs">
          {(["debutant", "intermediaire", "avance"] as Level[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPreview(l)}
              className={`rounded-full px-2.5 py-1 font-semibold ${preview === l ? "bg-mint text-bg" : "bg-line text-ink-soft"}`}
            >
              {l === "debutant" ? "Débutant" : l === "intermediaire" ? "Intermédiaire" : "Avancé"}
            </button>
          ))}
        </div>
        <BlockCard block={wodToFn({ ...wod, title: wod.title || "Sans nom" })(preview)} tone="jaune" />
      </aside>
    </div>
  );
}
