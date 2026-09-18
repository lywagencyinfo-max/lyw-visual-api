export type CotisationStatus = "a-jour" | "proche-echeance" | "en-retard" | "impaye";

export interface Member {
  id: string;
  nom: string;
  email: string;
  statut: CotisationStatus;
  dateEcheance: string; // ISO yyyy-mm-dd
  montant: number; // en euros
  derniereRelance: string | null; // ISO date ou null si jamais relancé
  datePaiement?: string | null; // ISO date, rempli une fois payé
}

export interface AgentMeta {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  model: string;
  tools: string[];
  systemPrompt: string;
}
