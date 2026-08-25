<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Mes dépenses — Eau La Maman" });

const expenses = [
  { label: "Carburant", vehicle: "ABARRY OU3859", date: "22 août 2026", amount: "68,40 €", icon: "pi pi-bolt", status: "Validée" },
  { label: "Péage A13", vehicle: "ABARRY 2 OU4217", date: "21 août 2026", amount: "12,70 €", icon: "pi pi-ticket", status: "Validée" },
  { label: "Entretien périodique", vehicle: "ABARRY 3 OU7712", date: "20 août 2026", amount: "284,00 €", icon: "pi pi-wrench", status: "En attente" },
  { label: "Carburant", vehicle: "ABARRY 2 OU4217", date: "18 août 2026", amount: "74,30 €", icon: "pi pi-bolt", status: "Validée" },
];
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 lg:col-span-6 xl:col-span-3"><div class="card !mb-0"><div class="flex justify-between mb-4"><div><span class="block text-muted-color font-medium mb-4">Total ce mois</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">614,20 €</div></div><div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border w-10 h-10"><i class="pi pi-wallet text-orange-500 !text-xl" /></div></div><span class="text-primary font-medium">-8 % </span><span class="text-muted-color">depuis juillet</span></div></div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3"><div class="card !mb-0"><div class="flex justify-between mb-4"><div><span class="block text-muted-color font-medium mb-4">Carburant</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">286,40 €</div></div><div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border w-10 h-10"><i class="pi pi-bolt text-blue-500 !text-xl" /></div></div><span class="text-primary font-medium">46 % </span><span class="text-muted-color">des dépenses</span></div></div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3"><div class="card !mb-0"><div class="flex justify-between mb-4"><div><span class="block text-muted-color font-medium mb-4">Entretien</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">284,00 €</div></div><div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border w-10 h-10"><i class="pi pi-wrench text-cyan-500 !text-xl" /></div></div><span class="text-primary font-medium">1 </span><span class="text-muted-color">intervention</span></div></div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3"><div class="card !mb-0"><div class="flex justify-between mb-4"><div><span class="block text-muted-color font-medium mb-4">À valider</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">1 justificatif</div></div><div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border w-10 h-10"><i class="pi pi-file-check text-purple-500 !text-xl" /></div></div><span class="text-primary font-medium">En attente </span><span class="text-muted-color">de contrôle</span></div></div>

    <div class="col-span-12">
      <div class="card">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4"><div class="font-semibold text-xl">Dépenses récentes</div><div class="flex gap-2"><Button label="Télécharger" icon="pi pi-download" severity="secondary" outlined /><Button label="Ajouter une dépense" icon="pi pi-plus" /></div></div>
        <DataTable :value="expenses" responsive-layout="scroll" striped-rows>
          <Column header="Dépense"><template #body="{ data }"><div class="flex items-center gap-3"><div class="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-full"><i :class="data.icon" class="text-green-500" /></div><span class="font-medium">{{ data.label }}</span></div></template></Column>
          <Column field="vehicle" header="Véhicule" />
          <Column field="date" header="Date" />
          <Column field="amount" header="Montant" />
          <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="data.status === 'Validée' ? 'success' : 'warn'" /></template></Column>
          <Column header="Voir"><template #body><Button icon="pi pi-search" text /></template></Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>
