<script setup lang="ts">
import { dashboardExpensesTotal, type ClientDashboardResponse, type DashboardVehiculeBalance } from "~/config/clientDashboard";
import type { ClientExpensesResponse } from "~/config/clientExpenses";
import { periodeComptableQuery, periodePrecedente } from "~/config/clientPeriodeComptable";
import { clientDisplayName, clientSpaceRoleLabel } from "~/config/auth";
import { PARRAIN_SPACE_HOME } from "~/config/clientParrain";
import { notificationResourceToRoute } from "~/config/clientNotifications";
import type { ClientNotification } from "~/config/clientNotifications";
import { ordonnerActivites } from "~/config/clientActivites";

definePageMeta({ layout: "client", middleware: ["auth", "accueil-espace-client"] });
useHead({
  title: "Tableau de bord — Eau La Maman",
  // Police des 4 cartes KPI desktop/tablette paysage (voir
  // components/client/dashboard/KpiCard.vue) : Poppins, comme dans
  // _template/apollo-vue-6.2.0 (src/assets/layout/_fonts.scss), pour
  // retrouver le rendu (chasse, graisse) de la référence. Chargée ici plutôt
  // que dans le composant pour éviter 4 <link> identiques (un par carte) ;
  // scopée à .client-kpi-card, le reste du dashboard garde "Lato".
  link: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap" },
  ],
});

const auth = useAuth();
const { dashboard, isLoading, error, fetchDashboard } = useClientDashboard();
// fetchNotifications() n'est plus appelé ici : chargé une seule fois au
// niveau du shell (layouts/client.vue), même état partagé (useState) —
// nécessaire pour que la cloche du header ait un badge à jour sur TOUTE
// page de l'espace client, pas seulement celle-ci (chantier "centre de
// notifications" du 27/08/2026).
const { items: notificationItems, markAllRead, markRead } = useClientNotifications();
const requestFetch = useRequestFetch();
const router = useRouter();

// Même comportement de clic que la cloche desktop (components/client/
// notifications/ClientNotificationsPanel.vue::onSelect) — ce widget réutilise
// désormais ClientNotificationsList.vue (demande du 28/08/2026 : un seul
// rendu partagé plutôt que 3 implémentations différentes), donc chaque ligne
// est un vrai bouton cliquable : sans ce handler, il resterait interactif en
// apparence (hover) sans effet, jamais acceptable.
async function onSelectNotification(notification: ClientNotification) {
  const route = notificationResourceToRoute(notification.resource);
  await markRead(notification.id);
  if (route) {
    await router.push(route);
  }
}
// "Solde par véhicule" n'a de sens que pour un contexte proprietaire/livreur
// (chantier "capacités" du 27/08/2026, voir config/clientCapabilities.ts) :
// masqué en dessous, pas seulement affiché vide, pour un compte sans ce
// contexte (ex. client seul, ou futur prestataire seul) — distinction
// "capacité métier" vs "aucune donnée" (demande du 27/08/2026, section 21).
const capabilities = useClientCapabilities();

// Identité réelle (GET /api/auth/me) — jamais "Issa M." (ancienne donnée de
// démonstration). Nom et libellé de rôle : voir config/auth.ts.
const displayName = computed(() => clientDisplayName(auth.user.value));
const displayPhone = computed(() => formatPhoneNumber(auth.user.value?.telephone));
const displayRole = computed(() => clientSpaceRoleLabel(auth.user.value?.roles, auth.context.value));
const displayQr = computed(() => auth.user.value?.qr_payload ?? null);

// Filtre de période de l'accueil : tous les montants de la page suivent la période
// choisie (voir docs/filtre-periode-comptable.md).
const { periodeComptable, periodeRapide, query: periodeQuery } = useClientPeriodeAccueil();

// Période précédente (comparaison RÉELLE, pas une image locale figée) : même
// endpoint, mois ou année entière précédente, null pour les autres périodes
// (aucune tendance plutôt qu'une comparaison approximative). État volontairement
// local (pas de useState partagé) : ne sert qu'au calcul de variation de cette
// page, jamais consommé ailleurs.
const previousDashboard = ref<ClientDashboardResponse | null>(null);

// Carte "Dépenses" mobile : total validé de la période, le même que la page qu'elle
// ouvre (GET /depenses/mine couvre aussi les véhicules de l'équipe d'un livreur, pas
// `depenses_total`). Bornes reprises de la réponse du dashboard, calculées par le serveur.
const validatedExpensesTotal = ref<number | null>(null);
const validatedExpensesLoaded = ref(false);
let chargementSeq = 0;

