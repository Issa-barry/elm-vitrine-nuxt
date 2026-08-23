<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Activité et livraisons — Eau La Maman" });

const deliveries = [
  { id: "CMD-2847", date: "23 août, 10:45", destination: "Boulogne-Billancourt", driver: "Issa M.", vehicle: "GH-482-LM", amount: "48,00 €", status: "En cours" },
  { id: "CMD-2841", date: "23 août, 08:20", destination: "Paris 15e", driver: "Mamadou D.", vehicle: "FS-731-KP", amount: "62,50 €", status: "Livrée" },
  { id: "CMD-2839", date: "22 août, 16:30", destination: "Neuilly-sur-Seine", driver: "Issa M.", vehicle: "GH-482-LM", amount: "55,00 €", status: "Livrée" },
  { id: "CMD-2832", date: "22 août, 13:10", destination: "Issy-les-Moulineaux", driver: "Amine B.", vehicle: "EW-214-TR", amount: "44,00 €", status: "À vérifier" },
  { id: "CMD-2826", date: "21 août, 17:05", destination: "Levallois-Perret", driver: "Mamadou D.", vehicle: "FS-731-KP", amount: "58,80 €", status: "Livrée" },
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
        <DataTable :value="deliveries" data-key="id" paginator :rows="5" responsive-layout="scroll" striped-rows>
          <Column field="id" header="Commande" sortable />
          <Column field="date" header="Date" sortable />
          <Column field="destination" header="Destination" />
          <Column field="driver" header="Conducteur" />
          <Column field="vehicle" header="Véhicule" />
          <Column field="amount" header="Commission" />
          <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="severity(data.status)" /></template></Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>
