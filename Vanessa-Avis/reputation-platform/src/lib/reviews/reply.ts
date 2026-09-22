import type { Review } from "@/lib/types";

/**
 * Génère un brouillon de réponse sans appel à Claude (mode démo ou fallback
 * si ANTHROPIC_API_KEY absente). Reproduit les règles ReputAuto™ : ton
 * chaleureux + détail précis pour un avis positif, ton empathique jamais
 * défensif + contact direct hors-ligne pour un avis négatif/crise. Ne publie
 * jamais rien — c'est toujours un brouillon à valider.
 */
export function buildMockDraftReply(
  review: Review,
  businessName: string,
  contactEmail: string
): string {
  const firstName = review.auteur.split(" ")[0] || review.auteur;

  if (review.sentiment === "positif") {
    // Extrait un fragment du texte pour citer un détail précis, sans inventer.
    const snippet = review.texte.split(/[.!]/)[0]?.trim().slice(0, 90) || review.texte.slice(0, 90);
    return `Bonjour ${firstName}, merci infiniment pour ce message qui nous fait très plaisir ! Nous sommes ravis que « ${snippet} » vous ait marqué·e — c'est exactement ce qu'on cherche à offrir. Au plaisir de vous accueillir de nouveau bientôt !\n\n— L'équipe ${businessName}`;
  }

  if (review.sentiment === "neutre") {
    return `Bonjour ${firstName}, merci d'avoir pris le temps de partager votre expérience. Nous notons vos remarques et allons voir comment nous améliorer sur ce point. N'hésitez pas à nous écrire à ${contactEmail} si vous souhaitez nous en dire plus.\n\n— L'équipe ${businessName}`;
  }

  // "crise" : empathique, jamais défensif, ne nie aucun fait rapporté,
  // propose un contact direct hors-ligne. Relecture humaine obligatoire.
  return `Bonjour ${firstName}, nous sommes sincèrement désolés pour cette expérience — ce n'est clairement pas le niveau que nous souhaitons offrir. Nous aimerions en discuter directement avec vous pour comprendre ce qui s'est passé et trouver une solution : pourriez-vous nous contacter à ${contactEmail} ou par téléphone ? Merci de nous donner l'occasion de faire mieux.\n\n— L'équipe ${businessName}\n\n[⚠️ Brouillon à relire avant publication — avis classé "crise"]`;
}
