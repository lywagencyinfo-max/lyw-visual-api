"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Dumbbell, ImageOff, Loader2, LogOut, Plus, Search, Timer } from "lucide-react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { Button, DeleteButton, Field, inputCls } from "@/components/admin/fields";
import { ExerciseEditor } from "@/components/admin/ExerciseEditor";
import { WodEditor } from "@/components/admin/WodEditor";
import { MediaPreview } from "@/components/MediaViewer";
import { Logo, Pill } from "@/components/ui";
import { missingDemos } from "@/lib/content/movements";
import { contentRepo, supabase } from "@/lib/content/repo";
import { WOD_KIND_LABEL, type CustomWod, type Exercise } from "@/lib/content/types";
import { useContent } from "@/lib/content/useContent";
import { debutWeek } from "@/lib/content/wods";

type Tab = "exercises" | "wods" | "missing";

// ---------- Accès ----------

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase()!.auth.signInWithPassword({ email, password });
    if (error) setError("Email ou mot de passe incorrect.");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-10 grid max-w-sm gap-4 rounded-2xl border border-line bg-bg-soft p-6">
      <h1 className="text-2xl font-black">Espace admin</h1>
      <Field label="Email" htmlFor="login-email">
        <input id="login-email" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Mot de passe" htmlFor="login-password">
        <input id="login-password" type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && <p className="text-sm text-rose-soft">{error}</p>}
      <Button type="submit" tone="primary" disabled={busy}>
        Se connecter
      </Button>
    </form>
  );
}

/** En production (Supabase), seuls les comptes listés dans la table « admins » accèdent à l'espace. */
function AdminGate({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!sb || !session) return;
    setIsAdmin(undefined);
    sb.from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [sb, session]);

  if (!sb) {
    return (
      <>
        <p className="mt-6 rounded-xl border border-jaune/40 bg-jaune/10 p-3 text-sm text-jaune">
          Mode démo : le contenu est enregistré dans ce navigateur uniquement. Une fois Supabase connecté, il sera partagé avec tous les abonnés.
        </p>
        {children}
      </>
    );
  }
  if (session === undefined || (session && isAdmin === undefined)) return <p className="mt-10 text-ink-dim">Chargement…</p>;
  if (!session) return <LoginForm />;
  if (!isAdmin) {
    return (
      <div className="mt-10 rounded-2xl border border-line bg-bg-soft p-6">
        <p>Ce compte ({session.user.email}) n&apos;a pas accès à l&apos;espace admin.</p>
        <div className="mt-4">
          <Button onClick={() => sb.auth.signOut()}>Se déconnecter</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => sb.auth.signOut()}>
          <LogOut className="h-4 w-4" /> {session.user.email}
        </Button>
      </div>
      {children}
    </>
  );
}

// ---------- Onglets ----------

