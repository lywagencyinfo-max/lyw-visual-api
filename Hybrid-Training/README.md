# Lift Your Body — Programmes Hyrox & cross-training

Application web (Next.js) qui donne chaque jour la séance prévue par un programme
périodisé sur 12 semaines. Chaque séance contient **un échauffement RAMP, un
bloc principal et une session de mobilité**.

## Lancer

```bash
cd lyb-app
npm install
npm run dev            # http://localhost:3000
npm run check:program  # vérifie toutes les combinaisons formule × niveau × 36 semaines
```

## Formules

| Formule | Séances / sem. | Prix | Répartition de la semaine |
|---|---|---|---|
| Start | 2 | 12,99 €/mois | Force + WOD · Hyrox (stations + course compromise) |
| Found | 3 | 17,99 €/mois | Force + WOD · Engine (course/ergos) · Hyrox |
| Pro | 4 | 22,99 €/mois | Force bas du corps + finisher · Engine · Haut du corps + WOD gym · Hyrox |

## Logique d'entraînement (`lyb-app/src/lib/program`)

- **Cycle de 12 semaines** (`cycle.ts`) : Base (S1-4) → Développement (S5-8) → Spécifique (S9-11) → Affûtage + simulation (S12).
  3 semaines de charge, 1 de décharge (S4, S8). Le cycle suivant reprend avec d'autres lifts et WODs.
- **Force** : le même lift principal pendant 4 semaines pour progresser en charge (4×8 → 5×5 → 5×3 → 3×3, RPE 7 à 9).
- **WODs cross-training** (`workouts.ts`) : AMRAP, EMOM, For Time, Tabata, intervalles, chippers ; couplets/triplets ; WODs « flush » en décharge et affûtage.
- **Engine** : zone 2, seuil, VMA, puis allure Hyrox en phase spécifique.
- **Hyrox** (`stations.ts`) : les 8 stations en rotation par paires, course compromise, volume qui passe de 40 % à 85-100 % de la distance de course,
  charges Open/Pro femme/homme. S12 : simulation (demi-Hyrox, 75 % ou complet selon le niveau).
- **Échauffement RAMP** (`warmup.ts`) : Raise · Activate · Mobilise · Potentiate, en rotation hebdomadaire, potentiation propre à la séance.
- **Mobilité** (`mobility.ts`) : 12' ciblées (hanches, chaîne postérieure, chevilles, épaules, full body) selon la séance. Récupération active les jours off.
- **Niveaux** : débutant / intermédiaire / avancé ajustent volumes, variantes et nombre de stations.

Les séances sont **déterministes** : tous les abonnés d'une même formule et d'un même niveau ont la même séance le même jour
(utile pour une communauté, un classement, du contenu social).

## Statut

- Profil et séances terminées stockés dans le navigateur (localStorage).
- **Non branché** : comptes utilisateurs, paiement (Stripe Billing conseillé), notifications.
- Les charges Hyrox sont indicatives : à vérifier avec le rulebook de la saison en cours.

Sources consultées pour la méthode : guides Hyrox de Centr, PureGym, FindYourEdge, VPA, BlenderBottle ;
template CrossFit de Greg Glassman (3 on / 1 off, M/G/W) ; protocole RAMP (UKSCA).
