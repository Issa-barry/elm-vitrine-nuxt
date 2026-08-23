<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Mon profil — Eau La Maman" });

const profile = reactive({
  firstName: "Issa",
  lastName: "M.",
  email: "issa@exemple.fr",
  phone: "06 12 34 56 78",
  company: "Transport IM",
  siret: "123 456 789 00012",
  city: "Paris",
  notifications: true,
});
const cities = ["Paris", "Boulogne-Billancourt", "Issy-les-Moulineaux", "Neuilly-sur-Seine"];
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 xl:col-span-7">
      <div class="card">
        <div class="font-semibold text-xl mb-6">Informations personnelles</div>
        <div class="flex items-center gap-4 pb-6 mb-6 border-b border-surface">
          <Avatar label="IM" size="xlarge" shape="circle" class="!bg-primary !text-primary-contrast" />
          <div><div class="font-semibold text-xl">{{ profile.firstName }} {{ profile.lastName }}</div><span class="text-muted-color">Compte propriétaire · Actif depuis mars 2025</span></div>
        </div>
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2"><label for="first-name" class="font-medium">Prénom</label><InputText id="first-name" v-model="profile.firstName" fluid /></div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2"><label for="last-name" class="font-medium">Nom</label><InputText id="last-name" v-model="profile.lastName" fluid /></div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2"><label for="email" class="font-medium">Adresse e-mail</label><InputText id="email" v-model="profile.email" type="email" fluid /></div>
          <div class="col-span-12 md:col-span-6 flex flex-col gap-2"><label for="phone" class="font-medium">Téléphone</label><InputText id="phone" v-model="profile.phone" fluid /></div>
          <div class="col-span-12 flex flex-col gap-2"><label for="city" class="font-medium">Ville principale</label><Select id="city" v-model="profile.city" :options="cities" fluid /></div>
        </div>
        <div class="flex justify-end mt-6"><Button label="Enregistrer" icon="pi pi-check" /></div>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-5">
      <div class="card">
        <div class="font-semibold text-xl mb-6">Informations professionnelles</div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2"><label for="company" class="font-medium">Société</label><InputText id="company" v-model="profile.company" fluid /></div>
          <div class="flex flex-col gap-2"><label for="siret" class="font-medium">Numéro SIRET</label><InputText id="siret" v-model="profile.siret" fluid /></div>
        </div>
        <div class="flex justify-end mt-6"><Button label="Mettre à jour" severity="secondary" outlined /></div>
      </div>

      <div class="card">
        <div class="font-semibold text-xl mb-6">Notifications</div>
        <div class="flex items-center justify-between gap-4">
          <div><span class="font-medium">Alertes d’activité</span><span class="block text-muted-color mt-1">Nouvelles commandes et validations</span></div>
          <ToggleSwitch v-model="profile.notifications" />
        </div>
      </div>
    </div>
  </div>
</template>
