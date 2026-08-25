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
      KPI "commissions" : même trio que la carte solde mobile
      (client-mobile-balance-card + son meta Déjà payé/Reste à payer),
      recomposé en 3 cartes horizontales à partir de tablette paysage —
      voir components/client/dashboard/KpiCard.vue. En dessous de lg (grille
      encore trop étroite pour 3 cartes lisibles), 2 colonnes puis 1 sur la
      ligne suivante ; à partir de lg, les 3 cartes tiennent sur une ligne.
      "Cumul des commissions" reste le KPI dominant du dashboard (déjà mis en
      avant côté mobile) : seule carte en variante "primary".
    -->
    <div class="col-span-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ClientDashboardKpiCard
          label="Cumul des commissions"
          :amount="formatGnf(totals.generated)"
          variant="primary"
          secondary-label="Déjà payé"
          :secondary-value="formatGnf(totals.paid)"
        />
        <ClientDashboardKpiCard
          label="Déjà payé"
          :amount="formatGnf(totals.paid)"
          icon="pi pi-check-circle"
          icon-background="bg-green-100 dark:bg-green-400/10"
          icon-color="text-green-500"
          secondary-label="Commissions déjà versées"
        />
        <ClientDashboardKpiCard
          label="Reste à payer"
          :amount="formatGnf(totals.remaining)"
          icon="pi pi-clock"
          icon-background="bg-orange-100 dark:bg-orange-400/10"
          icon-color="text-orange-500"
          secondary-label="Commissions en attente"
        />
      </div>
    </div>

    <!-- Dépenses : carte compacte à part, comme sur mobile (client-mobile-summary-card), pas noyée dans la grille KPI. -->
    <div class="col-span-12">
      <NuxtLink to="/espace-client/depenses" class="card !mb-0 flex items-center justify-between gap-4 group">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border w-10 h-10 shrink-0"><i class="pi pi-wallet text-purple-500 !text-xl" /></div>
          <div class="min-w-0"><span class="block text-muted-color font-medium">Dépenses</span><strong class="block text-surface-900 dark:text-surface-0 font-medium text-xl">614 200 GNF</strong></div>
        </div>
        <i class="pi pi-arrow-right text-muted-color group-hover:text-primary shrink-0" aria-hidden="true" />
      </NuxtLink>
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
