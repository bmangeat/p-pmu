# ⏰ Pari Retard

Petite plateforme de pari de bureau : chaque jour, on parie sur l'heure d'arrivée
du retardataire. Plus on est proche de l'heure réelle, plus on marque de points.
Classement général + graphique de l'historique des arrivées.

## Stack

- **Next.js 16** (App Router, server-side) + **TypeScript** + **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL** (Neon en production)
- **Auth.js / NextAuth v5** — connexion **Google**
- **Recharts** pour le graphique

## Règles du jeu

- Chaque pari est soit une **heure d'arrivée**, soit **« Absent »** (il ne viendra pas).
- Les paris restent **ouverts** tant qu'un admin n'a pas saisi le résultat (présent à une
  heure, ou absent). À la saisie, le jour est **clôturé** et les scores calculés.
- L'admin peut **suspendre** un jour (congé, télétravail…) : aucun pari, aucun point. Réversible.
- **Barème** (modifiable dans `src/lib/config.ts`, fonction `scoreBet`) :
  - Présent bien deviné : `100 − écart_en_minutes` (plancher 0) **+ 50** si pile.
  - « Absent » bien deviné : **25 pts** (forfait, moins impactant).
  - Mauvaise prédiction de présence : **0**.

---

## Prérequis

- **Node.js ≥ 20.9** (le projet contient un `.nvmrc`). Avec nvm :
  ```bash
  nvm use        # lit .nvmrc → Node 20
  ```
- Une base PostgreSQL. En local tu peux utiliser Docker (voir plus bas) ou
  directement une base Neon gratuite.

## Lancer en local

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Configurer l'environnement** — copie `.env.example` vers `.env` et remplis les valeurs :
   ```bash
   cp .env.example .env
   ```
   Pour un démarrage rapide en local, tu peux activer la **connexion de dev**
   (sans Google) en mettant `DEV_LOGIN="1"` — c'est déjà le cas dans `.env.example`.

3. **Base de données locale** (option Docker, jetable) :
   ```bash
   docker run -d --name arrival-pg \
     -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=arrival \
     -p 5432:5432 postgres:16-alpine
   ```
   `DATABASE_URL` correspondante (déjà dans `.env.example`) :
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arrival?schema=public"
   ```

4. **Créer les tables** :
   ```bash
   npm run db:push
   ```

5. **Démarrer** :
   ```bash
   npm run dev
   ```
   → http://localhost:3000

> En mode `DEV_LOGIN`, la page `/login` propose un formulaire « Connexion dev » :
> entre un nom + un email et tu es connecté, sans Google. Pratique pour tester.
> **Ne jamais activer `DEV_LOGIN` en production.**

## Administrateur

Les emails listés dans `ADMIN_EMAILS` (séparés par des virgules) ont accès à
la page `/admin` pour saisir le résultat du jour et suspendre des jours. Les admins
sont **validés d'office** (voir ci-dessous).

## Accès & validation des comptes

- L'accès est **réservé aux connectés** : toute page du jeu redirige vers `/login` sans session.
- Un **nouveau compte** doit saisir un **code à 6 chiffres** sur `/verify` pour être validé.
- Ce code est affiché sur `/admin`, **change toutes les heures** (dérivé de `AUTH_SECRET`
  + l'heure courante, sans cron ni stockage) — l'admin le communique aux participants.
- Une fois validé, l'utilisateur n'a plus jamais à le ressaisir (champ `User.verified`).
- ⚠️ Le code dépend de `AUTH_SECRET` : garde la même valeur en production, sinon les codes changent.

## Connexion Google (pour la production)

1. Va sur [Google Cloud Console](https://console.cloud.google.com/) → crée un projet.
2. **APIs & Services → OAuth consent screen** : configure (type « External »).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** :
   - Type : *Web application*
   - **Authorized redirect URIs** :
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://TON-APP.vercel.app/api/auth/callback/google` (prod)
4. Récupère le **Client ID** et le **Client secret** → renseigne
   `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET`.

---

## Déploiement gratuit : Vercel + Neon

### 1. Base de données Neon (gratuit)

1. Crée un compte sur [neon.tech](https://neon.tech) et un projet Postgres.
2. Copie la **connection string** (format `postgresql://...?sslmode=require`).
3. Applique le schéma sur Neon depuis ta machine :
   ```bash
   DATABASE_URL="postgresql://...neon...?sslmode=require" npm run db:push
   ```

### 2. Hébergement Vercel (gratuit)

1. Pousse ce projet sur un dépôt **GitHub**.
2. Sur [vercel.com](https://vercel.com), **Add New → Project**, importe le dépôt.
3. Dans **Settings → Environment Variables**, ajoute :

   | Variable             | Valeur                                  |
   | -------------------- | --------------------------------------- |
   | `DATABASE_URL`       | la connection string Neon               |
   | `AUTH_SECRET`        | généré avec `openssl rand -base64 32`   |
   | `AUTH_GOOGLE_ID`     | Client ID Google                        |
   | `AUTH_GOOGLE_SECRET` | Client secret Google                    |
   | `ADMIN_EMAILS`       | ton email (et ceux des autres admins)   |
   | `TARGET_NAME`        | le prénom du retardataire affiché       |
   | `AUTH_URL`           | `https://TON-APP.vercel.app`            |

   ⚠️ **Ne pas** définir `DEV_LOGIN` en production (laisse-la absente ou `0`).

4. **Deploy**. Le build lance `prisma generate && next build` automatiquement.
5. Ajoute l'URL de prod dans les *redirect URIs* Google (voir ci-dessus).

L'offre gratuite de Vercel + Neon suffit largement pour un usage de bureau.

## Personnalisation

- **Barème de score** : `SCORE` dans `src/lib/config.ts`.
- **Fuseau horaire** (détermine « le jour » et l'affichage) : `OFFICE_TZ` dans `src/lib/config.ts`.
- **Nom du retardataire** : variable `TARGET_NAME`.
