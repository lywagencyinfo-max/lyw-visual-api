import { NextResponse } from "next/server";
import { listMembers } from "@/lib/members";

export const runtime = "nodejs";

/** Tire la liste des membres depuis le backend actif (Sheets/Airtable) ou les données d'exemple. */
export async function GET() {
  const { members, backend } = await listMembers();
  return NextResponse.json({ members, backend, syncedAt: new Date().toISOString() });
}
