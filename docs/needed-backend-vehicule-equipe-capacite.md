# Contrat backend souhaité — équipe complète (avec téléphone) et capacité réelle du véhicule

Chantier "boîte de dialogue véhicule" du 27/08/2026
(`pages/espace-client/vehicules.vue`). Ce document liste ce qui **manque
réellement** côté `elm-monolithe` pour afficher, dans le tiroir de détail
d'un véhicule : la liste complète des livreurs de son équipe (nom + téléphone
+ rôle) et sa vraie capacité (par catégorie produit, pas un nombre unique).
Rien de ce qui suit n'est implémenté ni consommé aujourd'hui côté Nuxt — le
tiroir actuel se limite volontairement à un seul champ "Conducteur"
(nom du chauffeur, ou "Non assigné") et une "Capacité" à "—", pour ne
jamais afficher une donnée partielle ou inventée.

## Vérifié dans le code réel (elm-monolithe, 27/08/2026)

### 1. Le contrat mobile actuel réduit l'équipe à un seul nom

`GET /v1/mobile/vehicules/mine` — `App\Http\Controllers\Api\Client\VehiculesController::__invoke()`
(`app/Http/Controllers/Api/Client/VehiculesController.php:50-73`) charge bien
**toute** l'équipe (`->with(['typeVehicule', 'equipe.membres.livreur.personne'])`,
ligne 99) mais ne renvoie dans le JSON que :

```php
'conducteur' => $this->conducteurNom($v), // un seul nom, celui au rôle "chauffeur", ou null
```

`conducteurNom()` (lignes 81-86) ne prend que le premier membre au rôle
`chauffeur` — les autres membres (convoyeurs, chauffeurs supplémentaires
selon la taille réelle de l'équipe) sont chargés en mémoire par Eloquent puis
**jetés**, jamais sérialisés. Le commentaire `#[Endpoint(...)]` du contrôleur
le confirme explicitement (ligne 25-28) : *"`conducteur` : nom du membre
d'équipe au rôle `chauffeur`, `null` si aucune équipe ou aucun chauffeur
assigné"*.

### 2. Une équipe a réellement un nombre variable de membres, chacun avec un téléphone

`App\Models\EquipeLivreur` (pivot enrichi `equipe_livreurs`, voir
`app/Models/EquipeLivreur.php`) porte `role` (chaîne libre :
`chauffeur`/`convoyeur`/...) et `ordre` — aucune limite de taille d'équipe
dans le modèle. Chaque membre pointe vers un `Livreur`
(`app/Models/Livreur.php:34,50`) :

```php
protected $appends = ['nom', 'prenom', 'telephone']; // ligne 34
// telephone (ligne 50) :
return $this->personne?->telephone;
```

Le téléphone existe donc déjà nativement sur chaque membre chargé
(`equipe.membres.livreur.personne`) — c'est un problème d'exposition dans le
contrôleur, pas un champ manquant dans le modèle de données. Le backoffice
(`localhost:8000/backoffice/vehicules/{id}`) l'affiche déjà pour preuve : 2
membres pour "ABDOULAYE" (Camara Ya Moussa, chauffeur ; Camara Sidiki,
convoyeur), chacun avec son numéro.

### 3. La capacité renvoyée par l'API mobile est un champ hérité, jamais alimenté

Toujours dans le même contrôleur (ligne 59) :

```php
// Colonne héritée, jamais alimentée par les parcours actuels (capacité portée
// par vehicule_capacites désormais, cf. VehiculeCapaciteService) — contrat API
// mobile conservé tel quel (nombre unique), sans repli sur le type.
'capacite' => $v->capacite_packs,
```

Le commentaire du contrôleur (ligne 25) le dit explicitement : *"`capacite`
est un champ hérité (nombre unique, packs) — la capacité réelle
multi-catégorie n'est pas exposée ici."* — c'est pourquoi le tiroir Nuxt
affiche "—" pour toutes les vraies données : `capacite_packs` est en
pratique toujours vide, pas un bug d'affichage front.

La vraie capacité vit dans `App\Models\VehiculeCapacite`
(`app/Models/VehiculeCapacite.php`) : une ligne par véhicule **et par
catégorie produit** (`categorie_id` → `Categorie` du catalogue, ex. "Sachet
eau", "Bouteille"), avec `capacite_max` (entier). Voir
`App\Services\VehiculeCapaciteService` pour la logique déjà en place côté
backoffice. C'est exactement ce que montre le backoffice : "Sachet d'eau :
270" / "Bouteille d'eau : 540" — deux lignes `VehiculeCapacite`, pas un
nombre unique.

## Endpoint souhaité (proposition, pas un contrat figé)

Deux options, la seconde préférée (évite un aller-retour supplémentaire par
véhicule affiché) :

**Option A — étendre `GET /v1/mobile/vehicules/mine`** avec deux champs en
plus de `conducteur` (conservé tel quel, pour ne rien casser côté clients
existants du contrat) :

```json
{
  "id": "...",
  "conducteur": "Camara Ya Moussa",
  "equipe": [
    { "nom": "Camara Ya Moussa", "telephone": "+224629331246", "role": "chauffeur" },
    { "nom": "Camara Sidiki", "telephone": "+224626448941", "role": "convoyeur" }
  ],
  "capacites": [
    { "categorie": "Sachet eau", "capacite_max": 270 },
    { "categorie": "Bouteille", "capacite_max": 540 }
  ]
}
```

`telephone` au même format que le reste du contrat mobile (voir
`Personne::normaliserTelephone`/l'existant sur `/me`), `role` = valeur brute
de `EquipeLivreur.role` (chaîne libre, jamais traduite/devinée côté Nuxt —
même principe que `statut_label` ailleurs dans ce contrat). `equipe: []` et
`capacites: []` si aucune équipe/aucune capacité configurée — jamais `null`
sur la liste elle-même pour rester cohérent avec le reste du contrat
paginé (voir `docs/api-espace-client-contract.md`).

**Option B** — endpoint dédié `GET /v1/mobile/vehicules/{id}/equipe`, si
l'organisation préfère ne pas alourdir la liste (les infos d'équipe/capacité
ne sont utiles qu'à l'ouverture du tiroir de détail, jamais dans le tableau).

## Ce qui reste volontairement non implémenté côté Nuxt

Le tiroir de détail (`pages/espace-client/vehicules.vue`) garde un seul champ
"Conducteur" (nom du chauffeur, "Non assigné" sinon) et "Capacité" à "—" tant
que l'un des deux champs ci-dessus n'existe pas — jamais une liste de
livreurs ou une capacité reconstituée à partir de données partielles ou
inventées.
