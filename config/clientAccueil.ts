import type { AuthContext } from "./auth";
import { resolveClientCapabilities } from "./clientCapabilities";

// Accueil d'un compte actif sans aucune activité (agent du back-office sans
// fiche rattachée, par exemple) : l'espace client lui est ouvert (compte
// unique, ADR 0055 côté elm-monolithe), mais il n'a aucune donnée métier à
// voir. Il arrive sur cette page neutre plutôt que sur un tableau de bord vide.
export const ACCUEIL_SANS_ACTIVITE = "/espace-client/bienvenue";

// `context` inconnu (/me en échec juste après la connexion) : on ne conclut
// rien, le compte garde l'accueil habituel.
export function compteSansActivite(context: AuthContext | null | undefined): boolean {
  if (!context) return false;

  return !Object.values(resolveClientCapabilities(context)).some(Boolean);
}
