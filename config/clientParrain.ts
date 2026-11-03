import type {
  ApiParrainCommissionsQuery,
  ApiParrainCommissionsResponse,
  ApiParrainPaiementsQuery,
  ApiParrainPaiementsResponse,
  ApiParrainSyntheseResponse,
  ApiParrainVehiculesResponse,
} from "~/types/api";

// Espace parrain — contrat : docs/api-espace-parrain-contract.md côté
// elm-monolithe. Aucun montant n'est calculé ici : totaux et restes viennent
// du backend. L'identifiant du parrain n'est jamais envoyé, Laravel le déduit
// du compte authentifié.
export const PARRAIN_SPACE_HOME = "/espace-client/parrain";

export function isParrainSpacePath(path: string): boolean {
  return path === PARRAIN_SPACE_HOME || path.startsWith(`${PARRAIN_SPACE_HOME}/`);
}

export type ParrainSynthese = ApiParrainSyntheseResponse;
export type ParrainTotaux = ParrainSynthese["totaux"];
export type ParrainVehicule = ApiParrainVehiculesResponse["data"][number];
export type ParrainCommissionsResponse = ApiParrainCommissionsResponse;
export type ParrainPaiementsResponse = ApiParrainPaiementsResponse;
export type ParrainPaiement = ParrainPaiementsResponse["data"][number];
// `page` absent du contrat généré, comme sur les autres endpoints paginés.
export type ParrainCommissionsQuery = ApiParrainCommissionsQuery & { page?: number };
export type ParrainPaiementsQuery = ApiParrainPaiementsQuery & { page?: number };

// `reference` réécrit en nullable : généré en `string` (Scramble infère depuis
// la relation), mais null si l'opération d'origine a été supprimée.
export type ParrainCommission = Omit<ParrainCommissionsResponse["data"][number], "reference"> & {
  reference: string | null;
};

export type ParrainCommissionStatus = "creee" | "impaye" | "partiel" | "paye";

// Libellés de l'espace parrain : "Créée" (libellé interne du back-office)
// désigne ici une part dont la période n'est pas encore validée.
const COMMISSION_STATUS_LABELS: Record<ParrainCommissionStatus, string> = {
  creee: "En attente de validation",
  impaye: "À payer",
  partiel: "Partiellement payée",
  paye: "Payée",
};

export function parrainCommissionStatusLabel(statut: string): string {
  return COMMISSION_STATUS_LABELS[statut as ParrainCommissionStatus] ?? statut;
}

// Rien d'anormal dans une commission en attente ou à payer : jamais de rouge.
export function parrainCommissionStatusSeverity(statut: string): "success" | "warn" | "secondary" {
  if (statut === "paye") return "success";
  if (statut === "creee") return "secondary";
  return "warn";
}

export const PARRAIN_COMMISSION_STATUS_OPTIONS: Array<{ label: string; value: ParrainCommissionStatus | null }> = [
  { label: "Tous les statuts", value: null },
  ...(Object.entries(COMMISSION_STATUS_LABELS) as Array<[ParrainCommissionStatus, string]>).map(([value, label]) => ({ label, value })),
];

export const NOT_ATTACHED_MESSAGE = "Votre compte n'est plus rattaché à un parrain. Contactez votre responsable en cas d'erreur.";

export function formatParrainDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
