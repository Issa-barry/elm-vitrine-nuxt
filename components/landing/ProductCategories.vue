<script setup lang="ts">
import bottlesImage from "~/assets/img/produit/prd-10.webp";
import packsImage from "~/assets/img/produit/prd-14.webp";
import deliveryImage from "~/assets/img/produit/prd-22.webp";

const categories = [
  {
    image: bottlesImage,
    title: "Bouteilles individuelles",
    description:
      "Des bouteilles de 350 ml à 1,5 L, pour un usage quotidien à la maison ou au bureau.",
  },
  {
    image: packsImage,
    title: "Packs & multipacks",
    description:
      "Des packs de plusieurs bouteilles, pratiques pour les familles, commerces et événements.",
  },
  {
    image: deliveryImage,
    title: "Livraison & distribution",
    description:
      "Une flotte dédiée pour livrer nos produits chez les commerces, entreprises et particuliers.",
  },
];
</script>

<template>
  <div class="mt-16">
    <h2 class="font-bold text-3xl text-gray-800">Nos catégories</h2>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
      <LandingProductCard
        v-for="item of categories"
        :key="item.title"
        :image="item.image"
        :title="item.title"
        :description="item.description"
      />
    </div>
  </div>
</template>
