import type { Member } from "@/lib/types";

/**
 * Intégration Airtable — source de vérité alternative aux Google Sheets pour
 * le suivi des membres/cotisations, quand MEMBERS_BACKEND=airtable.
 * Nécessite un Personal Access Token AIRTABLE_API_KEY (.env.local) avec les
 * scopes data.records:read + data.records:write + schema.bases:read sur la
 * base AIRTABLE_BASE_ID.
 */

const API = "https://api.airtable.com/v0";

export function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

function token(): string {
  const t = process.env.AIRTABLE_API_KEY;
  if (!t) throw new Error("AIRTABLE_API_KEY absent — ajoute ton Personal Access Token Airtable dans .env.local.");
  return t;
}

function baseId(): string {
  const b = process.env.AIRTABLE_BASE_ID;
  if (!b) throw new Error("AIRTABLE_BASE_ID absent — ajoute l'ID de ta base Airtable dans .env.local.");
  return b;
}

function tableName(): string {
  return process.env.AIRTABLE_TABLE_NAME || "Membres";
}

async function at<T>(pathSuffix: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${pathSuffix}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Airtable ${res.status} : ${body.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

function statusFromField(raw: unknown): Member["statut"] {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("retard")) return "en-retard";
  if (s.includes("impaye") || s.includes("impayé")) return "impaye";
  if (s.includes("proche")) return "proche-echeance";
  return "a-jour";
}

function recordToMember(r: AirtableRecord): Member {
  const f = r.fields;
  return {
    id: r.id,
    nom: String(f.Nom ?? f.nom ?? "Membre sans nom"),
    email: String(f.Email ?? f.email ?? ""),
    statut: statusFromField(f.Statut ?? f.statut),
    dateEcheance: String(f["Date échéance"] ?? f.dateEcheance ?? ""),
    montant: Number(f.Montant ?? f.montant ?? 0),
    derniereRelance: (f["Dernière relance"] ?? f.derniereRelance ?? null) as string | null,
    datePaiement: (f["Date paiement"] ?? f.datePaiement ?? null) as string | null,
  };
}

/** Liste tous les membres de la table configurée (pagination gérée). */
export async function listMembers(): Promise<Member[]> {
  const out: AirtableRecord[] = [];
  let offset: string | undefined;
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ pageSize: "100" });
    if (offset) q.set("offset", offset);
    const j = await at<{ records: AirtableRecord[]; offset?: string }>(
      `/${baseId()}/${encodeURIComponent(tableName())}?${q.toString()}`
    );
    out.push(...(j.records ?? []));
    if (!j.offset) break;
    offset = j.offset;
  }
  return out.map(recordToMember);
}

/** Met à jour le statut de cotisation (et éventuellement la date de paiement) d'un membre. */
export async function updateMemberStatus(
  memberId: string,
  fields: { statut?: Member["statut"]; datePaiement?: string; derniereRelance?: string }
): Promise<Member> {
  const payload: Record<string, unknown> = {};
  if (fields.statut) payload["Statut"] = fields.statut;
  if (fields.datePaiement) payload["Date paiement"] = fields.datePaiement;
  if (fields.derniereRelance) payload["Dernière relance"] = fields.derniereRelance;

  const r = await at<AirtableRecord>(`/${baseId()}/${encodeURIComponent(tableName())}/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: payload }),
  });
  return recordToMember(r);
}
