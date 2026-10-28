#!/usr/bin/env python3
"""
Mailing client — envoi d'une campagne e-mail depuis l'adresse du client (SMTP).

Aucune installation nécessaire : uniquement Python 3.8+.

Utilisation :
    python mailing.py                      -> menu interactif
    python mailing.py verifier             -> contrôle la liste + la connexion SMTP
    python mailing.py apercu semaine1      -> génère apercu_semaine1.html
    python mailing.py test semaine1        -> envoie 1 e-mail de test à email_test
    python mailing.py envoyer semaine1     -> envoie la campagne à toute la liste
    python mailing.py statut               -> où en est chaque semaine
"""

import configparser
import csv
import getpass
import html
import re
import smtplib
import ssl
import sys
import time
from datetime import date, datetime
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

DOSSIER = Path(__file__).resolve().parent
FICHIER_CONFIG = DOSSIER / "config.ini"
FICHIER_CONTACTS = DOSSIER / "contacts.csv"
FICHIER_DESINSCRITS = DOSSIER / "desinscrits.txt"
DOSSIER_CAMPAGNE = DOSSIER / "campagne"
DOSSIER_JOURNAL = DOSSIER / "journal"

EMAIL_VALIDE = re.compile(r"^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
VARIABLE = re.compile(r"\{\{\s*([\w-]+)\s*(?:\|([^}]*))?\}\}")


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

def charger_config():
    if not FICHIER_CONFIG.exists():
        sortir(f"Fichier introuvable : {FICHIER_CONFIG.name}\n"
               "Copie config.exemple.ini en config.ini et complète-le.")
    cfg = configparser.ConfigParser(interpolation=None)
    cfg.read(FICHIER_CONFIG, encoding="utf-8")
    try:
        conf = {
            "hote": cfg["smtp"]["hote"].strip(),
            "port": cfg["smtp"].getint("port"),
            "securite": cfg["smtp"].get("securite", "ssl").strip().lower(),
            "utilisateur": cfg["smtp"]["utilisateur"].strip(),
            "mot_de_passe": cfg["smtp"].get("mot_de_passe", "").strip(),
            "nom": cfg["expediteur"]["nom"].strip(),
            "email": cfg["expediteur"]["email"].strip(),
            "reponse_a": cfg["expediteur"].get("reponse_a", "").strip(),
            "pause": cfg["envoi"].getfloat("pause_secondes", 8),
            "limite_jour": cfg["envoi"].getint("limite_par_jour", 400),
            "email_test": cfg["envoi"].get("email_test", "").strip(),
            "pied_auto": cfg["envoi"].getboolean("ajouter_pied_desinscription", True),
        }
    except (KeyError, ValueError) as e:
        sortir(f"config.ini incomplet ou invalide : {e}")
    if conf["securite"] not in ("ssl", "starttls"):
        sortir("config.ini : securite doit valoir 'ssl' ou 'starttls'.")
    return conf


def demander_mot_de_passe(conf):
    if not conf["mot_de_passe"]:
        conf["mot_de_passe"] = getpass.getpass(
            f"Mot de passe SMTP pour {conf['utilisateur']} (rien ne s'affiche) : ")


# --------------------------------------------------------------------------- #
# Contacts
# --------------------------------------------------------------------------- #

def charger_desinscrits():
    if not FICHIER_DESINSCRITS.exists():
        return set()
    lignes = FICHIER_DESINSCRITS.read_text(encoding="utf-8").splitlines()
    return {l.strip().lower() for l in lignes if l.strip() and not l.startswith("#")}


def charger_contacts():
    """Retourne (contacts_valides, invalides, doublons, desinscrits_trouves)."""
    if not FICHIER_CONTACTS.exists():
        sortir(f"Fichier introuvable : {FICHIER_CONTACTS.name}")
    brut = FICHIER_CONTACTS.read_bytes()
    for encodage in ("utf-8-sig", "cp1252"):  # Excel enregistre souvent en cp1252
        try:
            texte = brut.decode(encodage)
            break
        except UnicodeDecodeError:
            continue
    try:
        separateur = csv.Sniffer().sniff(texte[:4096], delimiters=";,\t").delimiter
    except csv.Error:
        separateur = ";"
    lecteur = csv.DictReader(texte.splitlines(), delimiter=separateur)
    if not lecteur.fieldnames:
        sortir("contacts.csv est vide.")
    lecteur.fieldnames = [c.strip().lower() for c in lecteur.fieldnames]
    if "email" not in lecteur.fieldnames:
        sortir("contacts.csv doit contenir une colonne nommée 'email'.\n"
               f"Colonnes trouvées : {', '.join(lecteur.fieldnames)}")

    desinscrits = charger_desinscrits()
    vus, valides, invalides, doublons, exclus = set(), [], [], [], []
    for ligne in lecteur:
        ligne = {k: (v or "").strip() for k, v in ligne.items() if k}
        adresse = ligne["email"].lower()
        if not adresse:
            continue
        if not EMAIL_VALIDE.match(adresse):
            invalides.append(adresse)
        elif adresse in vus:
            doublons.append(adresse)
        elif adresse in desinscrits:
            exclus.append(adresse)
        else:
            vus.add(adresse)
            ligne["email"] = adresse
            valides.append(ligne)
    return valides, invalides, doublons, exclus


# --------------------------------------------------------------------------- #
# Modèles d'e-mails
# --------------------------------------------------------------------------- #

def lister_campagnes():
    return sorted(p.stem for p in DOSSIER_CAMPAGNE.glob("*.html"))


def charger_modele(nom):
    chemin = DOSSIER_CAMPAGNE / f"{nom}.html"
    if not chemin.exists():
        sortir(f"Modèle introuvable : campagne/{nom}.html\n"
               f"Disponibles : {', '.join(lister_campagnes()) or 'aucun'}")
    texte = chemin.read_text(encoding="utf-8")
    entete, _, corps = texte.partition("\n")
    if not entete.lower().startswith("sujet:"):
        sortir(f"campagne/{nom}.html : la 1re ligne doit être  Sujet: ...")
    return entete.split(":", 1)[1].strip(), corps.strip()


def remplir(modele, contact):
    """Remplace {{prenom}} ou {{prenom|valeur par défaut}}."""
    def remplacer(m):
        valeur = contact.get(m.group(1).lower(), "")
        return valeur if valeur else (m.group(2) or "").strip()
    return VARIABLE.sub(remplacer, modele)


def pied_desinscription(conf):
    adresse = conf["reponse_a"] or conf["email"]
    lien = f"mailto:{adresse}?subject=D%C3%A9sinscription"
    return (
        '<p style="font-size:12px;color:#888;margin-top:32px;'
        'font-family:Arial,sans-serif">'
        "Vous ne souhaitez plus recevoir nos e-mails ? "
        f'<a href="{lien}" style="color:#888">Cliquez ici pour vous désinscrire</a>'
        " ou répondez simplement « STOP ».</p>"
    )


def html_vers_texte(contenu):
    t = re.sub(r"(?is)<(script|style).*?</\1>", "", contenu)
    t = re.sub(r'(?is)<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r"\2 (\1)", t)
    t = re.sub(r"(?i)<br\s*/?>", "\n", t)
    t = re.sub(r"(?i)</(p|div|h[1-6]|li|tr)>", "\n\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    t = "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in t.splitlines())
    return re.sub(r"\n\s*\n\s*\n+", "\n\n", t).strip()


def construire_message(conf, sujet_modele, corps_modele, contact):
    corps = remplir(corps_modele, contact)
    if conf["pied_auto"] and "sinscri" not in corps.lower():
        if "</body>" in corps.lower():
            corps = re.sub(r"(?i)</body>", pied_desinscription(conf) + "</body>", corps, count=1)
        else:
            corps += pied_desinscription(conf)

    msg = EmailMessage()
    msg["Subject"] = remplir(sujet_modele, contact)
    msg["From"] = formataddr((conf["nom"], conf["email"]))
    msg["To"] = contact["email"]
    if conf["reponse_a"]:
        msg["Reply-To"] = conf["reponse_a"]
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=conf["email"].split("@")[-1])
    desinscription = conf["reponse_a"] or conf["email"]
    msg["List-Unsubscribe"] = f"<mailto:{desinscription}?subject=Desinscription>"
    msg.set_content(html_vers_texte(corps))
    msg.add_alternative(corps, subtype="html")
    return msg


# --------------------------------------------------------------------------- #
# Journal (permet de reprendre sans jamais envoyer deux fois)
# --------------------------------------------------------------------------- #

def chemin_journal(nom):
    DOSSIER_JOURNAL.mkdir(exist_ok=True)
    return DOSSIER_JOURNAL / f"{nom}.csv"


def deja_envoyes(nom):
    chemin = chemin_journal(nom)
    if not chemin.exists():
        return set()
    with chemin.open(encoding="utf-8", newline="") as f:
        return {l["email"] for l in csv.DictReader(f, delimiter=";")
                if l["statut"] in ("envoye", "rejete")}


def envoyes_aujourdhui():
    total, jour = 0, date.today().isoformat()
    for chemin in DOSSIER_JOURNAL.glob("*.csv") if DOSSIER_JOURNAL.exists() else []:
        with chemin.open(encoding="utf-8", newline="") as f:
            total += sum(1 for l in csv.DictReader(f, delimiter=";")
                         if l["statut"] == "envoye" and l["date"].startswith(jour))
    return total


def journaliser(nom, adresse, statut, detail=""):
    chemin = chemin_journal(nom)
    nouveau = not chemin.exists()
    with chemin.open("a", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        if nouveau:
            w.writerow(["date", "email", "statut", "detail"])
        w.writerow([datetime.now().isoformat(timespec="seconds"), adresse, statut, detail])


# --------------------------------------------------------------------------- #
# SMTP
# --------------------------------------------------------------------------- #

def connecter(conf):
    contexte = ssl.create_default_context()
    if conf["securite"] == "ssl":
        serveur = smtplib.SMTP_SSL(conf["hote"], conf["port"], context=contexte, timeout=60)
    else:
        serveur = smtplib.SMTP(conf["hote"], conf["port"], timeout=60)
        serveur.starttls(context=contexte)
    serveur.login(conf["utilisateur"], conf["mot_de_passe"])
    return serveur


def connecter_ou_sortir(conf):
    demander_mot_de_passe(conf)
    try:
        return connecter(conf)
    except smtplib.SMTPAuthenticationError as e:
        sortir("Connexion refusée (identifiant ou mot de passe).\n"
               "Gmail / Outlook : il faut un « mot de passe d'application », "
               f"pas le mot de passe habituel. Voir README.\nDétail : {e}")
    except (OSError, smtplib.SMTPException) as e:
        sortir(f"Impossible de joindre {conf['hote']}:{conf['port']} — {e}")


# --------------------------------------------------------------------------- #
# Commandes
# --------------------------------------------------------------------------- #

def cmd_verifier():
    conf = charger_config()
    valides, invalides, doublons, exclus = charger_contacts()
    print(f"\nContacts valides       : {len(valides)}")
    print(f"Adresses invalides     : {len(invalides)}")
    for a in invalides[:20]:
        print(f"   - {a}")
    print(f"Doublons ignorés       : {len(doublons)}")
    print(f"Désinscrits exclus     : {len(exclus)}")
    print(f"Modèles disponibles    : {', '.join(lister_campagnes()) or 'aucun'}")
    jours = -(-len(valides) // max(conf["limite_jour"], 1))
    duree = len(valides) * conf["pause"] / 60
    print(f"Durée estimée / envoi  : ~{duree:.0f} min, sur {jours} jour(s) "
          f"(limite {conf['limite_jour']}/jour)")
    print("\nTest de connexion SMTP...")
    serveur = connecter_ou_sortir(conf)
    serveur.quit()
    print("Connexion OK ✔")


def cmd_apercu(nom):
    conf = charger_config()
    sujet, corps = charger_modele(nom)
    valides = charger_contacts()[0]
    contact = valides[0] if valides else {"email": "exemple@domaine.be"}
    msg = construire_message(conf, sujet, corps, contact)
    contenu = msg.get_body(("html",)).get_content()
    sortie = DOSSIER / f"apercu_{nom}.html"
    sortie.write_text(contenu, encoding="utf-8")
    print(f"\nSujet  : {msg['Subject']}")
    print(f"Pour   : {contact['email']} (1er contact de la liste)")
    print(f"Aperçu : {sortie.name}  → ouvre-le dans ton navigateur")


def cmd_test(nom):
    conf = charger_config()
    if not conf["email_test"]:
        sortir("Renseigne email_test dans config.ini.")
    sujet, corps = charger_modele(nom)
    valides = charger_contacts()[0]
    contact = dict(valides[0]) if valides else {}
    contact["email"] = conf["email_test"]
    msg = construire_message(conf, "[TEST] " + sujet, corps, contact)
    serveur = connecter_ou_sortir(conf)
    serveur.send_message(msg)
    serveur.quit()
    print(f"\nE-mail de test envoyé à {conf['email_test']} ✔ "
          "(vérifie aussi le dossier spam)")


def cmd_envoyer(nom):
    conf = charger_config()
    sujet, corps = charger_modele(nom)
    valides, invalides, doublons, exclus = charger_contacts()
    faits = deja_envoyes(nom)
    a_faire = [c for c in valides if c["email"] not in faits]
    quota = conf["limite_jour"] - envoyes_aujourdhui()

    print(f"\nCampagne        : {nom}  —  « {sujet} »")
    print(f"Expéditeur      : {conf['nom']} <{conf['email']}>")
    print(f"Déjà envoyés    : {len(faits)}")
    print(f"Restant         : {len(a_faire)}")
    print(f"Quota du jour   : {max(quota, 0)} (limite {conf['limite_jour']}/jour)")
    if not a_faire:
        print("\nRien à envoyer : cette campagne est terminée ✔")
        return
    if quota <= 0:
        print("\nLimite journalière atteinte. Relance demain : "
              "l'envoi reprendra où il s'est arrêté.")
        return
    lot = a_faire[:quota]
    print(f"\n→ {len(lot)} e-mails vont partir maintenant "
          f"(~{len(lot) * conf['pause'] / 60:.0f} min).")
    if input("Tape OUI pour confirmer : ").strip().upper() != "OUI":
        print("Annulé.")
        return

    serveur = connecter_ou_sortir(conf)
    envoyes = rejetes = 0
    try:
        for i, contact in enumerate(lot, 1):
            msg = construire_message(conf, sujet, corps, contact)
            for essai in (1, 2):
                try:
                    serveur.send_message(msg)
                    journaliser(nom, contact["email"], "envoye")
                    envoyes += 1
                    print(f"[{i}/{len(lot)}] ✔ {contact['email']}")
                    break
                except smtplib.SMTPRecipientsRefused as e:
                    journaliser(nom, contact["email"], "rejete", str(e.recipients))
                    rejetes += 1
                    print(f"[{i}/{len(lot)}] ✖ {contact['email']} (adresse refusée)")
                    break
                except smtplib.SMTPServerDisconnected:
                    if essai == 2:
                        raise
                    print("   connexion perdue, reconnexion...")
                    time.sleep(5)
                    serveur = connecter(conf)
            if i < len(lot):
                time.sleep(conf["pause"])
    except KeyboardInterrupt:
        print("\nInterrompu. Relance la même commande pour reprendre.")
    except (smtplib.SMTPException, OSError) as e:
        print(f"\nLe serveur a stoppé l'envoi : {e}\n"
              "C'est souvent une limite d'envoi du fournisseur. Attends quelques "
              "heures puis relance : l'envoi reprendra où il s'est arrêté.")
    finally:
        try:
            serveur.quit()
        except Exception:
            pass

    reste = len(a_faire) - envoyes - rejetes
    print(f"\nBilan : {envoyes} envoyés, {rejetes} refusés, {reste} restants.")
    if reste:
        print("Relance demain la même commande pour envoyer la suite.")
    else:
        print(f"Campagne {nom} terminée ✔")


def cmd_statut():
    valides = charger_contacts()[0]
    print(f"\nListe : {len(valides)} contacts  |  envoyés aujourd'hui : {envoyes_aujourdhui()}\n")
    for nom in lister_campagnes():
        n = len(deja_envoyes(nom) & {c["email"] for c in valides})
        barre = "█" * int(20 * n / max(len(valides), 1))
        print(f"  {nom:<12} {barre:<20} {n}/{len(valides)}")


# --------------------------------------------------------------------------- #
# Menu
# --------------------------------------------------------------------------- #

def choisir_campagne():
    campagnes = lister_campagnes()
    if not campagnes:
        sortir("Aucun modèle dans le dossier campagne/.")
    for i, c in enumerate(campagnes, 1):
        print(f"  {i}. {c}")
    choix = input("Numéro de la campagne : ").strip()
    if not choix.isdigit() or not 1 <= int(choix) <= len(campagnes):
        sortir("Choix invalide.")
    return campagnes[int(choix) - 1]


def menu():
    print("\n=== MAILING CLIENT ===")
    print("1. Vérifier la liste et la connexion")
    print("2. Générer un aperçu")
    print("3. Envoyer un e-mail de test")
    print("4. Envoyer une campagne")
    print("5. Voir l'avancement")
    choix = input("\nTon choix : ").strip()
    actions = {"1": cmd_verifier, "5": cmd_statut}
    if choix in actions:
        actions[choix]()
    elif choix in ("2", "3", "4"):
        nom = choisir_campagne()
        {"2": cmd_apercu, "3": cmd_test, "4": cmd_envoyer}[choix](nom)
    else:
        print("Choix invalide.")


def sortir(message):
    print(f"\n✖ {message}")
    sys.exit(1)


def main():
    args = sys.argv[1:]
    commandes = {"verifier": cmd_verifier, "statut": cmd_statut}
    commandes_campagne = {"apercu": cmd_apercu, "test": cmd_test, "envoyer": cmd_envoyer}
    if not args:
        menu()
    elif args[0] in commandes:
        commandes[args[0]]()
    elif args[0] in commandes_campagne and len(args) == 2:
        commandes_campagne[args[0]](args[1])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
