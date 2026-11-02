"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CustomWod, Exercise } from "./types";

/**
 * Stockage du contenu de l'espace admin.
 * - Supabase si NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définis (production) ;
 * - sinon le navigateur (mode démo : visible uniquement sur cet appareil).
 */
export interface ContentRepo {
  mode: "supabase" | "local";
  listExercises(): Promise<Exercise[]>;
  saveExercise(ex: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  listWods(): Promise<CustomWod[]>;
  saveWod(wod: CustomWod): Promise<void>;
  deleteWod(id: string): Promise<void>;
  /** Envoie un fichier et renvoie son URL publique */
  upload(file: File): Promise<string>;
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------- Mode démo (navigateur) ----------

const KEYS = { exercises: "lyb.content.exercises", wods: "lyb.content.wods" };

function readList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeList(key: string, list: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    throw new Error("Stockage du navigateur plein : utilise des images plus légères ou un lien vidéo.");
  }
}

function upsert<T extends { id: string }>(key: string, item: T) {
  const list = readList<T>(key).filter((x) => x.id !== item.id);
  writeList(key, [...list, item]);
}

/** En mode démo, les photos sont redimensionnées (1200 px max) et gardées dans le navigateur. */
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = URL.createObjectURL(file);
  });
}

const localRepo: ContentRepo = {
  mode: "local",
  listExercises: async () => readList<Exercise>(KEYS.exercises),
  saveExercise: async (ex) => upsert(KEYS.exercises, ex),
  deleteExercise: async (id) => writeList(KEYS.exercises, readList<Exercise>(KEYS.exercises).filter((x) => x.id !== id)),
  listWods: async () => readList<CustomWod>(KEYS.wods),
  saveWod: async (wod) => upsert(KEYS.wods, wod),
  deleteWod: async (id) => writeList(KEYS.wods, readList<CustomWod>(KEYS.wods).filter((x) => x.id !== id)),
  upload: async (file) => {
    if (!file.type.startsWith("image/")) throw new Error("En mode démo, seules les photos peuvent être envoyées. Pour une vidéo, colle un lien.");
    return imageToDataUrl(file);
  },
};

// ---------- Supabase ----------

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function supabaseRepo(sb: SupabaseClient): ContentRepo {
  return {
    mode: "supabase",
    listExercises: async () => (check(await sb.from("exercises").select("data")) as { data: Exercise }[]).map((r) => r.data),
    saveExercise: async (ex) => void check(await sb.from("exercises").upsert({ id: ex.id, data: ex })),
    deleteExercise: async (id) => void check(await sb.from("exercises").delete().eq("id", id)),
    listWods: async () => (check(await sb.from("wods").select("data")) as { data: CustomWod }[]).map((r) => r.data),
    saveWod: async (wod) => void check(await sb.from("wods").upsert({ id: wod.id, data: wod })),
    deleteWod: async (id) => void check(await sb.from("wods").delete().eq("id", id)),
    upload: async (file) => {
      const path = `${newId()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, "-")}`;
      check(await sb.storage.from("media").upload(path, file, { contentType: file.type }));
      return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
    },
  };
}

export function contentRepo(): ContentRepo {
  const sb = supabase();
  return sb ? supabaseRepo(sb) : localRepo;
}
