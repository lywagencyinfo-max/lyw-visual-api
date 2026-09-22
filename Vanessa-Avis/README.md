# Vanessa — Agent avis Google & réputation · Agent IA (template)

Ton agent IA prêt à l'emploi, à ouvrir dans **Claude Code**.

## Démarrer en 3 étapes

1. Ouvre **ce dossier** dans Claude Code.
2. Dans le terminal :
   ```bash
   cd reputation-platform
   cp .env.example .env.local     # puis colle ta clé Anthropic dans .env.local
   npm install
   npm run dev
   ```
3. Ouvre **http://localhost:3000** → tu arrives direct sur l'interface de **Vanessa**.

Ta clé Anthropic : https://console.anthropic.com → API Keys.

## Ce que fait Vanessa

Agent gestion des avis Google / réputation — moteur du système **ReputAuto™** : détection des nouveaux avis sur votre Google Business Profile, analyse du sentiment et des signaux de crise, brouillons de réponse personnalisés et alertes email immédiates en cas d'avis sensible ou de chute de la note moyenne.

## 100 % vierge

Aucune clé, aucun historique, aucune donnée d'origine. Tout est à toi :
- Remplace les informations de ton établissement (`BUSINESS_NAME`, `BUSINESS_CONTACT_EMAIL`) dans `reputation-platform/.env.local`.
- Le tableau d'avis démarre avec des exemples fictifs (`src/data/mockReviews.ts`) — connecte ton Google Business Profile pour passer sur tes vrais avis.

Clés éventuelles selon les fonctionnalités : voir `reputation-platform/.env.example`.

## ⚠️ Important — publication des réponses

Vanessa ne publie **jamais** une réponse sur Google de façon autonome. Chaque réponse est un **brouillon** que vous relisez dans l'onglet **Avis**, puis publiez vous-même d'un clic explicite sur « Publier ». Pour un avis négatif ou classé « crise » (note basse, signal d'accusation grave…), la relecture est **obligatoire, sans exception**.
