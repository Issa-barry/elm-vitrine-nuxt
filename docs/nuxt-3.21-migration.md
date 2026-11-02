# Migration Nuxt 3.9.0 → 3.21.11

Chantier séparé du Groupe A (dépendances transitives), branche
`chore/security-nuxt-upgrade`. Motivation : plusieurs CVE Nuxt touchent le
runtime réellement déployé sur `eau-la-maman.com` (pas seulement l'outillage
dev), voir `docs/security-audit.md`.

## Pourquoi 3.21.11 et pas Nuxt 4

`npm view nuxt dist-tags` : le tag `3x` pointe explicitement vers `3.21.11`
— c'est la dernière version officiellement maintenue de la branche 3.x, pas
juste « une version qui satisfait `^3.9.0` ». `latest` (4.5.2) est une
majeure différente, hors périmètre ici : la consigne était de rester sur
Nuxt 3 si ça suffit à corriger les vulnérabilités runtime, et 3.21.11 les
corrige toutes (voir plus bas).

## Versions avant / après

| Package | Avant | Après |
|---|---|---|
| nuxt | 3.9.0 | 3.21.11 |
| @nuxt/schema (interne à nuxt) | 3.9.0 | 3.21.11 |
| @nuxt/kit (interne à nuxt) | 3.9.0 | 3.21.11 |
| nitropack | 2.8.1 | 2.13.4 |
| vite (interne à @nuxt/vite-builder) | 5.0.10 | 7.3.6 |
| vue | 3.5.41 | 3.5.41 (inchangé) |
| vue-router | 4.2.5 (déclaré) | résolu 4.6.4 (toujours dans la plage `^4.2.5`) |
| chokidar (interne à nuxt) | 3.x | 5.x (interne, sans impact applicatif) |
| @unhead/vue | 1.8.9 | 2.1.17 |
| primevue / @primevue/nuxt-module / @primeuix/themes | 4.5.4 / 4.5.4 / 2.0.0 | **inchangés** |
| typescript | 5.9.3 | 5.9.3 (inchangé) |
| @nuxt/eslint | 0.6.2 | **inchangé volontairement** (commit séparé, voir plus bas) |
| vitest | 2.1.9 | **inchangé volontairement** (commit séparé, voir plus bas) |

`vite` reste à 5.0.10 au niveau racine du lockfile (un autre outil du
dev-toolchain le demande encore) mais `@nuxt/vite-builder` — celui qui
compile réellement l'app — a sa propre copie imbriquée en 7.3.6. Vérifié
explicitement dans `package-lock.json` : c'est la résolution npm normale
pour deux consommateurs ayant des besoins de majeures différentes, pas une
incohérence.

## Vulnérabilités

- Avant migration (baseline) : 56 (6 critiques, 38 hautes, 7 modérées, 5 basses).
- Après Groupe A seul (branche séparée) : 59 (4 critiques, 31 hautes, 6 modérées, 18 basses) — redistribution favorable, détail dans `security-audit.md`.
- Après migration Nuxt (cette branche, sans le Groupe A) : **10** (1 critique, 6 hautes, 3 modérées, 0 basse).
- Nuxt/nitropack eux-mêmes : 0 CVE restante après migration.

## CVE Nuxt corrigées et exposition réelle

Le RCE le plus grave listé par `npm audit` (« Server-Side Remote Code
Execution via Runtime Template Injection in Nuxt Server Island Props »,
GHSA-9473-5f9j-94wq) nécessite la fonctionnalité **Nuxt Server Islands**
(`<NuxtIsland>` / fichiers `*.server.vue` / `experimental.componentIslands`).
Vérifié : ce projet n'utilise cette fonctionnalité nulle part (aucun fichier
`*.server.vue`, aucune référence à `NuxtIsland`/`componentIslands`) — ce
risque précis n'était donc probablement pas exploitable même avant la
migration. En revanche, plusieurs autres CVE s'appliquent génériquement à
tout site Nuxt utilisant `navigateTo`/`<NuxtLink>` (XSS reflected, open
redirect) — ce projet les utilise partout — donc la migration reste
justifiée indépendamment du cas Server Islands.

## Correctif nécessaire : `ci.yml` passe à `npm ci --legacy-peer-deps`

