import { getValidAccessToken } from "./google";
import type { Member } from "@/lib/types";

/**
 * Intégration Google Sheets — source de vérité par défaut pour le suivi des
 * membres/cotisations quand MEMBERS_BACKEND=sheets.
 *
 * Attend une feuille avec l'en-tête (ligne 1) :
 *   Nom | Email | Statut | Date échéance | Montant | Dernière relance | Date paiement
 *
 * Configurée via GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SHEETS_SHEET_NAME.
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
  );
}

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID absent — ajoute l'ID de ton classeur dans .env.local.");
  return id;
}

function sheetName(): string {
  return process.env.GOOGLE_SHEETS_SHEET_NAME || "Membres";
}

const COLUMNS = ["Nom", "Email", "Statut", "Date échéance", "Montant", "Dernière relance", "Date paiement"] as const;

function statusFromCell(raw: string | undefined): Member["statut"] {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("retard")) return "en-retard";
  if (s.includes("impaye") || s.includes("impayé")) return "impaye";
  if (s.includes("proche")) return "proche-echeance";
  return "a-jour";
}

function rowToMember(row: string[], rowIndex: number): Member {
  const [nom, email, statut, dateEcheance, montant, derniereRelance, datePaiement] = row;
  return {
    id: `row-${rowIndex}`,
    nom: nom || "Membre sans nom",
    email: email || "",
    statut: statusFromCell(statut),
    dateEcheance: dateEcheance || "",
    montant: Number(montant || 0),
    derniereRelance: derniereRelance || null,
    datePaiement: datePaiement || null,
  };
}

async function sheetsGet<T>(pathSuffix: string): Promise<T> {
  const token = await getValidAccessToken();
  const res = await fetch(`${SHEETS_API}/${spreadsheetId()}${pathSuffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets ${res.status} : ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function sheetsPut<T>(pathSuffix: string, body: unknown): Promise<T> {
  const token = await getValidAccessToken();
  const res = await fetch(`${SHEETS_API}/${spreadsheetId()}${pathSuffix}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets ${res.status} : ${errText.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Lit tous les membres depuis la feuille (ligne 1 = en-tête, ignorée). */
export async function listMembers(): Promise<Member[]> {
  const range = `${sheetName()}!A2:G1000`;
  const data = await sheetsGet<{ values?: string[][] }>(`/values/${encodeURIComponent(range)}`);
  const rows = data.values ?? [];
  return rows
    .filter((r) => r.some((cell) => cell && cell.trim()))
    .map((row, i) => rowToMember(row, i + 2));
}

/**
 * Met à jour le statut (et éventuellement la date de paiement / dernière
 * relance) d'un membre repéré par son numéro de ligne (memberId = "row-<n>").
 */
export async function updateMemberStatus(
  memberId: string,
  fields: { statut?: Member["statut"]; datePaiement?: string; derniereRelance?: string }
): Promise<void> {
  const rowNumber = Number(memberId.replace(/^row-/, ""));
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error(`Identifiant de membre invalide pour Google Sheets : ${memberId}`);
  }

  if (fields.statut) {
    await sheetsPut(`/values/${encodeURIComponent(`${sheetName()}!C${rowNumber}`)}?valueInputOption=RAW`, {
      values: [[fields.statut]],
    });
  }
  if (fields.derniereRelance) {
    await sheetsPut(`/values/${encodeURIComponent(`${sheetName()}!F${rowNumber}`)}?valueInputOption=RAW`, {
      values: [[fields.derniereRelance]],
    });
  }
  if (fields.datePaiement) {
    await sheetsPut(`/values/${encodeURIComponent(`${sheetName()}!G${rowNumber}`)}?valueInputOption=RAW`, {
      values: [[fields.datePaiement]],
    });
  }
}

/** Écrit l'en-tête standard si la feuille est vide (setup initial). */
export async function ensureHeaderRow(): Promise<void> {
  const range = `${sheetName()}!A1:G1`;
  const existing = await sheetsGet<{ values?: string[][] }>(`/values/${encodeURIComponent(range)}`);
  if (existing.values && existing.values.length > 0) return;
  await sheetsPut(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    values: [COLUMNS as unknown as string[]],
  });
}
