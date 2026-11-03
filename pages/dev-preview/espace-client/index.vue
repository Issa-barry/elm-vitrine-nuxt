<script setup lang="ts">
import { CLIENT_CAPABILITIES_PREVIEW_FIXTURES, CLIENT_CAPABILITIES_PREVIEW_SCENARIOS } from "~/config/clientCapabilitiesFixtures";

// Preview UI des capacités espace client (chantier "prestataire" du
// 27/08/2026) — INDÉPENDANTE de l'auth réelle (aucun middleware "auth", pas
// d'appel à useAuth()), UNIQUEMENT en développement (voir demande du
// 27/08/2026, section 16 : "impossible en production"). "dev-preview" plutôt
// que "_preview" (suggéré dans la demande) : un dossier commençant par "_"
// sous pages/ est ignoré par le routeur de fichiers de Nuxt (convention
// documentée), aucune route n'en aurait résulté.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: "Page introuvable." });
}

definePageMeta({ layout: "client" });
useHead({ title: "Preview — capacités espace client" });
</script>

<template>
  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <div class="card">
        <div class="mb-4">
          <div class="font-semibold text-xl">Preview UI — capacités espace client</div>
          <p class="text-muted-color mt-2 mb-0">
            Développement uniquement — aucune session réelle, aucun appel API. Choisissez un scénario pour voir la
            navigation (menu desktop + bas mobile) et les capacités résolues.
          </p>
        </div>
        <ul class="list-none p-0 m-0">
          <li v-for="scenario in CLIENT_CAPABILITIES_PREVIEW_SCENARIOS" :key="scenario" class="border-b border-surface last:border-b-0">
            <NuxtLink :to="`/dev-preview/espace-client/${scenario}`" class="flex items-center justify-between gap-4 py-4 group">
              <div class="min-w-0">
                <span class="block text-surface-900 dark:text-surface-0 font-semibold group-hover:text-primary">{{ CLIENT_CAPABILITIES_PREVIEW_FIXTURES[scenario].label }}</span>
                <span class="block text-muted-color text-sm mt-1">{{ CLIENT_CAPABILITIES_PREVIEW_FIXTURES[scenario].description }}</span>
              </div>
              <i class="pi pi-arrow-right text-sm shrink-0" />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
