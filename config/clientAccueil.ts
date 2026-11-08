import type { AuthContext } from "./auth";
import { resolveClientCapabilities } from "./clientCapabilities";

// Accueil d'un compte actif sans aucune activité (agent du back-office sans
// fiche rattachée, par exemple) : l'espace client lui est ouvert (compte
// unique, ADR 0055 côté elm-monolithe), mais il n'a aucune donnée métier à
// voir. Il arrive sur cette page neutre plutôt que sur un tableau de bord vide.
export const ACCUEIL_SANS_ACTIVITE = "/espace-client/bienvenue";

// `context` inconnu (/me en échec juste après la connexion) : on ne conclut
// rien, le compte garde l'accueil habituel. `orders` n'est pas une activité :
// la liste « Commandes » est ouverte à tout compte (ADR 0058 côté elm-monolithe),
// la compter rendrait tout compte « avec activité ».
export function compteSansActivite(context: AuthContext | null | undefined): boolean {
  if (!context) return false;

  const { orders: _ouverteATous, ...activites } = resolveClientCapabilities(context);

  return !Object.values(activites).some(Boolean);
}