async function chargerAccueil() {
  const seq = ++chargementSeq;
  const estCourant = () => seq === chargementSeq;
  const query = periodeQuery.value;
  const precedente = periodeRapide.value ? null : periodePrecedente(periodeComptable.value);
  validatedExpensesLoaded.value = false;

  const chargerPrecedent = async () => {
    const data = precedente
      ? await requestFetch<ClientDashboardResponse>("/api/client/dashboard", { query: periodeComptableQuery(precedente) }).catch(() => null)
      : null;
    if (estCourant()) previousDashboard.value = data;
  };

  const chargerDepenses = async () => {
    const dashboardCourant = await fetchDashboard(query);
    if (!dashboardCourant || !estCourant()) {
      if (estCourant()) validatedExpensesLoaded.value = true;
      return;
    }
    const filters = dashboard.value?.filters;
    const data = await requestFetch<ClientExpensesResponse>("/api/client/expenses", {
      query: { statut: "valide", per_page: 1, date_debut: filters?.date_debut ?? undefined, date_fin: filters?.date_fin ?? undefined },
    }).catch(() => null);
    if (!estCourant()) return;
    validatedExpensesTotal.value = data?.total_valide ?? null;
    validatedExpensesLoaded.value = true;
  };

  await Promise.all([chargerDepenses(), chargerPrecedent()]);
}

onMounted(chargerAccueil);
watch(periodeQuery, chargerAccueil);

// Les liens gardent la période : la période comptable est partagée entre les écrans,
// une période rapide est transmise par ses bornes, calculées par le serveur.
const lienPeriode = computed<{ du?: string; au?: string }>(() => {
  const filters = dashboard.value?.filters;
  if (!periodeRapide.value || !filters?.date_debut || !filters.date_fin) return {};
  return { du: filters.date_debut, au: filters.date_fin };
});
const expensesLink = computed(() => ({
  path: "/espace-client/depenses",
  query: periodeRapide.value === "tout" ? { periode: "toutes" } : lienPeriode.value,
}));

const summary = computed(() => dashboard.value?.summary ?? null);
const previousSummary = computed(() => previousDashboard.value?.summary ?? null);
const parVehicule = computed(() => dashboard.value?.par_vehicule ?? []);
const hasVehicles = computed(() => parVehicule.value.length > 0);
// Aperçu limité à 3 véhicules sur le dashboard (mobile "Commissions par
// véhicule" et desktop "Solde par véhicule"). "Tout voir" et chaque ligne mènent
// aux commissions sur la période affichée (une ligne filtre en plus sur son
// véhicule), jamais à la liste ou à la fiche véhicule.
const topVehicles = computed(() => parVehicule.value.slice(0, 3));
// Gains multi-activités (ADR 0054). Badges d'un véhicule : nature du rattachement actuel, sinon les
// activités de ses gains sur la période (véhicule quitté, consultant).
const badgesVehicule = (vehicle: DashboardVehiculeBalance) => ordonnerActivites(
  (vehicle.liens?.length ? vehicle.liens : (vehicle.par_activite ?? []).map((ligne) => ligne.activite)) as string[],
);
// La section reste réservée aux comptes à véhicules ; un compte qui n'en a qu'au
// travers de ses commissions (parrain, consultant) la voit dès qu'une ligne existe.
const afficherVehicules = computed(() => capabilities.value.vehicles || hasVehicles.value);
const commissionsLink = computed(() => ({ path: "/espace-client/commissions", query: lienPeriode.value }));
const topVehicleLink = (vehiculeId: string) => ({
  path: "/espace-client/commissions",
  query: { vehicule_id: vehiculeId, ...lienPeriode.value },
});

const expensesTotal = computed(() => (dashboard.value ? dashboardExpensesTotal(dashboard.value) : 0));
const previousExpensesTotal = computed(() => (previousDashboard.value ? dashboardExpensesTotal(previousDashboard.value) : 0));
// Jamais de 0 transitoire pendant le chargement. Repli sur `depenses_total` si
// l'appel échoue ou si le backend ne renvoie pas encore `total_valide`.
const mobileExpensesCardValue = computed(() => (validatedExpensesLoaded.value
  ? formatGnf(validatedExpensesTotal.value ?? expensesTotal.value)
  : "…"));

// Jamais un pourcentage inventé : null tant que l'une des deux périodes n'est
// pas chargée (voir utils/kpiTrend.ts — computeKpiTrend renvoie déjà null si
// la période précédente vaut 0).
const kpiTrends = computed(() => {
  if (!summary.value || !previousSummary.value) {
    return { generated: null, expenses: null, operations: null, remaining: null };
  }
  const current = summary.value;
  const previous = previousSummary.value;
  return {
    generated: computeKpiTrend(current.total_earned, previous.total_earned),
    // invertTone=true : une hausse de dépenses n'est pas une bonne nouvelle,
    // contrairement aux 3 autres KPI (voir utils/kpiTrend.ts).
    expenses: computeKpiTrend(expensesTotal.value, previousExpensesTotal.value, true),
    operations: computeKpiTrend(current.operations_count, previous.operations_count),
    remaining: computeKpiTrend(current.balance, previous.balance),
  };
});

