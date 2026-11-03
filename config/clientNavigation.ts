import type { ClientCapabilities } from "./clientCapabilities";
import { isParrainSpacePath, PARRAIN_SPACE_HOME } from "./clientParrain";

// Configuration UNIQUE de navigation de l'espace client, consommée par
// ClientMenu.vue (desktop) ET ClientMobileBottomNav.vue (mobile) — chantier
// "capacités" du 27/08/2026 (voir config/clientCapabilities.ts). Un seul
// endroit à modifier pour ajouter/retirer un item ou changer sa capacité
// requise (demande du 27/08/2026, section 13 : jamais de
// roles.includes(...) dispersé dans les composants).
//
// "Mes commandes" (capability "orders") n'a volontairement PAS d'entrée ici
// pour l'instant : aucune page /espace-client/commandes n'existe encore
// (chantier distinct, non entamé — voir le point resté ouvert dans le fil de
// discussion sur les nouvelles pages "commandes"/"propositions-véhicule").
// Ajouter l'entrée sans la page casserait un lien pour tout compte avec un
// contexte client réel dès aujourd'hui.
export interface ClientNavItem {
  key: string;
  label: string;
  /** Libellé plus court du menu bas mobile, sinon `label`. */
  mobileLabel?: string;
  /** Nom d'icône PrimeIcons SANS préfixe ("pi-home", pas "pi pi-home") — chaque menu applique son propre préfixe (pi-fw sur desktop, aucun sur mobile). */
  icon: string;
  to: string;
  capability: keyof ClientCapabilities;
  exact?: boolean;
  section: "accueil" | "gestion" | "parrain" | "compte";
  /**
   * Inclus dans le menu bas mobile (espace limité à quelques items
   * atteignables au pouce) — les autres restent accessibles via le menu
   * desktop et les raccourcis du tableau de bord.
   */
  mobileBottomNav?: boolean;
}

export const CLIENT_NAV_ITEMS: ClientNavItem[] = [
  { key: "dashboard", label: "Accueil", icon: "pi-home", to: "/espace-client", capability: "dashboard", exact: true, section: "accueil", mobileBottomNav: true },
  { key: "vehicles", label: "Véhicules", icon: "pi-car", to: "/espace-client/vehicules", capability: "vehicles", section: "gestion", mobileBottomNav: true },
  { key: "logisticsActivity", label: "Livraisons", icon: "pi-map-marker", to: "/espace-client/activite", capability: "logisticsActivity", section: "gestion", mobileBottomNav: true },
  { key: "commissions", label: "Commissions", icon: "pi-percentage", to: "/espace-client/commissions", capability: "commissions", section: "gestion", mobileBottomNav: true },
  { key: "expenses", label: "Dépenses", icon: "pi-wallet", to: "/espace-client/depenses", capability: "expenses", section: "gestion", mobileBottomNav: true },
  // Prestations : placeholder UI uniquement (voir pages/espace-client/
  // prestations.vue) — aucune API prestataire réelle, jamais affiché
  // aujourd'hui (capability "services" toujours false tant que le backend
  // n'expose pas prestataire_id, voir config/clientCapabilities.ts).
  { key: "services", label: "Prestations", icon: "pi-briefcase", to: "/espace-client/prestations", capability: "services", section: "gestion" },
  { key: "parrainHome", label: "Synthèse", mobileLabel: "Accueil", icon: "pi-home", to: PARRAIN_SPACE_HOME, capability: "parrain", exact: true, section: "parrain" },
  { key: "parrainVehicles", label: "Véhicules parrainés", mobileLabel: "Véhicules", icon: "pi-car", to: `${PARRAIN_SPACE_HOME}/vehicules`, capability: "parrain", section: "parrain" },
  { key: "parrainCommissions", label: "Mes commissions", mobileLabel: "Commissions", icon: "pi-percentage", to: `${PARRAIN_SPACE_HOME}/commissions`, capability: "parrain", section: "parrain" },
  { key: "parrainPayments", label: "Mes paiements", mobileLabel: "Paiements", icon: "pi-wallet", to: `${PARRAIN_SPACE_HOME}/paiements`, capability: "parrain", section: "parrain" },
  { key: "profile", label: "Mon profil", mobileLabel: "Profil", icon: "pi-user", to: "/espace-client/profil", capability: "profile", section: "compte" },
];

export function visibleNavItems(capabilities: ClientCapabilities): ClientNavItem[] {
  return CLIENT_NAV_ITEMS.filter((item) => capabilities[item.capability]);
}

const BACK_TO_MAIN_SPACE: ClientNavItem = {
  key: "mainSpace",
  label: "Mon espace",
  icon: "pi-arrow-left",
  to: "/espace-client",
  capability: "dashboard",
  exact: true,
  section: "accueil",
};

// La barre mobile s'adapte à l'espace ouvert plutôt que de cumuler les entrées
// (décision du 02/11/2026 : 5 entrées au plus). Un parrain seul reste toujours
// dans la sienne, profil compris. Avec une autre activité, sa barre habituelle
// ne change pas hors de l'espace parrain, et celle de l'espace parrain propose
// le retour.
export function bottomNavItems(capabilities: ClientCapabilities, path: string): ClientNavItem[] {
  const parrainOnly = capabilities.parrain && !capabilities.dashboard;

  if (!capabilities.parrain || (!parrainOnly && !isParrainSpacePath(path))) {
    return CLIENT_NAV_ITEMS.filter((item) => item.mobileBottomNav && capabilities[item.capability]);
  }

  const parrainItems = CLIENT_NAV_ITEMS.filter((item) => item.section === "parrain");
  const profile = CLIENT_NAV_ITEMS.find((item) => item.key === "profile");

  return parrainOnly && profile ? [...parrainItems, profile] : [...parrainItems, BACK_TO_MAIN_SPACE];
}
