# Mailing client : envoi depuis l'adresse e-mail du client

Un petit outil pour envoyer une campagne de 5 e-mails (1 par semaine) **depuis la boîte mail du client**, sans Mailchimp ni Brevo.
Chaque destinataire reçoit **son propre e-mail, personnalisé** (pas de CC ni de CCI visibles).

Il suffit d'avoir **Python 3** (gratuit : https://www.python.org/downloads/, cocher « Add Python to PATH » sous Windows). Rien d'autre à installer.

## Mise en place (une seule fois)

1. **Configuration** : copie `config.exemple.ini` en `config.ini` et complète-le avec les infos de la boîte du client (voir le tableau plus bas).
2. **Contacts** : remplace `contacts.csv` par la liste du client. Depuis Excel : *Enregistrer sous → CSV*.
   - Une seule colonne est obligatoire : `email`.
   - Toutes les autres colonnes (`prenom`, `societe`, etc.) peuvent servir dans les textes.
   - Les doublons, les adresses mal formées et les désinscrits sont écartés automatiquement.
3. **Textes** : modifie `campagne/semaine1.html` … `semaine5.html`.
   - **1re ligne = le sujet** : `Sujet: Votre offre de novembre`
   - La suite, c'est le corps en HTML. Tu peux aussi coller le HTML exporté depuis Canva, Stripo, etc.
   - Personnalisation : `{{prenom}}`, `{{societe}}`… Avec une valeur de secours si la case est vide : `{{prenom|Madame, Monsieur}}`.
   - Un lien de désinscription est ajouté automatiquement en bas de chaque e-mail.

## Chaque semaine

Double-clique sur **`lancer-windows.bat`** (ou `lancer-mac.command` sur Mac), ou tape `python mailing.py`.

```
1. Vérifier la liste et la connexion   → à faire la 1re fois
2. Générer un aperçu                   → crée apercu_semaineX.html à ouvrir dans le navigateur
3. Envoyer un e-mail de test           → reçu sur ton adresse email_test
4. Envoyer une campagne                → envoi à toute la liste (confirmation « OUI »)
5. Voir l'avancement
```

Version ligne de commande : `python mailing.py envoyer semaine2`.

### Sécurités intégrées
- **Jamais deux fois le même e-mail** : chaque envoi est noté dans `journal/semaineX.csv`. Si tu coupes le programme, si la connexion tombe ou si le PC s'éteint, il suffit de relancer : l'envoi reprend où il s'est arrêté.
- **Limite par jour** : si la liste dépasse la limite du fournisseur, l'outil s'arrête tout seul. Le lendemain, relance-le et il envoie la suite.
- **Pause entre les envois** (8 s par défaut) : sans elle, Gmail ou Outlook bloquent la boîte.
- Le mot de passe est demandé au lancement s'il n'est pas dans `config.ini`.

### Désinscriptions
Quand quelqu'un répond « STOP » ou clique sur le lien de désinscription, ajoute son adresse dans `desinscrits.txt`, une par ligne. Elle sera exclue des envois suivants. **Pense à le faire avant chaque nouvel envoi.**

## Réglages selon le fournisseur du client

| Fournisseur | hote | port | securite | Limite conseillée / jour |
|---|---|---|---|---|
| Gmail (@gmail.com) | smtp.gmail.com | 465 | ssl | 400 |
| Google Workspace (domaine pro) | smtp.gmail.com | 465 | ssl | 1500 |
| Microsoft 365 / Outlook pro | smtp.office365.com | 587 | starttls | 2000 |
| OVH (MX Plan / Email Pro) | ssl0.ovh.net | 465 | ssl | 200 |
| Infomaniak | mail.infomaniak.com | 465 | ssl | à vérifier |
| Autre hébergeur | voir les « paramètres SMTP » dans l'espace client de l'hébergeur | | | |

**Gmail / Google Workspace** : il faut un **mot de passe d'application**, pas le mot de passe habituel.
Compte Google → Sécurité → activer la validation en 2 étapes → « Mots de passe des applications » → en créer un et le coller dans `config.ini`.

**Microsoft 365** : l'administrateur doit autoriser « SMTP authentifié » pour cette boîte (Centre d'administration → Utilisateurs → la boîte → Courrier → Gérer les applications de messagerie). Les adresses Outlook.com/Hotmail personnelles ne sont pas adaptées : Microsoft y bloque ce type d'envoi.

## Conseils pour éviter le dossier spam
- Commence par **un test** (option 3) et vérifie l'affichage sur téléphone et dans le dossier spam.
- Si la liste dépasse quelques centaines d'adresses, **étale le 1er envoi** sur 2-3 jours (baisse `limite_par_jour`) : une boîte qui envoie d'un coup beaucoup plus que d'habitude paraît suspecte.
- Peu d'images, pas de pièce jointe, un seul lien principal.
- Si le client a son propre nom de domaine, demande à son hébergeur de vérifier que **SPF, DKIM et DMARC** sont configurés.

## RGPD
Envoyer des e-mails commerciaux demande le **consentement** des destinataires, ou une relation client existante pour des produits similaires. Fais confirmer par le client que sa liste respecte bien ça. Le lien de désinscription et `desinscrits.txt` couvrent l'obligation de permettre de refuser les envois.
