// Activité au titre de laquelle le compte perçoit une commission (ADR 0054 côté
// elm-monolithe). Elle vient TOUJOURS du backend : `activite` d'une ligne de
// commission (type de bénéficiaire de la part enregistrée) ou `liens` d'un
// véhicule — jamais déduite des rôles du compte, une même personne pouvant être
// propriétaire, livreur, parrain et consultant.
export type ActiviteCompte = "proprietaire" | "livreur" | "parrain" | "consultant";

interface ActiviteDefinition {
  value: ActiviteCompte;
  label: string;
  icon: string;
}

// Ordre d'affichage identique à celui du backend (BeneficiairesCompte::activites()).
export const ACTIVITES: readonly ActiviteDefinition[] = [
  { value: "proprietaire", label: "Propriétaire", icon: "pi pi-home" },
  { value: "livreur", label: "Livreur", icon: "pi pi-truck" },
  { value: "parrain", label: "Parrain", icon: "pi pi-users" },
  { value: "consultant", label: "Consultant", icon: "pi pi-briefcase" },
];

function definition(activite: string): ActiviteDefinition | undefined {
  return ACTIVITES.find((item) => item.value === activite);
}

export function estActivite(valeur: unknown): valeur is ActiviteCompte {
  return typeof valeur === "string" && definition(valeur) !== undefined;
}

/** Libellé d'une activité ; une valeur future inconnue reste affichée telle quelle, jamais une erreur. */
export function activiteLabel(activite: string): string {
  return definition(activite)?.label ?? activite;
}

export function activiteIcon(activite: string): string {
  return definition(activite)?.icon ?? "pi pi-tag";
}

/** La répartition par activité n'a de sens qu'à partir de deux activités ; le badge, lui, reste toujours affiché. */
export function repartitionVisible(parActivite: readonly unknown[] | null | undefined): boolean {
  return (parActivite?.length ?? 0) >= 2;
}

/** Du gain le plus élevé au plus faible, égalité départagée par libellé (même tri que « Gains par véhicule »). */
export function trierActivitesParGain<T extends { activite: string; total_earned: number }>(lignes: readonly T[]): T[] {
  return [...lignes].sort((a, b) => b.total_earned - a.total_earned || activiteLabel(a.activite).localeCompare(activiteLabel(b.activite), "fr"));
}

/** Part relative d'un montant dans le total reçu du backend, arrondie ; 0 si le total est nul. */
export function partDuTotal(montant: number, total: number): number {
  return total > 0 ? Math.round((montant / total) * 100) : 0;
}

/** Trie des valeurs d'activité dans l'ordre d'affichage, sans doublon. */
export function ordonnerActivites(activites: readonly string[]): ActiviteCompte[] {
  return ACTIVITES.map((item) => item.value).filter((value) => activites.includes(value));
}
