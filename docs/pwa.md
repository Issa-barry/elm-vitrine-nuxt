# PWA (Progressive Web App)

V1 : installable sur mobile, tablette et ordinateur, en conservant le SSR et
le SEO existants. **Volontairement sans offline métier** (pas de cache de
commandes, véhicules, dépenses, gains/commissions, profil — voir
[Garde-fous](#garde-fous) et [AGENTS.md](../AGENTS.md)).

## Architecture

- Module : [`@vite-pwa/nuxt`](https://vite-pwa-org.netlify.app/frameworks/nuxt)
  (voir `nuxt.config.ts`, clé `pwa`), stratégie `generateSW` (service worker
  généré par Workbox, pas de fichier `sw.ts` maintenu à la main).
- SSR **non désactivé** : `nuxt.config.ts` ne définit `ssr: false` nulle
  part. Le service worker ne fait que compléter le SSR pour les visites
  répétées, il ne le remplace pas.
- Aucun secret dans le manifest, le service worker ou une clé
  `NUXT_PUBLIC_*` (voir `docs/environment.md`).

## Manifest

`server/routes/manifest.webmanifest.ts` génère le manifest **à la requête**,
exactement comme `server/routes/robots.txt.ts` génère `robots.txt` — et pour
la même raison : le même artefact `.output` peut tourner sur plusieurs
environnements Hostinger sans reconstruire (voir `docs/environment.md`), donc
le nom affiché ne peut pas être figé au moment du build.

La génération statique du module (`pwa.manifest`) est donc désactivée
(`manifest: false` dans `nuxt.config.ts`) au profit de cette route.

Champs pilotés par `runtimeConfig.public` (donc par les variables
`NUXT_PUBLIC_*` déjà documentées dans `docs/environment.md`, aucune nouvelle
variable créée) :

| Champ manifest | Source | Exemple prod | Exemple préprod |
|---|---|---|---|
| `name` | `NUXT_PUBLIC_APP_NAME` | `Eau La Maman` | `ELM Préprod` |
| `short_name` | `ELM` en production, sinon identique à `name` | `ELM` | `ELM Préprod` |

Champs fixes (identiques partout, non pilotés par l'environnement) :

- `id: "/"` — identité stable de l'app, indépendante d'un futur changement de
  `start_url` (évite qu'un changement ultérieur ne soit vu comme une
  "nouvelle" app par Chrome/Android).
- `start_url: "/espace-client"` et `scope: "/"` — voir
  [Vitrine + espace client](#vitrine--espace-client).
- `display: "standalone"`.
- `theme_color: "#2563eb"` — couleur de marque ELM déjà utilisée comme
  `--p-primary-hover-color` (voir `assets/css/main.css`) et présente dans
  `public/logo_grand.png`. Pas de nouvelle couleur inventée.
- `background_color: "#ffffff"` — déjà utilisé dans `assets/css/main.css`
  (`--p-primary-contrast-color`, `.landing-theme-action--inverted`).
- `icons` — voir [Icônes](#icônes).

Le lien `<link rel="manifest" href="/manifest.webmanifest">` est ajouté
statiquement dans `nuxt.config.ts` (`app.head.link`), le chemin ne change
jamais même si le contenu, lui, varie par environnement.

Le nom affiché sous l'icône iOS lors de « Ajouter à l'écran d'accueil » suit
la même logique côté client, dans `app.vue`
(`meta name="apple-mobile-web-app-title"`, piloté par
`runtimeConfig.public.appName`).

## Icônes

Générées une fois depuis `public/logo_grand.png` (1024×1024, fond bleu ELM
plein cadre `#2563eb`, logo déjà centré avec une marge généreuse) via
`@vite-pwa/assets-generator`, sans modifier le logo ni l'identité visuelle.
Fichiers commités dans `public/icons/` :

| Fichier | Usage |
|---|---|
| `pwa-192x192.png` | Manifest, icône Android/desktop standard |
| `pwa-512x512.png` | Manifest, icône Android/desktop haute résolution |
| `maskable-icon-512x512.png` | Manifest, `purpose: "maskable"` |
| `apple-touch-icon-180x180.png` | `<link rel="apple-touch-icon">`, iOS |

`maskable-icon-512x512.png` est un simple doublon de `pwa-512x512.png` : le
logo source a déjà assez de marge (le motif occupe environ la moitié du
canevas, centré, fond plein sans transparence) pour respecter la zone de
sécurité maskable d'Android (contenu utile dans le cercle central à 80 % du
canevas) sans padding supplémentaire. Le padding ajouté par le preset par
défaut du générateur produisait un résultat visuellement dégradé (bordure
blanche/transparente en trop) et a été écarté.

Le favicon existant (`public/favicon.png`, référencé dans
`nuxt.config.ts`) n'a pas été touché.

## Politique de cache (service worker)

Stratégie `generateSW` (Workbox), configurée dans `nuxt.config.ts` (clé
`pwa.workbox`) :

- **Assets statiques versionnés du build** (JS/CSS, icônes, images, fonts —
  `globPatterns` dans `nuxt.config.ts`) → précachés automatiquement
  (`CacheFirst` implicite de Workbox), servis même hors connexion.
- **`navigateFallback: null`** — pas de coquille HTML de secours. Cette app
  est SSR, pas SPA/SSG : une navigation doit toujours atteindre le serveur
  Nitro. Avec un `navigateFallback` par défaut (comportement standard du
  module, pensé pour les SPA), le service worker tenterait de servir une page
  HTML précachée qui n'existe pas dans une build SSR — au mieux inutile, au
  pire un risque de comportement cassé.
- **API Laravel → `NetworkOnly`, jamais de cache**, via deux règles
  `runtimeCaching` explicites :
  1. Nos propres routes serveur `/api/*` (proxy Nitro vers Laravel, voir
     `server/api/**`) — repérées par chemin, même origine.
  2. Tout appel cross-origin (le monolithe Laravel appelé directement depuis
     le navigateur via `NUXT_PUBLIC_API_BASE`) — repéré par origine, **pas**
     par nom de domaine : l'URL réelle du backend varie par environnement
     (`fello.eau-la-maman.com` en production, autre chose en préprod/local)
     et n'est jamais codée en dur, y compris ici (voir `AGENTS.md`).

  Concrètement, en cas de coupure réseau, l'utilisateur voit l'échec réseau
  natif du navigateur plutôt qu'une ancienne donnée financière présentée
  comme actuelle — comportement volontaire (voir
  [Pas d'offline métier](#pas-doffline-métier-volontaire)).

- Aucune règle particulière pour `/manifest.webmanifest` ou `/robots.txt` :
  ce sont des routes serveur dynamiques, pas des fichiers du dossier de
  build, donc `globPatterns` ne peut pas les précacher par erreur.

### Authentification (préparation Sanctum)

Le web utilisera Laravel/Sanctum avec cookies. Le service worker ne stocke,
n'intercepte ni ne rejoue **aucune** réponse HTTP :

- pas de token, pas de cookie stocké par le service worker ;
- pas de réponse authentifiée mise en cache ;
- un `401`/`403`/`419` renvoyé par le backend n'est jamais masqué par une
  réponse mise en cache à la place.

C'est une conséquence directe de la politique `NetworkOnly` ci-dessus : rien
sous `/api/*` ni vers un domaine cross-origin n'est jamais intercepté par le
cache du service worker.

### Pas d'offline métier (volontaire)

Volontairement absents de cette V1 : cache de commandes, véhicules,
dépenses, gains/commissions, profil ; IndexedDB métier ; Background Sync ;
file d'attente offline ; notifications push. Pourront être étudiés plus
tard, sur décision explicite — voir [Garde-fous](#garde-fous).

## Vitrine + espace client

```
scope: "/"
start_url: "/espace-client"
```

`scope: "/"` couvre toute l'app (`/`, `/connexion`, `/inscription`,
`/espace-client/**`) : rien n'empêche la navigation entre vitrine publique et
espace client authentifié après installation. `start_url: "/espace-client"`
fait que l'app installée s'ouvre directement sur l'espace client — cohérent
avec le routing actuel (`pages/espace-client/`), aucune restriction de scope
nécessaire.

Tant que l'authentification Laravel réelle n'est pas branchée (voir
`pages/connexion.vue`), un utilisateur non connecté qui ouvre l'app installée
atterrit sur `/espace-client` tel qu'il le ferait en visitant l'URL
directement dans un navigateur — la redirection vers `/connexion` pour un
utilisateur non authentifié est un sujet séparé, à traiter avec le
branchement réel de l'auth.

## Mise à jour

`registerType: "prompt"` (pas `autoUpdate`) : un nouveau déploiement
n'écrase jamais silencieusement le JS en cours d'exécution. Quand un nouveau
service worker est prêt, `components/PwaUpdatePrompt.vue` affiche un bandeau
discret « Nouvelle version disponible — Mettre à jour », piloté par
`usePWA().needRefresh` (composable exposé par `@vite-pwa/nuxt`). Le clic
appelle `updateServiceWorker(true)`, qui active le nouveau service worker et
recharge la page. Sans action de l'utilisateur, l'ancienne version continue
de fonctionner normalement (pas de rupture forcée en plein usage).

Pas de bandeau au premier chargement : `needRefresh` ne devient vrai que
lorsqu'un service worker plus récent est effectivement en attente, jamais à
l'installation initiale.

## Installation

### Android (Chrome)

Bannière/icône d'installation native du navigateur (aucun prompt personnalisé
ajouté côté app — voir [UX installation](#ux-installation)) une fois le
manifest et le service worker détectés comme valides.

### Ordinateur (Chrome / Edge, Windows)

Même mécanisme natif : icône d'installation dans la barre d'adresse. Une
fois installée, l'app s'ouvre dans une fenêtre dédiée en `display:
standalone`, avec le responsive desktop existant conservé (aucune version
Windows séparée, aucun CSS spécifique ajouté).

### iPhone / iPad (Safari)

iOS ne propose pas de bannière d'installation automatique. Parcours manuel :

1. Ouvrir `https://eau-la-maman.com` dans **Safari** (pas Chrome iOS, qui ne
   supporte pas l'ajout à l'écran d'accueil de la même façon).
2. Toucher l'icône **Partager**.
3. Choisir **Sur l'écran d'accueil**.
4. Confirmer — l'icône ajoutée utilise `apple-touch-icon-180x180.png`, le nom
   affiché est celui de `apple-mobile-web-app-title` (donc piloté par
   l'environnement, voir [Manifest](#manifest)).

Aucune tentative de reproduire artificiellement le comportement Android sur
iOS (pas de bannière custom, pas de détection UA pour forcer un prompt).

### UX installation

Aucun prompt d'installation personnalisé n'est déclenché au premier
chargement : `pwa.workbox`/`client.installPrompt` n'est pas configuré, donc
`@vite-pwa/nuxt` laisse le navigateur gérer nativement l'événement
`beforeinstallprompt` (pas de `preventDefault()` custom). Proposer
l'installation depuis l'espace client ou le profil est un sujet séparé, pour
plus tard.

## Environnements

Aucune nouvelle variable d'environnement : le manifest et le titre iOS
réutilisent `NUXT_PUBLIC_APP_NAME` / `NUXT_PUBLIC_ENVIRONMENT`, déjà
documentés dans `docs/environment.md` (qui anticipait déjà ce besoin : *« Nom
affiché ; sert aussi au manifest PWA »*). En pratique, avec les valeurs déjà
prévues par environnement :

| Environnement | `name`/`short_name` (non-prod) ou `name` (prod) |
|---|---|
| Local | `Eau La Maman` (valeur par défaut de `NUXT_PUBLIC_APP_NAME`) |
| Préproduction | `ELM Préprod` |
| Recette | `ELM Recette` |
| Production | `Eau La Maman` (`short_name: "ELM"`) |

Un testeur préprod/recette voit donc un nom d'app différent de la production,
aussi bien dans le manifest Android/desktop que dans le titre iOS.

## Vérifications effectuées

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (voir
  AGENTS.md pour la liste complète attendue avant de considérer une tâche
  terminée).
- Build Nitro : `.output/public/manifest.webmanifest` **n'existe pas**
  (confirme que la génération statique du module est bien désactivée), un
  service worker est bien généré, `/manifest.webmanifest` répond dynamiquement
  avec le bon `Content-Type`.
- `npm run dev` : pas de service worker enregistré (`pwa.devOptions.enabled:
  false`, volontaire — voir commentaire dans `nuxt.config.ts`), donc aucune
  interférence avec la suite Playwright existante (`docs/e2e.md`), qui tourne
  contre `nuxt dev`.
- Installabilité (manifest + service worker + icônes + HTTPS) et mode
  `standalone` : à vérifier manuellement contre un build réel
  (`npm run build && npm run preview`, ou un déploiement préprod), Chrome
  desktop et Android — pas automatisable simplement dans la suite Playwright
  existante puisqu'elle cible `nuxt dev`, où le service worker est
  volontairement désactivé.

## Tests automatisés

`tests/e2e/pwa.spec.ts` (Playwright, réutilise l'infrastructure existante —
voir `docs/e2e.md`) vérifie ce qui est testable contre `nuxt dev` : présence
du `<link rel="manifest">` et du thème couleur dans le head, et que
`/manifest.webmanifest` répond avec le bon `Content-Type` et les champs
attendus (`name`, `start_url`, `scope`, `display`, icônes). La vérification
du service worker lui-même (uniquement actif en build, voir ci-dessus) reste
manuelle.

## Garde-fous

Voir aussi `AGENTS.md`. Pour tout agent qui reviendrait sur ce chantier :

- Aucune API métier en `CacheFirst` (ni aucune autre stratégie de cache) —
  `NetworkOnly` uniquement pour `/api/*` et tout cross-origin.
- Aucune donnée privée (commandes, véhicules, dépenses, gains, profil) mise
  en cache par le service worker.
- Aucun secret dans le manifest ou le service worker.
- Ne jamais définir `ssr: false` pour les besoins de la PWA.
- Pas d'offline métier (IndexedDB, Background Sync, file d'attente) sans
  décision explicite — ce n'est pas un oubli, c'est un choix de portée pour
  cette V1.
