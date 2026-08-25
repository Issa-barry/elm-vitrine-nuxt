<script setup lang="ts">
const { toggleConfigMenu } = useClientLayout();

// Données de démonstration, cohérentes avec celles utilisées pour la carte
// d'identité de l'accueil (pages/espace-client/index.vue). Pas de contrat API
// réel derrière : à remplacer quand l'authentification sera branchée.
const name = "Issa M.";
const role = "Propriétaire";
const phone = "+224 622 60 26 93";

type ProfileRow = { label: string; to?: string; action?: () => void };
type ProfileGroup = { title: string; rows: ProfileRow[] };

// Seules les lignes pointant vers une route réelle ou réutilisant un
// mécanisme existant sont listées ici. Voir le récapitulatif fourni au
// dernier message pour la liste des actions volontairement omises.
const groups: ProfileGroup[] = [
  {
    title: "Profil",
    rows: [{ label: "Modifier le profil", to: "/espace-client/profil" }],
  },
  {
    title: "Services",
    rows: [
      { label: "Livraisons", to: "/espace-client/activite" },
      { label: "Véhicules", to: "/espace-client/vehicules" },
    ],
  },
  {
    title: "Paramètres",
    rows: [{ label: "Apparence", action: () => toggleConfigMenu() }],
  },
];

const router = useRouter();

const logoutConfirmVisible = ref(false);

const confirmLogout = () => {
  logoutConfirmVisible.value = false;
  router.push("/connexion");
};
</script>

<template>
  <div class="client-mobile-profile-body">
    <div class="client-mobile-profile-identity">
      <NuxtLink to="/espace-client/profil" class="client-mobile-profile-avatar-action" aria-label="Modifier le profil">
        <span class="client-mobile-profile-avatar" aria-hidden="true"><i class="pi pi-user" /></span>
        <span class="client-mobile-profile-avatar-edit" aria-hidden="true"><i class="pi pi-pencil" /></span>
      </NuxtLink>
      <div class="client-mobile-profile-identity-info">
        <strong>{{ name }}</strong>
        <span>{{ role }}</span>
        <span>{{ phone }}</span>
      </div>
    </div>

    <div v-for="group in groups" :key="group.title" class="client-mobile-profile-group">
      <span class="client-mobile-profile-group-title">{{ group.title }}</span>
      <div class="client-mobile-profile-rows">
        <template v-for="row in group.rows" :key="row.label">
          <NuxtLink v-if="row.to" :to="row.to" class="client-mobile-profile-row">
            <span class="client-mobile-profile-row-label">{{ row.label }}</span>
            <i class="pi pi-chevron-right client-mobile-profile-row-chevron" aria-hidden="true" />
          </NuxtLink>
          <button v-else type="button" class="client-mobile-profile-row" @click="row.action?.()">
            <span class="client-mobile-profile-row-label">{{ row.label }}</span>
            <i class="pi pi-chevron-right client-mobile-profile-row-chevron" aria-hidden="true" />
          </button>
        </template>
      </div>
    </div>

    <button type="button" class="client-mobile-profile-logout" @click="logoutConfirmVisible = true">
      <i class="pi pi-sign-out" aria-hidden="true" />
      <span>Se déconnecter</span>
    </button>

    <Dialog
      v-model:visible="logoutConfirmVisible"
      modal
      :closable="false"
      class="client-mobile-logout-dialog"
      aria-labelledby="logout-dialog-title"
    >
      <div class="client-mobile-logout-dialog-body">
        <span class="client-mobile-logout-dialog-icon" aria-hidden="true"><i class="pi pi-sign-out" /></span>
        <h2 id="logout-dialog-title">Se déconnecter ?</h2>
      </div>
      <div class="client-mobile-logout-dialog-actions">
        <Button label="Annuler" severity="secondary" outlined @click="logoutConfirmVisible = false" />
        <Button label="Oui" severity="danger" @click="confirmLogout" />
      </div>
    </Dialog>
  </div>
</template>
