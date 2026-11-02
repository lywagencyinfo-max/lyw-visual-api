"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ProgramExtras } from "../program/generator";
import { contentRepo } from "./repo";
import { toExtras } from "./wods";
import type { CustomWod, Exercise } from "./types";

interface ContentState {
  ready: boolean;
  exercises: Exercise[];
  wods: CustomWod[];
  extras: ProgramExtras;
  reload: () => Promise<void>;
}

const EMPTY: ProgramExtras = { wods: [], flush: [], finishers: [] };
const Ctx = createContext<ContentState>({ ready: false, exercises: [], wods: [], extras: EMPTY, reload: async () => {} });

/** Charge le contenu ajouté depuis l'espace admin (bibliothèque d'exercices, WODs). */
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [wods, setWods] = useState<CustomWod[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const repo = contentRepo();
    try {
      const [ex, wd] = await Promise.all([repo.listExercises(), repo.listWods()]);
      setExercises(ex.sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setWods(wd.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch {
      // Contenu indisponible (réseau) : le programme de base reste utilisable
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const extras = useMemo(() => toExtras(wods), [wods]);
  return <Ctx.Provider value={{ ready, exercises, wods, extras, reload }}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);
