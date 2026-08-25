# Audit sécurité des dépendances

Contexte : `npm audit` signalait 56 vulnérabilités (6 critiques, 38 hautes, 7
modérées, 5 basses) sur ce projet (Nuxt 3.9.0). Traité en deux chantiers
séparés et volontairement découplés :

- **Groupe A** (ce document, branche `chore/security-transitive-deps`) :
  dépendances transitives corrigibles par un bump ciblé, **sans toucher à
  Nuxt/Vite/Nitro/PrimeVue**.
- **Migration Nuxt** (branche `chore/security-nuxt-upgrade`) : les CVE qui
  touchent réellement le runtime déployé (`nuxt`, `nitropack`) nécessitent
  une vraie montée de version contrôlée, traitée séparément.

## Pourquoi pas `npm audit fix` (même sans `--force`)

Testé et rejeté : `npm audit fix` sans `--force` fait déjà passer `nuxt`
3.9.0 → 3.21.11 et `@nuxt/schema` 3.9.0 → 4.5.2 (major), parce
qu'aucune version sûre de `@nuxt/devtools` n'existe dans la plage que
`nuxt@3.9.0` déclare (`^1.0.6`) — la seule CVE critique de `@nuxt/devtools`
n'a pas de correctif avant sa version 3.x. npm n'a donc pas d'autre choix,
même en mode « non cassant », que de faire remonter `nuxt` lui-même. C'est
exactement le saut de version qu'on traite à part dans le chantier Nuxt.

## Méthode Groupe A

Pour chaque package : lire la plage réellement vulnérable de l'avis de
sécurité (pas juste regarder `npm audit fix --dry-run`, qui vise souvent
« latest » alors qu'un correctif existe déjà dans la même version majeure),
et ne prendre que le plus petit bump qui sort de cette plage. Aucun saut de
version majeure dans ce fichier.

| Package | Avant | Après (override) | CVE visée | Parent | Exposition réelle |
|---|---|---|---|---|---|
| tar | 6.2.0 | 6.2.1 | DoS parsing (folders count), GHSA-f5x3-32g6-xq36 | @mapbox/node-pre-gyp, cacache, giget | Aucune (npm/CLI, jamais en prod) |
| shell-quote | 1.8.1 | 1.10.0 | Quadratic DoS parse(), GHSA-395f-4hp3-45gv | launch-editor (dev server) | Aucune (dev only) |
| simple-git | 3.22.0 | 3.36.0 | RCE via bypass parsing option, GHSA-hffm-xvc3-vprc | @nuxt/devtools | Aucune (devtools, dev only) |
| node-forge | 1.3.1 | 1.4.0 | ASN.1 recursion/forgery, GHSA-5m6q-g25r-mvwx et autres | listhen (dev server) | Aucune (dev only) |
| ip | 2.0.0 | 2.0.1 | SSRF isPublic, GHSA-2p57-rm9w-gvfp | socks | Quasi nulle |
| socks | 2.7.1 | 2.8.9 | (suit ip) | tooling proxy | Quasi nulle |
| lodash | 4.17.21 | 4.18.1 | Code injection `_.template`, GHSA-r5fr-rjxr-66jc | vue-eslint-parser, archiver-utils | Dev/lint only |
| flatted | 3.2.9 | 3.4.4 | Prototype pollution parse(), GHSA-rf6f-7fwh-wjgh | @nuxt/devtools, flat-cache | Build/dev only |
| minimatch | 5.1.6 | 5.1.9 | ReDoS wildcards/GLOBSTAR, GHSA-3ppc-4f35-3m26 et autres | @eslint/config-array et al. | Dev/lint only |
| picomatch | 2.3.1 | 2.3.2 | ReDoS extglob quantifiers, GHSA-c2c7-rcm5-vvqj | @parcel/watcher, @rollup/pluginutils | Dev/build only |
| svgo | 3.2.0 | 3.3.5 | Billion Laughs DoS + removeScripts, GHSA-xpqw-6gx7-v673 / GHSA-2p49-hgcm-8545 | postcss-svgo | Build-time (assets SVG) |
| undici | 5.28.2 | 5.28.5 | Random values / integrity / proxy-auth (fix partiel — voir note) | openapi-typescript (script, jamais exécuté en prod) | Aucune (tooling, pas le fetch runtime Node) |
| yaml | 2.3.4 | 2.9.0 | Stack overflow YAML imbriqué, GHSA-48c2-rrv3-qjmp | postcss-load-config, unplugin-vue-router | Build config only |
| diff | 5.1.0 | 5.2.2 | DoS parsePatch/applyPatch, GHSA-73rr-hh4g-fpgx | @nuxt/devtools-wizard | Aucune (devtools, dev only) |
| @babel/core | 7.23.7 | 7.26.10 | ReDoS regexp named groups (via @babel/helpers), GHSA-968p-4wvh-cqc8 | vite-plugin-vue-jsx, untyped | Build-time seulement |

Note **undici** : le fix complet (smuggling, CRLF injection, WebSocket DoS)
n'existe qu'à partir de la 6.x. La 5.28.5 ferme 3 des 13 avis (valeurs
aléatoires, intégrité, proxy-auth) sans changer de majeure. Le reste est
documenté en dette ci-dessous — cette instance d'undici est une dépendance
d'`openapi-typescript` (un script de génération, jamais exécuté en
production), donc sans urgence.

