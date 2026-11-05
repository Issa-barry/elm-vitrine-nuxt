# Variables d'environnement

Ce projet tourne en Node.js/Nitro (déployé sur Hostinger via `npm run build` +
`server/index.mjs`, pas en `nuxt generate` statique). Toute la configuration
qui varie par environnement passe par `runtimeConfig` (voir
[`config/runtime.ts`](../config/runtime.ts) et `nuxt.config.ts`) — jamais par
une URL codée en dur dans le code applicatif.

## Liste des variables

| Variable | Portée | Obligatoire | Rôle |
|---|---|---|---|
| `NUXT_PUBLIC_APP_NAME` | publique | non (défaut : `Eau La Maman`) | Nom complet ; sert au manifest PWA (`name`, voir `docs/pwa.md`) et au titre de la fenêtre d'installation iPhone |
| `NUXT_PUBLIC_APP_SHORT_NAME` | publique | non (si vide : `NUXT_PUBLIC_APP_NAME`) | Nom sous l'icône de l'application installée : `short_name` du manifest (Android, ordinateur) et `apple-mobile-web-app-title` (iPhone) |
| `NUXT_PUBLIC_APP_VERSION` | publique | non (défaut : version de `package.json`) | Uniquement informatif |
| `NUXT_PUBLIC_ENVIRONMENT` | publique | non (défaut : `local`) | `local` \| `preprod` \| `recette` \| `production` — pilote le SEO |
| `NUXT_PUBLIC_SITE_URL` | publique | **oui** hors local | URL publique de ce site (canonique, robots.txt) |
| `NUXT_PUBLIC_API_BASE` | publique | **oui** hors local | URL du monolithe Laravel, appelée depuis le navigateur |
| `NUXT_MONOLITH_API_BASE` | privée (serveur uniquement) | non (retombe sur `NUXT_PUBLIC_API_BASE` si absente) | URL utilisée par `server/api/*` et `server/utils/*` pour relayer vers Laravel |
| `NUXT_VITRINE_SERVICE_TOKEN` | privée (serveur uniquement) | non, **pas encore utilisée** | Réservée pour le jour où le backend exigera un jeton serveur-à-serveur sur `/api/public/*` (middleware `vitrine.token`) |
| `NUXT_AUTH_SESSION_PASSWORD` | privée (serveur uniquement) | **oui** hors local | Secret de scellement (chiffrement + signature) du cookie de session BFF qui porte le token Sanctum côté serveur — voir [`server/utils/authSession.ts`](../server/utils/authSession.ts). ≥ 32 caractères aléatoires, propre à chaque environnement, jamais réutilisé. Générer avec `openssl rand -hex 32` |

Publique = sous `runtimeConfig.public`, donc visible dans le bundle envoyé au
navigateur. Privée = au niveau racine de `runtimeConfig`, accessible
uniquement dans `server/api/*`, `server/utils/*` et `server/plugins/*` — un
composant ou une page Vue ne peut pas y accéder.

## Validation au démarrage

[`server/plugins/validateRuntimeConfig.ts`](../server/plugins/validateRuntimeConfig.ts)
vérifie au démarrage du serveur Nitro que `siteUrl` et `apiBase` sont bien
renseignées. En environnement `local`, un avertissement suffit. Dans tout
autre environnement, le serveur refuse de démarrer avec un message clair
indiquant quelle(s) variable(s) manque(nt) — sans jamais logger la valeur
d'un secret.

## Par environnement

### Local

Copiez `.env.example` en `.env` (déjà fait, fichier ignoré par git) et
ajustez si votre Laravel local ne tourne pas sur `http://localhost:8000`.

### Préproduction

Backend confirmé : `https://formation.eau-la-maman.com` (vérifié en direct :
`POST /api/auth/login` y répond bien avec les erreurs de validation Laravel
attendues).

Dans le panneau Hostinger de la Web App préprod (`Variables
d'environnement`) :

```
NUXT_PUBLIC_ENVIRONMENT=preprod
NUXT_PUBLIC_APP_NAME=Eau La Maman Test
NUXT_PUBLIC_APP_SHORT_NAME=ELM Test
NUXT_PUBLIC_SITE_URL=https://test.eau-la-maman.com
NUXT_PUBLIC_API_BASE=https://formation.eau-la-maman.com
NUXT_MONOLITH_API_BASE=https://formation.eau-la-maman.com
NUXT_VITRINE_SERVICE_TOKEN=
NUXT_AUTH_SESSION_PASSWORD=<valeur générée, propre à cet environnement>
```

### Production

```
NUXT_PUBLIC_ENVIRONMENT=production
NUXT_PUBLIC_APP_NAME=Eau La Maman
NUXT_PUBLIC_APP_SHORT_NAME=ELM
NUXT_PUBLIC_SITE_URL=https://eau-la-maman.com
NUXT_PUBLIC_API_BASE=https://fello.eau-la-maman.com
NUXT_MONOLITH_API_BASE=https://fello.eau-la-maman.com
NUXT_VITRINE_SERVICE_TOKEN=
NUXT_AUTH_SESSION_PASSWORD=<valeur générée, propre à cet environnement>
```

### Recette (plus tard)

Même principe : une Web App Hostinger dédiée, sa propre branche Git, ses
propres variables (`NUXT_PUBLIC_ENVIRONMENT=recette`,
`NUXT_PUBLIC_APP_NAME=ELM Recette`, URLs de préprod/recette selon ce que le
backend expose).

## Configuration Hostinger

