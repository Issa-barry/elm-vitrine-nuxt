# Tests E2E (Playwright)

Base E2E pour les parcours critiques du frontend, séparée du chantier
migration Nuxt et du chantier sécurité (voir `docs/nuxt-3.21-migration.md`,
`docs/security-audit.md`).

## Lancer les tests

```bash
npm run test:e2e       # headless
npm run test:e2e:ui    # mode UI Playwright, pour déboguer
```

Nécessite Chromium (`npx playwright install chromium` si jamais absent —
souvent déjà en cache local si un autre projet utilise Playwright).

## Ce qui est couvert

8 parcours, dans `tests/e2e/` :

| Fichier | Parcours |
|---|---|
| `landing.spec.ts` | Page d'accueil, CTA Connexion/Inscription |
| `connexion.spec.ts` | Validation, connexion simulée, lien mot de passe oublié |
| `inscription.spec.ts` | Parcours complet téléphone → identité → sécurité → succès |
| `espace-client-navigation.spec.ts` | Navigation entre les sections du menu |
| `vehicules.spec.ts` | Tableau des véhicules (vue desktop) |
| `activite.spec.ts` | Livraisons et commandes |
| `profil.spec.ts` | Informations personnelles |
| `pwa.spec.ts` | Manifest PWA, icônes, balises `<head>` associées (voir `docs/pwa.md`) |

## Portée réelle : pas de backend

`connexion.vue` et `inscription.vue`/`mot-de-passe-oublie.vue` documentent
explicitement l'absence d'appel réseau à ce stade (voir leurs commentaires
en tête de fichier) — la connexion et l'étape "vérification du téléphone"
de l'inscription **simulent** une réponse backend via
`isUiPreview = import.meta.dev`. Ces tests tournent donc contre
`npm run dev` (voir `playwright.config.ts`), jamais contre un build ni
contre le vrai monolithe `elm-monolithe`. Ce n'est pas du E2E "bout en
bout" au sens strict — c'est une validation fiable du comportement
frontend (rendu, navigation, validation côté client) qui devra être
complétée le jour où ces pages seront branchées au backend réel.

## Fragilité connue (machine locale, pas confirmée en CI)

Sur la machine où cette suite a été écrite, `npm run dev` sous charge peut
compiler une route à la volée plus lentement que le timeout par défaut,
provoquant un échec intermittent sur 1-2 tests (typiquement la première
visite d'une route dans la suite). Le comportement applicatif lui-même a
été vérifié correct par un script Playwright isolé (interaction identique,
succès systématique) — c'est un problème de timing machine, pas un bug
d'app ni de sélecteur. `retries: 1` est configuré pour `CI`, mais cette
suite **n'est pas encore câblée comme check bloquant** dans `ci.yml` : à
confirmer stable sur un vrai run GitHub Actions avant de l'y ajouter.
