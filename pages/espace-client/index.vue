<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Tableau de bord — Eau La Maman" });

const deliveries = [
  { reference: "CMD-2847", destination: "Boulogne-Billancourt", vehicle: "Renault Master", amount: "48,00 €", status: "En cours" },
  { reference: "CMD-2841", destination: "Paris 15e", vehicle: "Peugeot Expert", amount: "62,50 €", status: "Livrée" },
  { reference: "CMD-2839", destination: "Neuilly-sur-Seine", vehicle: "Renault Master", amount: "55,00 €", status: "Livrée" },
  { reference: "CMD-2832", destination: "Issy-les-Moulineaux", vehicle: "Citroën Jumpy", amount: "44,00 €", status: "À vérifier" },
];

const vehicles = [
  { name: "Renault Master", value: 82, color: "bg-orange-500", text: "text-orange-500" },
  { name: "Peugeot Expert", value: 64, color: "bg-cyan-500", text: "text-cyan-500" },
  { name: "Citroën Jumpy", value: 48, color: "bg-purple-500", text: "text-purple-500" },
];

const notifications = [
  { icon: "pi pi-check", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500", title: "Livraison CMD-2841 terminée", detail: "12 packs livrés à Paris 15e" },
  { icon: "pi pi-send", background: "bg-orange-100 dark:bg-orange-400/10", iconColor: "text-orange-500", title: "Nouvelle commande attribuée", detail: "Commande CMD-2847" },
  { icon: "pi pi-wallet", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500", title: "Versement validé", detail: "Montant de 542,80 €" },
];

const severity = (status: string) => status === "Livrée" ? "success" : status === "En cours" ? "info" : "warn";
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card !mb-0">
        <div class="flex justify-between mb-4">
          <div><span class="block text-muted-color font-medium mb-4">Livraisons</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">48</div></div>
          <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border w-10 h-10"><i class="pi pi-truck text-blue-500 !text-xl" /></div>
        </div>
        <span class="text-primary font-medium">12 nouvelles </span><span class="text-muted-color">ce mois-ci</span>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card !mb-0">
        <div class="flex justify-between mb-4">
          <div><span class="block text-muted-color font-medium mb-4">Revenus</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">2 340,80 €</div></div>
          <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border w-10 h-10"><i class="pi pi-euro text-orange-500 !text-xl" /></div>
        </div>
        <span class="text-primary font-medium">+184 € </span><span class="text-muted-color">cette semaine</span>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card !mb-0">
        <div class="flex justify-between mb-4">
          <div><span class="block text-muted-color font-medium mb-4">Véhicules</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">3 actifs</div></div>
          <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border w-10 h-10"><i class="pi pi-car text-cyan-500 !text-xl" /></div>
        </div>
        <span class="text-primary font-medium">100 % </span><span class="text-muted-color">disponibles</span>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card !mb-0">
        <div class="flex justify-between mb-4">
          <div><span class="block text-muted-color font-medium mb-4">Dépenses</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">614,20 €</div></div>
          <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border w-10 h-10"><i class="pi pi-wallet text-purple-500 !text-xl" /></div>
        </div>
        <span class="text-primary font-medium">26 % </span><span class="text-muted-color">des revenus</span>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="font-semibold text-xl mb-4">Livraisons récentes</div>
        <DataTable :value="deliveries" :rows="5" responsive-layout="scroll">
          <Column field="reference" header="Commande" />
          <Column field="destination" header="Destination" />
          <Column field="amount" header="Commission" />
          <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="severity(data.status)" /></template></Column>
          <Column header="Voir"><template #body><Button icon="pi pi-search" type="button" text /></template></Column>
        </DataTable>
      </div>

      <div class="card">
        <div class="flex justify-between items-center mb-6"><div class="font-semibold text-xl">Activité des véhicules</div><Button icon="pi pi-ellipsis-v" text rounded severity="secondary" /></div>
        <ul class="list-none p-0 m-0">
          <li v-for="vehicle in vehicles" :key="vehicle.name" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 last:mb-0">
            <div><span class="text-surface-900 dark:text-surface-0 font-medium">{{ vehicle.name }}</span><div class="mt-1 text-muted-color">Taux d’utilisation</div></div>
            <div class="mt-2 md:mt-0 flex items-center"><div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-40 lg:w-24 h-2"><div :class="vehicle.color" class="h-full" :style="{ width: `${vehicle.value}%` }" /></div><span :class="vehicle.text" class="ml-4 font-medium">{{ vehicle.value }} %</span></div>
          </li>
        </ul>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="font-semibold text-xl mb-4">Prochain versement</div>
        <div class="flex items-center justify-between py-4">
          <div><span class="block text-muted-color mb-2">Montant estimé</span><strong class="text-surface-900 dark:text-surface-0 text-3xl">1 726,60 €</strong><span class="block text-muted-color mt-2">Prévu le 31 août 2026</span></div>
          <i class="pi pi-chart-line text-primary text-5xl" />
        </div>
        <Button label="Voir le détail" icon="pi pi-arrow-right" icon-pos="right" class="mt-4" />
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-6"><div class="font-semibold text-xl">Notifications</div><Button icon="pi pi-ellipsis-v" text rounded severity="secondary" /></div>
        <span class="block text-muted-color font-medium mb-4">AUJOURD’HUI</span>
        <ul class="p-0 m-0 list-none">
          <li v-for="notification in notifications" :key="notification.title" class="flex items-center py-3 border-b border-surface last:border-b-0">
            <div :class="notification.background" class="w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0">
              <i :class="[notification.icon, notification.iconColor]" class="!text-xl" />
            </div>
            <span class="text-surface-900 dark:text-surface-0 leading-normal"><strong class="font-medium">{{ notification.title }}</strong><span class="block text-muted-color mt-1">{{ notification.detail }}</span></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
