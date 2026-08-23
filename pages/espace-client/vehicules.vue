<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Mes véhicules — Eau La Maman" });

const search = ref("");
const vehicles = [
  { name: "Renault Master", plate: "GH-482-LM", type: "Fourgon", mileage: "68 240 km", driver: "Issa M.", status: "Actif" },
  { name: "Peugeot Expert", plate: "FS-731-KP", type: "Utilitaire", mileage: "91 580 km", driver: "Mamadou D.", status: "Actif" },
  { name: "Citroën Jumpy", plate: "EW-214-TR", type: "Utilitaire", mileage: "112 040 km", driver: "Amine B.", status: "Entretien" },
];

const filteredVehicles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("fr");
  if (!query) return vehicles;
  return vehicles.filter((vehicle) => Object.values(vehicle).some((value) => value.toLocaleLowerCase("fr").includes(query)));
});
</script>

<template>
  <div class="card">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div><div class="font-semibold text-xl">Mes véhicules</div><span class="text-muted-color">Véhicules rattachés à votre compte propriétaire</span></div>
      <Button label="Ajouter un véhicule" icon="pi pi-plus" />
    </div>
    <div class="flex justify-end mb-4">
      <IconField><InputIcon class="pi pi-search" /><InputText v-model="search" placeholder="Rechercher" /></IconField>
    </div>
    <DataTable :value="filteredVehicles" data-key="plate" :rows="10" paginator responsive-layout="scroll" striped-rows>
      <Column field="name" header="Véhicule" sortable><template #body="{ data }"><div><span class="font-medium text-surface-900 dark:text-surface-0">{{ data.name }}</span><span class="block text-muted-color mt-1">{{ data.type }}</span></div></template></Column>
      <Column field="plate" header="Immatriculation" sortable />
      <Column field="mileage" header="Kilométrage" sortable />
      <Column field="driver" header="Conducteur" />
      <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="data.status === 'Actif' ? 'success' : 'warn'" /></template></Column>
      <Column header="Actions"><template #body><Button icon="pi pi-ellipsis-v" text rounded severity="secondary" /></template></Column>
    </DataTable>
  </div>
</template>
