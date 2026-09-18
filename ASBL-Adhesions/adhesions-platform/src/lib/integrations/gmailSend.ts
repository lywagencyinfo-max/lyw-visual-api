import { getValidAccessToken } from "./google";

/**
 * Envoi de mails via Gmail API (scope gmail.send) — utilisé pour les emails
 * de relance de cotisation et l'envoi des attestations fiscales en pièce jointe.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string; // texte brut ou HTML
  isHtml?: boolean;
  cc?: string[];
  bcc?: string[];
  /** Pièces jointes (content = base64), ex. une attestation en PDF. */
  attachments?: { filename: string; content: string; mimeType?: string }[];
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
  sentAt: string;
}

function encodeRfc2047(s: string): string {
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  const b64 = Buffer.from(s, "utf-8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function buildMimeMessage(p: SendEmailParams, from: string): string {
  const boundary = `adhesions-${Date.now()}`;
  const headers: string[] = [
    `From: ${from}`,
    `To: ${p.to}`,
    ...(p.cc?.length ? [`Cc: ${p.cc.join(", ")}`] : []),
    ...(p.bcc?.length ? [`Bcc: ${p.bcc.join(", ")}`] : []),
    `Subject: ${encodeRfc2047(p.subject)}`,
    "MIME-Version: 1.0",
  ];

  if (p.attachments?.length) {
    const mixed = `mixed-${boundary}`;
    const parts: string[] = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      "",
      `--${mixed}`,
      `Content-Type: ${p.isHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
      "Content-Transfer-Encoding: 8bit",
      "",
      p.body,
      "",
    ];
    for (const a of p.attachments) {
      const b64 = a.content.replace(/(.{76})/g, "$1\r\n");
      parts.push(
        `--${mixed}`,
        `Content-Type: ${a.mimeType ?? "application/octet-stream"}; name="${a.filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${a.filename}"`,
        "",
        b64,
        ""
      );
    }
    parts.push(`--${mixed}--`);
    return parts.join("\r\n");
  }

  if (p.isHtml) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const plain = p.body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    return [
      ...headers,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      plain,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      p.body,
      "",
      `--${boundary}--`,
    ].join("\r\n");
  }

  return [
    ...headers,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    p.body,
  ].join("\r\n");
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getUserEmail(): Promise<string> {
  const token = await getValidAccessToken();
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return "me";
  const data = await res.json();
  return data.email || "me";
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const token = await getValidAccessToken();
  const from = await getUserEmail();
  const mime = buildMimeMessage(params, from);
  const raw = base64UrlEncode(Buffer.from(mime, "utf-8"));

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send ${res.status} : ${errText.slice(0, 400)}`);
  }
  const data = await res.json();
  return {
    messageId: data.id,
    threadId: data.threadId,
    sentAt: new Date().toISOString(),
  };
}

/**
 * Construit le texte de relance selon la cadence CotisAuto™ (J-30 doux, J-15
 * direct, J+7 après échéance ferme mais courtois). Utilisé par l'API
 * /api/members/remind et par le chat pour rester cohérent partout.
 */
export function buildReminderEmail(params: {
  nom: string;
  montant: number;
  dateEcheance: string; // ISO
  cadence: "j-30" | "j-15" | "j+7";
  asblName: string;
}): { subject: string; body: string } {
  const dateFmt = new Date(params.dateEcheance).toLocaleDateString("fr-FR");
  const opt = `\n\nVous ne souhaitez plus recevoir ces rappels ? Répondez simplement "stop relances" et nous en tiendrons compte.`;

  if (params.cadence === "j-30") {
    return {
      subject: `Votre cotisation ${params.asblName} arrive bientôt à échéance`,
      body: `Bonjour ${params.nom},\n\nVotre cotisation annuelle de ${params.montant} € arrive à échéance le ${dateFmt}. Pas d'inquiétude, c'est juste un petit rappel amical.\n\nVous pouvez la régler par virement (RIB disponible sur simple demande) ou via le lien de paiement habituel.\n\nSi vous avez déjà réglé, merci d'ignorer ce message.${opt}\n\nBien à vous,\nL'équipe de ${params.asblName}`,
    };
  }
  if (params.cadence === "j-15") {
    return {
      subject: `Rappel — cotisation ${params.asblName} à régler avant le ${dateFmt}`,
      body: `Bonjour ${params.nom},\n\nVotre cotisation de ${params.montant} € doit être réglée avant le ${dateFmt}. N'hésitez pas à répondre à ce message si vous avez la moindre question sur le paiement.\n\nSi c'est déjà fait, merci d'ignorer ce message.${opt}\n\nBien à vous,\nL'équipe de ${params.asblName}`,
    };
  }
  return {
    subject: `Votre cotisation ${params.asblName} est en attente de règlement`,
    body: `Bonjour ${params.nom},\n\nNous n'avons pas encore reçu votre cotisation de ${params.montant} €, dont l'échéance était le ${dateFmt}. Pourriez-vous la régulariser dès que possible ? Si un souci empêche le paiement, répondez-nous simplement, nous trouverons une solution ensemble.${opt}\n\nBien à vous,\nL'équipe de ${params.asblName}`,
  };
}
