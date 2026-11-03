<script setup lang="ts">
import { getRobotsMetaContent, resolveAppShortName } from "~/config/runtime";

const { public: publicConfig } = useRuntimeConfig();

// Empêche l'indexation de tout ce qui n'est pas la production (préprod,
// recette, local) — voir server/routes/robots.txt.ts pour le pendant côté
// robots.txt, piloté par la même variable NUXT_PUBLIC_ENVIRONMENT.
useHead({
  meta: [
    { name: "robots", content: getRobotsMetaContent(publicConfig.environment) },
    // Nom affiché sous l'icône iOS lors de "Ajouter à l'écran d'accueil" —
    // même nom court que le manifest PWA (server/routes/manifest.webmanifest.ts),
    // pour afficher le même nom sur iPhone et sur Android.
    { name: "apple-mobile-web-app-title", content: resolveAppShortName(publicConfig) },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
