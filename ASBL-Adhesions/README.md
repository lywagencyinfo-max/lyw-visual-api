# Julie — Agent adhésions & cotisations · Agent IA (template ASBL)

Ton agent IA prêt à l'emploi, à ouvrir dans **Claude Code**.

## Démarrer en 3 étapes

1. Ouvre **ce dossier** dans Claude Code.
2. Dans le terminal :
   ```bash
   cd adhesions-platform
   cp .env.example .env.local     # puis colle ta clé Anthropic dans .env.local
   npm install
   npm run dev
   ```
3. Ouvre **http://localhost:3000** → tu arrives direct sur l'interface de **Julie**.

Ta clé Anthropic : https://console.anthropic.com → API Keys.

## Ce que fait Julie

Agent adhésions & cotisations — moteur du système **CotisAuto™** : détection des échéances, relances par email, suivi des paiements (Google Sheets / Airtable) et génération de brouillons d'attestations fiscales.

## 100 % vierge

Aucune clé, aucun historique, aucune donnée d'origine. Tout est à toi :
- Remplace les informations de ton ASBL (`ASBL_NAME`, `ASBL_ADDRESS`, `ASBL_REGISTRATION_NUMBER`) dans `adhesions-platform/.env.local`.
- Le tableau des membres démarre avec des données d'exemple (`src/data/mockMembers.ts`) — connecte Google Sheets ou Airtable pour passer sur tes vraies données.

Clés éventuelles selon les fonctionnalités : voir `adhesions-platform/.env.example`.

## ⚠️ Important — attestations fiscales

Les attestations générées par Julie sont **des brouillons à faire valider par le trésorier/comptable de l'ASBL** avant tout envoi. Les formats et seuils légaux d'une attestation fiscale varient selon le pays, la région et le type de don ou de cotisation, et changent régulièrement — Julie n'est pas une source légale faisant foi.
