"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "./program/types";

const PROFILE_KEY = "lyb.profile";
const DONE_KEY = "lyb.done";

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

/** Profil + séances terminées, persistés localement. `ready` passe à true après hydratation. */
export function useAthlete() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  useEffect(() => {
    setProfile(read<Profile | null>(PROFILE_KEY, null));
    setDone(read<Record<string, string>>(DONE_KEY, {}));
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

  return { ready, profile, done, toggleDone };
}
