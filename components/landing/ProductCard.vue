<script setup lang="ts">
withDefaults(
  defineProps<{
    image: string;
    title: string;
    description: string;
    // Classe Tailwind complète (pas juste le ratio) : une classe construite
    // dynamiquement (`aspect-[${x}]`) ne serait pas détectée par le scanner
    // JIT de Tailwind et ne générerait aucun CSS. À adapter selon que la
    // photo du produit est plutôt large (packs, scènes) ou haute (bouteille
    // seule), pour que le produit reste entièrement visible sans être coupé.
    aspectClass?: string;
    imageWidth?: number;
    imageHeight?: number;
  }>(),
  {
    aspectClass: "aspect-[4/3]",
    imageWidth: 1000,
    imageHeight: 750,
  },
);
</script>

<template>
  <div>
    <img
      :src="image"
      :alt="title"
      :class="['w-full object-cover rounded-lg', aspectClass]"
      loading="lazy"
      :width="imageWidth"
      :height="imageHeight"
    >
    <h3 class="mt-4 font-semibold text-gray-900">{{ title }}</h3>
    <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ description }}</p>
  </div>
</template>
