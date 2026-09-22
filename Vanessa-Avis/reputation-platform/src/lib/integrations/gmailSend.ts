import { getValidAccessToken } from "./google";
import type { Review } from "@/lib/types";

/**
 * Envoi de mails via Gmail API (scope gmail.send) — utilisé uniquement pour
 * les alertes de réputation ReputAuto™ (nouvel avis ≤ seuil, ou chute de la
 * note moyenne). Jamais utilisé pour publier une réponse à un avis — ça,
 * c'est le rôle exclusif de googleBusinessProfile.replyToReview.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string; // texte brut ou HTML
  isHtml?: boolean;
  cc?: string[];
  bcc?: string[];
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
  const boundary = `reputauto-${Date.now()}`;
  const headers: string[] = [
    `From: ${from}`,
    `To: ${p.to}`,
    ...(p.cc?.length ? [`Cc: ${p.cc.join(", ")}`] : []),
    ...(p.bcc?.length ? [`Bcc: ${p.bcc.join(", ")}`] : []),
    `Subject: ${encodeRfc2047(p.subject)}`,
    "MIME-Version: 1.0",
  ];

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
 * Construit l'email d'alerte pour un nouvel avis ≤ seuil (ex. ≤ 2 étoiles).
 */
export function buildNegativeReviewAlertEmail(review: Review, businessName: string): { subject: string; body: string } {
  const dateFmt = new Date(review.date).toLocaleDateString("fr-FR");
  return {
    subject: `⚠️ Nouvel avis ${review.note}★ sur Google — ${businessName}`,
    body: `Bonjour,\n\nUn nouvel avis nécessitant votre attention vient d'être publié sur votre fiche Google Business Profile.\n\nAuteur : ${review.auteur}\nNote : ${review.note}/5\nDate : ${dateFmt}\n\n« ${review.texte} »\n\nVanessa a préparé un brouillon de réponse empathique dans l'onglet Avis — il doit être relu et validé avant toute publication, en particulier pour un avis de ce niveau.\n\n— Vanessa, agent ReputAuto™`,
  };
}

/**
 * Construit l'email d'alerte de baisse significative de la note moyenne.
 */
export function buildRatingDropAlertEmail(params: {
  businessName: string;
  averageRecent: number;
  averagePrevious: number;
  dropFraction: number;
}): { subject: string; body: string } {
  const pct = Math.round(params.dropFraction * 100);
  return {
    subject: `⚠️ Baisse de la note moyenne Google — ${params.businessName}`,
    body: `Bonjour,\n\nLa note moyenne de votre fiche Google Business Profile a baissé de façon significative sur la période récente.\n\nNote moyenne période précédente : ${params.averagePrevious.toFixed(1)}/5\nNote moyenne période récente : ${params.averageRecent.toFixed(1)}/5\nBaisse : -${pct} %\n\nNous vous recommandons de consulter les derniers avis dans l'onglet Avis pour identifier la cause et répondre rapidement, avant que la situation ne s'aggrave.\n\n— Vanessa, agent ReputAuto™`,
  };
}
