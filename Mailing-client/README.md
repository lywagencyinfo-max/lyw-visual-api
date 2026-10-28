# Agent Mailing : Google Sheets + Gmail

Un agent qui envoie la campagne de 5 semaines **tout seul**, depuis l'adresse du client.
**Rien à installer** : tout se passe dans un Google Sheet.

- Chaque destinataire reçoit **son propre e-mail personnalisé** (pas de CC ni de CCI).
- L'agent envoie chaque semaine **à la date prévue**, sans que tu aies besoin d'ouvrir le fichier.
- **Jamais deux fois le même e-mail** à la même personne.
- Doublons, adresses mal écrites et désinscrits sont écartés automatiquement.
- Suivi en direct : colonne « Statut » et onglet « Journal ».

---

## Installation (10 minutes, une seule fois)

1. Va sur **sheets.google.com** → **Feuille de calcul vierge**. Connecte-toi avec le compte Google qui va envoyer (voir « Quelle adresse ? » plus bas).
2. Menu **Extensions → Apps Script**.
3. Efface tout le contenu, colle le contenu du fichier **`Code.gs`**, puis clique sur 💾 **Enregistrer**.
4. Reviens dans le Google Sheet et **recharge la page** (F5). Le menu **📧 Mailing** apparaît en haut.
5. **📧 Mailing → 1. Préparer le fichier**. Google demande une autorisation la première fois :
   *Continuer → choisir le compte → Paramètres avancés → Accéder au projet (non sécurisé) → Autoriser.*
   L'écran « non sécurisé » est normal : c'est ton propre script, pas une appli publiée.
6. Les onglets sont créés. Il ne reste qu'à les remplir.

## Remplir les onglets

| Onglet | Quoi mettre |
|---|---|
| **Réglages** | Nom de l'expéditeur, adresse d'envoi, ton e-mail de test |
| **Contacts** | La liste du client, à coller depuis Excel. La colonne `email` est obligatoire ; ajoute les colonnes que tu veux (prenom, societe…) |
| **Campagne** | Une ligne par semaine : **date d'envoi**, **sujet**, **message** |
| **Désinscrits** | Les adresses qui ne doivent plus rien recevoir |
| **Journal** | Rempli par l'agent : qui a reçu quoi et quand |

**Écrire les messages** : tape le texte normalement dans la cellule (Alt + Entrée pour aller à la ligne). Les liens `https://…` deviennent cliquables tout seuls. Tu peux aussi coller du HTML, par exemple un design exporté de Canva ou Stripo.

**Personnalisation** : `{{prenom}}`, `{{societe}}`… avec une valeur de secours si la case est vide : `Bonjour {{prenom|Madame, Monsieur}},`

Un lien de désinscription est ajouté automatiquement en bas de chaque e-mail.

## Lancer la campagne

1. **📧 Mailing → Vérifier la liste et le quota** : compte les contacts valides et les adresses écartées.
2. **📧 Mailing → 2. Envoyer un e-mail de test** : tu le reçois tel que le destinataire le verra. Vérifie aussi les spams et l'affichage sur téléphone.
3. **📧 Mailing → 4. ▶ Activer l'agent automatique**. C'est tout.

L'agent passe ensuite **toutes les heures, entre 8h et 19h**. Dès que la date d'une semaine est arrivée, il envoie. Si le quota Gmail du jour est atteint, il continue le lendemain là où il s'est arrêté. Tu peux fermer le fichier et l'ordinateur.

- Pour envoyer tout de suite sans attendre : **3. Envoyer maintenant les e-mails prévus**.
- Pour tout stopper : **5. ⏸ Arrêter l'agent automatique**.
- Pour **changer une date**, modifie la cellule : l'agent en tient compte au passage suivant.

## Quelle adresse ? (important)

**A. Le client a une adresse Gmail ou Google Workspace**
Le plus simple : crée le Google Sheet **avec le compte du client** (ou demande-lui de le faire et de te le partager). Laisse « Adresse expéditeur » vide.

**B. Le client a une autre adresse (OVH, Microsoft 365, Combell, Infomaniak…)**
Ajoute son adresse dans un compte Gmail (le tien ou un Gmail créé pour lui) :
Gmail → ⚙️ Paramètres → **Comptes et importation** → **Envoyer des e-mails en tant que** → *Ajouter une autre adresse e-mail*. Décoche « Traiter comme un alias », puis entre le serveur SMTP du client (fourni par son hébergeur). Gmail envoie alors **via le serveur du client** et l'e-mail part bien de son adresse.
Ensuite, mets cette adresse dans « Adresse expéditeur » dans l'onglet Réglages.

## Limites de Google

| Compte | E-mails / jour |
|---|---|
| Gmail gratuit | **100** |
| Google Workspace | **1 500** |

Avec 450 contacts sur un Gmail gratuit, chaque semaine part donc sur 5 jours ; l'agent gère ça tout seul. Le menu « Vérifier » affiche le quota restant. Pour une grosse liste, mieux vaut un compte Google Workspace.

## Désinscriptions et RGPD
- Quand quelqu'un répond « STOP » ou clique sur le lien, ajoute son adresse dans l'onglet **Désinscrits**. Elle est exclue dès le passage suivant.
- Les e-mails commerciaux demandent le **consentement** des destinataires, ou une relation client existante. Fais confirmer par le client que sa liste respecte bien ça.

## Conseils anti-spam
- Toujours un test d'abord.
- Peu d'images, pas de pièce jointe, un lien principal.
- Domaine du client : demande à son hébergeur de vérifier **SPF, DKIM et DMARC**.
