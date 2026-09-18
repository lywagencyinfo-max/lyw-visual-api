import type { Member } from "@/lib/types";
import { MOCK_MEMBERS } from "@/data/mockMembers";
import * as sheets from "@/lib/integrations/googleSheets";
import * as airtable from "@/lib/integrations/airtable";

export type MembersBackend = "sheets" | "airtable" | "mock";

export function activeBackend(): MembersBackend {
  const configured = (process.env.MEMBERS_BACKEND || "").toLowerCase();
  if (configured === "sheets" && sheets.isGoogleSheetsConfigured()) return "sheets";
  if (configured === "airtable" && airtable.isAirtableConfigured()) return "airtable";
  return "mock";
}

/** Charge la liste des membres depuis le backend actif (ou les données d'exemple). */
export async function listMembers(): Promise<{ members: Member[]; backend: MembersBackend }> {
  const backend = activeBackend();
  try {
    if (backend === "sheets") return { members: await sheets.listMembers(), backend };
    if (backend === "airtable") return { members: await airtable.listMembers(), backend };
  } catch (e) {
    console.error(`[members] échec de lecture du backend "${backend}", retour au mode démo :`, e);
    return { members: MOCK_MEMBERS, backend: "mock" };
  }
  return { members: MOCK_MEMBERS, backend: "mock" };
}

/** Met à jour le statut d'un membre sur le backend actif. Pas d'effet en mode démo (mock). */
export async function updateMemberStatus(
  memberId: string,
  fields: { statut?: Member["statut"]; datePaiement?: string; derniereRelance?: string }
): Promise<{ ok: boolean; backend: MembersBackend }> {
  const backend = activeBackend();
  if (backend === "sheets") {
    await sheets.updateMemberStatus(memberId, fields);
    return { ok: true, backend };
  }
  if (backend === "airtable") {
    await airtable.updateMemberStatus(memberId, fields);
    return { ok: true, backend };
  }
  return { ok: false, backend };
}

/** Détermine la cadence de relance CotisAuto™ en fonction de la date d'échéance. */
export function reminderCadence(dateEcheance: string, today = new Date()): "j-30" | "j-15" | "j+7" | null {
  const due = new Date(dateEcheance);
  if (Number.isNaN(due.getTime())) return null;
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= -7) return "j+7";
  if (diffDays <= 15) return "j-15";
  if (diffDays <= 30) return "j-30";
  return null;
}
