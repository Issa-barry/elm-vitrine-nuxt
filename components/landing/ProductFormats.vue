<script setup lang="ts">
import bottle350Image from "~/assets/img/produit/prd-8.webp";
import bottle500Image from "~/assets/img/produit/prd-7.webp";
import bottle1500Image from "~/assets/img/produit/prd-6.webp";

const formats = [
  {
    image: bottle350Image,
    title: "Bouteille 350 ml",
    description: "Le format individuel, vendu en packs de 15 bouteilles.",
  },
  {
    image: bottle500Image,
    title: "Bouteille 500 ml",
    description: "Le format le plus demandé, vendu en packs de 12 bouteilles.",
  },
  {
    image: bottle1500Image,
    title: "Bouteille 1,5 L",
    description: "Le grand format familial, vendu en packs de 6 bouteilles.",
  },
];
</script>

<template>
  <div class="mt-16">
    <h2 class="font-bold text-3xl text-gray-800">Nos formats</h2>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
      <LandingProductCard
        v-for="item of formats"
        :key="item.title"
        :image="item.image"
        :title="item.title"
        :description="item.description"
        aspect-class="aspect-[3/4]"
        :image-width="750"
        :image-height="1000"
      />
    </div>
  </div>
</template>
