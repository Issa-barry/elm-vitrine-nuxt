<script setup lang="ts">
import type { ClientCapabilities } from "~/config/clientCapabilities";
import type { ClientCapabilitiesPreviewScenario } from "~/config/clientCapabilitiesFixtures";
import { CLIENT_CAPABILITIES_PREVIEW_FIXTURES, isClientCapabilitiesPreviewScenario } from "~/config/clientCapabilitiesFixtures";
import { CLIENT_NAV_ITEMS } from "~/config/clientNavigation";

// Voir le commentaire de garde dans pages/dev-preview/espace-client/index.vue
// (dev uniquement, indépendant de l'auth réelle, aucun appel API).
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: "Page introuvable." });
}

definePageMeta({ layout: "client" });

const route = useRoute();
const scenarioParam = route.params.scenario;

// 404 propre pour un scénario inconnu plutôt qu'une page à moitié vide.
if (typeof scenarioParam !== "string" || !isClientCapabilitiesPreviewScenario(scenarioParam)) {
  throw createError({ statusCode: 404, statusMessage: "Scénario de preview inconnu." });
}

const scenario = scenarioParam as ClientCapabilitiesPreviewScenario;
const fixture = CLIENT_CAPABILITIES_PREVIEW_FIXTURES[scenario];

useHead({ title: `Preview — ${fixture.label} — capacités espace client` });

// Même liste que la navigation réelle (config/clientNavigation.ts) : montre
// pour CHAQUE item, pas seulement ceux visibles, si ce scénario y donne
// droit — plus lisible pour comparer les 4 scénarios que la seule liste
// filtrée déjà visible dans le menu à côté.
const capabilityLabels: Record<keyof ClientCapabilities, string> = {
  dashboard: "Tableau de bord",
  commissions: "Commissions",
  expenses: "Dépenses",
  vehicles: "Véhicules",
  logisticsActivity: "Activité & livraisons",
  orders: "Mes commandes",
  services: "Mes prestations",
  profile: "Mon profil",
};

const capabilityRows = (Object.keys(capabilityLabels) as Array<keyof ClientCapabilities>).map((key) => ({
  key,
  label: capabilityLabels[key],
  enabled: fixture.capabilities[key],
  hasNavItem: CLIENT_NAV_ITEMS.some((item) => item.capability === key),
}));
</script>

<template>
  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <div class="card !mb-0">
        <div class="flex items-center justify-between mb-4">
          <div>
            <NuxtLink to="/dev-preview/espace-client" class="text-sm text-primary hover:underline">← Tous les scénarios</NuxtLink>
            <div class="font-semibold text-xl mt-2">{{ fixture.label }}</div>
            <p class="text-muted-color mt-1 mb-0">{{ fixture.description }}</p>
          </div>
          <div class="text-right">
            <strong class="block text-surface-900 dark:text-surface-0">{{ fixture.user.prenom }} {{ fixture.user.nom }}</strong>
            <span class="block text-muted-color text-sm mt-1">{{ formatPhoneNumber(fixture.user.telephone) }}</span>
            <span class="block text-muted-color text-sm">{{ fixture.user.roles.join(" + ") }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12">
      <div class="card">
        <div class="mb-4">
          <div class="font-semibold text-xl">Capacités résolues</div>
          <p class="text-muted-color mt-2 mb-0">
            Comparez au menu à gauche (desktop) et en bas (mobile, réduisez la fenêtre) — même
            <code>resolveClientCapabilities()</code> que la session réelle, jamais une valeur recopiée à la main.
          </p>
        </div>
        <ul class="list-none p-0 m-0">
          <li v-for="row in capabilityRows" :key="row.key" class="flex items-center justify-between gap-4 py-3 border-b border-surface last:border-b-0">
            <div class="flex items-center gap-3">
              <i :class="row.enabled ? 'pi pi-check-circle text-green-500' : 'pi pi-times-circle text-muted-color'" />
              <span class="text-surface-900 dark:text-surface-0">{{ row.label }}</span>
              <span v-if="!row.hasNavItem" class="text-muted-color text-xs">(pas encore d'entrée de menu)</span>
            </div>
            <Tag :value="row.enabled ? 'Visible' : 'Masqué'" :severity="row.enabled ? 'success' : 'secondary'" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
