/**
 * AGENT MAILING — Google Sheets + Gmail
 * Envoie une campagne de plusieurs semaines depuis la boîte Gmail / Google Workspace
 * (ou depuis une adresse du client ajoutée dans Gmail via « Envoyer des e-mails en tant que »).
 *
 * Installation : Extensions > Apps Script > coller ce fichier > Enregistrer > recharger le Google Sheet.
 * Ensuite tout se fait depuis le menu « 📧 Mailing ».
 */

const ONGLETS = {
  reglages: 'Réglages',
  contacts: 'Contacts',
  campagne: 'Campagne',
  desinscrits: 'Désinscrits',
  journal: 'Journal',
};
const HEURE_DEBUT = 8;          // l'agent n'envoie qu'entre 8h et 19h
const HEURE_FIN = 19;
const PAUSE_MS = 1500;          // pause entre deux e-mails
const DUREE_MAX_MS = 5 * 60000; // Google coupe un script après 6 min : on s'arrête avant
const EMAIL_VALIDE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// --------------------------------------------------------------------------- //
// Menu
// --------------------------------------------------------------------------- //

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📧 Mailing')
    .addItem('1. Préparer le fichier (1re fois)', 'installer')
    .addSeparator()
    .addItem('2. Envoyer un e-mail de test', 'envoyerTest')
    .addItem('3. Envoyer maintenant les e-mails prévus', 'envoyerMaintenant')
    .addSeparator()
    .addItem('4. ▶ Activer l\'agent automatique', 'activerAgent')
    .addItem('5. ⏸ Arrêter l\'agent automatique', 'arreterAgent')
    .addSeparator()
    .addItem('Vérifier la liste et le quota', 'verifier')
    .addToUi();
}

function installer() {
  const ss = SpreadsheetApp.getActive();
  const creer = (nom, entetes, lignes) => {
    let f = ss.getSheetByName(nom);
    if (f) return f;
    f = ss.insertSheet(nom);
    f.getRange(1, 1, 1, entetes.length).setValues([entetes])
      .setFontWeight('bold').setBackground('#e8f0fe');
    if (lignes && lignes.length) f.getRange(2, 1, lignes.length, entetes.length).setValues(lignes);
    f.setFrozenRows(1);
    return f;
  };

  creer(ONGLETS.reglages, ['Réglage', 'Valeur', 'Aide'], [
    ['Nom expéditeur', 'Nom du Client', 'Nom affiché chez le destinataire'],
    ['Adresse expéditeur', '', 'Vide = adresse du compte Gmail. Sinon une adresse ajoutée dans Gmail > Paramètres > Comptes > « Envoyer des e-mails en tant que »'],
    ['Répondre à', '', 'Facultatif : adresse qui reçoit les réponses'],
    ['E-mail de test', '', 'Ton adresse pour recevoir les tests'],
    ['Ajouter lien de désinscription', 'OUI', 'OUI / NON'],
  ]);
  creer(ONGLETS.contacts, ['email', 'prenom', 'nom', 'societe'], [
    ['marie.dupont@exemple.be', 'Marie', 'Dupont', 'Boulangerie Dupont'],
  ]);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const semaines = [1, 2, 3, 4, 5].map(n => {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() + 7 * (n - 1));
    return [n, d, `{{prenom|Bonjour}}, sujet de la semaine ${n}`,
      `Bonjour {{prenom|Madame, Monsieur}},\n\nTexte de la semaine ${n}.\n\nBien à vous,\nNom du Client`, ''];
  });
  const camp = creer(ONGLETS.campagne, ['Semaine', 'Date d\'envoi', 'Sujet', 'Message', 'Statut'], semaines);
  camp.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  camp.setColumnWidth(3, 280).setColumnWidth(4, 500);
  camp.getRange('D2:D').setWrap(true);
  creer(ONGLETS.desinscrits, ['email'], []);
  creer(ONGLETS.journal, ['date', 'semaine', 'email', 'statut', 'détail'], []);

  const defaut = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (defaut && ss.getSheets().length > 1 && defaut.getLastRow() === 0) ss.deleteSheet(defaut);
  ss.getSheetByName(ONGLETS.reglages).activate();
  alerte('Fichier prêt ✔\n\n1. Complète l\'onglet « Réglages »\n2. Colle la liste dans « Contacts »\n' +
         '3. Écris les e-mails dans « Campagne »\n4. Menu > Envoyer un e-mail de test');
}

