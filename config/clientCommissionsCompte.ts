import type { ApiActiviteEarningsRow, ApiCommissionClientRow, ApiCommissionsCompteQuery, ApiCommissionsCompteResponse } from "~/types/api";
import type { ActiviteCompte } from "./clientActivites";
import type { DashboardFilters } from "./clientDashboard";
import type { Quinzaine } from "./clientPeriodeComptable";

// Détail des commissions du compte, toutes activités (GET /v1/mobile/commissions,
// ADR 0054 côté elm-monolithe). Les montants et le résumé viennent du backend,
// jamais recalculés ici : `resume` porte les mêmes champs que `summary` et
// `par_activite` du dashboard, sur les mêmes filtres.
export type CommissionCompte = ApiCommissionClientRow;
export type ActiviteGains = ApiActiviteEarningsRow;
export type CommissionsCompteResponse = ApiCommissionsCompteResponse;

export type CommissionsCompteQuery = Omit<ApiCommissionsCompteQuery, "activite" | "quinzaine" | "page"> & {
  activite?: ActiviteCompte;
  quinzaine?: Quinzaine;
  page?: number;
};

/**
 * Période du détail, reprise de la réponse du dashboard (bornes calculées par le
 * serveur) : période comptable telle quelle, sinon ses dates, sinon toutes les
 * périodes. Le détail et le tableau de bord portent ainsi exactement sur la même
 * période, quel que soit le choix de la liste « Période ».
 */
export interface PeriodeResolue {
  date_debut?: string | null;
  date_fin?: string | null;
  annee?: number | null;
  mois?: number | null;
  quinzaine?: string | null;
}

export function periodeDuDetail(filters: PeriodeResolue | DashboardFilters): CommissionsCompteQuery {
  if (filters.annee) {
    return {
      annee: filters.annee,
      ...(filters.mois ? { mois: filters.mois } : {}),
      ...(filters.mois && filters.quinzaine ? { quinzaine: filters.quinzaine as Quinzaine } : {}),
    };
  }
  if (filters.date_debut && filters.date_fin) {
    return { date_debut: filters.date_debut, date_fin: filters.date_fin };
  }
  return { periode: "tout" };
}

/** Date de gain « 2026-10-20 » affichée « 20/10/2026 », sans passer par le fuseau du navigateur. */
export function dateCommission(date: string | null | undefined): string {
  const [annee, mois, jour] = (date ?? "").slice(0, 10).split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : "—";
}

/** Véhicule d'une ligne, ou mention explicite pour une vente directe sans véhicule. */
export function vehiculeCommission(ligne: Pick<CommissionCompte, "vehicule">): string {
  return ligne.vehicule ? `${ligne.vehicule.nom_vehicule} · ${ligne.vehicule.immatriculation}` : "Sans véhicule";
}

// Rien d'anormal dans une commission à payer : jamais de rouge (même règle que
// l'espace parrain). Une annulée reste lisible, sans alerte.
export function commissionStatutSeverity(statut: string | null | undefined): "success" | "warn" | "secondary" {
  if (statut === "paye") return "success";
  if (statut === "creee" || statut === "annulee") return "secondary";
  return "warn";
}
