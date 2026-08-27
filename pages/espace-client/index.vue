<script setup lang="ts">
import type { ClientDashboardResponse } from "~/config/clientDashboard";
import { clientSpaceRoleLabel } from "~/config/auth";
import { notificationVisual } from "~/config/clientNotifications";

definePageMeta({ layout: "client", middleware: "auth" });
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
const { notifications, markAllRead } = useClientNotifications();
const requestFetch = useRequestFetch();
// "Solde par véhicule" n'a de sens que pour un contexte proprietaire/livreur
// (chantier "capacités" du 27/08/2026, voir config/clientCapabilities.ts) :
// masqué en dessous, pas seulement affiché vide, pour un compte sans ce
// contexte (ex. client seul, ou futur prestataire seul) — distinction
// "capacité métier" vs "aucune donnée" (demande du 27/08/2026, section 21).
const capabilities = useClientCapabilities();

// Identité réelle (GET /api/auth/me) — jamais "Issa M." (ancienne donnée de
// démonstration). clientSpaceRoleLabel() reflète la même priorité que
// profile.type côté backend en cas de cumul de rôles (proprietaire > client
// > livreur), voir config/auth.ts.
const displayName = computed(() => {
  const user = auth.user.value;
  return user ? `${user.prenom} ${user.nom}`.trim() : "";
});
const displayPhone = computed(() => formatPhoneNumber(auth.user.value?.telephone));
const displayRole = computed(() => clientSpaceRoleLabel(auth.user.value?.roles));
const displayQr = computed(() => auth.user.value?.qr_payload ?? null);

// Période précédente (comparaison RÉELLE, pas une image locale figée) : même
// endpoint, filtre "mois_passe" — voir docs/api-espace-client-contract.md §5
// côté elm-monolithe (raccourci de période supporté nativement). État
// volontairement local (pas de useState partagé) : ne sert qu'au calcul de
// variation de cette page, jamais consommé ailleurs.
const previousDashboard = ref<ClientDashboardResponse | null>(null);

onMounted(async () => {
  await Promise.all([
    fetchDashboard({ period: "ce_mois" }),
    requestFetch<ClientDashboardResponse>("/api/client/dashboard", { query: { period: "mois_passe" } })
      .then((data) => { previousDashboard.value = data; })
      .catch(() => { previousDashboard.value = null; }),
  ]);
});

const summary = computed(() => dashboard.value?.summary ?? null);
const previousSummary = computed(() => previousDashboard.value?.summary ?? null);
const parVehicule = computed(() => dashboard.value?.par_vehicule ?? []);
const hasVehicles = computed(() => parVehicule.value.length > 0);
// Aperçu limité à 3 véhicules sur le dashboard (mobile "Commissions par
// véhicule" et desktop "Solde par véhicule") — "Tout voir" reste le chemin
// vers la liste complète des véhicules ; les lignes individuelles mènent
// maintenant aux commissions (voir topVehicleLink ci-dessous), pas à la fiche
// véhicule.
const topVehicles = computed(() => parVehicule.value.slice(0, 3));
const topVehicleLink = (vehiculeId: string) => ({
  path: "/espace-client/commissions",
  query: { vehicule_id: vehiculeId },
});

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
    expenses: computeKpiTrend(current.frais_depenses_total, previous.frais_depenses_total, true),
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
const notificationDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const formatNotificationDate = (iso: string) => notificationDateFormatter.format(new Date(iso));

// Les 6 plus récentes seulement (déjà triées par le backend, `latest()`) —
// la carte dashboard reste un aperçu, pas la liste complète.
const recentNotifications = computed(() => (notifications.value?.data ?? []).slice(0, 6));
</script>

<template>
  <div>
  <div class="client-mobile-dashboard">
    <ClientMobileIdentityQr :name="displayName" :phone="displayPhone" :role="displayRole" :qr-value="displayQr" />

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
          <p v-else id="mobile-balance-title" class="client-mobile-balance-empty">Aucune commission enregistrée pour le moment.</p>
        </div>
      </section>

      <div class="client-mobile-summary-grid">
        <NuxtLink to="/espace-client/depenses" class="client-mobile-summary-card" aria-label="Voir le détail des dépenses">
          <span class="client-mobile-summary-icon"><i class="pi pi-wallet" /></span>
          <div><span>Dépenses</span><strong>{{ formatGnf(summary.frais_depenses_total) }}</strong></div>
          <i class="pi pi-chevron-right client-mobile-summary-chevron" aria-hidden="true" />
        </NuxtLink>
      </div>

      <template v-if="capabilities.vehicles">
        <div class="client-mobile-section-heading">
          <h2>Commissions par véhicule</h2>
          <NuxtLink to="/espace-client/vehicules">Tout voir <i class="pi pi-arrow-right" /></NuxtLink>
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

  <div v-if="error" class="client-desktop-dashboard" role="alert">
    <div class="card">{{ error.message }}</div>
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

      Variation (%) calculée réellement contre GET /v1/mobile/dashboard?
      period=mois_passe (voir computed kpiTrends plus haut) — jamais un
      pourcentage tapé en dur. Carte 3 = operations_count (voir commentaire
      "Carte n°3" plus haut : "Net à payer" n'a pas d'équivalent réel).
    -->
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
        :value="formatGnf(summary.frais_depenses_total)"
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

    <div v-if="capabilities.vehicles" class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div><div class="font-semibold text-xl">Solde par véhicule</div><span class="text-muted-color">Total des commissions générées</span></div>
          <NuxtLink to="/espace-client/vehicules" class="flex items-center gap-2 text-primary font-medium hover:underline">Tout voir <i class="pi pi-arrow-right text-sm" /></NuxtLink>
        </div>
        <ul v-if="hasVehicles" class="list-none p-0 m-0">
          <li v-for="vehicle in topVehicles" :key="vehicle.vehicule_id" class="border-b border-surface last:border-b-0">
            <NuxtLink :to="topVehicleLink(vehicle.vehicule_id)" class="flex items-center justify-between gap-4 py-4 group">
              <div class="min-w-0"><span class="block text-surface-900 dark:text-surface-0 font-semibold group-hover:text-primary">{{ vehicle.nom_vehicule }}</span><span class="block text-muted-color text-sm mt-1">{{ vehicle.immatriculation }}</span></div>
              <div class="shrink-0 text-right"><strong class="block text-surface-900 dark:text-surface-0">{{ formatGnf(vehicle.total_earned) }}</strong></div>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="text-muted-color">Aucun véhicule associé pour le moment.</p>
      </div>
    </div>

    <div class="col-span-12" :class="{ 'xl:col-span-6': capabilities.vehicles }">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <div class="font-semibold text-xl">Notifications</div>
          <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" aria-label="Tout marquer comme lu" @click="markAllRead" />
        </div>
        <ul v-if="recentNotifications.length" class="p-0 m-0 list-none">
          <li v-for="notification in recentNotifications" :key="notification.id" class="flex items-center py-3 border-b border-surface last:border-b-0">
            <div :class="notificationVisual(notification.type).background" class="w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0">
              <i :class="[notificationVisual(notification.type).icon, notificationVisual(notification.type).iconColor]" class="!text-xl" />
            </div>
            <span class="text-surface-900 dark:text-surface-0 leading-normal" :class="{ 'font-semibold': !notification.lu }">
              <strong class="font-medium">{{ notification.titre }}</strong>
              <span class="block text-muted-color mt-1">{{ notification.message }} · {{ formatNotificationDate(notification.created_at) }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="text-muted-color">Aucune notification pour le moment.</p>
      </div>
    </div>
  </div>
  </div>
</template>
