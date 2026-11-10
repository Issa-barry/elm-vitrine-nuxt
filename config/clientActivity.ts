import type { ApiActiviteQuery } from "~/types/api";
import type { AuthContext } from "./auth";
import type { PaginatedResponse } from "./pagination";
import type { PeriodeComptableQuery, Quinzaine } from "./clientPeriodeComptable";

// Liste unique « Commandes » : contrat GET /v1/mobile/activite et
// GET /v1/mobile/activite/{type}/{id} côté elm-monolithe (ADR 0058,
// docs/api-espace-client-contract.md §5). Une ligne porte trois informations
// distinctes, toutes calculées par le serveur :
// - `nature` : ce qu'est l'opération (vente, distribution client, précommande, transfert) ;
// - `liens` : pourquoi ce compte la voit (client, livreur, propriétaire), plusieurs pour un compte qui cumule ;
// - `avancement` : où elle en est, dans un vocabulaire commun.
// Le paiement reste à part, et le serveur l'omet pour un compte seulement livreur.
//
// Types écrits à la main : OpenAPI génère `data` en `string[]` et `liens` en
// `string`, faute de pouvoir inférer les lignes. Seuls les paramètres de
// requête viennent du contrat généré.
export type ActivityType = "vente" | "logistique";

export type ActivityLien = "client" | "livreur" | "proprietaire";

export interface ActivityCode {
  code: string;
  label: string;
}

export interface ActivityVehicle {
  id: string;
  nom_vehicule: string;
  immatriculation: string;
}

export type ActivityPaymentStatus = "creee" | "impayee" | "partiel" | "payee" | "annulee" | "acompte_recu";

export interface ClientActivityItem {
  id: string;
  type: ActivityType;
  reference: string;
  nature: ActivityCode;
  liens: ActivityLien[];
  avancement: ActivityCode;
  /** Statut de la facture d'une vente — null pour un transfert, une vente sans facture ou un compte seulement livreur. */
  statut_paiement: ActivityPaymentStatus | null;
  statut_paiement_label: string | null;
  site_source: string;
  site_destination: string;
  vehicule: ActivityVehicle | null;
  date: string;
  nb_packs: number;
}

export interface ClientOperationLine {
  id: string;
  libelle: string | null;
  quantite: number;
  /** Prix réservés au client de la commande. */
  prix_unitaire: number | null;
  total: number | null;
}

export interface ClientOperationDetail extends ClientActivityItem {
  /** Remise physique, seulement quand le système la connaît : réception ou retrait validés. */
  remise: { date: string | null; source: "reception" | "retrait" } | null;
  lignes: ClientOperationLine[];
  total: number | null;
  /** Coordonnées du client : le client lui-même, ou le livreur pendant la livraison. */
  contact: { telephone: string | null; adresse: string | null } | null;
}

// Périodes rapides : le navigateur ne transmet que la clé, le backend résout
// seul les bornes (ActiviteMineRequest + Periode, fuseau de l'application) —
// jamais de calcul de dates avec l'horloge du navigateur.
export const ACTIVITY_PERIODS = [
  { value: "aujourd_hui", label: "Aujourd’hui" },
  { value: "hier", label: "Hier" },
  { value: "cette_semaine", label: "Cette semaine" },
  { value: "semaine_precedente", label: "Semaine dernière" },
  { value: "ce_mois", label: "Ce mois" },
  { value: "mois_precedent", label: "Mois dernier" },
  { value: "cette_annee", label: "Cette année" },
] as const;

export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number]["value"];

export function activityPeriodLabel(period: ActivityPeriod): string {
  return ACTIVITY_PERIODS.find((option) => option.value === period)?.label ?? period;
}

export interface ActivityFilters {
  type: ActivityType | null;
  lien: ActivityLien | null;
  vehicule_id: string | null;
  periode: ActivityPeriod | null;
  annee: number | null;
  mois: number | null;
  quinzaine: Quinzaine | null;
  date_debut: string | null;
  date_fin: string | null;
}

export type ClientActivityResponse = PaginatedResponse<ClientActivityItem, ActivityFilters> & {
  /** Calculé sans aucun filtre : distingue un compte sans opération d'une période vide. */
  compte_a_des_operations: boolean;
};

/**
 * Requête vers GET /api/client/activity (BFF) — dérivée des paramètres de
 * requête OpenAPI. `periode` exclut `date_debut`/`date_fin` (422 sinon, voir
 * ActiviteMineRequest), et la période comptable exclut les deux. `lien` est
 * filtré par le serveur, pour garder des totaux et une pagination justes.
 */
export type ActivityQuery = Omit<ApiActiviteQuery, "lien" | "periode" | "page"> & {
  lien?: ActivityLien;
  page?: number;
  periode?: ActivityPeriod;
} & PeriodeComptableQuery;

export function activityTypeLabel(type: ActivityType): string {
  return type === "vente" ? "Vente" : "Transfert logistique";
}

const LIEN_LABELS: Record<ActivityLien, string> = {
  client: "Ma commande",
  livreur: "Livraison",
  proprietaire: "Vente sur véhicule",
};

export function lienLabel(lien: ActivityLien): string {
  return LIEN_LABELS[lien];
}

/** Badges d'une ligne : un transfert reste un transfert, une vente porte un badge par lien du compte. */
export function operationBadges(item: Pick<ClientActivityItem, "type" | "liens">): string[] {
  if (item.type === "logistique") return [activityTypeLabel("logistique")];

  return item.liens.map(lienLabel);
}

/**
 * Liens que ce compte peut avoir, d'après ses activités (GET /api/auth/me) : le
 * filtre par lien ne s'affiche qu'à partir de deux, ce n'est pas une rubrique.
 */
export function liensDuCompte(context: AuthContext | null | undefined): ActivityLien[] {
  if (!context) return [];

  return ([
    ["client", context.client_id],
    ["livreur", context.livreur_id],
    ["proprietaire", context.proprietaire_id],
  ] as const).filter(([, id]) => Boolean(id)).map(([lien]) => lien);
}

/**
 * Couleur de l'avancement : vert pour une opération aboutie, gris pour une
 * annulation (ni erreur ni blocage), ambre pour un retour, bleu sinon.
 */
export function avancementSeverity(code: string): "success" | "info" | "warn" | "secondary" {
  if (["livree", "terminee", "retiree", "termine"].includes(code)) return "success";
  if (["annulee", "annule"].includes(code)) return "secondary";
  if (["retournee", "retourne"].includes(code)) return "warn";
  return "info";
}

/**
 * Paiement affiché à côté de l'avancement d'une vente. Rien pour une facture
 * encore « Créée » (aucun encaissement attendu) ni « Annulée » (l'avancement
 * le dit déjà). Un acompte de précommande reste à compléter : attention.
 */
export function activityPayment(item: Pick<ClientActivityItem, "statut_paiement" | "statut_paiement_label">): { label: string; severity: "success" | "warn" } | null {
  if (!item.statut_paiement || !item.statut_paiement_label) return null;
  if (item.statut_paiement === "payee") return { label: item.statut_paiement_label, severity: "success" };
  if (["partiel", "impayee", "acompte_recu"].includes(item.statut_paiement)) return { label: item.statut_paiement_label, severity: "warn" };
  return null;
}