Chaque Web App Hostinger (une par environnement) a son propre panneau
`Variables d'environnement` — c'est la seule source de vérité pour les
valeurs réelles de préprod/production/recette. Aucune valeur réelle ne doit
être committée : `.env.production`, `.env.preprod`, `.env.recette` ne sont
**pas** des fichiers de ce dépôt. Un fichier `.env.<env>` local reste
possible ponctuellement pour tester une config en local, mais ne devient
jamais la source de vérité de la production.

Une fois `npm run build` exécuté, le même artefact (`.output/`) peut tourner
avec des valeurs d'environnement différentes sans reconstruire — c'est
justement l'intérêt de Nitro en mode serveur. Seule exception connue :
`NUXT_PUBLIC_APP_VERSION`, quand elle n'est pas fournie, est lue dans
`package.json` au moment du build (donc figée au build, ce qui est attendu
pour un numéro de version).

## Authentification (BFF)

L'auth utilisateur (login/session/logout) passe par un BFF Nitro plutôt que
par un appel direct navigateur → Laravel : voir
[`composables/useAuth.ts`](../composables/useAuth.ts),
[`server/api/auth/`](../server/api/auth/) et
[`server/utils/authSession.ts`](../server/utils/authSession.ts). Le token
Sanctum obtenu de Laravel (`POST /api/auth/login`, contrat détaillé dans
`docs/api-auth-contract.md` côté `elm-monolithe`) n'est jamais exposé au
JavaScript du navigateur ni stocké en clair côté client (ni `localStorage`,
ni cookie lisible en JS). Il est contenu dans la session Nuxt scellée
(chiffrée + signée avec `NUXT_AUTH_SESSION_PASSWORD` ci-dessus), transmise
via un cookie httpOnly, et n'est manipulé en clair que par Nitro lui-même,
après ouverture de la session (voir `server/utils/authSession.ts`). Ce choix
évite aussi de toucher à la config CORS/Sanctum
stateful de Laravel : voir l'audit du 26/08/2026 (section E) pour la
justification complète et l'architecture alternative envisagée puis écartée
(Sanctum SPA cookie-session).

Décision motivée dans l'audit et acceptée le 26/08/2026 : voir la section
"Prêt pour SPA directe ?" de `docs/api-auth-contract.md` côté `elm-monolithe`
si cette architecture doit être reconsidérée plus tard.

Compte unique (ADR 0055 côté `elm-monolithe`) : « Le front Nuxt est un espace
ouvert à tous les utilisateurs. Toute personne peut le consulter. Tout
utilisateur disposant d'un compte actif peut s'y connecter avec son identité
EAU LA MAMAN existante, quels que soient ses rôles et ses activités métier.
L'absence d'activité n'est jamais un motif de refus d'accès au front. Seules
les données et fonctionnalités métier restent conditionnées par les
rattachements et autorisations propres à chaque utilisateur. »

`POST /api/auth/login` et la connexion OTP authentifient donc tout compte
actif, agents du back-office compris, sans jamais créer de second compte.
L'espace client est ouvert à tout compte actif : `middleware/auth.ts` ne
vérifie que la session, jamais un rôle ni une activité. Les menus viennent de
`context` (`config/clientCapabilities.ts`), jamais des rôles back-office. Un
compte sans activité arrive sur l'accueil neutre `/espace-client/bienvenue`
(`config/clientAccueil.ts`). Laravel limite chaque donnée aux activités du
compte.

**Aucun bypass d'auth runtime, y compris en `nuxt dev`** (décision du
26/08/2026, revenant sur un choix antérieur) : `pages/connexion.vue`,
`pages/inscription.vue`, `pages/mot-de-passe-oublie.vue`,
`middleware/auth.ts` et `middleware/guest.ts` appellent tous réellement le
backend dans tous les environnements — aucun ne simule un succès faute de
backend disponible. Un `elm-monolithe` local joignable
(`NUXT_MONOLITH_API_BASE`) est donc nécessaire pour utiliser ces parcours en
`nuxt dev` ; sans lui, le backend renvoie une vraie erreur affichée à
l'écran (voir `server/utils/monolithClient.ts`), jamais un accès silencieux.
Les mocks restent réservés aux tests automatisés (`page.route()` dans
Playwright pour les scénarios purement client, ou le mock backend dédié
`tests/e2e/mock-backend.mjs` quand un test a besoin d'une vraie session).

`logout`/`logout-all` (`server/api/auth/{logout,logout-all}.post.ts`)
distinguent explicitement deux garanties : la session Nuxt (ce cookie, ce
navigateur) est **toujours** supprimée, mais le token Sanctum n'est
**effectivement révoqué côté Laravel** que si cet appel réussit
(`revokedRemotely` dans la réponse). Pour `logout-all` en particulier, si
Laravel échoue, le message renvoyé ne prétend jamais que "tous les appareils
ont été déconnectés" — l'opération distante reste explicitement non
confirmée. Les échecs de révocation sont logués côté serveur (jamais le
token lui-même).

## Précautions de sécurité

- Toute clé sous `NUXT_PUBLIC_*` est visible dans le navigateur. Interdit :
  jetons de service, clés admin, secrets Laravel, secrets SMS/WhatsApp,
  secrets de paiement, mots de passe, secrets de base de données.
- Les secrets vivent uniquement en dehors de `public` dans `runtimeConfig`
  (donc côté serveur Nitro uniquement), ou restent côté Laravel.
- `server/plugins/validateRuntimeConfig.ts` ne logue jamais la valeur d'une
  variable manquante, seulement son nom.

## Futur SaaS

Ces environnements (`local`/`preprod`/`recette`/`production`) décrivent une
infrastructure technique, pas des clients. Le multi-tenant SaaS sera un sujet
séparé, résolu plus tard par résolution dynamique du tenant (sous-domaine +
données backend), pas en ajoutant une variable d'environnement par client.