// Carte n°3 : "Net à payer" (ancienne maquette) n'a AUCUN équivalent réel
// dans `summary` (GET /v1/mobile/dashboard) — c'était une simple soustraction
// locale (commission - dépenses), désormais interdite (aucun calcul financier
// côté Nuxt, voir demande du 26/08/2026, section 30). Remplacée par un champ
// réel et distinct des 3 autres cartes : `operations_count`. La grille à 4
// cartes (et les tests de mise en page associés) reste inchangée.
// Les 6 plus récentes seulement (page 1 du contrat paginé, déjà triées par
// le backend) — la carte dashboard reste un aperçu, pas la liste complète
// (voir pages/espace-client/notifications.vue pour l'historique paginé).
const recentNotifications = computed(() => notificationItems.value.slice(0, 6));
</script>

<template>
  <div>
  <div class="client-mobile-dashboard">
    <ClientMobileIdentityQr :name="displayName" :phone="displayPhone" :role="displayRole" :qr-value="displayQr" />

    <div v-if="capabilities.parrain" class="client-mobile-summary-grid">
      <NuxtLink :to="PARRAIN_SPACE_HOME" class="client-mobile-summary-card" aria-label="Ouvrir l'espace parrain" data-testid="carte-espace-parrain">
        <span class="client-mobile-summary-icon"><i class="pi pi-users" /></span>
        <div><span>Espace parrain</span><strong>Mes parrainages</strong></div>
        <i class="pi pi-chevron-right client-mobile-summary-chevron" aria-hidden="true" />
      </NuxtLink>
    </div>

    <ClientPeriodeAccueilFilter :chargement="isLoading" />

    <div v-if="error" class="p-4 text-red-500" role="alert">
      {{ error.message }}
    </div>

    <section v-else-if="isLoading && !dashboard" class="p-4 text-muted-color" role="status">
      Chargement du tableau de bord…
    </section>

    <template v-else-if="summary">
      <section class="client-mobile-balance-card" aria-labelledby="mobile-balance-title">
        <svg class="client-mobile-balance-wave" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 65 C105 18 174 38 260 70 C360 108 425 38 600 62 L600 180 L0 180 Z" fill="var(--p-primary-500)" />
        </svg>
        <div class="client-mobile-balance-content">
          <template v-if="summary.total_earned > 0">
            <span id="mobile-balance-title" class="client-mobile-balance-label">Cumul des commissions</span>
            <strong class="client-mobile-balance-amount">{{ formatGnf(summary.total_earned) }}</strong>
            <div class="client-mobile-balance-meta">
              <div><span>Déjà payé</span><strong>{{ formatGnf(summary.total_paid) }}</strong></div>
              <div><span>Reste à payer</span><strong>{{ formatGnf(summary.balance) }}</strong></div>
            </div>
          </template>
          <p v-else id="mobile-balance-title" class="client-mobile-balance-empty">Aucune commission sur cette période.</p>
        </div>
      </section>

      <div class="client-mobile-summary-grid">
        <NuxtLink :to="expensesLink" class="client-mobile-summary-card" aria-label="Voir le détail des dépenses">
          <span class="client-mobile-summary-icon"><i class="pi pi-wallet" /></span>
          <div><span>Dépenses</span><strong>{{ mobileExpensesCardValue }}</strong></div>
          <i class="pi pi-chevron-right client-mobile-summary-chevron" aria-hidden="true" />
        </NuxtLink>
      </div>

      <template v-if="afficherVehicules">
        <div class="client-mobile-section-heading">
          <h2>Commissions par véhicule</h2>
          <NuxtLink :to="commissionsLink">Tout voir <i class="pi pi-arrow-right" /></NuxtLink>
        </div>
        <div v-if="hasVehicles" class="client-mobile-vehicle-list">
          <NuxtLink
            v-for="vehicle in topVehicles"
            :key="vehicle.vehicule_id"
            :to="topVehicleLink(vehicle.vehicule_id)"
            class="client-mobile-vehicle-row"
            :aria-label="`Voir les commissions de ${vehicle.nom_vehicule}`"
          >
            <div>
              <span class="client-mobile-vehicle-name">{{ vehicle.nom_vehicule }}</span>
              <span class="client-mobile-vehicle-registration">{{ vehicle.immatriculation }}</span>
              <span v-if="badgesVehicule(vehicle).length" class="client-vehicle-badges">
                <ClientActiviteBadge v-for="activite in badgesVehicule(vehicle)" :key="activite" :activite="activite" />
              </span>
            </div>
            <div class="client-mobile-vehicle-finance">
              <span class="client-mobile-vehicle-amount">{{ formatGnf(vehicle.total_earned) }}</span>
            </div>
            <i class="pi pi-chevron-right" />
          </NuxtLink>
        </div>
        <p v-else class="client-mobile-empty-state">Aucun véhicule associé pour le moment.</p>
      </template>
    </template>
  </div>

  <div v-if="error" class="client-desktop-dashboard">
    <ClientPeriodeAccueilFilter class="mb-6" :chargement="isLoading" />
    <div class="card" role="alert">{{ error.message }}</div>
  </div>
  <div v-else-if="isLoading && !dashboard" class="client-desktop-dashboard" role="status">
    <div class="card">Chargement du tableau de bord…</div>
  </div>
  <div v-else-if="summary" class="client-desktop-dashboard grid grid-cols-12 gap-8">
    <!--
      KPI desktop/tablette paysage : markup et classes repris fidèlement de
      _template/apollo-vue-6.2.0/src/components/dashboard/ecommerce/
      StatsEcommerceWidget.vue (voir components/client/dashboard/KpiCard.vue).
      Grille strictement identique à celle d'Apollo (col-span-12
      md:col-span-6 xl:col-span-3) : 2x2 dès ~768px en paysage (tablette),
      4x1 à partir de 1280px (seuil xl propre à Apollo, couvre le desktop).
      En dessous de 768px ou en portrait, .client-desktop-dashboard reste
      masqué (voir le split chrome/contenu de _mobile.scss) : le mobile et
      la tablette portrait ne sont pas concernés par ce bloc.

      Variation (%) calculée réellement contre GET /v1/mobile/dashboard sur la
      période précédente (voir computed kpiTrends plus haut) — jamais un
      pourcentage tapé en dur. Carte 3 = operations_count (voir commentaire
      "Carte n°3" plus haut : "Net à payer" n'a pas d'équivalent réel).
    -->
    <div class="col-span-12">
      <ClientPeriodeAccueilFilter :chargement="isLoading" />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Commission générée"
        :value="formatGnf(summary.total_earned)"
        :trend="kpiTrends.generated"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Dépenses"
        :value="formatGnf(expensesTotal)"
        :trend="kpiTrends.expenses"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Opérations"
        :value="String(summary.operations_count)"
        :trend="kpiTrends.operations"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Reste à payer"
        :value="formatGnf(summary.balance)"
        :trend="kpiTrends.remaining"
        secondary-label="Déjà payé"
        :secondary-value="formatGnf(summary.total_paid)"
      />
    </div>

    <div v-if="afficherVehicules" class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div><div class="font-semibold text-xl">Solde par véhicule</div><span class="text-muted-color">Total des commissions générées</span></div>
          <NuxtLink :to="commissionsLink" class="flex items-center gap-2 text-primary font-medium hover:underline">Tout voir <i class="pi pi-arrow-right text-sm" /></NuxtLink>
        </div>
        <ul v-if="hasVehicles" class="list-none p-0 m-0">
          <li v-for="vehicle in topVehicles" :key="vehicle.vehicule_id" class="border-b border-surface last:border-b-0">
            <NuxtLink :to="topVehicleLink(vehicle.vehicule_id)" class="flex items-center justify-between gap-4 py-4 group">
              <div class="min-w-0">
                <span class="block text-surface-900 dark:text-surface-0 font-semibold group-hover:text-primary">{{ vehicle.nom_vehicule }}</span><span class="block text-muted-color text-sm mt-1">{{ vehicle.immatriculation }}</span>
                <span v-if="badgesVehicule(vehicle).length" class="client-vehicle-badges">
                  <ClientActiviteBadge v-for="activite in badgesVehicule(vehicle)" :key="activite" :activite="activite" />
                </span>
              </div>
              <div class="shrink-0 text-right"><strong class="block text-surface-900 dark:text-surface-0">{{ formatGnf(vehicle.total_earned) }}</strong></div>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="text-muted-color">Aucun véhicule associé pour le moment.</p>
      </div>
    </div>

    <div class="col-span-12" :class="{ 'xl:col-span-6': afficherVehicules }">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <div class="font-semibold text-xl">Notifications</div>
          <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" aria-label="Tout marquer comme lu" @click="markAllRead" />
        </div>
        <ClientNotificationsList
          v-if="recentNotifications.length"
          :notifications="recentNotifications"
          @select="onSelectNotification"
        />
        <p v-else class="text-muted-color">Aucune notification pour le moment.</p>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.client-vehicle-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}
</style>
