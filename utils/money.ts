// Formatage monétaire centralisé (GNF) — auto-importé par Nuxt comme le reste
// de utils/*.ts (voir utils/phone.ts pour le même principe). Remplace les
// implémentations locales dupliquées dans pages/espace-client/{index,
// depenses,activite}.vue (`new Intl.NumberFormat("fr-FR").format(...) + "
// GNF"`, copiée-collée dans chacun de ces fichiers) — une seule fonction
// testée, jamais réécrite par composant (voir demande du 26/08/2026,
// section 29).
const numberFormatter = new Intl.NumberFormat("fr-FR");

/** Formate un montant en GNF : "1 250 000 GNF" (espace fine insécable Intl). */
export function formatGnf(amount: number): string {
  return `${numberFormatter.format(amount)} GNF`;
}

/** Formate un nombre simple (sans devise), même séparateur de milliers. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
