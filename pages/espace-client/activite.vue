<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Activité et livraisons — Eau La Maman" });

const deliveries = [
  { reference: "CMD-2847", vehicle: "ABARRY OU3859", status: "En cours" },
  { reference: "CMD-2841", vehicle: "ABARRY OU4217", status: "Livrée" },
  { reference: "CMD-2839", vehicle: "ABARRY OU3859", status: "Livrée" },
  { reference: "CMD-2832", vehicle: "ABARRY OU7712", status: "À vérifier" },
  { reference: "CMD-2826", vehicle: "ABARRY OU4217", status: "Livrée" },
];

const severity = (status: string) => status === "Livrée" ? "success" : status === "En cours" ? "info" : "warn";
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 md:col-span-6 xl:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Aujourd’hui</span><div class="flex justify-between"><span class="text-surface-900 dark:text-surface-0 font-medium text-xl">6 livraisons</span><i class="pi pi-calendar text-blue-500 !text-xl" /></div></div></div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">En cours</span><div class="flex justify-between"><span class="text-surface-900 dark:text-surface-0 font-medium text-xl">2 commandes</span><i class="pi pi-send text-orange-500 !text-xl" /></div></div></div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Terminées</span><div class="flex justify-between"><span class="text-surface-900 dark:text-surface-0 font-medium text-xl">4 livraisons</span><i class="pi pi-check-circle text-green-500 !text-xl" /></div></div></div>
    <div class="col-span-12 md:col-span-6 xl:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Taux de réussite</span><div class="flex justify-between"><span class="text-surface-900 dark:text-surface-0 font-medium text-xl">98,4 %</span><i class="pi pi-chart-bar text-purple-500 !text-xl" /></div></div></div>

    <div class="col-span-12">
      <div class="card">
        <div class="flex items-center justify-between mb-4"><div class="font-semibold text-xl">Activité & livraisons</div><Button label="Exporter" icon="pi pi-download" severity="secondary" outlined /></div>
        <DataTable :value="deliveries" data-key="reference" paginator :rows="5" responsive-layout="scroll" striped-rows>
          <Column field="reference" header="Commande" sortable />
          <Column field="vehicle" header="Véhicule" sortable />
          <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="severity(data.status)" /></template></Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>
