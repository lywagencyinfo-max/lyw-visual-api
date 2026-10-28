"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "./program/types";

const PROFILE_KEY = "lyb.profile";
const DONE_KEY = "lyb.done";
const RESULTS_KEY = "lyb.results";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (navigation privée) : l'app reste utilisable sans persistance
  }
}

export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile);
}

export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {}
}

function readProfile(): Profile | null {
  const p = read<(Omit<Profile, "plan"> & { plan: string }) | null>(PROFILE_KEY, null);
  if (!p) return null;
  // La formule « Found » a été renommée « Build »
  return { ...p, plan: p.plan === "found" ? "build" : p.plan } as Profile;
}

/** Profil + séances terminées, persistés localement. `ready` passe à true après hydratation. */
export function useAthlete() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  // Temps de simulation saisis (id de séance → "mm:ss" ou "h:mm:ss")
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    setProfile(readProfile());
    setDone(read<Record<string, string>>(DONE_KEY, {}));
    setResults(read<Record<string, string>>(RESULTS_KEY, {}));
    setReady(true);
  }, []);

  const toggleDone = useCallback((id: string) => {
    setDone((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = new Date().toISOString();
      write(DONE_KEY, next);
      return next;
    });
  }, []);

  const saveResult = useCallback((id: string, time: string) => {
    setResults((prev) => {
      const next = { ...prev };
      if (time) next[id] = time;
      else delete next[id];
      write(RESULTS_KEY, next);
      return next;
    });
  }, []);

  return { ready, profile, done, toggleDone, results, saveResult };
}
