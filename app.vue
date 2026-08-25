<script setup lang="ts">
import { getRobotsMetaContent } from "~/config/runtime";

const { public: publicConfig } = useRuntimeConfig();

// Empêche l'indexation de tout ce qui n'est pas la production (préprod,
// recette, local) — voir server/routes/robots.txt.ts pour le pendant côté
// robots.txt, piloté par la même variable NUXT_PUBLIC_ENVIRONMENT.
useHead({
  meta: [{ name: "robots", content: getRobotsMetaContent(publicConfig.environment) }],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
