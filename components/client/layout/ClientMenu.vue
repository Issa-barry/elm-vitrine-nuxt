<script setup lang="ts">
const model = [
  {
    label: "Accueil",
    items: [{ label: "Tableau de bord", icon: "pi pi-fw pi-home", to: "/espace-client" }],
  },
  {
    label: "Gestion",
    items: [
      { label: "Mes véhicules", icon: "pi pi-fw pi-car", to: "/espace-client/vehicules" },
      { label: "Activité & livraisons", icon: "pi pi-fw pi-map-marker", to: "/espace-client/activite" },
      { label: "Mes commissions", icon: "pi pi-fw pi-percentage", to: "/espace-client/commissions" },
      { label: "Mes dépenses", icon: "pi pi-fw pi-wallet", to: "/espace-client/depenses" },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Mon profil", icon: "pi pi-fw pi-user", to: "/espace-client/profil" },
      { label: "Retour au site", icon: "pi pi-fw pi-globe", to: "/" },
    ],
  },
];
</script>

<template>
  <ul class="layout-menu">
    <ClientLayoutClientMenuItem
      v-for="item in model"
      :key="item.label"
      :item="item"
    />
  </ul>
</template>
