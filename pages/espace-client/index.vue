<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Tableau de bord — Eau La Maman" });

const formatGnf = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;

const vehicles = [
  { id: "ou3859", name: "ABARRY", registration: "OU3859", commission: 2_380_000, paid: 1_800_000, status: "En activité" },
  { id: "ou4217", name: "ABARRY 2", registration: "OU4217", commission: 1_950_000, paid: 1_450_000, status: "En activité" },
  { id: "ou7712", name: "ABARRY 3", registration: "OU7712", commission: 1_420_000, paid: 850_000, status: "En activité" },
];

const totals = computed(() => ({
  generated: vehicles.reduce((sum, vehicle) => sum + vehicle.commission, 0),
  paid: vehicles.reduce((sum, vehicle) => sum + vehicle.paid, 0),
  remaining: vehicles.reduce((sum, vehicle) => sum + vehicle.commission - vehicle.paid, 0),
}));

// Même montant que la carte "Dépenses" mobile (client-mobile-summary-card,
// non modifiée dans cette passe) : pas encore branché sur une source de
// dépenses partagée/datée.
const totalExpenses = 614_200;

// "Net à payer" n'existe pas comme notion distincte ailleurs dans l'app :
// interprété ici comme la commission générée nette des dépenses (differe de
// "Reste à payer", qui est la commission générée nette de ce qui est déjà
// payé). Simple soustraction de deux valeurs déjà affichées, aucune nouvelle
// règle métier/backend introduite.
const netToPay = computed(() => totals.value.generated - totalExpenses);

// Période précédente : même statut que vehicles/totalExpenses ci-dessus
// (instantané mock local, le dashboard n'a pas encore de vrai historique
// daté) — sert de base de comparaison RÉELLE (voir utils/kpiTrend.ts) pour
// les 4 variations affichées, plutôt qu'un pourcentage tapé en dur.
const previousVehicles = [
  { commission: 2_150_000, paid: 1_600_000 },
  { commission: 1_780_000, paid: 1_300_000 },
  { commission: 1_190_000, paid: 700_000 },
];
const previousExpenses = 590_000;

const previousTotals = computed(() => ({
  generated: previousVehicles.reduce((sum, vehicle) => sum + vehicle.commission, 0),
  remaining: previousVehicles.reduce((sum, vehicle) => sum + vehicle.commission - vehicle.paid, 0),
}));
const previousNetToPay = computed(() => previousTotals.value.generated - previousExpenses);

// invertTone=true pour Dépenses : une hausse de dépenses n'est pas une
// bonne nouvelle, contrairement aux 3 autres KPI (voir utils/kpiTrend.ts).
const kpiTrends = computed(() => ({
  generated: computeKpiTrend(totals.value.generated, previousTotals.value.generated),
  expenses: computeKpiTrend(totalExpenses, previousExpenses, true),
  net: computeKpiTrend(netToPay.value, previousNetToPay.value),
  remaining: computeKpiTrend(totals.value.remaining, previousTotals.value.remaining),
}));

