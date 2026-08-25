<script setup>
definePageMeta({
  layout: "landing",
});
</script>

<template>
  <LandingContainer>
    <LandingSectionhead>
      <template #title>Contact</template>
      <template #desc>Nous sommes là pour vous aider.</template>
    </LandingSectionhead>

    <div class="grid md:grid-cols-2 gap-10 mx-auto max-w-4xl mt-16">
      <div>
        <h2 class="font-medium text-2xl text-gray-800">
          Contacter Eau La Maman
        </h2>
        <p class="text-lg leading-relaxed text-slate-500 mt-3">
          Une question, une demande ? Nous sommes là pour vous aider.
          Remplissez le formulaire ou écrivez-nous directement.
        </p>
        <div class="mt-5">
          <div class="flex items-center mt-2 space-x-2 text-gray-600">
            <Icon class="text-gray-400 w-4 h-4" name="uil:map-marker" />
            <span>Guinée, Conakry, Matoto marché</span>
          </div>
          <div class="flex items-center mt-2 space-x-2 text-gray-600">
            <Icon class="text-gray-400 w-4 h-4" name="uil:envelope" /><a
              href="mailto:contact@eaulamaman.com"
              >contact@eaulamaman.com</a
            >
          </div>
          <div class="flex items-center mt-2 space-x-2 text-gray-600">
            <Icon class="text-gray-400 w-4 h-4" name="uil:phone" /><a
              href="tel:+224656555520"
              >+224 656 555 520</a
            >
          </div>
        </div>
      </div>
      <div>
        <LandingContactform />
      </div>
    </div>
  </LandingContainer>
</template>
