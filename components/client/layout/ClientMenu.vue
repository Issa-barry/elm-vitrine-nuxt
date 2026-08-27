<script setup lang="ts">
import { visibleNavItems } from "~/config/clientNavigation";

// Construit depuis CLIENT_NAV_ITEMS + useClientCapabilities() — jamais un
// menu statique ni un roles.includes(...) local (voir config/
// clientNavigation.ts, chantier "capacités" du 27/08/2026). "Retour au site"
// reste hors capacités (toujours affiché, lien externe à l'espace client).
const SECTION_LABELS = { accueil: "Accueil", gestion: "Gestion", compte: "Compte" } as const;

const capabilities = useClientCapabilities();

const model = computed(() => {
  const items = visibleNavItems(capabilities.value);
  const bySection = (section: keyof typeof SECTION_LABELS) =>
    items
      .filter((item) => item.section === section)
      .map((item) => ({ label: item.label, icon: `pi pi-fw ${item.icon}`, to: item.to }));

  const compteItems = [...bySection("compte"), { label: "Retour au site", icon: "pi pi-fw pi-globe", to: "/" }];

  return (
    [
      { label: SECTION_LABELS.accueil, items: bySection("accueil") },
      { label: SECTION_LABELS.gestion, items: bySection("gestion") },
      { label: SECTION_LABELS.compte, items: compteItems },
    ] satisfies Array<{ label: string; items: Array<{ label: string; icon: string; to: string }> }>
  ).filter((group) => group.items.length > 0);
});
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
