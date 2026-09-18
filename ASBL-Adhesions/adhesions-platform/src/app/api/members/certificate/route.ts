import { NextResponse } from "next/server";
import { listMembers } from "@/lib/members";
import { generateCertificatePdf } from "@/lib/certificates/generate";

export const runtime = "nodejs";

/** Génère (et retourne) le PDF d'attestation fiscale d'un membre payé. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const memberId: string | undefined = body.memberId;
  if (!memberId) {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 });
  }

  const { members } = await listMembers();
  const member = members.find((m) => m.id === memberId);
  if (!member) {
    return NextResponse.json({ error: `Membre "${memberId}" introuvable` }, { status: 404 });
  }

  const datePaiement = member.datePaiement || new Date().toISOString().slice(0, 10);
  const pdfBytes = await generateCertificatePdf({ member, datePaiement });

  const filename = `attestation-${member.nom.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
