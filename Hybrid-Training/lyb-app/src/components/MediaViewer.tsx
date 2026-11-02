"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Exercise, Media } from "@/lib/content/types";

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  return m?.[1] ?? null;
}

export function guessKind(url: string): Media["kind"] {
  if (youtubeId(url)) return "youtube";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return "video";
  return "image";
}

/** `thumb` : vignette compacte (listes, éditeur) au lieu du lecteur. */
export function MediaPreview({ media, className, thumb }: { media: Media; className?: string; thumb?: boolean }) {
  if (media.kind === "image") return <img src={media.url} alt="" className={className} />;
  if (media.kind === "video") return <video src={media.url} controls={!thumb} playsInline muted loop className={className} />;
  const id = youtubeId(media.url);
  if (thumb) {
    return (
      <div className={`relative grid place-items-center bg-bg text-xs font-semibold text-ink-dim ${className ?? ""}`}>
        Vidéo YouTube
        {id && (
          <img
            src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => (e.currentTarget.hidden = true)}
          />
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {id && (
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title="Démo vidéo"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full rounded-lg"
        />
      )}
      <a href={media.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-mint underline">
        Ouvrir sur YouTube
      </a>
    </div>
  );
}

/** Fenêtre de démo d'un mouvement : photos, vidéos et consignes de la bibliothèque. */
export function MediaViewer({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={exercise.name}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-bg-soft p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">{exercise.name}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-card" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {exercise.media.map((m, i) => (
            <MediaPreview key={i} media={m} className="w-full rounded-lg" />
          ))}
        </div>
        {exercise.cues && <p className="mt-4 whitespace-pre-line text-sm text-ink-soft">{exercise.cues}</p>}
      </div>
    </div>
  );
}
