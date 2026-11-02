<script setup lang="ts">
import { getRobotsMetaContent } from "~/config/runtime";

const { public: publicConfig } = useRuntimeConfig();

// Empêche l'indexation de tout ce qui n'est pas la production (préprod,
// recette, local) — voir server/routes/robots.txt.ts pour le pendant côté
// robots.txt, piloté par la même variable NUXT_PUBLIC_ENVIRONMENT.
useHead({
  meta: [
    { name: "robots", content: getRobotsMetaContent(publicConfig.environment) },
    // Nom affiché sous l'icône iOS lors de "Ajouter à l'écran d'accueil" —
    // même logique que le manifest PWA (server/routes/manifest.webmanifest.ts) :
    // un testeur préprod/recette ne doit jamais voir "Eau La Maman".
    { name: "apple-mobile-web-app-title", content: publicConfig.appName },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PwaUpdatePrompt />
</template>
