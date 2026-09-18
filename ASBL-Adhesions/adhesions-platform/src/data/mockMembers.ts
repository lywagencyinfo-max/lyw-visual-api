import type { Member } from "@/lib/types";

/**
 * Membres d'exemple — 100 % fictifs. Sert de source par défaut quand aucun
 * backend (Google Sheets / Airtable) n'est configuré via MEMBERS_BACKEND.
 * Remplacé automatiquement dès que le backend actif répond.
 */
export const MOCK_MEMBERS: Member[] = [
  {
    id: "mbr-001",
    nom: "Isabelle Dupont",
    email: "isabelle.dupont@example.org",
    statut: "proche-echeance",
    dateEcheance: "2026-10-18",
    montant: 35,
    derniereRelance: null,
  },
  {
    id: "mbr-002",
    nom: "Marc Lefèvre",
    email: "marc.lefevre@example.org",
    statut: "proche-echeance",
    dateEcheance: "2026-10-03",
    montant: 35,
    derniereRelance: "2026-09-18",
  },
  {
    id: "mbr-003",
    nom: "Sophie Nguyen",
    email: "sophie.nguyen@example.org",
    statut: "en-retard",
    dateEcheance: "2026-09-05",
    montant: 50,
    derniereRelance: "2026-09-12",
  },
  {
    id: "mbr-004",
    nom: "Amine Belkacem",
    email: "amine.belkacem@example.org",
    statut: "a-jour",
    dateEcheance: "2027-03-01",
    montant: 35,
    derniereRelance: "2026-01-20",
    datePaiement: "2026-01-22",
  },
  {
    id: "mbr-005",
    nom: "Claire Vandenberghe",
    email: "claire.vandenberghe@example.org",
    statut: "impaye",
    dateEcheance: "2026-08-01",
    montant: 50,
    derniereRelance: "2026-09-08",
  },
];
