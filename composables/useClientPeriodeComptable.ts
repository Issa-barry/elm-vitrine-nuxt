import type { PeriodeComptable, PeriodeRapide } from "~/config/clientPeriodeComptable";
import {
  periodeComptableCourante,
  periodeComptableLabel,
  periodeComptableQuery,
  periodeRapideLabel,
} from "~/config/clientPeriodeComptable";

// Sélection partagée par l'accueil et les écrans Commissions, Ventes et Dépenses :
// elle reste la même quand on passe de l'un à l'autre, et revient au mois en cours
// au rechargement de la page.
export function useClientPeriodeComptable() {
  const periodeComptable = useState<PeriodeComptable>("client:periode-comptable", () => periodeComptableCourante());

  function revenirAuMoisCourant() {
    periodeComptable.value = periodeComptableCourante();
  }

  return { periodeComptable, revenirAuMoisCourant };
}

// Filtre de l'accueil : une période rapide, sinon la période comptable partagée.
// "Ce mois" n'est pas une période rapide de plus : c'est le mois comptable en cours,
// pour que l'accueil et les autres écrans s'ouvrent sur la même période.
export function useClientPeriodeAccueil() {
  const { periodeComptable } = useClientPeriodeComptable();
  const periodeRapide = useState<Exclude<PeriodeRapide, "ce_mois"> | null>("client:accueil-periode-rapide", () => null);

  const query = computed(() => (periodeRapide.value ? { periode: periodeRapide.value } : periodeComptableQuery(periodeComptable.value)));
  const label = computed(() => (periodeRapide.value ? periodeRapideLabel(periodeRapide.value) : periodeComptableLabel(periodeComptable.value)));

  function appliquer(rapide: PeriodeRapide | null, comptable: PeriodeComptable) {
    const prochaine = rapide === "ce_mois" ? periodeComptableCourante() : comptable;
    periodeRapide.value = rapide === "ce_mois" ? null : rapide;
    // Même sélection : aucune requête inutile.
    if (JSON.stringify(prochaine) !== JSON.stringify(periodeComptable.value)) {
      periodeComptable.value = prochaine;
    }
  }

  return { periodeComptable, periodeRapide, query, label, appliquer };
}
