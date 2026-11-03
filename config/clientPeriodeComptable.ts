// Filtre commun Accueil / Commissions / Ventes / Dépenses : le navigateur n'envoie
// que annee + mois + quinzaine (ou une clé de période rapide sur l'accueil), le
// backend calcule seul les bornes et les renvoie dans `filters`
// (PeriodeComptableFiltre, docs/filtre-periode-comptable.md) — jamais de calcul
// de bornes ici. Calendrier fixe : P1 du 1er au 15, P2 du 16 à la fin du mois,
// même si un paiement intervient plus tard.
export type Quinzaine = "TOUT" | "P1" | "P2";

export interface PeriodeComptable {
  annee: number;
  // TOUTE_ANNEE ou 1 à 12.
  mois: number;
  quinzaine: Quinzaine;
}

export interface PeriodeComptableQuery {
  annee?: number;
  mois?: number;
  quinzaine?: Quinzaine;
}

export const QUINZAINES: ReadonlyArray<{ value: Quinzaine; label: string; title: string }> = [
  { value: "TOUT", label: "Tout le mois", title: "Du 1er au dernier jour du mois" },
  { value: "P1", label: "P1 : 01–15", title: "Première période, du 1er au 15" },
  { value: "P2", label: "P2 : 16–Fin", title: "Deuxième période, du 16 au dernier jour du mois" },
];

// Valeur non vide : PrimeVue Select affiche son placeholder sur une valeur vide
// (même correctif que ALL dans les pages de l'espace client).
export const TOUTE_ANNEE = 0;

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const MOIS: Array<{ value: number; label: string }> = [
  { value: TOUTE_ANNEE, label: "Toute l’année" },
  ...NOMS_MOIS.map((label, index) => ({ value: index + 1, label })),
];

const NOMBRE_ANNEES = 5;

// Lu en UTC, comme les autres dates de l'espace client (fuseau de l'application).
export function periodeComptableCourante(maintenant: Date = new Date()): PeriodeComptable {
  return { annee: maintenant.getUTCFullYear(), mois: maintenant.getUTCMonth() + 1, quinzaine: "TOUT" };
}

// Année en cours et précédentes, jamais une année future (422 côté backend).
export function anneesProposees(anneeCourante: number): number[] {
  return Array.from({ length: NOMBRE_ANNEES }, (_, index) => anneeCourante - index);
}

export function periodeComptableQuery({ annee, mois, quinzaine }: PeriodeComptable): PeriodeComptableQuery {
  return mois === TOUTE_ANNEE ? { annee } : { annee, mois, quinzaine };
}

// Période de comparaison des tendances : mois ou année entière précédente, null
// pour une quinzaine (la précédente n'a pas toujours la même durée).
export function periodePrecedente({ annee, mois, quinzaine }: PeriodeComptable): PeriodeComptable | null {
  if (quinzaine !== "TOUT") return null;
  if (mois === TOUTE_ANNEE) return { annee: annee - 1, mois: TOUTE_ANNEE, quinzaine: "TOUT" };
  return mois === 1
    ? { annee: annee - 1, mois: 12, quinzaine: "TOUT" }
    : { annee, mois: mois - 1, quinzaine: "TOUT" };
}

export function estMoisCourant(periode: PeriodeComptable, maintenant: Date = new Date()): boolean {
  const courante = periodeComptableCourante(maintenant);
  return periode.annee === courante.annee && periode.mois === courante.mois && periode.quinzaine === "TOUT";
}

export function periodeComptableLabel(periode: PeriodeComptable, maintenant: Date = new Date()): string {
  if (estMoisCourant(periode, maintenant)) return "Ce mois";
  if (periode.mois === TOUTE_ANNEE) return `Année ${periode.annee}`;
  const mois = `${NOMS_MOIS[periode.mois - 1]} ${periode.annee}`;
  return periode.quinzaine === "TOUT" ? mois : `${mois} · ${periode.quinzaine}`;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

// Affiche les bornes renvoyées par le backend, "" tant qu'elles sont inconnues.
export function bornesLabel(debut?: string | null, fin?: string | null): string {
  if (!debut || !fin) return "";
  const format = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`));
  return `Du ${format(debut)} au ${format(fin)}`;
}

// Périodes rapides de l'accueil, résolues par le serveur (SituationPeriode).
export const PERIODES_RAPIDES = [
  { value: "aujourd_hui", label: "Aujourd’hui" },
  { value: "hier", label: "Hier" },
  { value: "cette_semaine", label: "Cette semaine" },
  { value: "semaine_precedente", label: "Semaine dernière" },
  { value: "ce_mois", label: "Ce mois" },
  { value: "mois_precedent", label: "Mois dernier" },
  { value: "cette_annee", label: "Cette année" },
  { value: "annee_precedente", label: "Année dernière" },
  { value: "tout", label: "Toutes les périodes" },
] as const;

export type PeriodeRapide = (typeof PERIODES_RAPIDES)[number]["value"];

export function periodeRapideLabel(periode: PeriodeRapide): string {
  return PERIODES_RAPIDES.find((option) => option.value === periode)?.label ?? periode;
}

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Bornes transmises par un lien de l'accueil (?du=…&au=…), pour ouvrir un écran sur
// la période rapide choisie : le backend revalide ces dates.
export function bornesDepuisLien(query: Record<string, unknown>): { du: string; au: string } | null {
  const { du, au } = query;
  return typeof du === "string" && typeof au === "string" && FORMAT_DATE.test(du) && FORMAT_DATE.test(au) ? { du, au } : null;
}