function ExercisesTab({ prefill, onPrefillUsed }: { prefill: string | null; onPrefillUsed: () => void }) {
  const { exercises, reload } = useContent();
  const [editing, setEditing] = useState<Partial<Exercise> | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (prefill) {
      setEditing({ name: prefill });
      onPrefillUsed();
    }
  }, [prefill, onPrefillUsed]);

  if (editing) {
    return (
      <ExerciseEditor
        key={editing.id ?? editing.name ?? "new"}
        initial={editing}
        onDone={async (saved) => {
          if (saved) await reload();
          setEditing(null);
        }}
      />
    );
  }

  const q = query.toLowerCase();
  const list = exercises.filter((e) => !q || [e.name, ...e.aliases].some((n) => n.toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input aria-label="Rechercher un exercice" className={clsx(inputCls, "pl-9")} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" />
        </div>
        <Button tone="primary" onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" /> Nouvel exercice
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="mt-8 text-center text-ink-dim">
          {exercises.length ? "Aucun exercice ne correspond." : "Aucun exercice pour l'instant. Commence par l'onglet « Sans démo » pour voir les mouvements les plus fréquents."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {list.map((ex) => (
            <li key={ex.id} className="flex gap-3 rounded-xl border border-line bg-bg-soft p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bg">
                {ex.media[0] ? (
                  <MediaPreview media={ex.media[0]} thumb className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-ink-dim">
                    <ImageOff className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{ex.name}</p>
                <p className="text-xs text-ink-dim">
                  {ex.media.length} média{ex.media.length > 1 ? "s" : ""}
                  {ex.aliases.length > 0 && ` · ${ex.aliases.join(", ")}`}
                </p>
                <div className="mt-1 flex gap-1">
                  <Button onClick={() => setEditing(ex)}>Modifier</Button>
                  <DeleteButton
                    onConfirm={async () => {
                      await contentRepo().deleteExercise(ex.id);
                      await reload();
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WodsTab() {
  const { wods, reload } = useContent();
  const [editing, setEditing] = useState<CustomWod | "new" | null>(null);

  if (editing) {
    return (
      <WodEditor
        initial={editing === "new" ? undefined : editing}
        onDone={async (saved) => {
          if (saved) await reload();
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-soft">
          Un nouveau WOD est programmé pour tous les abonnés la semaine qui suit son ajout, puis il entre dans la rotation des séances.
          Les WODs légers servent les semaines de décharge, les finishers terminent les séances de force bas du corps (Pro, Race Prep).
        </p>
        <Button tone="primary" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Nouveau WOD
        </Button>
      </div>
      {wods.length === 0 ? (
        <p className="mt-8 text-center text-ink-dim">Aucun WOD ajouté pour l&apos;instant.</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {wods.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-soft p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{w.title}</p>
                <p className="text-sm text-ink-dim">
                  {w.format} · {w.minutes}&apos; · {w.items.map((i) => i.name).join(", ")}
                </p>
                {w.active && (
                  <p className="text-xs text-mint">
                    {w.kind === "flush" ? "Semaines de décharge · " : ""}Programmé pour tous les abonnés la semaine du{" "}
                    {new Date(debutWeek(w.createdAt)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, puis en rotation
                  </p>
                )}
              </div>
              <Pill>{WOD_KIND_LABEL[w.kind]}</Pill>
              <Pill tone={w.active ? "mint" : "default"}>{w.active ? "Actif" : "Inactif"}</Pill>
              <Button onClick={() => setEditing(w)}>Modifier</Button>
              <DeleteButton
                onConfirm={async () => {
                  await contentRepo().deleteWod(w.id);
                  await reload();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MissingTab({ onAdd }: { onAdd: (name: string) => void }) {
  const { exercises, extras } = useContent();
  const [list, setList] = useState<{ name: string; count: number }[] | null>(null);

  // Le calcul parcourt tout le programme : on le lance après l'affichage
  useEffect(() => {
    setList(null);
    const t = setTimeout(() => setList(missingDemos(exercises, extras)), 30);
    return () => clearTimeout(t);
  }, [exercises, extras]);

  if (!list) {
    return (
      <p className="flex items-center gap-2 text-ink-dim">
        <Loader2 className="h-4 w-4 animate-spin" /> Analyse du programme…
      </p>
    );
  }
  return (
    <div>
      <p className="text-sm text-ink-soft">
        {list.length} mouvements du programme n&apos;ont pas encore de photo ni de vidéo. Les plus fréquents sont en haut : commence par eux.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-bg-soft">
        {list.slice(0, 80).map((m) => (
          <li key={m.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
            <span className="text-xs tabular-nums text-ink-dim">{m.count} séances</span>
            <Button onClick={() => onAdd(m.name)}>Ajouter une démo</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("exercises");
  const [prefill, setPrefill] = useState<string | null>(null);
  const { exercises, wods } = useContent();
  const tabs = useMemo(
    () => [
      { id: "exercises" as const, label: "Exercices", icon: Dumbbell, count: exercises.length },
      { id: "wods" as const, label: "WODs", icon: Timer, count: wods.length },
      { id: "missing" as const, label: "Sans démo", icon: ImageOff },
    ],
    [exercises.length, wods.length],
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/app" className="text-sm text-ink-soft hover:text-ink">
          Voir l&apos;application
        </Link>
      </header>
      <AdminGate>
        <h1 className="mt-6 text-3xl font-black">Espace admin</h1>
        <nav className="mt-5 flex gap-1 border-b border-line">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx("-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold", tab === id ? "border-mint text-ink" : "border-transparent text-ink-dim hover:text-ink")}
            >
              <Icon className="h-4 w-4" /> {label}
              {count !== undefined && <span className="rounded-full bg-line px-1.5 text-xs">{count}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-6">
          {tab === "exercises" && <ExercisesTab prefill={prefill} onPrefillUsed={() => setPrefill(null)} />}
          {tab === "wods" && <WodsTab />}
          {tab === "missing" && (
            <MissingTab
              onAdd={(name) => {
                setPrefill(name);
                setTab("exercises");
              }}
            />
          )}
        </div>
      </AdminGate>
    </main>
  );
}