## Explicitement écarté de ce chantier (nécessite une majeure ou une revue dédiée)

Pas d'override ici : soit aucun correctif n'existe dans la version majeure
actuelle (saut de majeure obligatoire), soit la plage vulnérable annoncée
par `npm audit` ne correspondait pas clairement à l'instance réellement
installée (nécessite une vérification plus poussée avant d'agir) :

| Package | Version | Situation |
|---|---|---|
| sigstore, @sigstore/sign, @sigstore/tuf, tuf-js | 2.x | Fix seulement en v5/v6 — chaîne pacote ← @nuxt/devtools, aucune exposition prod, mais saut de majeure à valider isolément |
| serialize-javascript | 6.0.1 | Fix seulement en 7.0.5+ — aucun correctif dans la v6 |
| glob, brace-expansion | 8.1.0 / 2.0.1 | Plage vulnérable annoncée par npm audit (glob 10.2–10.4, brace-expansion 2.0–2.1.3) ne correspond pas clairement à l'instance installée — possible faux positif de dédoublonnage, à vérifier avant d'agir plutôt que de deviner |
| pacote, cacache, make-fetch-happen, npm-registry-fetch, node-gyp, @npmcli/run-script, @mapbox/node-pre-gyp, @vercel/nft, parse-git-config | — | Chaîne npm-interne de `@nuxt/devtools` ; corrections existantes mais en cascade les unes des autres — à traiter comme un lot cohérent séparé, pas en overrides isolés |
| @nuxt/eslint / @eslint/config-inspector | 0.6.2 | Fix nécessite @nuxt/eslint 1.17.0 (majeure, format de config ESLint flat potentiellement différent) — dev-only, pas urgent |
| vitest | 2.1.9 | Fix nécessite 4.1.11 (majeure) — CVE sur le serveur UI Vitest, jamais lancé ici (`vitest run`, pas `--ui`) |
| nuxt et son écosystème couplé (@nuxt/devtools, @nuxt/kit, nitropack, vite, esbuild, rollup...) | 3.9.0 | Traité séparément, voir migration Nuxt |

`vitest`/`@nuxt/eslint` : volontairement laissés pour un commit séparé et
réversible, jamais mélangés avec la migration Nuxt (risque de devoir
distinguer laquelle des deux montées a causé une régression).

## Vérification

Après application des overrides ci-dessus : `npm ci` (lockfile propre,
diff limité aux 15 packages listés + leurs propres dépendances directes,
zéro changement sur nuxt/vue/vite/nitropack/primevue/typescript),
`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
Résultats dans le message de commit et le rapport final.
