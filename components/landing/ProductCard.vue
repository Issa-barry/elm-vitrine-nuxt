<script setup lang="ts">
defineProps<{
  image: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <div>
    <img :src="image" :alt="title" class="w-full aspect-[4/3] object-cover rounded-lg" loading="lazy" width="1000" height="750">
    <h3 class="mt-4 font-semibold text-gray-900">{{ title }}</h3>
    <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ description }}</p>
  </div>
</template>