// --------------------------------------------------------------------------- //
// Lecture des onglets
// --------------------------------------------------------------------------- //

function onglet(nom) {
  const f = SpreadsheetApp.getActive().getSheetByName(nom);
  if (!f) throw new Error(`Onglet « ${nom} » introuvable : lance d'abord « Préparer le fichier ».`);
  return f;
}

function lireReglages() {
  const r = {};
  onglet(ONGLETS.reglages).getDataRange().getValues().slice(1)
    .forEach(([cle, valeur]) => { r[String(cle).trim()] = String(valeur).trim(); });
  return {
    nom: r['Nom expéditeur'] || '',
    from: r['Adresse expéditeur'] || '',
    replyTo: r['Répondre à'] || '',
    test: r['E-mail de test'] || '',
    pied: (r['Ajouter lien de désinscription'] || 'OUI').toUpperCase() !== 'NON',
  };
}

function lireDesinscrits() {
  return new Set(onglet(ONGLETS.desinscrits).getDataRange().getValues().slice(1)
    .map(l => String(l[0]).trim().toLowerCase()).filter(Boolean));
}

function lireContacts() {
  const valeurs = onglet(ONGLETS.contacts).getDataRange().getValues();
  const entetes = valeurs[0].map(e => String(e).trim().toLowerCase());
  const col = entetes.indexOf('email');
  if (col < 0) throw new Error('L\'onglet « Contacts » doit avoir une colonne « email ».');
  const desinscrits = lireDesinscrits();
  const vus = new Set();
  const res = { valides: [], invalides: [], doublons: 0, exclus: 0 };
  valeurs.slice(1).forEach(ligne => {
    const adresse = String(ligne[col]).trim().toLowerCase();
    if (!adresse) return;
    if (!EMAIL_VALIDE.test(adresse)) return res.invalides.push(adresse);
    if (vus.has(adresse)) return res.doublons++;
    if (desinscrits.has(adresse)) return res.exclus++;
    vus.add(adresse);
    const contact = {};
    entetes.forEach((e, i) => { if (e) contact[e] = String(ligne[i]).trim(); });
    contact.email = adresse;
    res.valides.push(contact);
  });
  return res;
}

function lireCampagne() {
  return onglet(ONGLETS.campagne).getDataRange().getValues().slice(1)
    .map((l, i) => ({ ligne: i + 2, semaine: String(l[0]).trim(), date: l[1], sujet: String(l[2]), message: String(l[3]) }))
    .filter(c => c.semaine && c.sujet.trim() && c.message.trim());
}

function dejaEnvoyes(semaine) {
  return new Set(onglet(ONGLETS.journal).getDataRange().getValues().slice(1)
    .filter(l => String(l[1]) === semaine && (l[3] === 'envoyé' || l[3] === 'refusé'))
    .map(l => String(l[2])));
}

// --------------------------------------------------------------------------- //
// Construction des e-mails
// --------------------------------------------------------------------------- //

/** {{prenom}} ou {{prenom|valeur si vide}} */
function remplir(modele, contact) {
  return modele.replace(/\{\{\s*([\w-]+)\s*(?:\|([^}]*))?\}\}/g,
    (_, cle, defaut) => contact[cle.toLowerCase()] || (defaut || '').trim());
}

