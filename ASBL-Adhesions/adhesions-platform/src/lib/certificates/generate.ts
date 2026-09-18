import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { Member } from "@/lib/types";

export interface CertificateInput {
  member: Pick<Member, "nom" | "montant">;
  datePaiement: string; // ISO
  anneeFiscale?: number;
}

/**
 * Génère un PDF d'attestation fiscale à partir d'un membre et des infos de
 * l'ASBL (env). Par défaut, le PDF porte un filigrane "BROUILLON — À VALIDER"
 * tant que CERTIFICATES_VALIDATED n'est pas activé : ce document ne doit
 * jamais être envoyé tel quel sans relecture du trésorier/comptable de l'ASBL,
 * les formats et seuils légaux d'attestation variant et changeant régulièrement.
 */
export async function generateCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const asblName = process.env.ASBL_NAME || "Mon ASBL";
  const asblAddress = process.env.ASBL_ADDRESS || "Adresse non renseignée";
  const asblRegistration = process.env.ASBL_REGISTRATION_NUMBER || "Numéro d'entreprise non renseigné";
  const isValidated = process.env.CERTIFICATES_VALIDATED === "1";

  const paymentDate = new Date(input.datePaiement);
  const fiscalYear = input.anneeFiscale ?? (Number.isNaN(paymentDate.getTime()) ? new Date().getFullYear() : paymentDate.getFullYear());
  const paymentDateFmt = Number.isNaN(paymentDate.getTime())
    ? input.datePaiement
    : paymentDate.toLocaleDateString("fr-FR");

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.06, 0.06, 0.06);
  const soft = rgb(0.35, 0.35, 0.35);

  let y = height - 80;
  const left = 60;

  page.drawText(asblName, { x: left, y, size: 18, font: fontBold, color: ink });
  y -= 20;
  page.drawText(asblAddress, { x: left, y, size: 10, font, color: soft });
  y -= 14;
  page.drawText(`Numéro d'entreprise : ${asblRegistration}`, { x: left, y, size: 10, font, color: soft });

  y -= 60;
  page.drawText("Attestation fiscale", { x: left, y, size: 22, font: fontBold, color: ink });
  y -= 40;

  const lines = [
    `L'ASBL ${asblName} atteste que :`,
    "",
    `Membre : ${input.member.nom}`,
    `Montant reçu : ${input.member.montant.toFixed(2)} €`,
    `Date de paiement : ${paymentDateFmt}`,
    `Année fiscale : ${fiscalYear}`,
  ];
  for (const line of lines) {
    page.drawText(line, { x: left, y, size: 12, font: line.includes(":") ? fontBold : font, color: ink });
    y -= 22;
  }

  y -= 30;
  const legalNote =
    "Ce document est généré automatiquement à partir des informations enregistrées par l'ASBL. Il doit être relu et validé par le trésorier ou le comptable de l'ASBL avant tout envoi : les formats et seuils légaux d'attestation fiscale varient selon le pays, la région et le type de don ou de cotisation, et changent régulièrement.";
  page.drawText(wrapText(legalNote, 90), { x: left, y, size: 9, font, color: soft, lineHeight: 12 });

  if (!isValidated) {
    page.drawText("BROUILLON — À VALIDER", {
      x: width / 2 - 180,
      y: height / 2,
      size: 42,
      font: fontBold,
      color: rgb(0.85, 0.2, 0.2),
      opacity: 0.25,
      rotate: degrees(35),
    });
    y -= 40;
    page.drawText("Brouillon — à faire valider par le trésorier/comptable de l'ASBL avant tout envoi.", {
      x: left,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.7, 0.15, 0.15),
    });
  }

  return doc.save();
}

function wrapText(text: string, maxCharsPerLine: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = w;
    } else {
      current += " " + w;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join("\n");
}
