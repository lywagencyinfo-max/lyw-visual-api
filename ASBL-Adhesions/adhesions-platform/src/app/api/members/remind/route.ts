import { NextResponse } from "next/server";
import { listMembers, updateMemberStatus, reminderCadence } from "@/lib/members";
import { sendEmail, buildReminderEmail } from "@/lib/integrations/gmailSend";
import { isGoogleConfigured } from "@/lib/integrations/google";

export const runtime = "nodejs";

/**
 * Envoie une relance de cotisation (cadence J-30/J-15/J+7 déterminée
 * automatiquement) à un ou plusieurs membres via Gmail. Sans Google connecté,
 * renvoie le brouillon d'email sans l'envoyer (mode démo).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
  if (memberIds.length === 0) {
    return NextResponse.json({ error: "memberIds requis (tableau non vide)" }, { status: 400 });
  }

  const asblName = process.env.ASBL_NAME || "Mon ASBL";
  const { members } = await listMembers();
  const targets = members.filter((m) => memberIds.includes(m.id));
  const canSend = isGoogleConfigured();

  const results = await Promise.all(
    targets.map(async (member) => {
      const cadence = reminderCadence(member.dateEcheance) ?? "j-15";
      const draft = buildReminderEmail({
        nom: member.nom,
        montant: member.montant,
        dateEcheance: member.dateEcheance,
        cadence,
        asblName,
      });

      if (!canSend) {
        return { memberId: member.id, sent: false, cadence, draft, reason: "Google non connecté — brouillon uniquement (mode démo)." };
      }

      try {
        await sendEmail({ to: member.email, subject: draft.subject, body: draft.body });
        const today = new Date().toISOString().slice(0, 10);
        await updateMemberStatus(member.id, { derniereRelance: today });
        return { memberId: member.id, sent: true, cadence, draft };
      } catch (e) {
        return { memberId: member.id, sent: false, cadence, draft, reason: e instanceof Error ? e.message : "Erreur d'envoi" };
      }
    })
  );

  return NextResponse.json({ results });
}