Découvert seulement en PR réelle (pas reproduit par mes premières
vérifications locales) : `@nuxt/devtools` → `vite-plugin-vue-tracer`
déclare des `peerDependencies` sur `vite` qui entrent en conflit avec la
version que `@nuxt/vite-builder` utilise réellement. En résolution stricte,
npm 10 plante avec `Cannot read properties of null (reading 'edgesOut')`
(bug connu d'Arborist) — reproduit à l'identique sur Windows **et** sur
`ubuntu-latest` via un workflow temporaire, donc pas un problème
d'environnement local. `--legacy-peer-deps` contourne le crash ; le lock a
été généré avec ce même flag, donc `ci.yml` doit l'utiliser aussi pour que
`npm ci` accepte le lock (une résolution stricte du lock ne correspond pas
à une résolution stricte à froid — d'où l'échec initial en CI malgré des
vérifications locales vertes).

## Correctif nécessaire : `@types/node`

Régression détectée au typecheck après la bascule : `config/runtime.ts`
utilise `process.env.npm_package_version`, et Nuxt 3.21.11 n'injecte plus
automatiquement les types Node globaux (`.nuxt/tsconfig.json` génère
`"types": []`, alors qu'avant un mécanisme différent les incluait
implicitement). `@types/node` n'avait jamais été une dépendance explicite
du projet — ajouté en `^22.12.0` (aligné sur le Node 22.x utilisé par
`.github/workflows/ci.yml` et par l'hébergement Hostinger).

## Vérifications effectuées

Toutes dans un clone isolé (`git archive` + `npm install --legacy-peer-deps`
avec Node 22/npm 10, cf. `AGENTS.md` pour pourquoi `--legacy-peer-deps` —
contourne un bug connu de résolution de pairs de npm 10 sur cet arbre de
dépendances) :

- `npm install` : ✅ (10 vulnérabilités restantes, voir plus haut)
- `npm run lint` : ✅
- `npm run typecheck` : ✅ (après ajout de `@types/node`)
- `npm run test` : ✅ (6/6)
- `npm run build` : ✅ — client (Vite 7), serveur (Vite 7 SSR), Nitro (preset `node-server`) tous construits sans erreur
- Démarrage réel de `node .output/server/index.mjs` : ✅, testé avec les variables d'environnement Hostinger (`NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_ENVIRONMENT`)
  - `/`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/espace-client`, `/espace-client/vehicules`, `/espace-client/activite`, `/espace-client/profil` : tous HTTP 200 avec HTML SSR complet
  - `robots.txt` : `Disallow: /` en `NUXT_PUBLIC_ENVIRONMENT=local`, `Allow: /` en `production` — logique noindex intacte
- Contrôle visuel (Playwright + Chromium headless, `chrome-win64` déjà en cache local) sur les 8 pages ci-dessus × 3 largeurs (390/768/1440 px) : 24 captures, **0 erreur console**, thème PrimeVue ELM et mise en page responsive visuellement intacts sur l'échantillon inspecté (landing, connexion, tableau de bord, véhicules mobile)

## Suivi : peut-on retirer `--legacy-peer-deps` ?

Vérifié le 2026-08-25 : `@nuxt/devtools@3.4.2` est déjà le dernier patch de
la ligne 3.4.x (compatible Nuxt 3 — la suite 4.0.0-alpha.* est réservée à
Nuxt 4, hors périmètre). `vite-plugin-vue-tracer@1.5.0` (déjà résolu dans
notre arbre) est aussi sa dernière version publiée, et déclare toujours
`vite: "^6.0.0 || ^7.0.0 || ^8.0.0-0"` en peerDependency — aucune version
plus récente ne change cette plage. Le conflit qui fait planter npm 10 en
résolution stricte (bug Arborist `edgesOut`) n'est donc pas un simple
retard de version corrigible par un bump : c'est soit un bug npm en
attente de correctif upstream, soit une incohérence de peerDependencies
qui ne se résoudra que par une évolution de `@nuxt/devtools` lui-même.

**Conclusion : ne pas retirer `--legacy-peer-deps` maintenant.** Rien à
mettre à jour côté projet sans une migration Nuxt 4 (hors périmètre, cf.
plus haut). À revérifier périodiquement (`npm view @nuxt/devtools
versions`) — si une 3.4.3+ ou une nouvelle version de
`vite-plugin-vue-tracer` assouplit sa plage `vite`, retester `npm ci` sans
le flag avant de le retirer de `ci.yml`.

## PWA (`@vite-pwa/nuxt`) — note pour plus tard

Pas de contrainte de version explicite trouvée dans les `peerDependencies`
de `@vite-pwa/nuxt` vis-à-vis de Vite/Nuxt — rien n'indique d'incompatibilité
avec Vite 7 ou Nuxt 3.21. Non vérifié par une installation réelle (le module
n'est pas encore utilisé dans ce projet) : à confirmer le jour de son
ajout effectif, pas une conclusion figée ici.

## Volontairement non traité dans cette branche

- **`@nuxt/eslint`** (0.6.2, fix nécessite 1.17.0, majeure) et **`vitest`**
  (2.1.9, fix nécessite 4.1.11, majeure) : dev/CI uniquement, jamais le
  runtime déployé. Laissés pour un commit séparé et réversible, jamais
  mélangés à cette migration — une régression après coup serait sinon
  ambiguë à attribuer.
- Le Groupe A (`chore/security-transitive-deps`) : branche indépendante,
  pas rebasée sur celle-ci pour garder les deux chantiers isolables et
  revenables séparément.