const notifications = [
  { icon: "pi pi-check", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500", title: "Livraison CMD-2841 terminée", detail: "12 packs livrés aujourd’hui" },
  { icon: "pi pi-send", background: "bg-orange-100 dark:bg-orange-400/10", iconColor: "text-orange-500", title: "Nouvelle commande attribuée", detail: "Commande CMD-2847" },
  { icon: "pi pi-wallet", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500", title: "Versement validé", detail: "Montant de 850 000 GNF" },
];
</script>

<template>
  <div>
  <div class="client-mobile-dashboard">
    <ClientMobileIdentityQr name="Issa M." phone="+224 622 60 26 93" role="Propriétaire" />

    <section class="client-mobile-balance-card" aria-labelledby="mobile-balance-title">
      <svg class="client-mobile-balance-wave" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 65 C105 18 174 38 260 70 C360 108 425 38 600 62 L600 180 L0 180 Z" fill="var(--p-primary-500)" />
      </svg>
      <div class="client-mobile-balance-content">
        <template v-if="totals.generated > 0">
          <span id="mobile-balance-title" class="client-mobile-balance-label">Cumul des commissions</span>
          <strong class="client-mobile-balance-amount">{{ formatGnf(totals.generated) }}</strong>
          <div class="client-mobile-balance-meta">
            <div><span>Déjà payé</span><strong>{{ formatGnf(totals.paid) }}</strong></div>
            <div><span>Reste à payer</span><strong>{{ formatGnf(totals.remaining) }}</strong></div>
          </div>
        </template>
        <p v-else id="mobile-balance-title" class="client-mobile-balance-empty">Aucune commission enregistrée pour le moment.</p>
      </div>
    </section>

    <div class="client-mobile-summary-grid">
      <NuxtLink to="/espace-client/depenses" class="client-mobile-summary-card" aria-label="Voir le détail des dépenses">
        <span class="client-mobile-summary-icon"><i class="pi pi-wallet" /></span>
        <div><span>Dépenses</span><strong>614 200 GNF</strong></div>
        <i class="pi pi-chevron-right client-mobile-summary-chevron" aria-hidden="true" />
      </NuxtLink>
    </div>

    <div class="client-mobile-section-heading">
      <h2>Commissions par véhicule</h2>
      <NuxtLink to="/espace-client/vehicules">Tout voir <i class="pi pi-arrow-right" /></NuxtLink>
    </div>
    <div v-if="vehicles.length" class="client-mobile-vehicle-list">
      <NuxtLink
        v-for="vehicle in vehicles"
        :key="vehicle.id"
        :to="`/espace-client/vehicules/${vehicle.id}`"
        external
        class="client-mobile-vehicle-row"
        :aria-label="`Voir les détails de ${vehicle.name}`"
      >
        <div>
          <span class="client-mobile-vehicle-name">{{ vehicle.name }}</span>
          <span class="client-mobile-vehicle-registration">{{ vehicle.registration }}</span>
        </div>
        <div class="client-mobile-vehicle-finance">
          <span class="client-mobile-vehicle-amount">{{ formatGnf(vehicle.commission) }}</span>
          <span class="client-mobile-vehicle-status">{{ vehicle.status }}</span>
        </div>
        <i class="pi pi-chevron-right" />
      </NuxtLink>
    </div>
    <p v-else class="client-mobile-empty-state">Aucun véhicule associé pour le moment.</p>
  </div>

  <div class="client-desktop-dashboard grid grid-cols-12 gap-8">
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

      Variation (%) calculée réellement (voir utils/kpiTrend.ts) contre une
      période précédente encore mockée localement (previousVehicles/
      previousExpenses ci-dessus, même statut que vehicles) faute d'un vrai
      historique daté dans le dashboard — jamais un pourcentage tapé en dur.
      Plus de mini line chart : retiré à la demande explicite du 2026-08-26.
    -->
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Commission générée"
        :value="formatGnf(totals.generated)"
        :trend="kpiTrends.generated"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Dépenses"
        :value="formatGnf(totalExpenses)"
        :trend="kpiTrends.expenses"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Net à payer"
        :value="formatGnf(netToPay)"
        :trend="kpiTrends.net"
      />
    </div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3">
      <ClientDashboardKpiCard
        label="Reste à payer"
        :value="formatGnf(totals.remaining)"
        :trend="kpiTrends.remaining"
        secondary-label="Déjà payé"
        :secondary-value="formatGnf(totals.paid)"
      />
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div><div class="font-semibold text-xl">Solde par véhicule</div><span class="text-muted-color">Total des commissions générées</span></div>
          <NuxtLink to="/espace-client/vehicules" class="flex items-center gap-2 text-primary font-medium hover:underline">Tout voir <i class="pi pi-arrow-right text-sm" /></NuxtLink>
        </div>
        <ul class="list-none p-0 m-0">
          <li v-for="vehicle in vehicles" :key="vehicle.registration" class="border-b border-surface last:border-b-0">
            <NuxtLink :to="`/espace-client/vehicules/${vehicle.id}`" external class="flex items-center justify-between gap-4 py-4 group">
              <div class="min-w-0"><span class="block text-surface-900 dark:text-surface-0 font-semibold group-hover:text-primary">{{ vehicle.name }}</span><span class="block text-muted-color text-sm mt-1">{{ vehicle.registration }}</span></div>
              <div class="shrink-0 text-right"><strong class="block text-surface-900 dark:text-surface-0">{{ formatGnf(vehicle.commission) }}</strong><span class="block text-green-500 text-sm mt-1">{{ vehicle.status }}</span></div>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6"><div class="font-semibold text-xl">Notifications</div><Button icon="pi pi-ellipsis-v" text rounded severity="secondary" /></div>
        <span class="block text-muted-color font-medium mb-4">AUJOURD’HUI</span>
        <ul class="p-0 m-0 list-none">
          <li v-for="notification in notifications" :key="notification.title" class="flex items-center py-3 border-b border-surface last:border-b-0">
            <div :class="notification.background" class="w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0"><i :class="[notification.icon, notification.iconColor]" class="!text-xl" /></div>
            <span class="text-surface-900 dark:text-surface-0 leading-normal"><strong class="font-medium">{{ notification.title }}</strong><span class="block text-muted-color mt-1">{{ notification.detail }}</span></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
  </div>
</template>
