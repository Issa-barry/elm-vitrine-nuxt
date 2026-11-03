# Contrat backend souhaité — statistiques de commissions (timeline)

Chantier du 27/08/2026 : refonte de `pages/espace-client/commissions.vue` en
vue statistique des gains (KPI, filtre de période, répartition par véhicule).
Ce document liste ce qui **manque réellement** côté `elm-monolithe` pour
compléter cette page — rien de ce qui suit n'est implémenté ni consommé
aujourd'hui côté Nuxt.

## Ce qui existe déjà et suffit

`GET /v1/mobile/dashboard` (voir `docs/api-espace-client-contract.md` §5 côté
`elm-monolithe`) couvre déjà, sans rien ajouter côté backend :

- le filtre de période (`period=7j|30j|ce_mois|mois_passe|custom` +
  `date_debut`/`date_fin`) ;
- le filtre par véhicule (`vehicule_id`) ;
- le KPI principal (`summary.total_earned`, `summary.total_paid`,
  `summary.balance`, `summary.operations_count`) ;
- la répartition par véhicule (`par_vehicule[]`), y compris pour la barre de
  progression (part du total calculée côté Nuxt, jamais une nouvelle formule
  métier — simple division sur des montants déjà réels).
- la comparaison de tendance pour la période "Ce mois" (`period=mois_passe`
  en second appel).

## Ce qui manque : une série temporelle (bloc "Évolution des gains")

Aucun endpoint actuel ne renvoie une décomposition **jour par jour** (ou
semaine par semaine) des gains sur une période. Deux endpoints s'en
approchent mais ont été écartés :

- `GET /v1/mobile/vehicules/{id}/commissions` — a des dates exploitables,
  mais (a) est scopé à **un seul véhicule** (fusionner plusieurs véhicules
  suppose autant d'appels que de véhicules), et surtout (b) ne couvre que les
  commissions de **vente** (`CommissionEnveloppePart`) — **jamais** les
  commissions logistiques, exactement la même limitation documentée pour
  `GET /gains/mine` (déconseillé, `docs/api-espace-client-contract.md` §5).
  Construire une timeline à partir de cet endpoint aurait produit un total
  **divergent** de celui, faisant autorité, affiché sur `/v1/mobile/dashboard`
  — jamais fait pour cette raison.
- `GET /gains/mine` — même limitation, explicitement déconseillé.

### Endpoint souhaité (proposition, pas un contrat figé)

```
GET /v1/mobile/commissions/statistiques
```

Query (mêmes noms que `/v1/mobile/dashboard` par cohérence) :

| Param | Effet |
|---|---|
| `period` | `7j`\|`30j`\|`ce_mois`\|`mois_passe`\|`custom` |
| `date_debut`, `date_fin` | si `period=custom` |
| `vehicule_id` | optionnel, restreint à un véhicule |

Réponse conceptuelle (exemple, pas un schéma final) :

```json
{
  "summary": { "total": 175500, "count": 1, "paid": 0, "remaining": 175500 },
  "timeline": [
    { "date": "2026-08-20", "amount": 50000 },
    { "date": "2026-08-25", "amount": 125500 }
  ],
  "by_vehicle": [
    { "vehicle": { "id": "...", "name": "ACHOUR", "registration": "BG5084" }, "amount": 175500, "count": 1 }
  ]
}
```

Le regroupement par jour/semaine/mois selon la longueur de la période
(demande initiale du chantier, section 8) doit être décidé **côté backend**
(même moteur que `ClientEarningsService`, pas une agrégation approximative
recalculée côté Nuxt) — sinon le total de la timeline risque de diverger,
encore une fois, de `summary.total_earned`.

## Ce qui reste volontairement non implémenté côté Nuxt

Le bloc "Évolution des gains" de `commissions.vue` affiche un état "Bientôt
disponible" honnête (jamais une timeline reconstituée à partir de données
partielles, jamais un graphique avec des valeurs inventées) tant que
l'endpoint ci-dessus — ou équivalent — n'existe pas.
