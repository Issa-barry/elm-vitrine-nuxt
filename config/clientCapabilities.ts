import type { AuthContext } from "./auth";

// Couche de CAPACITÉS UI — chantier du 27/08/2026, préparation du frontend
// pour un futur contexte métier "prestataire" (voir docs/api-espace-client-
// contract.md côté elm-monolithe : le backend n'expose pas encore ce
// contexte, aucune API prestataire n'est consommée ici). Décide uniquement
// QUOI AFFICHER (menus, sections, widgets) — CE N'EST PAS UNE SÉCURITÉ :
// Laravel reste seul responsable des autorisations réelles (role:client|
// proprietaire|livreur sur chaque endpoint, ClientIdentityResolver). Masquer
// un menu ici n'empêche jamais un accès direct par URL — voir middleware/auth.ts,
// qui reste la seule vraie garde.
//
// Principe : ne JAMAIS modéliser l'UI autour d'un rôle unique
// (roles.includes("prestataire") ni roles[0]) — un compte cumule des
// contextes (client + proprietaire + prestataire...). L'accès à l'espace
// client, lui, ne dépend d'aucun rôle (compte unique, ADR 0055 côté
// elm-monolithe). Cette couche centralise la
// traduction "contextes métier -> capacités UI" en UN seul endroit : quand
// le backend exposera réellement `prestataire_id` (ou équivalent),
// resolveClientCapabilities() est le seul fichier à ajuster.
export interface ClientCapabilities {
  /** Tableau de bord — toujours accessible à tout compte espace client (contenu déjà adaptatif, voir summary/par_vehicule de GET /v1/mobile/dashboard). */
  dashboard: boolean;
  /** Commissions — fonctionnalité générique : un prestataire perçoit des commissions comme un proprietaire/livreur, pas réservée à la possession d'un véhicule. */
  commissions: boolean;
  /** Dépenses — idem commissions : générique, jamais liée exclusivement à un véhicule possédé. */
  expenses: boolean;
  /** Mes véhicules — uniquement pertinent pour un contexte proprietaire ou livreur (équipe). */
  vehicles: boolean;
  /**
   * Commandes — liste unique des opérations du compte (ADR 0058 côté elm-monolithe) : ses commandes,
   * ses livraisons et les ventes de ses véhicules. Ouverte à tout compte, même sans activité : le
   * serveur ne renvoie que ce qui le concerne, et le bouton « Passer une commande » s'y trouve.
   */
  orders: boolean;
  /** Mes prestations — futur contexte prestataire, aucun backend aujourd'hui (voir pages/espace-client/prestations.vue, placeholder). */
  services: boolean;
  /** Espace parrain — compte rattaché à un parrain par un responsable (ADR 0050 côté elm-monolithe). */
  parrain: boolean;
  /** Profil — toujours accessible à tout compte espace client. */
  profile: boolean;
}

// Un compte sans aucun contexte métier reconnu (agent du back-office sans
// activité, par exemple) n'a droit à aucun menu métier — jamais un menu
// affiché "par défaut". Il arrive sur l'accueil neutre (config/clientAccueil.ts).
const NO_CAPABILITIES: ClientCapabilities = {
  dashboard: false,
  commissions: false,
  expenses: false,
  vehicles: false,
  orders: false,
  services: false,
  parrain: false,
  profile: false,
};

/**
 * Dérive les capacités UI à partir du `context` réel de GET /api/auth/me.
 * Jamais de `roles.includes(...)` dispersé dans les composants (voir demande
 * du 27/08/2026, section 14) : ce fichier est le seul point de traduction.
 */
export function resolveClientCapabilities(context: AuthContext | null | undefined): ClientCapabilities {
  if (!context) return NO_CAPABILITIES;

  // Vrai aujourd'hui pour n'importe quel contexte reconnu (client OU
  // proprietaire OU livreur OU, demain, prestataire) : dashboard/commissions/
  // dépenses/profil ne sont jamais réservés à un seul type de compte (voir
  // demande du 27/08/2026, section 5 : "tout le monde a des dépenses et
  // peut avoir des commissions").
  // Un consultant perçoit des commissions (ADR 0054) : le tableau de bord et les
  // commissions les comptent avec ses autres activités.
  const hasAnyContext = Boolean(
    context.client_id || context.proprietaire_id || context.livreur_id || context.prestataire_id || context.consultant_ids?.length,
  );

  // parrain_id volontairement hors de hasAnyContext : tableau de bord,
  // commissions et dépenses lisent le dashboard propriétaire/livreur, vide pour
  // un parrain seul. Il a ses propres écrans, et le menu des autres comptes ne
  // change pas.
  const hasParrainContext = Boolean(context.parrain_id);

  // Véhicules : uniquement proprietaire ou livreur (une équipe) — jamais un
  // client pur, jamais (aujourd'hui) un prestataire pur.
  const hasVehicleContext = Boolean(context.proprietaire_id || context.livreur_id);

  return {
    dashboard: hasAnyContext,
    commissions: hasAnyContext,
    expenses: hasAnyContext,
    vehicles: hasVehicleContext,
    orders: true,
    // prestataire_id n'existe pas encore côté backend : toujours false en
    // pratique tant qu'il n'est pas exposé — voir config/auth.ts::AuthContext.
    services: Boolean(context.prestataire_id),
    parrain: hasParrainContext,
    profile: hasAnyContext || hasParrainContext,
  };
}