function echapper(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Texte simple -> HTML propre. Si le message contient déjà du HTML, il est gardé tel quel. */
function versHtml(message) {
  if (/<[a-z][\s\S]*>/i.test(message)) return message;
  const paragraphes = message.trim().split(/\n\s*\n/).map(p =>
    '<p>' + echapper(p).replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>') + '</p>');
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:600px">' +
    paragraphes.join('') + '</div>';
}

function versTexte(h) {
  return h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function construire(reglages, campagne, contact) {
  let corps = versHtml(remplir(campagne.message, contact));
  if (reglages.pied && !/sinscri/i.test(corps)) {
    const adresse = reglages.replyTo || reglages.from || Session.getEffectiveUser().getEmail();
    corps += '<p style="font-size:12px;color:#888;margin-top:32px;font-family:Arial,sans-serif">' +
      'Vous ne souhaitez plus recevoir nos e-mails ? ' +
      `<a href="mailto:${adresse}?subject=D%C3%A9sinscription" style="color:#888">Désinscrivez-vous ici</a>` +
      ' ou répondez simplement « STOP ».</p>';
  }
  return { sujet: remplir(campagne.sujet, contact), html: corps, texte: versTexte(corps) };
}

function envoyer(reglages, destinataire, mail) {
  const options = { htmlBody: mail.html, name: reglages.nom };
  if (reglages.from) options.from = reglages.from;
  if (reglages.replyTo) options.replyTo = reglages.replyTo;
  GmailApp.sendEmail(destinataire, mail.sujet, mail.texte, options);
}

function verifierAlias(reglages) {
  if (reglages.from && GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(reglages.from.toLowerCase()) < 0) {
    throw new Error(`L'adresse « ${reglages.from} » n'est pas ajoutée dans Gmail.\n` +
      'Gmail > Paramètres > Comptes > « Envoyer des e-mails en tant que » > Ajouter une autre adresse.');
  }
}

// --------------------------------------------------------------------------- //
// Envoi
// --------------------------------------------------------------------------- //

/**
 * Envoie toutes les semaines dont la date est arrivée, sans jamais renvoyer
 * à quelqu'un qui a déjà reçu. S'arrête au quota du jour ou après 5 min,
 * et reprend au passage suivant.
 */
function traiterEnvois() {
  const verrou = LockService.getScriptLock();
  if (!verrou.tryLock(1000)) return { envoyes: 0, message: 'Un envoi est déjà en cours.' };
  try {
    const debut = Date.now();
    const reglages = lireReglages();
    verifierAlias(reglages);
    const contacts = lireContacts().valides;
    const journal = onglet(ONGLETS.journal);
    const feuilleCampagne = onglet(ONGLETS.campagne);
    const maintenant = new Date();
    let total = 0;
    let arret = '';

    for (const campagne of lireCampagne()) {
      if (!(campagne.date instanceof Date) || campagne.date > maintenant) continue;
      const faits = dejaEnvoyes(campagne.semaine);
      const restants = contacts.filter(c => !faits.has(c.email));
      for (const contact of restants) {
        if (MailApp.getRemainingDailyQuota() <= 0) { arret = 'quota'; break; }
        if (Date.now() - debut > DUREE_MAX_MS) { arret = 'temps'; break; }
        try {
          envoyer(reglages, contact.email, construire(reglages, campagne, contact));
          journal.appendRow([new Date(), campagne.semaine, contact.email, 'envoyé', '']);
          faits.add(contact.email);
          total++;
        } catch (e) {
          const msg = String(e.message || e);
          if (/invalid|invalide/i.test(msg)) {
            journal.appendRow([new Date(), campagne.semaine, contact.email, 'refusé', msg]);
            faits.add(contact.email);
          } else {
            arret = msg;
            break;
          }
        }
        Utilities.sleep(PAUSE_MS);
      }
      const n = contacts.filter(c => faits.has(c.email)).length;
      feuilleCampagne.getRange(campagne.ligne, 5)
        .setValue(n >= contacts.length ? '✔ Terminé' : `En cours : ${n}/${contacts.length}`);
      SpreadsheetApp.flush();
      if (arret) break;
    }

    const raisons = {
      quota: 'Quota Gmail du jour atteint : la suite partira demain.',
      temps: 'Pause technique : la suite partira au prochain passage.',
    };
    return { envoyes: total, message: arret ? (raisons[arret] || 'Arrêt : ' + arret) : '' };
  } finally {
    verrou.releaseLock();
  }
}

/** Lancé automatiquement toutes les heures par l'agent. */
function passageAutomatique() {
  const h = new Date().getHours();
  if (h < HEURE_DEBUT || h >= HEURE_FIN) return;
  traiterEnvois();
}

function envoyerMaintenant() {
  const ui = SpreadsheetApp.getUi();
  const prevues = lireCampagne().filter(c => c.date instanceof Date && c.date <= new Date());
  if (!prevues.length) return alerte('Aucune semaine n\'est prévue pour aujourd\'hui ou avant.');
  const nb = lireContacts().valides.length;
  const rep = ui.alert('Confirmer l\'envoi',
    `Semaine(s) ${prevues.map(c => c.semaine).join(', ')} → ${nb} contacts.\n` +
    'Les personnes qui ont déjà reçu ne recevront rien une 2e fois.\n\nEnvoyer maintenant ?',
    ui.ButtonSet.YES_NO);
  if (rep !== ui.Button.YES) return;
  const r = traiterEnvois();
  alerte(`${r.envoyes} e-mail(s) envoyé(s). ${r.message}`);
}

function envoyerTest() {
  const ui = SpreadsheetApp.getUi();
  const reglages = lireReglages();
  if (!reglages.test) return alerte('Renseigne « E-mail de test » dans l\'onglet Réglages.');
  verifierAlias(reglages);
  const rep = ui.prompt('E-mail de test', 'Numéro de la semaine à tester :', ui.ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== ui.Button.OK) return;
  const campagne = lireCampagne().find(c => c.semaine === rep.getResponseText().trim());
  if (!campagne) return alerte('Semaine introuvable dans l\'onglet Campagne.');
  const contact = Object.assign({}, lireContacts().valides[0] || {}, { email: reglages.test });
  const mail = construire(reglages, campagne, contact);
  mail.sujet = '[TEST] ' + mail.sujet;
  envoyer(reglages, reglages.test, mail);
  alerte(`Test envoyé à ${reglages.test} ✔\n(avec les données du 1er contact de la liste)`);
}

// --------------------------------------------------------------------------- //
// Agent automatique
// --------------------------------------------------------------------------- //

function activerAgent() {
  arreterAgent(true);
  ScriptApp.newTrigger('passageAutomatique').timeBased().everyHours(1).create();
  alerte('Agent activé ✔\n\nToutes les heures (entre 8h et 19h), il envoie les semaines dont la date ' +
         'est arrivée, en respectant le quota Gmail.\nTu peux fermer le fichier : il tourne tout seul.\n\n' +
         'Suivi : colonne « Statut » et onglet « Journal ».');
}

function arreterAgent(silencieux) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'passageAutomatique')
    .forEach(t => ScriptApp.deleteTrigger(t));
  if (silencieux !== true) alerte('Agent arrêté. Plus aucun envoi automatique.');
}

function verifier() {
  const c = lireContacts();
  const actif = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'passageAutomatique');
  alerte(
    `Contacts valides : ${c.valides.length}\n` +
    `Adresses invalides : ${c.invalides.length}${c.invalides.length ? ' (' + c.invalides.slice(0, 5).join(', ') + '…)' : ''}\n` +
    `Doublons ignorés : ${c.doublons}\n` +
    `Désinscrits exclus : ${c.exclus}\n\n` +
    `Quota Gmail restant aujourd'hui : ${MailApp.getRemainingDailyQuota()}\n` +
    `Agent automatique : ${actif ? 'ACTIF ▶' : 'arrêté ⏸'}`);
}

function alerte(message) {
  SpreadsheetApp.getUi().alert(message);
}
