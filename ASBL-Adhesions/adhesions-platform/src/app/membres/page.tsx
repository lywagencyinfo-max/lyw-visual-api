"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<Member["statut"], { label: string; className: string }> = {
  "a-jour": { label: "À jour", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "proche-echeance": { label: "Proche échéance", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "en-retard": { label: "En retard", className: "bg-orange-50 text-orange-700 border-orange-200" },
  impaye: { label: "Impayé", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function MembresPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [backend, setBackend] = useState<string>("mock");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members/sync");
      const data = await res.json();
      setMembers(data.members ?? []);
      setBackend(data.backend ?? "mock");
    } catch {
      setToast("Échec de la synchronisation des membres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendReminders = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/members/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: Array.from(selected) }),
      });
      const data = await res.json();
      const sentCount = (data.results ?? []).filter((r: { sent: boolean }) => r.sent).length;
      const total = (data.results ?? []).length;
      setToast(
        sentCount === total
          ? `${sentCount} relance(s) envoyée(s).`
          : `${sentCount}/${total} envoyée(s) — le reste est en brouillon (Google non connecté).`
      );
      setSelected(new Set());
      await load();
    } catch {
      setToast("Échec de l'envoi des relances.");
    } finally {
      setBusy(false);
    }
  };

  const generateCertificate = async (member: Member) => {
    setBusy(true);
    try {
      const res = await fetch("/api/members/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      setToast("Échec de la génération de l'attestation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Link href="/" className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
              CotisAuto™
            </Link>
            <span className="text-[var(--color-ink-dim)]">/</span>
            <span>Membres</span>
          </div>
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)]">
            Source : {backend === "mock" ? "données d'exemple" : backend === "sheets" ? "Google Sheets" : "Airtable"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Membres &amp; cotisations</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-bg-soft)] disabled:opacity-50"
            >
              {loading ? "Synchronisation…" : "Synchroniser"}
            </button>
            <button
              onClick={sendReminders}
              disabled={busy || selected.size === 0}
              className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              Relancer la sélection ({selected.size})
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--color-bg-soft)] text-[11px] uppercase tracking-wide text-[var(--color-ink-dim)]">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Dernière relance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const st = STATUS_LABEL[m.statut];
                return (
                  <tr key={m.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg-soft)]">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                    </td>
                    <td className="px-4 py-3 font-semibold">{m.nom}</td>
                    <td className="px-4 py-3 text-[var(--color-ink-soft)]">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.className)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                      {m.dateEcheance ? new Date(m.dateEcheance).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">{m.montant} €</td>
                    <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                      {m.derniereRelance ? new Date(m.derniereRelance).toLocaleDateString("fr-FR") : "Jamais"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.statut === "a-jour" && (
                        <button
                          onClick={() => generateCertificate(m)}
                          disabled={busy}
                          className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--color-bg-soft)] disabled:opacity-50"
                        >
                          Attestation
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-ink-dim)]">
                    Aucun membre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {backend === "mock" && (
          <p className="mt-3 text-xs text-[var(--color-ink-dim)]">
            Ces membres sont des exemples fictifs. Configure <code>MEMBERS_BACKEND</code> (sheets ou airtable) dans{" "}
            <code>.env.local</code> pour connecter tes vraies données.
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
