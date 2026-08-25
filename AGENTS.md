# Règles pour les agents IA sur ce dépôt

## Variables d'environnement

- Aucune URL backend (Laravel) ne doit être codée en dur dans une page, un
  composant ou une route serveur. Toujours passer par `useRuntimeConfig()`
  (client/universel) ou `useRuntimeConfig(event)` (routes/plugins Nitro).
- Aucun secret ne doit être placé sous une clé `NUXT_PUBLIC_*` /
  `runtimeConfig.public` : tout ce qui s'y trouve est visible dans le
  navigateur. Un jeton de service, une clé admin ou tout autre secret va
  uniquement dans `runtimeConfig` (racine, hors `public`).
- Toute nouvelle variable d'environnement doit être ajoutée à `.env.example`
  avec un commentaire expliquant son rôle, et documentée dans
  [`docs/environment.md`](docs/environment.md).
- Ne jamais committer de vraie valeur secrète, ni de fichier `.env`,
  `.env.preprod`, `.env.production` ou `.env.recette` contenant des valeurs
  réelles. Les valeurs de préprod/production/recette vivent uniquement dans
  le panneau Hostinger de la Web App correspondante.
- Avant d'ajouter une variable, vérifier si sa valeur doit être disponible au
  runtime (via `useRuntimeConfig`) ou si elle est légitimement figée au
  build (ex. `NUXT_PUBLIC_APP_VERSION`, lue depuis `package.json` si
  absente) — documenter explicitement toute exception de ce type dans
  `docs/environment.md`.
- Après toute modification de `config/runtime.ts` ou de la config
  d'environnement, lancer `npm run test` (voir `config/runtime.test.ts`) et
  `npm run typecheck`/`npm run lint` avant de considérer le travail terminé.

## Vérifications avant de considérer une tâche terminée

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Ne pas prétendre qu'une tâche est validée si l'une de ces commandes n'a pas
réellement été exécutée avec succès. Ces 4 commandes sont exactement celles
lancées par [`.github/workflows/ci.yml`](.github/workflows/ci.yml) sur toute
Pull Request — un agent qui les valide en local valide la CI.

## CI/CD et flux Git

Flux de promotion imposé par
[`.github/workflows/branch-flow.yml`](.github/workflows/branch-flow.yml) :

```
dev → pre-prod → production → main
```

- `dev` : développement courant (commits directs autorisés).
- `pre-prod` : validation fonctionnelle/technique avant production.
- `production` : branche réellement déployée par Hostinger sur
  `eau-la-maman.com` (intégration Git native du panneau, voir
  [`docs/environment.md`](docs/environment.md)).
- `main` : référence stable des versions validées, ne déclenche aucun
  déploiement.

Règles pour tout agent IA intervenant sur ce dépôt :

1. Ne jamais pousser directement sur `production` ou `main` — toujours par
   Pull Request depuis la branche immédiatement en amont du flux
   (`pre-prod` → `production`, `production` → `main`).
2. Exécuter les contrôles qualité (`lint`, `typecheck`, `test`, `build`)
   avant de considérer une tâche terminée — jamais d'affirmation non
   vérifiée (voir section précédente).
3. Ne jamais contourner un test ou un contrôle qualité qui échoue (pas de
   `continue-on-error`, de règle désactivée, de test skip ou de commande
   rendue artificiellement verte) : corriger la cause, ou remonter le
   blocage plutôt que le masquer.
4. Ne pas modifier `.github/workflows/*.yml` sans raison documentée dans le
   commit/la PR — ces workflows sont la seule barrière avant `pre-prod` et
   `production`.
5. Ne jamais committer de secret dans le dépôt (jeton, clé, mot de passe) :
   les valeurs sensibles vivent uniquement dans les secrets GitHub Actions
   ou le panneau Hostinger de l'environnement concerné (voir
   [`docs/environment.md`](docs/environment.md)).
