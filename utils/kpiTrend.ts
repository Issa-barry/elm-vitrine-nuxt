// Variation en % entre deux valeurs de période pour les cartes KPI du
// dashboard client (voir pages/espace-client/index.vue et
// components/client/dashboard/KpiCard.vue). Extrait en utilitaire partagé
// (auto-importé par Nuxt) pour être testable unitairement et éviter deux
// implémentations différentes du calcul/de l'arrondi.

export type KpiTrendTone = "positive" | "negative";

export interface KpiTrend {
  /** Pourcentage brut, non arrondi : (actuelle - précédente) / précédente * 100. */
  percent: number;
  tone: KpiTrendTone;
}

/**
 * Calcule la variation entre la valeur de la période courante et celle de
 * la période précédente. Retourne null quand la comparaison n'est pas
 * calculable (période précédente à 0, valeurs non finies) plutôt que
 * d'inventer un pourcentage — jamais de NaN/Infinity en sortie.
 *
 * `invertTone` sert aux KPI où une hausse n'est pas une bonne nouvelle
 * (ex. Dépenses) : la flèche/le signe reflètent toujours le calcul réel,
 * seule la couleur (tone) est inversée.
 */
export function computeKpiTrend(current: number, previous: number, invertTone = false): KpiTrend | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;

  const percent = ((current - previous) / previous) * 100;
  if (!Number.isFinite(percent)) return null;

  const isRise = percent > 0;
  const tone: KpiTrendTone = isRise !== invertTone ? "positive" : "negative";

  return { percent, tone };
}

/** Arrondi mathématique à 1 décimale maximum ; -0 normalisé en 0. */
export function roundKpiTrendPercent(percent: number): number {
  const rounded = Math.round(percent * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Formate un pourcentage de variation : arrondi mathématique à 1 décimale
 * maximum, décimale masquée si elle est nulle après arrondi (12,04 -> "12%"),
 * virgule française, signe explicite sauf pour 0 (jamais "+0%" ni "-0%").
 */
export function formatKpiTrendPercent(percent: number): string {
  const rounded = roundKpiTrendPercent(percent);
  const isWhole = Number.isInteger(rounded);
  const magnitude = Math.abs(rounded);
  const numberPart = isWhole ? String(magnitude) : magnitude.toFixed(1).replace(".", ",");
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";

  return `${sign}${numberPart}%`;
}
