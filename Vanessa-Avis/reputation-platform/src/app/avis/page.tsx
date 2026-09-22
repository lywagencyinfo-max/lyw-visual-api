"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { Review, RatingDropAlert } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<Review["statutReponse"], { label: string; className: string }> = {
  aucune: { label: "Pas de réponse", className: "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-line)]" },
  brouillon: { label: "Brouillon prêt", className: "bg-amber-50 text-amber-700 border-amber-200" },
  publiee: { label: "Publiée", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const SENTIMENT_LABEL: Record<Review["sentiment"], { label: string; className: string }> = {
  positif: { label: "🟢 Positif", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  neutre: { label: "🟡 Neutre", className: "bg-amber-50 text-amber-700 border-amber-200" },
  crise: { label: "🔴 Crise", className: "bg-red-50 text-red-700 border-red-200" },
};

function stars(note: number): string {
  return "★".repeat(note) + "☆".repeat(5 - note);
}

export default function AvisPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [backend, setBackend] = useState<string>("mock");
  const [ratingDropAlert, setRatingDropAlert] = useState<RatingDropAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const [editedDraft, setEditedDraft] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/sync");
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setBackend(data.backend ?? "mock");
      setRatingDropAlert(data.ratingDropAlert ?? null);
    } catch {
      setToast("Échec de la synchronisation des avis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const generateDraft = async (review: Review) => {
    setBusyId(review.id);
    try {
      const res = await fetch("/api/reviews/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setReviews((prev) => prev.map((r) => (r.id === review.id ? data.review : r)));
      setOpenDraftId(review.id);
      setEditedDraft(data.review.brouillonReponse ?? "");
    } catch {
      setToast("Échec de la génération du brouillon.");
    } finally {
      setBusyId(null);
    }
  };

  const openDraft = (review: Review) => {
    setOpenDraftId(review.id);
    setEditedDraft(review.brouillonReponse ?? "");
  };

  const publish = async (review: Review) => {
    if (review.relectureObligatoire) {
      const confirmed = window.confirm(
        "Cet avis est classé « crise » (note basse et/ou signal de crise détecté). Avez-vous bien relu ce brouillon avant de le publier publiquement sur Google ?"
      );
      if (!confirmed) return;
    }
    setBusyId(review.id);
    try {
      const res = await fetch("/api/reviews/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, comment: editedDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setToast(`Réponse publiée pour ${review.auteur}.`);
      setOpenDraftId(null);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Échec de la publication.");
    } finally {
      setBusyId(null);
    }
  };

  const sendReviewAlert = async (review: Review) => {
    setBusyId(review.id);
    try {
      const res = await fetch("/api/reviews/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "nouvel-avis", reviewId: review.id }),
      });
      const data = await res.json();
      setToast(data.sent ? "Alerte envoyée par email." : `Alerte non envoyée : ${data.reason || data.error || "raison inconnue"}`);
    } catch {
      setToast("Échec de l'envoi de l'alerte.");
    } finally {
      setBusyId(null);
    }
  };

  const sendRatingDropAlert = async () => {
    setBusyId("rating-drop");
    try {
      const res = await fetch("/api/reviews/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "baisse-note" }),
      });
      const data = await res.json();
      setToast(data.sent ? "Alerte de baisse de note envoyée par email." : `Alerte non envoyée : ${data.reason || data.error || "raison inconnue"}`);
    } catch {
      setToast("Échec de l'envoi de l'alerte.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Link href="/" className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
              ReputAuto™
            </Link>
            <span className="text-[var(--color-ink-dim)]">/</span>
            <span>Avis</span>
          </div>
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)]">
            Source : {backend === "mock" ? "données d'exemple" : "Google Business Profile"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Avis Google &amp; réponses</h1>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-bg-soft)] disabled:opacity-50"
          >
            {loading ? "Synchronisation…" : "Synchroniser"}
          </button>
        </div>

        {ratingDropAlert?.triggered && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div>
              ⚠️ <strong>Baisse de note moyenne détectée</strong> : {ratingDropAlert.averagePrevious.toFixed(1)}/5 →{" "}
              {ratingDropAlert.averageRecent.toFixed(1)}/5 (-{Math.round(ratingDropAlert.dropFraction * 100)} %, seuil{" "}
              {Math.round(ratingDropAlert.threshold * 100)} %).
            </div>
            <button
              onClick={sendRatingDropAlert}
              disabled={busyId === "rating-drop"}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Envoyer l&apos;alerte email
            </button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[var(--color-bg-soft)] text-[11px] uppercase tracking-wide text-[var(--color-ink-dim)]">
              <tr>
                <th className="px-4 py-3">Auteur</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Extrait</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Sentiment</th>
                <th className="px-4 py-3">Statut réponse</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const st = STATUS_LABEL[r.statutReponse];
                const sent = SENTIMENT_LABEL[r.sentiment];
                const isOpen = openDraftId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg-soft)]">
                      <td className="px-4 py-3 font-semibold">{r.auteur}</td>
                      <td className="px-4 py-3 text-amber-600" title={`${r.note}/5`}>
                        {stars(r.note)}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-[var(--color-ink-soft)]" title={r.texte}>
                        {r.texte}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                        {new Date(r.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", sent.className)}>
                          {sent.label}
                        </span>
                        {r.relectureObligatoire && (
                          <div className="mt-1 text-[10px] font-semibold text-red-600">Relecture obligatoire</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.className)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {r.statutReponse === "aucune" && (
                            <button
                              onClick={() => generateDraft(r)}
                              disabled={busyId === r.id}
                              className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--color-bg-soft)] disabled:opacity-50"
                            >
                              {busyId === r.id ? "Génération…" : "Générer un brouillon"}
                            </button>
                          )}
                          {r.statutReponse === "brouillon" && (
                            <button
                              onClick={() => (isOpen ? setOpenDraftId(null) : openDraft(r))}
                              className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--color-bg-soft)]"
                            >
                              {isOpen ? "Masquer le brouillon" : "Voir le brouillon"}
                            </button>
                          )}
                          {r.note <= 2 && (
                            <button
                              onClick={() => sendReviewAlert(r)}
                              disabled={busyId === r.id}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Alerter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && r.statutReponse === "brouillon" && (
                      <tr className="border-t border-[var(--color-line)] bg-[var(--color-bg-soft)]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-dim)]">
                              Brouillon de réponse — à relire avant publication
                            </label>
                            <textarea
                              value={editedDraft}
                              onChange={(e) => setEditedDraft(e.target.value)}
                              rows={5}
                              className="w-full rounded-lg border border-[var(--color-line)] bg-white p-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-[var(--color-ink-dim)]">
                                Vous pouvez modifier ce texte avant publication. Rien n&apos;est envoyé sur Google tant
                                que vous n&apos;avez pas cliqué sur « Publier ».
                              </p>
                              <button
                                onClick={() => publish(r)}
                                disabled={busyId === r.id || !editedDraft.trim()}
                                className="shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
                              >
                                {busyId === r.id ? "Publication…" : "Publier sur Google"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {reviews.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-ink-dim)]">
                    Aucun avis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {backend === "mock" && (
          <p className="mt-3 text-xs text-[var(--color-ink-dim)]">
            Ces avis sont des exemples fictifs. Configure <code>GOOGLE_BUSINESS_ACCOUNT_ID</code> /{" "}
            <code>GOOGLE_BUSINESS_LOCATION_ID</code> et connecte Google (scope <code>business.manage</code>) dans{" "}
            <code>.env.local</code> pour connecter ta vraie fiche Google Business Profile.
          </p>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-[var(--color-ink)] px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
