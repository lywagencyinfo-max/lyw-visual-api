"use client";

import { useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { MediaPreview, guessKind } from "@/components/MediaViewer";
import { contentRepo, newId } from "@/lib/content/repo";
import type { Exercise, Media } from "@/lib/content/types";
import { Button, Field, inputCls } from "./fields";

export function ExerciseEditor({ initial, onDone }: { initial: Partial<Exercise>; onDone: (saved: boolean) => void }) {
  const repo = contentRepo();
  const [name, setName] = useState(initial.name ?? "");
  const [aliases, setAliases] = useState((initial.aliases ?? []).join(", "));
  const [cues, setCues] = useState(initial.cues ?? "");
  const [media, setMedia] = useState<Media[]>(initial.media ?? []);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const url = await repo.upload(file);
        setMedia((m) => [...m, { kind: file.type.startsWith("video/") ? "video" : "image", url }]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//.test(url)) return setError("Le lien doit commencer par https://");
    setMedia((m) => [...m, { kind: guessKind(url), url }]);
    setLink("");
    setError("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await repo.saveExercise({
        id: initial.id ?? newId(),
        name: name.trim(),
        aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
        cues: cues.trim(),
        media,
        updatedAt: new Date().toISOString(),
      });
      onDone(true);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 rounded-2xl border border-line bg-bg-soft p-5">
      <h2 className="text-xl font-black">{initial.id ? "Modifier l'exercice" : "Nouvel exercice"}</h2>
      <Field label="Nom du mouvement" htmlFor="ex-name" hint="Tel qu'il apparaît dans les séances, ex. « Wall balls » ou « Kettlebell swings ».">
        <input id="ex-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Wall balls" />
      </Field>
      <Field label="Autres noms (facultatif)" htmlFor="ex-aliases" hint="Séparés par des virgules. La démo s'affiche aussi pour ces noms.">
        <input id="ex-aliases" className={inputCls} value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Wall ball, Wall ball shots" />
      </Field>
      <Field label="Consignes" htmlFor="ex-cues" hint="Placement, respiration, erreurs fréquentes. Une consigne par ligne.">
        <textarea id="ex-cues" rows={4} className={inputCls} value={cues} onChange={(e) => setCues(e.target.value)} placeholder={"Squat complet, hanches sous les genoux\nLancer dans le mouvement de remontée"} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold">Photos et vidéos</p>
        {media.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {media.map((m, i) => (
              <div key={i} className="relative overflow-hidden rounded-lg border border-line bg-bg">
                <MediaPreview media={m} thumb className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setMedia((list) => list.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-bg/80 p-1 hover:bg-bg"
                  aria-label="Retirer ce média"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <label htmlFor="ex-file" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink-dim p-3 text-sm hover:border-mint">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {repo.mode === "local" ? "Ajouter des photos" : "Ajouter des photos ou vidéos"}
            <input
              id="ex-file"
              type="file"
              accept={repo.mode === "local" ? "image/*" : "image/*,video/*"}
              multiple
              className="sr-only"
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex gap-2">
            <input id="ex-link" className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Lien YouTube ou vidéo" />
            <Button onClick={addLink} disabled={!link.trim()}>
              <Link2 className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose/15 p-3 text-sm text-rose-soft">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button tone="primary" onClick={save} disabled={busy || !name.trim()}>
          Enregistrer
        </Button>
        <Button onClick={() => onDone(false)}>Annuler</Button>
      </div>
    </div>
  );
}
